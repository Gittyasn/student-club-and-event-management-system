#!/usr/bin/env node
/* global process */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const loadEnvFile = () => {
    const envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return {};

    const env = {};
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        const separatorIndex = line.indexOf('=');
        if (separatorIndex === -1) continue;

        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
        env[key] = value;
    }

    return env;
};

const envFile = loadEnvFile();
const readEnv = (...keys) => keys.find((key) => process.env[key]) ? process.env[keys.find((key) => process.env[key])] : envFile[keys.find((key) => envFile[key])];

const supabaseUrl = readEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
const supabaseAnonKey = readEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_KEY');

const accountConfig = {
    student: {
        email: process.env.TEST_STUDENT_EMAIL,
        password: process.env.TEST_STUDENT_PASSWORD,
        expectedRole: 'student',
    },
    coordinator: {
        email: process.env.TEST_COORDINATOR_EMAIL,
        password: process.env.TEST_COORDINATOR_PASSWORD,
        expectedRole: 'coordinator',
    },
    admin: {
        email: process.env.TEST_ADMIN_EMAIL,
        password: process.env.TEST_ADMIN_PASSWORD,
        expectedRole: 'admin',
    },
};

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase config. Set SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_ANON_KEY/VITE_SUPABASE_KEY.');
    process.exit(1);
}

for (const [label, account] of Object.entries(accountConfig)) {
    if (!account.email || !account.password) {
        console.error(`Missing ${label} credentials. Set TEST_${label.toUpperCase()}_EMAIL and TEST_${label.toUpperCase()}_PASSWORD.`);
        process.exit(1);
    }
}

const state = {
    passed: 0,
    warned: 0,
    failed: 0,
};

const connections = [];

const print = (status, name, detail = '') => {
    const prefix = status === 'PASS' ? '[PASS]' : status === 'WARN' ? '[WARN]' : '[FAIL]';
    console.log(`${prefix} ${name}${detail ? `: ${detail}` : ''}`);
    if (status === 'PASS') state.passed += 1;
    if (status === 'WARN') state.warned += 1;
    if (status === 'FAIL') state.failed += 1;
};

const formatError = (error) => error?.message || String(error);

const countRows = (response) => Array.isArray(response?.data) ? response.data.length : response?.data ? 1 : 0;

const createAuthedClient = () =>
    createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });

const expectQuery = async (name, queryPromise, { allowZero = true, zeroMessage = 'No rows found.' } = {}) => {
    try {
        const response = await queryPromise;
        if (response.error) {
            print('FAIL', name, response.error.message);
            return { ok: false, count: null, response };
        }

        const count = countRows(response);
        if (count === 0 && !allowZero) {
            print('WARN', name, zeroMessage);
            return { ok: true, count, response };
        }

        print('PASS', name, `${count} row(s)`);
        return { ok: true, count, response };
    } catch (error) {
        print('FAIL', name, formatError(error));
        return { ok: false, count: null, response: null };
    }
};

const expectZeroRows = async (name, queryPromise) => {
    try {
        const response = await queryPromise;
        if (response.error) {
            print('FAIL', name, response.error.message);
            return false;
        }

        const count = countRows(response);
        if (count === 0) {
            print('PASS', name, 'No cross-user rows returned.');
            return true;
        }

        print('FAIL', name, `${count} unexpected row(s) returned.`);
        return false;
    } catch (error) {
        print('FAIL', name, formatError(error));
        return false;
    }
};

const login = async (label, { email, password, expectedRole }) => {
    const client = createAuthedClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
        print('FAIL', `${label} login`, error.message);
        return null;
    }

    const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('id, email, full_name, role, club_id')
        .eq('id', data.user.id)
        .single();

    if (profileError) {
        print('FAIL', `${label} profile lookup`, profileError.message);
        return null;
    }

    if (profile.role !== expectedRole) {
        print('FAIL', `${label} role check`, `expected ${expectedRole}, got ${profile.role}`);
        return null;
    }

    print('PASS', `${label} login`, `${email} -> ${profile.role}`);
    connections.push(client);
    return { client, user: data.user, profile };
};

const checkCertificateDownload = async (student) => {
    try {
        const certResponse = await student.client
            .from('certificates')
            .select('id, file_url, certificate_url')
            .eq('user_id', student.profile.id)
            .limit(1);

        if (certResponse.error) {
            print('FAIL', 'Student certificate lookup', certResponse.error.message);
            return;
        }

        const certificate = certResponse.data?.[0];
        if (!certificate) {
            print('WARN', 'Student certificate download', 'No certificate available for this account.');
            return;
        }

        const storagePath = certificate.file_url || certificate.certificate_url;
        const { data, error } = await student.client.storage.from('certificates').download(storagePath);

        if (error) {
            print('FAIL', 'Student certificate download', error.message);
            return;
        }

        print('PASS', 'Student certificate download', `${storagePath} (${data.size} bytes)`);
    } catch (error) {
        print('FAIL', 'Student certificate download', formatError(error));
    }
};

const main = async () => {
    console.log('Running live Supabase smoke tests\n');

    const student = await login('Student', accountConfig.student);
    const coordinator = await login('Coordinator', accountConfig.coordinator);
    const admin = await login('Admin', accountConfig.admin);

    if (!student || !coordinator || !admin) {
        process.exit(1);
    }

    const clubsResponse = await admin.client.from('clubs').select('id, name, coordinator_id').limit(50);
    const allClubIds = clubsResponse.data?.map((club) => club.id) || [];
    const otherClubId = allClubIds.find((clubId) => clubId !== coordinator.profile.club_id) || null;

    await expectQuery('Admin can read clubs', Promise.resolve(clubsResponse), { allowZero: false, zeroMessage: 'No clubs exist.' });
    await expectQuery('Admin can read events', admin.client.from('events').select('id, title, approval_status, status').limit(50), {
        allowZero: false,
        zeroMessage: 'No events exist.',
    });
    await expectQuery('Admin can read users', admin.client.from('profiles').select('id, email, role').limit(50), {
        allowZero: false,
        zeroMessage: 'No users exist.',
    });
    await expectQuery('Admin can read pending approvals', admin.client.from('events').select('id, title').eq('approval_status', 'pending').limit(20), {
        allowZero: true,
    });

    await expectQuery(
        'Coordinator can read own club memberships',
        coordinator.client.from('club_memberships').select('id, user_id, club_id, status, role').eq('club_id', coordinator.profile.club_id).limit(50),
        { allowZero: false, zeroMessage: 'Coordinator club has no visible membership rows.' }
    );
    await expectQuery(
        'Coordinator can read own club events',
        coordinator.client.from('events').select('id, title, club_id, approval_status, status').eq('club_id', coordinator.profile.club_id).limit(50),
        { allowZero: true }
    );

    if (otherClubId) {
        await expectQuery(
            'Coordinator other-club events probe',
            coordinator.client.from('events').select('id, title, club_id').eq('club_id', otherClubId).limit(10),
            { allowZero: true }
        );
    } else {
        print('WARN', 'Coordinator other-club events probe', 'No secondary club available for comparison.');
    }

    await expectQuery(
        'Student can read approved events',
        student.client.from('events').select('id, title, approval_status, status').eq('approval_status', 'approved').limit(50),
        { allowZero: false, zeroMessage: 'No approved events are visible.' }
    );
    await expectQuery(
        'Student can read own registrations',
        student.client.from('registrations').select('id, user_id, event_id, status').limit(50),
        { allowZero: true }
    );
    await expectQuery(
        'Student can read own notifications',
        student.client.from('notifications').select('id, user_id, title, is_read').limit(50),
        { allowZero: true }
    );
    await expectQuery(
        'Student can read own attendance',
        student.client.from('attendance_records').select('id, user_id, event_id, status').eq('user_id', student.profile.id).limit(50),
        { allowZero: true }
    );
    await expectQuery(
        'Student can read own results',
        student.client.from('results').select('id, user_id, event_id, team_id, rank, score, max_score').eq('user_id', student.profile.id).limit(50),
        { allowZero: true }
    );
    await expectQuery(
        'Student can read own certificates',
        student.client.from('certificates').select('id, user_id, event_id, file_url, certificate_url').eq('user_id', student.profile.id).limit(50),
        { allowZero: true }
    );
    await checkCertificateDownload(student);

    await expectZeroRows(
        'Student cannot read another user notifications',
        student.client.from('notifications').select('id, user_id, title').eq('user_id', coordinator.profile.id).limit(10)
    );
    await expectZeroRows(
        'Student cannot read another user registrations',
        student.client.from('registrations').select('id, user_id, event_id, status').neq('user_id', student.profile.id).limit(10)
    );

    await expectQuery('Student can read chats', student.client.from('chats').select('id, type, reference_id').limit(20), { allowZero: true });
    await expectQuery('Coordinator can read chats', coordinator.client.from('chats').select('id, type, reference_id').limit(20), { allowZero: true });
    await expectQuery('Admin can read chats', admin.client.from('chats').select('id, type, reference_id').limit(20), { allowZero: true });

    console.log(`\nSummary: ${state.passed} passed, ${state.warned} warnings, ${state.failed} failed`);

    for (const client of connections) {
        try {
            await client.auth.signOut();
        } catch {
            // Ignore logout cleanup failures.
        }
    }

    process.exit(state.failed > 0 ? 1 : 0);
};

main().catch(async (error) => {
    print('FAIL', 'Smoke test runner', formatError(error));

    for (const client of connections) {
        try {
            await client.auth.signOut();
        } catch {
            // Ignore logout cleanup failures.
        }
    }

    process.exit(1);
});
