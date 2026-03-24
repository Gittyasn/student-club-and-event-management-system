
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://thvsjqghttadnqzhqskx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRodnNqcWdodHRhZG5xemhxc2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzOTA0MTMsImV4cCI6MjA4NTk2NjQxM30.h0iUDwhqBgqDw8s-Kd5MMafkkG0Vl97RSMRAn4iQVoQ';

const createRoleClient = async (email, password) => {
    const client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    const { data: auth, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { client, user: auth.user };
};

async function run() {
    try {
        console.log('--- STARTING ATTENDANCE & RESULTS TESTS ---');
        
        const adminLog = await createRoleClient('yaswanthbandaruu@gmail.com', '123456');
        const coordLog = await createRoleClient('bandaruyaswanth5@gmail.com', '123456');
        const studentLog = await createRoleClient('bandaruyaswanth7@gmail.com', '123456');

        const admin = adminLog.client, coord = coordLog.client, student = studentLog.client;
        const coordUser = coordLog.user, studentUser = studentLog.user;

        // Ensure club exists
        console.log('Ensuring club exists for coordinator...');
        const clubName = 'AttendClub_' + Date.now();
        const { data: club, error: createClubErr } = await admin.from('clubs').insert({
            name: clubName,
            description: 'Attendance Test Club',
            status: 'active',
            coordinator_id: coordUser.id
        }).select().single();

        if (createClubErr) throw new Error('Admin create club failed: ' + createClubErr.message);
        console.log('✅ Created club:', club.id);

        // SYNC PROFILE: The frontend does this during assignment
        await admin.from('profiles').update({ club_id: club.id, role: 'coordinator' }).eq('id', coordUser.id);
        console.log('✅ Admin assigned coordinator profile club_id.');

        const eventTitle = 'Attend_Test_' + Date.now();
        const { data: event, error: evErr } = await coord.from('events').insert({
            club_id: club.id,
            title: eventTitle,
            description: 'Attendance Test',
            start_time: new Date().toISOString(),
            date: new Date().toISOString(),
            status: 'approved',
            approval_status: 'approved'
        }).select().single();

        if (evErr) throw new Error('Create event failed: ' + evErr.message);
        console.log('✅ Created event for attendance test:', event.id);

        // Register student
        const { data: reg, error: regErr } = await student.from('registrations').insert({
            event_id: event.id,
            user_id: studentUser.id,
            status: 'registered'
        }).select().single();
        if (regErr) throw new Error('Registration failed: ' + regErr.message);
        console.log('✅ Student registered for event.');

        console.log('\n--- TESTING ATTENDANCE ---');
        // Coordinator marks student present
        // coordinator_id is checked in attendance_records insertion policy via event_id -> clubs -> coordinator_id
        const { error: attErr } = await coord.from('attendance_records').insert({
            event_id: event.id,
            registration_id: reg.id,
            user_id: studentUser.id,
            status: 'present',
            method: 'manual',
            marked_by: coordUser.id
        });
        if (attErr) throw new Error('Coordinator mark attendance failed: ' + attErr.message);
        console.log('✅ Coordinator successfully marked student as present.');

        const { data: sAtt, error: sAttErr } = await student.from('attendance_records').select('*').eq('event_id', event.id);
        if (sAttErr) throw new Error('Student select attendance failed: ' + sAttErr.message);
        if (sAtt.length > 0) console.log('✅ Student can see their own attendance record.');
        else console.log('❌ Student CANNOT see their attendance record!');

        console.log('\n--- TESTING RESULTS ---');
        const { error: resErr } = await coord.from('results').insert({
            event_id: event.id,
            user_id: studentUser.id,
            position: 1,
            score: 100,
            remarks: 'Winner!'
        });
        if (resErr) throw new Error('Coordinator insert result failed: ' + resErr.message);
        console.log('✅ Coordinator successfully added result.');

        const { data: sRes, error: sResErr } = await student.from('results').select('*').eq('event_id', event.id);
        if (sResErr) throw new Error('Student select results failed: ' + sResErr.message);
        if (sRes && sRes.length > 0) console.log('✅ Student can see results for their event.');
        else console.log('❌ Student CANNOT see results or RLS denied access!');

        console.log('\n--- ATTENDANCE & RESULTS TESTS PASSED ---');
        process.exit(0);

    } catch (err) {
        console.error('TEST FAILED:', err.message);
        process.exit(1);
    }
}

run();
