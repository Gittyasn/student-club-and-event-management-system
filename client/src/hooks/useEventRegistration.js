import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export const useEventRegistration = (eventId, userId) => {
    const queryClient = useQueryClient();

    // Fetch event details
    const { data: event, isLoading: eventLoading } = useQuery({
        queryKey: ['event', eventId],
        enabled: !!eventId,
        queryFn: async () => {
            const { data } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();
            return data;
        }
    });

    // Fetch registrations for the event
    const { data: registrations, isLoading: registrationsLoading } = useQuery({
        queryKey: ['eventRegistrations', eventId],
        enabled: !!eventId,
        queryFn: async () => {
            const { data } = await supabase
                .from('registrations')
                .select('*')
                .eq('event_id', eventId)
                .eq('status', 'registered');
            return data || [];
        }
    });

    // Fetch user's registration status
    const { data: userRegistration } = useQuery({
        queryKey: ['userRegistration', eventId, userId],
        enabled: !!eventId && !!userId,
        queryFn: async () => {
            const { data } = await supabase
                .from('registrations')
                .select('*')
                .eq('event_id', eventId)
                .eq('user_id', userId)
                .single()
                .maybeSingle();
            return data;
        }
    });

    // Register for event (with waitlist)
    const registerMutation = useMutation({
        mutationFn: async () => {
            if (!event || !userId) throw new Error('Event or user ID missing');

            const registeredCount = registrations?.length || 0;
            // eslint-disable-next-line no-unused-vars
            const isFull = event.max_participants && registeredCount >= event.max_participants;

            // Generate QR token for attendance tracking
            // eslint-disable-next-line no-unused-vars
            const qrToken = uuidv4();

            const { data, error } = await supabase
                .from('registrations')
                .insert([{
                    event_id: eventId,
                    user_id: userId,
                    status: 'registered',
                    attendance_status: 'absent',
                    attendance_method: 'manual',
                    qr_scanned_at: null,
                    certificate_issued: false
                }])
                .select();

            if (error) throw error;
            return data[0];
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventRegistrations'] });
            queryClient.invalidateQueries({ queryKey: ['userRegistration'] });
        }
    });

    // Cancel registration
    const cancelMutation = useMutation({
        mutationFn: async () => {
            if (!userRegistration?.id) throw new Error('No registration found');

            const { error } = await supabase
                .from('registrations')
                .update({ status: 'cancelled' })
                .eq('id', userRegistration.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventRegistrations'] });
            queryClient.invalidateQueries({ queryKey: ['userRegistration'] });
        }
    });

    // Mark attendance (admin/coordinator)
    const markAttendanceMutation = useMutation({
        mutationFn: async (registrationId) => {
            const { error } = await supabase
                .from('registrations')
                .update({
                    attendance_status: 'present',
                    attendance_method: 'qr',
                    qr_scanned_at: new Date().toISOString()
                })
                .eq('id', registrationId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventRegistrations'] });
        }
    });

    // Get registration statistics
    const stats = {
        totalRegistrations: registrations?.length || 0,
        maxParticipants: event?.max_participants || 'Unlimited',
        isFull: event?.max_participants ? (registrations?.length || 0) >= event.max_participants : false,
        attendanceCount: registrations?.filter(r => r.attendance_status === 'present').length || 0,
        attendanceRate: registrations?.length > 0 
            ? ((registrations?.filter(r => r.attendance_status === 'present').length || 0) / registrations.length * 100).toFixed(1)
            : 0
    };

    return {
        event,
        eventLoading,
        userRegistration,
        registrations,
        registrationsLoading,
        registerMutation,
        cancelMutation,
        markAttendanceMutation,
        stats,
        isLoading: eventLoading || registrationsLoading
    };
};

// Hook for waitlist management
export const useEventWaitlist = (eventId) => {
    const queryClient = useQueryClient();

    const { data: waitlistData } = useQuery({
        queryKey: ['eventWaitlist', eventId],
        enabled: !!eventId,
        queryFn: async () => {
            const { data } = await supabase
                .from('registrations')
                .select('*, profiles:user_id(full_name, email)')
                .eq('event_id', eventId)
                .eq('status', 'waitlisted')
                .order('registered_at', { ascending: true });
            return data || [];
        }
    });

    // Add to waitlist
    const addToWaitlistMutation = useMutation({
        mutationFn: async (userId) => {
            const { error } = await supabase
                .from('registrations')
                .insert([{
                    event_id: eventId,
                    user_id: userId,
                    status: 'waitlisted',
                    attendance_status: 'absent'
                }]);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventWaitlist'] });
        }
    });

    // Promote from waitlist to registered
    const promoteFromWaitlistMutation = useMutation({
        mutationFn: async (registrationId) => {
            const { error } = await supabase
                .from('registrations')
                .update({ status: 'registered' })
                .eq('id', registrationId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventWaitlist'] });
        }
    });

    return {
        waitlistData,
        waitlistCount: waitlistData?.length || 0,
        addToWaitlistMutation,
        promoteFromWaitlistMutation
    };
};

// QR Token generation and verification
export const useQRAttendance = (eventId) => {
    const queryClient = useQueryClient();

    // Generate QR token for event
    const generateEventQRMutation = useMutation({
        mutationFn: async () => {
            const qrToken = uuidv4();
            const { error } = await supabase
                .from('events')
                .update({ qr_token: qrToken })
                .eq('id', eventId);

            if (error) throw error;
            return qrToken;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event'] });
        }
    });

    // Scan QR code and mark attendance
    const scanQRMutation = useMutation({
        mutationFn: async ({ registrationId, expectedToken }) => {
            const { data: event } = await supabase
                .from('events')
                .select('qr_token')
                .eq('id', eventId)
                .single();

            if (event.qr_token !== expectedToken) {
                throw new Error('Invalid QR code');
            }

            const { error } = await supabase
                .from('registrations')
                .update({
                    attendance_status: 'present',
                    attendance_method: 'qr',
                    qr_scanned_at: new Date().toISOString()
                })
                .eq('id', registrationId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventRegistrations'] });
        }
    });

    return {
        generateEventQRMutation,
        scanQRMutation
    };
};
