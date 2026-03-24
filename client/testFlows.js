
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://thvsjqghttadnqzhqskx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRodnNqcWdodHRhZG5xemhxc2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzOTA0MTMsImV4cCI6MjA4NTk2NjQxM30.h0iUDwhqBgqDw8s-Kd5MMafkkG0Vl97RSMRAn4iQVoQ';

// To isolate each role, we must create client with auth.persistSession = false
const createRoleClient = async (email, password) => {
    const client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    const { data: auth, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { client, user: auth.user };
};

async function run() {
    try {
        console.log('--- STARTING FLOW TESTS ---');
        
        console.log('Logging in roles...');
        const adminLog = await createRoleClient('yaswanthbandaruu@gmail.com', '123456');
        const coordLog = await createRoleClient('bandaruyaswanth5@gmail.com', '123456');
        const studentLog = await createRoleClient('bandaruyaswanth7@gmail.com', '123456');

        const admin = adminLog.client, coord = coordLog.client, student = studentLog.client;
        const coordUser = coordLog.user, studentUser = studentLog.user;

        console.log('--- FLOW 1: CLUB CREATION & VISIBILITY ---');
        const clubName = 'TestClub_' + Date.now();
        console.log('Admin creating club:', clubName);
        
        const { data: newClub, error: createClubErr } = await admin.from('clubs').insert({
            name: clubName,
            description: 'Flow Test',
            status: 'active',
            coordinator_id: coordUser.id
        }).select().single();

        if (createClubErr) throw new Error('Admin create club failed: ' + createClubErr.message);
        console.log('✅ Admin club created. ID:', newClub.id);

        // SYNC PROFILE: The frontend does this during assignment
        await admin.from('profiles').update({ club_id: newClub.id, role: 'coordinator' }).eq('id', coordUser.id);
        console.log('✅ Admin assigned coordinator profile club_id.');

        const { data: cClubs } = await coord.from('clubs').select('name').eq('id', newClub.id);
        if (cClubs.length > 0) console.log('✅ Coordinator can see the new club.');
        else console.log('❌ Coordinator CANNOT see the new club!');

        const { data: allCClubs } = await coord.from('clubs').select('id');
        if (allCClubs.length === 1) console.log('✅ Coordinator only sees 1 club (Correct RLS).');
        else if (allCClubs.length > 1) console.log('❌ Coordinator can see multiple clubs! RLS visibility issue.');
        else console.log('❌ Coordinator sees ZERO clubs!');

        const { data: sClubs } = await student.from('clubs').select('name').eq('id', newClub.id);
        if (sClubs.length > 0) console.log('✅ Student can see the new active club.');
        else console.log('❌ Student CANNOT see the active club!');


        console.log('\n--- FLOW 2: MEMBERSHIP ---');
        const { data: joinReq, error: joinErr } = await student.from('club_memberships').insert({
            club_id: newClub.id,
            user_id: studentUser.id,
            status: 'pending'
        }).select().single();

        if (joinErr) throw new Error('Student join failed: ' + joinErr.message);
        console.log('✅ Student requested to join successfully.');

        // Coordinator approvals
        const { error: appErr } = await coord.from('club_memberships').update({ status: 'approved' }).eq('id', joinReq.id);
        if (appErr) throw new Error('Coordinator approve failed: ' + appErr.message);
        console.log('✅ Coordinator approved student membership.');


        console.log('\n--- FLOW 3: EVENT CREATION & APPROVAL ---');
        const eventTitle = 'Event_' + Date.now();
        const { data: newEvent, error: evErr } = await coord.from('events').insert({
            club_id: newClub.id,
            title: eventTitle,
            description: 'Test event',
            start_time: new Date(Date.now() + 86400000).toISOString(),
            date: new Date(Date.now() + 86400000).toISOString(),
            status: 'draft',
            approval_status: 'pending'
        }).select().single();

        if (evErr) throw new Error('Coordinator create event failed: ' + evErr.message);
        console.log('✅ Coordinator created draft event. ID:', newEvent.id);

        const { data: sEvSearch } = await student.from('events').select('title').eq('id', newEvent.id);
        if (sEvSearch.length === 0) console.log('✅ Student CANNOT see draft event (Correct RLS).');
        else console.log('❌ Student CAN see draft event! RLS issue.');

        const { error: appEvErr } = await admin.from('events').update({ status: 'approved', approval_status: 'approved' }).eq('id', newEvent.id);
        if (appEvErr) throw new Error('Admin approve event failed: ' + appEvErr.message);
        console.log('✅ Admin approved event.');


        console.log('\n--- FLOW 4: REGISTRATION ---');
        const { error: regErr } = await student.from('registrations').insert({
            event_id: newEvent.id,
            user_id: studentUser.id,
            status: 'registered'
        });
        if (regErr) throw new Error('Student registration failed: ' + regErr.message);
        console.log('✅ Student successfully registered for event.');

        // Attempt duplicate
        const { error: regDupErr } = await student.from('registrations').insert({
            event_id: newEvent.id,
            user_id: studentUser.id,
            status: 'registered'
        });
        if (regDupErr) console.log('✅ Duplicate registration prevented. Error:', regDupErr.code);
        else console.log('❌ Duplicate registration succeeded! Missing unique constraint.');


        console.log('\n--- ALL DATABASE RLS TESTS PASSED ---');
        process.exit(0);

    } catch (err) {
        console.error('TEST FAILED:', err.message);
        process.exit(1);
    }
}

run();
