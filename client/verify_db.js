const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_KEY
);

async function verifyFlow1() {
    console.log('--- Verifying FLOW 1 (Club Creation) ---');
    const { data: clubs, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('name', 'Tech Club')
        .single();

    if (error) {
        console.error('Error fetching Tech Club:', error.message);
        return false;
    }
    console.log('Tech Club found:', clubs.name, 'Status:', clubs.status);
    return true;
}

async function verifyFlow2(studentEmail) {
    console.log('--- Verifying FLOW 2 (Membership) ---');
    const { data: profile } = await supabase.from('profiles').select('id').eq('email', studentEmail).single();
    if (!profile) return false;

    const { data: membership, error } = await supabase
        .from('membership')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error('Error fetching membership:', error.message);
        return false;
    }
    console.log('Membership found for student:', profile.id, 'Status:', membership.status);
    return true;
}

// Check args
const action = process.argv[2];
if (action === 'flow1') verifyFlow1();
if (action === 'flow2') verifyFlow2(process.argv[3] || 'student@test.com');
