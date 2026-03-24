import { supabase } from './supabaseClient';

export const attendanceService = {
  requestAttendanceToken: async (eventId) => {
    // Edge functions are missing. Fallback to a client-side token generation.
    const payload = { eventId, timestamp: Date.now(), expiresAt: Date.now() + 120 * 60 * 1000 };
    const token = btoa(JSON.stringify(payload));
    return { token };
  },

  validateAttendanceToken: async (token) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) throw new Error('Not authenticated');

    try {
      const payload = JSON.parse(atob(token));
      
      // Check expiration
      if (Date.now() > payload.expiresAt) {
        throw new Error("Attendance token has expired");
      }

      const eventId = payload.eventId;
      const userId = userData.user.id;

      // Directly update the registrations table since edge function is missing
      const { data, error } = await supabase
        .from('registrations')
        .update({ 
          attendance_status: 'present', 
          attendance_method: 'qr' 
        })
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return { 
        success: true, 
        message: 'Successfully marked as present',
        registration: data
      };

    } catch (err) {
      throw new Error(err.message || 'Invalid or expired attendance token');
    }
  },

  getMyAttendance: async (userId) => {
    return supabase
      .from('registrations')
      .select('*, event:events(*)')
      .eq('user_id', userId)
      .eq('attendance_status', 'present');
  }
};

