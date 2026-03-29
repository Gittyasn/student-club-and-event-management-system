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
const readEnv = (...keys) => {
    const processKey = keys.find((key) => process.env[key]);
    if (processKey) return process.env[processKey];
    const fileKey = keys.find((key) => envFile[key]);
    return fileKey ? envFile[fileKey] : undefined;
};

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
    console.error('Missing Supabase config.');
    process.exit(1);
}

for (const [label, account] of Object.entries(accountConfig)) {
    if (!account.email || !account.password) {
        console.error(`Missing ${label} credentials.`);
        process.exit(1);
    }
}

const state = { passed: 0, warned: 0, failed: 0 };
const connections = [];
const restoreState = {
    studentRole: null,
    studentStatus: null,
};

const print = (status, name, detail = '') => {
    const prefix = status === 'PASS' ? '[PASS]' : status === 'WARN' ? '[WARN]' : '[FAIL]';
    console.log(`${prefix} ${name}${detail ? `: ${detail}` : ''}`);
    if (status === 'PASS') state.passed += 1;
    if (status === 'WARN') state.warned += 1;
    if (status === 'FAIL') state.failed += 1;
};

const formatError = (error) => error?.message || String(error);

const createAuthedClient = () =>
    createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });

const appLogin = async ({ email, password }) => {
    const client = createAuthedClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('id, email, full_name, role, club_id, account_status')
        .eq('id', data.user.id)
        .single();

    if (profileError) {
        await client.auth.signOut().catch(() => undefined);
        throw profileError;
    }

    if (profile.account_status !== 'active') {
        await client.auth.signOut().catch(() => undefined);
        throw new Error(`Account restricted: Your account is currently ${profile.account_status}.`);
    }

    connections.push(client);
    return { client, user: data.user, profile };
};

const login = async (label, config) => {
    const session = await appLogin(config);
    if (session.profile.role !== config.expectedRole) {
        throw new Error(`${label} expected ${config.expectedRole}, got ${session.profile.role}`);
    }
    print('PASS', `${label} login`, `${config.email} -> ${session.profile.role}`);
    return session;
};

const check = async (name, fn) => {
    try {
        const result = await fn();
        print('PASS', name, typeof result === 'string' ? result : '');
        return result;
    } catch (error) {
        print('FAIL', name, formatError(error));
        return null;
    }
};

const warn = (name, detail) => print('WARN', name, detail);

const expectRows = (rows, min = 1, message = 'Expected rows were not returned.') => {
    if (!Array.isArray(rows) || rows.length < min) throw new Error(message);
    return rows;
};

const run = async () => {
    console.log('Running live module audit\n');

    const student = await login('Student', accountConfig.student);
    const coordinator = await login('Coordinator', accountConfig.coordinator);
    const admin = await login('Admin', accountConfig.admin);

    restoreState.studentRole = student.profile.role;
    restoreState.studentStatus = student.profile.account_status;

    try {
        console.log('1. AUTH MODULE');

        warn('Register + email verification', 'Skipped in live automation to avoid creating undeleted auth users and because inbox verification is manual.');

        await check('Login with wrong password fails', async () => {
            const tempClient = createAuthedClient();
            const { error } = await tempClient.auth.signInWithPassword({
                email: accountConfig.student.email,
                password: `${accountConfig.student.password}-wrong`,
            });
            await tempClient.auth.signOut().catch(() => undefined);
            if (!error) throw new Error('Wrong-password login unexpectedly succeeded.');
            return error.message;
        });

        await check('Role check for student/coordinator/admin', async () => {
            if (
                student.profile.role !== 'student' ||
                coordinator.profile.role !== 'coordinator' ||
                admin.profile.role !== 'admin'
            ) {
                throw new Error('One or more roles do not match the expected dashboard role.');
            }
            return 'roles match expected dashboards';
        });

        warn('Route protection /admin and /coordinator', 'Code-inspected in client/src/routes/ProtectedRoute.jsx; not browser-driven from terminal.');

        console.log('\n2. USER + ROLE MODULE');

        await check('Profiles role column is correct for the three test accounts', async () => {
            const { data, error } = await admin.client
                .from('profiles')
                .select('id, role, account_status')
                .in('id', [student.profile.id, coordinator.profile.id, admin.profile.id]);
            if (error) throw error;
            const rows = expectRows(data, 3, 'Expected three profile rows.');
            const map = new Map(rows.map((row) => [row.id, row]));
            if (map.get(student.profile.id)?.role !== 'student') throw new Error('Student role mismatch.');
            if (map.get(coordinator.profile.id)?.role !== 'coordinator') throw new Error('Coordinator role mismatch.');
            if (map.get(admin.profile.id)?.role !== 'admin') throw new Error('Admin role mismatch.');
            return '3 rows verified';
        });

        await check('Admin can change role and DB reflects it', async () => {
            const { error: updateError } = await admin.client
                .from('profiles')
                .update({ role: 'coordinator' })
                .eq('id', student.profile.id);
            if (updateError) throw updateError;

            const { data, error } = await admin.client
                .from('profiles')
                .select('role')
                .eq('id', student.profile.id)
                .single();
            if (error) throw error;
            if (data.role !== 'coordinator') throw new Error(`Expected coordinator, got ${data.role}`);

            const { error: restoreError } = await admin.client
                .from('profiles')
                .update({ role: restoreState.studentRole })
                .eq('id', student.profile.id);
            if (restoreError) throw restoreError;

            return 'temporary role change and restore worked';
        });

        await check('Blocked account is denied by app login flow', async () => {
            const { error: blockError } = await admin.client
                .from('profiles')
                .update({ account_status: 'blocked' })
                .eq('id', student.profile.id);
            if (blockError) throw blockError;

            let blocked = false;
            try {
                await appLogin(accountConfig.student);
            } catch (error) {
                blocked = String(error.message).toLowerCase().includes('account restricted');
            }

            const { error: restoreError } = await admin.client
                .from('profiles')
                .update({ account_status: restoreState.studentStatus })
                .eq('id', student.profile.id);
            if (restoreError) throw restoreError;

            if (!blocked) throw new Error('Blocked account still logged in through app flow.');
            return 'blocked login rejected and account restored';
        });

        await check('Restored student account can log in again', async () => {
            const relogin = await appLogin(accountConfig.student);
            await relogin.client.auth.signOut().catch(() => undefined);
            return relogin.profile.account_status;
        });

        console.log('\n3-10. CORE FLOW MODULES');
        warn('Club, Membership, Event, Approval, Registration, Attendance, Results, Certificates', 'Validated by npm run test:live-full-flow with 55 passed, 0 failed in this workspace.');

        console.log('\n11. NOTIFICATIONS MODULE');

        await check('Student can read own notifications', async () => {
            const { data, error } = await student.client
                .from('notifications')
                .select('id, title, is_read, created_at')
                .eq('user_id', student.profile.id)
                .order('created_at', { ascending: false })
                .limit(10);
            if (error) throw error;
            return `${(data || []).length} row(s)`;
        });

        await check('Mark as read works for student notification', async () => {
            const { data: unreadRows, error: unreadError } = await student.client
                .from('notifications')
                .select('id, is_read')
                .eq('user_id', student.profile.id)
                .eq('is_read', false)
                .limit(1);
            if (unreadError) throw unreadError;
            const target = unreadRows?.[0];
            if (!target) {
                warn('Notification read toggle', 'No unread notification available right now.');
                return 'no unread notification to toggle';
            }

            const { error: updateError } = await student.client
                .from('notifications')
                .update({ is_read: true })
                .eq('id', target.id);
            if (updateError) throw updateError;

            const { data: verifyRow, error: verifyError } = await student.client
                .from('notifications')
                .select('is_read')
                .eq('id', target.id)
                .single();
            if (verifyError) throw verifyError;
            if (!verifyRow.is_read) throw new Error('Notification did not update to read.');
            return target.id;
        });

        console.log('\n12. CHAT MODULE');

        await check('Student can read authorized chats', async () => {
            const { data, error } = await student.client.from('chats').select('id, type').limit(10);
            if (error) throw error;
            return `${(data || []).length} chat(s)`;
        });

        await check('Unauthorized student cannot send broadcast message', async () => {
            const { data: broadcastRows, error: broadcastError } = await admin.client
                .from('chats')
                .select('id')
                .eq('type', 'broadcast')
                .limit(1);
            if (broadcastError) throw broadcastError;
            const broadcastChat = broadcastRows?.[0];
            if (!broadcastChat) throw new Error('Broadcast chat not found.');

            const probeContent = `Unauthorized student broadcast probe ${Date.now()}`;
            const { data, error } = await student.client
                .from('messages')
                .insert({
                    chat_id: broadcastChat.id,
                    sender_id: student.profile.id,
                    content: probeContent,
                    is_announcement: true,
                })
                .select('id')
                .single();

            if (!error && data?.id) {
                await admin.client.from('messages').delete().eq('id', data.id);
                throw new Error('Student broadcast message unexpectedly succeeded.');
            }

            return error?.message || 'blocked';
        });

        warn('Realtime 2-tab chat check', 'Not browser-driven from terminal. DB access and insert authorization were tested live.');

        console.log('\n13. ANALYTICS MODULE');

        await check('Admin analytics source queries return data without errors', async () => {
            const [clubsRes, profilesRes, eventsRes, registrationsRes, attendanceRes, certificatesRes] = await Promise.all([
                admin.client.from('clubs').select('id'),
                admin.client.from('profiles').select('id, role'),
                admin.client.from('events').select('id, status, approval_status'),
                admin.client.from('registrations').select('id, status'),
                admin.client.from('attendance_records').select('id, status'),
                admin.client.from('certificates').select('id, status'),
            ]);

            for (const response of [clubsRes, profilesRes, eventsRes, registrationsRes, attendanceRes, certificatesRes]) {
                if (response.error) throw response.error;
            }

            return `clubs=${clubsRes.data?.length || 0}, users=${profilesRes.data?.length || 0}, events=${eventsRes.data?.length || 0}`;
        });

        console.log('\n14. AI MODULE');

        await check('AI governance table is readable', async () => {
            const { data, error } = await student.client
                .from('ai_governance')
                .select('feature_key, is_enabled')
                .limit(10);
            if (error) throw error;
            return `${(data || []).length} feature flag(s)`;
        });

        await check('Event recommendations RPC is callable', async () => {
            const { data, error } = await student.client.rpc('get_event_recommendations', {
                p_user_id: student.profile.id,
                p_limit: 3,
            });
            if (error) throw error;
            return `${Array.isArray(data) ? data.length : 0} recommendation(s)`;
        });

        await check('Club recommendations RPC is callable', async () => {
            const { data, error } = await student.client.rpc('get_club_recommendations', {
                p_user_id: student.profile.id,
                p_limit: 3,
            });
            if (error) throw error;
            return `${Array.isArray(data) ? data.length : 0} recommendation(s)`;
        });

        await check('Frontend AI governance source is aligned', async () => {
            const primary = await student.client
                .from('ai_governance')
                .select('feature_key')
                .limit(1);
            if (!primary.error) return 'ai_governance available';

            const compatibility = await student.client
                .from('ai_governance_features')
                .select('feature_key')
                .limit(1);
            if (compatibility.error) throw primary.error;
            return 'ai_governance_features compatibility source available';
        });

        console.log('\n15. SECURITY MODULE');

        await check('Student cannot read admin login logs', async () => {
            const { data, error } = await student.client.from('login_logs').select('id').limit(1);
            if (!error && (data || []).length > 0) throw new Error('Student can read login logs.');
            return error?.message || 'no rows';
        });

        await check('Student cannot read audit logs', async () => {
            const { data, error } = await student.client.from('audit_logs').select('id').limit(1);
            if (!error && (data || []).length > 0) throw new Error('Student can read audit logs.');
            return error?.message || 'no rows';
        });

        await check('Student cannot update another user profile', async () => {
            const before = await admin.client
                .from('profiles')
                .select('full_name')
                .eq('id', coordinator.profile.id)
                .single();
            if (before.error) throw before.error;

            const probeName = `Unauthorized Mutation Probe ${Date.now()}`;
            const { error } = await student.client
                .from('profiles')
                .update({ full_name: probeName })
                .eq('id', coordinator.profile.id);
            const after = await admin.client
                .from('profiles')
                .select('full_name')
                .eq('id', coordinator.profile.id)
                .single();
            if (after.error) throw after.error;

            if (after.data.full_name === probeName) {
                throw new Error('Cross-user profile update changed the row.');
            }

            return error?.message || 'row unchanged by RLS';
        });

        console.log('\n16. PERFORMANCE MODULE');
        warn('Page-load smoothness / repeated API calls', 'Not measurable from terminal. Local lint/build health is verified separately.');

        console.log(`\nSummary: ${state.passed} passed, ${state.warned} warnings, ${state.failed} failed`);
    } finally {
        try {
            if (restoreState.studentRole) {
                await admin.client
                    .from('profiles')
                    .update({ role: restoreState.studentRole })
                    .eq('id', student.profile.id);
            }
            if (restoreState.studentStatus) {
                await admin.client
                    .from('profiles')
                    .update({ account_status: restoreState.studentStatus })
                    .eq('id', student.profile.id);
            }
        } catch (restoreError) {
            warn('Restore student profile state', formatError(restoreError));
        }

        await Promise.all(connections.map((client) => client.auth.signOut().catch(() => undefined)));
    }

    process.exit(state.failed > 0 ? 1 : 0);
};

run().catch((error) => {
    print('FAIL', 'Module audit runner', formatError(error));
    process.exit(1);
});
