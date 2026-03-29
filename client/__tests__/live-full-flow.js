#!/usr/bin/env node
/* global process */

import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, StandardFonts } from 'pdf-lib';
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
const created = {
    clubIds: [],
    eventIds: [],
    membershipIds: [],
    registrationIds: [],
    resultIds: [],
    certificateIds: [],
    certificatePaths: [],
    originalCoordinatorClubId: null,
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

const login = async (label, { email, password, expectedRole }) => {
    const client = createAuthedClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`${label} login failed: ${error.message}`);

    const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('id, email, full_name, role, club_id')
        .eq('id', data.user.id)
        .single();

    if (profileError) throw new Error(`${label} profile lookup failed: ${profileError.message}`);
    if (profile.role !== expectedRole) throw new Error(`${label} expected ${expectedRole}, got ${profile.role}`);

    connections.push(client);
    print('PASS', `${label} login`, `${email} -> ${profile.role}`);
    return { client, user: data.user, profile };
};

const must = async (name, fn) => {
    const result = await fn();
    print('PASS', name);
    return result;
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

const buildPdf = async (studentName, eventTitle, certificateNumber) => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const { height } = page.getSize();

    page.drawText('Certificate of Participation', { x: 150, y: height - 80, size: 22, font: bold });
    page.drawText('This certifies that', { x: 230, y: height - 128, size: 12, font: regular });
    page.drawText(studentName, { x: 200, y: height - 162, size: 20, font: bold });
    page.drawText(`participated in ${eventTitle}`, { x: 165, y: height - 196, size: 12, font: regular });
    page.drawText(`Certificate No: ${certificateNumber}`, { x: 200, y: 68, size: 10, font: regular });

    return await pdfDoc.save();
};

const cleanup = async (admin, coordinatorId) => {
    try {
        if (created.originalCoordinatorClubId !== null) {
            await admin.client
                .from('profiles')
                .update({ club_id: created.originalCoordinatorClubId })
                .eq('id', coordinatorId);
        }

        if (created.certificatePaths.length > 0) {
            await admin.client.storage.from('certificates').remove(created.certificatePaths);
        }

        if (created.certificateIds.length > 0) {
            await admin.client.from('certificate_logs').delete().in('certificate_id', created.certificateIds);
            await admin.client.from('certificates').delete().in('id', created.certificateIds);
        }

        if (created.resultIds.length > 0) {
            await admin.client.from('result_logs').delete().in('result_id', created.resultIds);
        }
        if (created.eventIds.length > 0) {
            await admin.client.from('result_logs').delete().in('event_id', created.eventIds);
            await admin.client.from('results').delete().in('event_id', created.eventIds);
            await admin.client.from('attendance_logs').delete().in('event_id', created.eventIds);
            await admin.client.from('attendance_records').delete().in('event_id', created.eventIds);
            await admin.client.from('registrations').delete().in('event_id', created.eventIds);
            await admin.client.from('chat_rooms').delete().in('event_id', created.eventIds);
            await admin.client.from('events').delete().in('id', created.eventIds);
        }

        if (created.clubIds.length > 0) {
            await admin.client.from('club_memberships').delete().in('club_id', created.clubIds);
            await admin.client.from('clubs').delete().in('id', created.clubIds);
        }
    } catch (cleanupError) {
        warn('Cleanup', formatError(cleanupError));
    }
};

const main = async () => {
    console.log('Running full live role flow test\n');

    const student = await login('Student', accountConfig.student);
    const coordinator = await login('Coordinator', accountConfig.coordinator);
    const admin = await login('Admin', accountConfig.admin);

    created.originalCoordinatorClubId = coordinator.profile.club_id || null;

    const stamp = Date.now();
    const clubName = `Tech Club QA ${stamp}`;
    const inactiveClubName = `Tech Club Hidden QA ${stamp}`;
    const eventAName = `AI Workshop QA ${stamp}`;
    const eventBName = `Capacity Test QA ${stamp}`;
    const eventCName = `Rejected Event QA ${stamp}`;

    let activeClub = null;
    let inactiveClub = null;
    let eventA = null;
    let eventB = null;
    let eventC = null;
    let membership = null;
    let registrationA = null;
    let waitlistRegistration = null;
    let altStudent = null;

    try {
        const { data: clubCategoryRows, error: clubCategoryError } = await admin.client
            .from('club_categories')
            .select('id, name')
            .ilike('name', '%technical%')
            .limit(1);
        if (clubCategoryError) throw clubCategoryError;
        const clubCategory = expectRows(clubCategoryRows, 1, 'No technical club category found.')[0];

        const { data: eventCategoryRows, error: eventCategoryError } = await admin.client
            .from('event_categories')
            .select('id, name')
            .limit(1);
        if (eventCategoryError) throw eventCategoryError;
        const eventCategory = expectRows(eventCategoryRows, 1, 'No event categories found.')[0];

        const { data: altStudentRow, error: altStudentError } = await admin.client
            .from('profiles')
            .select('id, email, full_name, role')
            .eq('role', 'student')
            .neq('id', student.profile.id)
            .limit(1)
            .maybeSingle();
        if (altStudentError) throw altStudentError;
        altStudent = altStudentRow || null;
        if (!altStudent) warn('Alternate student for waitlist/certificate isolation', 'No second student found. Those checks will be skipped.');

        activeClub = await must('Flow 1 - Admin creates active club', async () => {
            const { data, error } = await admin.client
                .from('clubs')
                .insert({
                    name: clubName,
                    description: 'Temporary QA club for live flow testing.',
                    category_id: clubCategory.id,
                    status: 'active',
                    coordinator_id: coordinator.profile.id,
                })
                .select('id, name, coordinator_id, status')
                .single();
            if (error) throw error;
            created.clubIds.push(data.id);

            const { error: profileSyncError } = await admin.client
                .from('profiles')
                .update({ club_id: data.id })
                .eq('id', coordinator.profile.id);
            if (profileSyncError) throw profileSyncError;

            return data;
        });

        inactiveClub = await must('Flow 1 - Admin creates inactive club', async () => {
            const { data, error } = await admin.client
                .from('clubs')
                .insert({
                    name: inactiveClubName,
                    description: 'Temporary inactive QA club.',
                    category_id: clubCategory.id,
                    status: 'inactive',
                })
                .select('id, name, status')
                .single();
            if (error) throw error;
            created.clubIds.push(data.id);
            return data;
        });

        await check('Flow 1 - Club row saved with coordinator and active status', async () => {
            const { data, error } = await admin.client
                .from('clubs')
                .select('id, coordinator_id, status')
                .eq('id', activeClub.id)
                .single();
            if (error) throw error;
            if (data.coordinator_id !== coordinator.profile.id || data.status !== 'active') {
                throw new Error('Club row does not match expected coordinator or status.');
            }
            return data.id;
        });

        await check('Flow 1 - Coordinator sees assigned club', async () => {
            const { data, error } = await coordinator.client.from('clubs').select('id, name').eq('id', activeClub.id);
            if (error) throw error;
            expectRows(data, 1, 'Coordinator could not read assigned club.');
            return activeClub.name;
        });

        await check('Flow 1 - Coordinator cannot see unrelated inactive club', async () => {
            const { data, error } = await coordinator.client.from('clubs').select('id, name').eq('id', inactiveClub.id);
            if (error) throw error;
            if ((data || []).length > 0) throw new Error('Coordinator can see an unrelated club.');
            return 'hidden';
        });

        await check('Flow 1 - Student sees active club only', async () => {
            const { data, error } = await student.client.from('clubs').select('id, name, status').in('id', [activeClub.id, inactiveClub.id]);
            if (error) throw error;
            const ids = new Set((data || []).map((row) => row.id));
            if (!ids.has(activeClub.id)) throw new Error('Student cannot see active club.');
            if (ids.has(inactiveClub.id)) throw new Error('Student can see inactive club.');
            return activeClub.name;
        });

        membership = await must('Flow 2 - Student requests membership', async () => {
            const { data, error } = await student.client
                .from('club_memberships')
                .insert({ club_id: activeClub.id, user_id: student.profile.id, status: 'pending' })
                .select('id, club_id, user_id, status')
                .single();
            if (error) throw error;
            created.membershipIds.push(data.id);
            return data;
        });

        await check('Flow 2 - Membership row is pending in DB', async () => {
            const { data, error } = await admin.client
                .from('club_memberships')
                .select('id, club_id, user_id, status')
                .eq('id', membership.id)
                .single();
            if (error) throw error;
            if (data.club_id !== activeClub.id || data.user_id !== student.profile.id || data.status !== 'pending') {
                throw new Error('Membership row does not match expected values.');
            }
            return data.status;
        });

        await must('Flow 2 - Coordinator approves membership', async () => {
            const { error } = await coordinator.client
                .from('club_memberships')
                .update({ status: 'approved', approved_by: coordinator.profile.id, updated_at: new Date().toISOString() })
                .eq('id', membership.id);
            if (error) throw error;
        });

        await check('Flow 2 - Membership becomes approved', async () => {
            const { data, error } = await admin.client.from('club_memberships').select('status').eq('id', membership.id).single();
            if (error) throw error;
            if (data.status !== 'approved') throw new Error(`Expected approved, got ${data.status}`);
            return data.status;
        });

        await check('Flow 2 - Student sees club in my memberships', async () => {
            const { data, error } = await student.client
                .from('club_memberships')
                .select('id, club_id, status')
                .eq('user_id', student.profile.id)
                .eq('club_id', activeClub.id)
                .eq('status', 'approved');
            if (error) throw error;
            expectRows(data, 1, 'Approved membership is not visible to the student.');
            return 'visible';
        });

        await check('Flow 2 - Student cannot create event', async () => {
            const start = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
            const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
            const { data, error } = await student.client
                .from('events')
                .insert({
                    title: `Blocked Student Event ${stamp}`,
                    description: 'This should never be inserted by a student account.',
                    short_description: 'Blocked write test.',
                    club_id: activeClub.id,
                    category_id: eventCategory.id,
                    date: start.toISOString().slice(0, 10),
                    start_time: start.toISOString(),
                    end_time: end.toISOString(),
                    registration_deadline: new Date(start.getTime() - 60 * 60 * 1000).toISOString(),
                    max_participants: 10,
                    allow_waitlist: true,
                    mode: 'offline',
                    location: 'QA Hall',
                    visibility: 'public',
                    status: 'draft',
                    approval_status: 'draft',
                    created_by: student.profile.id,
                })
                .select('id')
                .single();
            if (!error) {
                if (data?.id) created.eventIds.push(data.id);
                throw new Error('Student write unexpectedly succeeded.');
            }
            return error.message;
        });

        const buildEventPayload = (title) => {
            const start = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
            const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
            return {
                title,
                description: 'Temporary QA event used to validate the production flow.',
                short_description: 'Temporary QA event.',
                club_id: activeClub.id,
                category_id: eventCategory.id,
                date: start.toISOString().slice(0, 10),
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                registration_deadline: new Date(start.getTime() - 60 * 60 * 1000).toISOString(),
                max_participants: 50,
                allow_waitlist: true,
                mode: 'offline',
                location: 'QA Seminar Hall',
                visibility: 'public',
                certificate_enabled: true,
                result_required: true,
                created_by: coordinator.profile.id,
                status: 'draft',
                approval_status: 'draft',
            };
        };

        eventA = await must('Flow 3 - Coordinator creates draft event', async () => {
            const { data, error } = await coordinator.client.from('events').insert(buildEventPayload(eventAName)).select('id, title, status, approval_status, created_by').single();
            if (error) throw error;
            created.eventIds.push(data.id);
            return data;
        });

        await check('Flow 3 - Draft event row saved correctly', async () => {
            if (eventA.status !== 'draft' || eventA.approval_status !== 'draft' || eventA.created_by !== coordinator.profile.id) {
                throw new Error('Draft event does not match expected state.');
            }
            return eventA.title;
        });

        await must('Flow 3 - Coordinator can edit draft event', async () => {
            const { error } = await coordinator.client.from('events').update({ short_description: 'Temporary QA event edited while still a draft.' }).eq('id', eventA.id);
            if (error) throw error;
        });

        await must('Flow 3 - Coordinator submits event for approval', async () => {
            const { error } = await coordinator.client
                .from('events')
                .update({ status: 'pending', approval_status: 'pending', submitted_at: new Date().toISOString() })
                .eq('id', eventA.id);
            if (error) throw error;
        });

        await check('Flow 3 - Pending event saved in DB', async () => {
            const { data, error } = await admin.client.from('events').select('status, approval_status, created_by').eq('id', eventA.id).single();
            if (error) throw error;
            if (data.status !== 'pending' || data.approval_status !== 'pending' || data.created_by !== coordinator.profile.id) {
                throw new Error('Submitted event is not pending.');
            }
            return 'pending';
        });

        await check('Flow 3 - Pending event cannot be edited by coordinator', async () => {
            const blockedTitle = `${eventAName} should not edit`;
            const { error } = await coordinator.client.from('events').update({ title: blockedTitle }).eq('id', eventA.id);
            if (error) return error.message;

            const { data: afterRow, error: verifyError } = await admin.client.from('events').select('title').eq('id', eventA.id).single();
            if (verifyError) throw verifyError;
            if (afterRow.title === blockedTitle) throw new Error('Pending event update actually changed the stored row.');
            return 'row unchanged';
        });

        await check('Flow 3 - Student cannot see unapproved event', async () => {
            const { data, error } = await student.client.from('events').select('id').eq('id', eventA.id);
            if (error) throw error;
            if ((data || []).length > 0) throw new Error('Student can see event before approval.');
            return 'hidden';
        });

        eventC = await must('Flow 6 - Coordinator creates reject-case event', async () => {
            const { data, error } = await coordinator.client.from('events').insert(buildEventPayload(eventCName)).select('id, title').single();
            if (error) throw error;
            created.eventIds.push(data.id);
            return data;
        });

        await must('Flow 6 - Coordinator submits reject-case event', async () => {
            const { error } = await coordinator.client
                .from('events')
                .update({ status: 'pending', approval_status: 'pending', submitted_at: new Date().toISOString() })
                .eq('id', eventC.id);
            if (error) throw error;
        });

        await must('Flow 6 - Admin rejects reject-case event', async () => {
            const { error } = await admin.client
                .from('events')
                .update({ status: 'draft', approval_status: 'rejected', rejection_reason: 'QA rejection path validation.' })
                .eq('id', eventC.id);
            if (error) throw error;
        });

        await check('Flow 6 - Rejection reason stored', async () => {
            const { data, error } = await admin.client.from('events').select('approval_status, rejection_reason').eq('id', eventC.id).single();
            if (error) throw error;
            if (data.approval_status !== 'rejected' || !data.rejection_reason) throw new Error('Rejected event did not save rejection details.');
            return data.rejection_reason;
        });

        await must('Flow 3 - Admin approves event', async () => {
            const { error } = await admin.client
                .from('events')
                .update({ status: 'registration_open', approval_status: 'approved', approved_at: new Date().toISOString(), rejection_reason: null })
                .eq('id', eventA.id);
            if (error) throw error;
        });

        await check('Flow 3 - Student sees approved event', async () => {
            const { data, error } = await student.client.from('events').select('id, title, approval_status, status').eq('id', eventA.id);
            if (error) throw error;
            const row = expectRows(data, 1, 'Approved event is still hidden from the student.')[0];
            if (row.approval_status !== 'approved') throw new Error('Event is visible but not approved.');
            return row.title;
        });

        eventB = await must('Flow 4 - Coordinator creates capacity test event', async () => {
            const payload = buildEventPayload(eventBName);
            payload.max_participants = 1;
            payload.allow_waitlist = true;
            const { data, error } = await coordinator.client.from('events').insert(payload).select('id, title').single();
            if (error) throw error;
            created.eventIds.push(data.id);
            return data;
        });

        await must('Flow 4 - Admin approves capacity test event', async () => {
            const { error } = await admin.client
                .from('events')
                .update({ status: 'registration_open', approval_status: 'approved', approved_at: new Date().toISOString() })
                .eq('id', eventB.id);
            if (error) throw error;
        });

        registrationA = await must('Flow 4 - Student registers for approved event', async () => {
            const { data, error } = await student.client
                .from('registrations')
                .insert({ event_id: eventA.id, user_id: student.profile.id, status: 'registered' })
                .select('id, event_id, user_id, status')
                .single();
            if (error) throw error;
            created.registrationIds.push(data.id);
            return data;
        });

        await check('Flow 4 - Registration row saved correctly', async () => {
            if (registrationA.event_id !== eventA.id || registrationA.user_id !== student.profile.id || registrationA.status !== 'registered') {
                throw new Error('Registration row does not match expected values.');
            }
            return registrationA.status;
        });

        await check('Flow 4 - Coordinator can view student in registrations', async () => {
            const { data, error } = await coordinator.client.from('registrations').select('id, user_id, event_id, status').eq('event_id', eventA.id).eq('user_id', student.profile.id);
            if (error) throw error;
            expectRows(data, 1, 'Coordinator cannot see the student registration.');
            return 'visible';
        });

        await check('Flow 4 - Duplicate registration is blocked', async () => {
            const { error } = await student.client.from('registrations').insert({ event_id: eventA.id, user_id: student.profile.id, status: 'registered' });
            if (!error) throw new Error('Duplicate registration unexpectedly succeeded.');
            return error.message;
        });

        if (altStudent) {
            const { data: altReg, error: altRegError } = await admin.client
                .from('registrations')
                .insert({ event_id: eventB.id, user_id: altStudent.id, status: 'registered' })
                .select('id')
                .single();
            if (altRegError) throw altRegError;
            created.registrationIds.push(altReg.id);

            waitlistRegistration = await must('Flow 4 - Student is waitlisted when event is full', async () => {
                const { data, error } = await student.client
                    .from('registrations')
                    .insert({ event_id: eventB.id, user_id: student.profile.id, status: 'waitlisted', waitlist_position: 1 })
                    .select('id, status, waitlist_position')
                    .single();
                if (error) throw error;
                created.registrationIds.push(data.id);
                return data;
            });

            await check('Flow 4 - Waitlist row saved correctly', async () => {
                if (waitlistRegistration.status !== 'waitlisted') throw new Error('Student was not waitlisted.');
                return `position ${waitlistRegistration.waitlist_position ?? 'n/a'}`;
            });

            await must('Flow 4 - Releasing seat promotes waitlist automatically', async () => {
                const { error } = await admin.client
                    .from('registrations')
                    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
                    .eq('id', altReg.id);
                if (error) throw error;
            });

            await check('Flow 4 - Waitlisted student becomes registered', async () => {
                const { data, error } = await admin.client.from('registrations').select('status, waitlist_position').eq('id', waitlistRegistration.id).single();
                if (error) throw error;
                if (data.status !== 'registered') throw new Error(`Expected promotion to registered, got ${data.status}`);
                return data.status;
            });
        }

        await must('Flow 5 - Coordinator marks attendance present', async () => {
            const { error } = await coordinator.client
                .from('attendance_records')
                .upsert({
                    event_id: eventA.id,
                    registration_id: registrationA.id,
                    user_id: student.profile.id,
                    status: 'present',
                    method: 'manual',
                    marked_at: new Date().toISOString(),
                    marked_by: coordinator.profile.id,
                }, { onConflict: 'event_id,user_id' });
            if (error) throw error;
        });

        await check('Flow 5 - Attendance row saved correctly', async () => {
            const { data, error } = await admin.client.from('attendance_records').select('event_id, user_id, status').eq('event_id', eventA.id).eq('user_id', student.profile.id).single();
            if (error) throw error;
            if (data.status !== 'present') throw new Error(`Expected present, got ${data.status}`);
            return data.status;
        });

        await check('Flow 5 - Student can view attendance', async () => {
            const { data, error } = await student.client.from('attendance_records').select('id, status').eq('event_id', eventA.id).eq('user_id', student.profile.id);
            if (error) throw error;
            expectRows(data, 1, 'Attendance is not visible to the student.');
            return 'visible';
        });

        await must('Flow 5 - Coordinator locks attendance', async () => {
            const { error } = await coordinator.client.rpc('lock_event_attendance', { p_event_id: eventA.id });
            if (error) throw error;
        });

        await check('Flow 5 - Locked attendance cannot be edited', async () => {
            const { error } = await coordinator.client
                .from('attendance_records')
                .update({ status: 'absent', modified_at: new Date().toISOString(), modified_by: coordinator.profile.id })
                .eq('event_id', eventA.id)
                .eq('user_id', student.profile.id);
            if (error) return error.message;

            const { data: afterRow, error: verifyError } = await admin.client
                .from('attendance_records')
                .select('status')
                .eq('event_id', eventA.id)
                .eq('user_id', student.profile.id)
                .single();
            if (verifyError) throw verifyError;
            if (afterRow.status !== 'present') throw new Error(`Attendance row changed after lock to ${afterRow.status}.`);
            return 'row unchanged';
        });

        const resultEntry = await must('Flow 6 - Coordinator saves result draft', async () => {
            const { data, error } = await coordinator.client
                .from('results')
                .upsert({
                    event_id: eventA.id,
                    user_id: student.profile.id,
                    result_type: 'score',
                    score: 95,
                    max_score: 100,
                    rank: 1,
                    is_winner: true,
                    prize_title: 'Winner',
                    status: 'draft',
                }, { onConflict: 'event_id,user_id' })
                .select('id, score, rank, status')
                .single();
            if (error) throw error;
            created.resultIds.push(data.id);
            return data;
        });

        await check('Flow 6 - Result draft saved', async () => {
            if (resultEntry.status !== 'draft') throw new Error(`Expected draft, got ${resultEntry.status}`);
            return `score ${resultEntry.score}`;
        });

        await must('Flow 6 - Coordinator publishes results', async () => {
            const { error } = await coordinator.client.rpc('publish_event_results', {
                p_event_id: eventA.id,
                p_actor_id: coordinator.profile.id,
            });
            if (error) throw error;
        });

        await check('Flow 6 - Student can see published result', async () => {
            const { data, error } = await student.client.from('results').select('id, status, score, rank').eq('event_id', eventA.id).eq('user_id', student.profile.id);
            if (error) throw error;
            const row = expectRows(data, 1, 'Published result is not visible to the student.')[0];
            if (!['published', 'locked'].includes(row.status)) throw new Error(`Expected published or locked, got ${row.status}`);
            return `rank ${row.rank}`;
        });

        await must('Flow 6 - Coordinator locks results', async () => {
            const { error } = await coordinator.client.rpc('lock_event_results', {
                p_event_id: eventA.id,
                p_actor_id: coordinator.profile.id,
            });
            if (error) throw error;
        });

        await check('Flow 6 - Locked results cannot be edited', async () => {
            const { error } = await coordinator.client.from('results').update({ score: 99 }).eq('event_id', eventA.id).eq('user_id', student.profile.id);
            if (error) return error.message;

            const { data: afterRow, error: verifyError } = await admin.client
                .from('results')
                .select('score, status')
                .eq('event_id', eventA.id)
                .eq('user_id', student.profile.id)
                .single();
            if (verifyError) throw verifyError;
            if (Number(afterRow.score) !== 95 || afterRow.status !== 'locked') {
                throw new Error(`Result row changed after lock (score=${afterRow.score}, status=${afterRow.status}).`);
            }
            return 'row unchanged';
        });

        const createCertificate = async (userId, fullName, certType, score, rank) => {
            const certificateId = crypto.randomUUID();
            const { data: certNumberData, error: certNumberError } = await coordinator.client.rpc('generate_certificate_number');
            if (certNumberError) throw certNumberError;
            const certificateNumber = certNumberData || `CERT-${stamp}-${Math.floor(Math.random() * 1000)}`;
            const filePath = `${eventA.id}/${userId}_${certType}_qa_${stamp}.pdf`;
            const pdfBytes = await buildPdf(fullName, eventAName, certificateNumber);

            const { error: uploadError } = await coordinator.client.storage.from('certificates').upload(filePath, pdfBytes, { contentType: 'application/pdf', upsert: true });
            if (uploadError) throw uploadError;

            const { error: certError } = await coordinator.client.from('certificates').insert({
                id: certificateId,
                event_id: eventA.id,
                user_id: userId,
                cert_type: certType,
                status: 'valid',
                score,
                rank,
                file_url: filePath,
                certificate_url: filePath,
                certificate_number: certificateNumber,
                generated_by: coordinator.profile.id,
                generated_at: new Date().toISOString(),
            });
            if (certError) throw certError;

            created.certificateIds.push(certificateId);
            created.certificatePaths.push(filePath);
            return { certificateId, filePath };
        };

        const studentCertificate = await must('Flow 6 - Coordinator generates student certificate', async () => {
            return await createCertificate(student.profile.id, student.profile.full_name || 'Student QA', 'winner', 95, 1);
        });

        let altCertificate = null;
        if (altStudent) {
            altCertificate = await must('Flow 6 - Coordinator generates second certificate for isolation test', async () => {
                return await createCertificate(altStudent.id, altStudent.full_name || 'Alt Student QA', 'participation', null, null);
            });
        }

        await check('Flow 6 - Certificate row exists in DB', async () => {
            const { data, error } = await admin.client.from('certificates').select('id, user_id, file_url').eq('id', studentCertificate.certificateId).single();
            if (error) throw error;
            if (data.user_id !== student.profile.id || !data.file_url) throw new Error('Certificate row is incomplete.');
            return data.file_url;
        });

        await check('Flow 6 - Student can see own certificate', async () => {
            const { data, error } = await student.client.from('certificates').select('id, file_url').eq('id', studentCertificate.certificateId);
            if (error) throw error;
            expectRows(data, 1, 'Student cannot read own certificate row.');
            return 'visible';
        });

        await check('Flow 6 - Student can download own certificate', async () => {
            const { data, error } = await student.client.storage.from('certificates').download(studentCertificate.filePath);
            if (error) throw error;
            return `${data.size} bytes`;
        });

        if (altCertificate) {
            await check('Flow 6 - Student cannot download another user certificate', async () => {
                const { error } = await student.client.storage.from('certificates').download(altCertificate.filePath);
                if (!error) throw new Error('Cross-user certificate download unexpectedly succeeded.');
                return error.message;
            });
        }

        console.log('\nLive role flow test complete.\n');
    } finally {
        await cleanup(admin, coordinator.profile.id);
        await Promise.all(connections.map((client) => client.auth.signOut().catch(() => undefined)));
    }

    console.log(`Summary: ${state.passed} passed, ${state.warned} warnings, ${state.failed} failed`);
    process.exit(state.failed > 0 ? 1 : 0);
};

main().catch((error) => {
    console.error(`\nFatal error: ${formatError(error)}`);
    process.exit(1);
});
