import { createClient } from '@supabase/supabase-js';

// This function validates a token and marks attendance for the requesting student.
// Expected POST body: { token: '<uuid>', userId: '<user-id>' }
// Deployment: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as environment variables for the function.

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function (req, res) {
  try {
    const body = await req.json();
    const { token, userId } = body || {};

    if (!token || !userId) {
      return new Response(JSON.stringify({ error: 'token and userId required' }), { status: 400 });
    }

    // Lookup token
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('attendance_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenErr || !tokenRow) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 400 });
    }

    if (tokenRow.used) {
      return new Response(JSON.stringify({ error: 'Token already used' }), { status: 400 });
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Token expired' }), { status: 400 });
    }

    // Verify registration exists for this user and event
    const { data: registration, error: regErr } = await supabase
      .from('registrations')
      .select('*')
      .eq('event_id', tokenRow.event_id)
      .eq('user_id', userId)
      .single();

    if (regErr || !registration) {
      return new Response(JSON.stringify({ error: 'No registration found for this event/user' }), { status: 400 });
    }

    if (registration.attendance_status === 'present') {
      return new Response(JSON.stringify({ error: 'Attendance already marked' }), { status: 400 });
    }

    if (registration.is_waitlisted) {
      return new Response(JSON.stringify({ error: 'You are on the waitlist and cannot mark attendance' }), { status: 400 });
    }

    // Update registration to mark attendance
    const { error: updErr } = await supabase
      .from('registrations')
      .update({ attendance_status: 'present', attendance_method: 'qr', attendance_marked_at: new Date().toISOString() })
      .eq('id', registration.id);

    if (updErr) {
      console.error('Failed to mark attendance', updErr);
      return new Response(JSON.stringify({ error: updErr.message }), { status: 500 });
    }

    // Mark token used
    await supabase.from('attendance_tokens').update({ used: true }).eq('token', token);

    // Create notification
    await supabase.from('notifications').insert({ user_id: userId, message: 'Attendance marked via QR', type: 'success' });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
