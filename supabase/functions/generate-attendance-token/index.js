import { createClient } from '@supabase/supabase-js';

// This function creates a single-use token row in `attendance_tokens` and returns it.
// Deployment: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as environment variables for the function.

const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function (req, res) {
  try {
    const body = await req.json();
    const { eventId, expiresInMinutes = 60 } = body || {};

    if (!eventId) {
      return new Response(JSON.stringify({ error: 'eventId required' }), { status: 400 });
    }

    // Require Authorization header and verify caller is a coordinator/admin for the event's club
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), { status: 401 });
    }

    // Build a client with the anon key so we can inspect the user from the provided token
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!anonKey) {
      console.error('SUPABASE_ANON_KEY not set in function env');
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), { status: 500 });
    }

    const authSupabase = createClient(process.env.SUPABASE_URL, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await authSupabase.auth.getUser();
    if (userErr || !userData?.data?.user) {
      return new Response(JSON.stringify({ error: 'Invalid auth token' }), { status: 401 });
    }

    const userId = userData.data.user.id;

    // Fetch event and club
    const { data: eventRow, error: eventErr } = await serviceSupabase
      .from('events')
      .select('id, club_id')
      .eq('id', eventId)
      .single();
    if (eventErr || !eventRow) {
      return new Response(JSON.stringify({ error: 'Event not found' }), { status: 404 });
    }

    // Fetch profile for caller
    const { data: profile, error: profileErr } = await serviceSupabase
      .from('profiles')
      .select('id, role, club_id')
      .eq('id', userId)
      .single();

    if (profileErr || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 403 });
    }

    // Only allow if caller is coordinator of the event's club or admin
    if (!(profile.role === 'admin' || (profile.role === 'coordinator' && profile.club_id === eventRow.club_id))) {
      return new Response(JSON.stringify({ error: 'Not authorized to generate token for this event' }), { status: 403 });
    }

    const expiresAt = new Date(Date.now() + (expiresInMinutes * 60 * 1000)).toISOString();

    const { data, error } = await serviceSupabase
      .from('attendance_tokens')
      .insert([{ event_id: eventId, expires_at: expiresAt, created_by: userId }])
      .select()
      .single();

    if (error) {
      console.error('Error creating token', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ token: data.token, expires_at: data.expires_at }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
