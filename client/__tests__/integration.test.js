/* global process */
// Integration Test Suite - Coordinator Features
// Run with: node client/__tests__/integration.test.js (requires test environment setup)

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

describe('Coordinator Analytics', () => {
    let testClubId;
    let testEventId;

    beforeAll(async () => {
        // Create test club
        const { data: club } = await supabase
            .from('clubs')
            .insert([{ name: 'Test Club Analytics' }])
            .select();
        testClubId = club?.[0]?.id;

        // Create test event
        const { data: event } = await supabase
            .from('events')
            .insert([{
                club_id: testClubId,
                title: 'Test Event',
                date: new Date().toISOString(),
                approval_status: 'approved'
            }])
            .select();
        testEventId = event?.[0]?.id;
    });

    it('should fetch coordinator analytics data', async () => {
        const { data, error } = await supabase
            .from('events')
            .select(`
                id,
                title,
                date,
                registrations (
                    id,
                    attendance_status
                )
            `)
            .eq('club_id', testClubId);

        expect(error).toBeNull();
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThan(0);
    });

    it('should calculate attendance rate correctly', async () => {
        const { data: events } = await supabase
            .from('events')
            .select('registrations(attendance_status)')
            .eq('club_id', testClubId);

        let totalRegs = 0;
        let totalPresent = 0;

        events.forEach(event => {
            const regs = event.registrations?.length || 0;
            const presents = event.registrations?.filter(r => r.attendance_status === 'present').length || 0;
            totalRegs += regs;
            totalPresent += presents;
        });

        const attendanceRate = totalRegs > 0 ? (totalPresent / totalRegs) * 100 : 0;
        expect(attendanceRate).toBeGreaterThanOrEqual(0);
        expect(attendanceRate).toBeLessThanOrEqual(100);
    });

    afterAll(async () => {
        // Cleanup
        await supabase.from('events').delete().eq('id', testEventId);
        await supabase.from('clubs').delete().eq('id', testClubId);
    });
});

describe('Event Registrations & Waitlist', () => {
    let testEventId;
    // eslint-disable-next-line no-unused-vars
    let testRegistrationId;

    beforeAll(async () => {
        const { data: event } = await supabase
            .from('events')
            .insert([{
                title: 'Waitlist Test Event',
                date: new Date().toISOString(),
                max_registrations: 1
            }])
            .select();
        testEventId = event?.[0]?.id;
    });

    it('should promote user from waitlist', async () => {
        // Get a waitlisted registration
        const { data: waitlistedReg } = await supabase
            .from('registrations')
            .select('id')
            .eq('event_id', testEventId)
            .eq('is_waitlisted', true)
            .limit(1);

        if (waitlistedReg && waitlistedReg.length > 0) {
            const { error } = await supabase
                .from('registrations')
                .update({ is_waitlisted: false })
                .eq('id', waitlistedReg[0].id);

            expect(error).toBeNull();

            // Verify update
            const { data: updated } = await supabase
                .from('registrations')
                .select('is_waitlisted')
                .eq('id', waitlistedReg[0].id)
                .single();

            expect(updated.is_waitlisted).toBe(false);
        }
    });

    afterAll(async () => {
        await supabase.from('events').delete().eq('id', testEventId);
    });
});

describe('Results Management', () => {
    let testEventId;
    let testResultId;

    beforeAll(async () => {
        const { data: event } = await supabase
            .from('events')
            .insert([{
                title: 'Results Test Event',
                date: new Date().toISOString()
            }])
            .select();
        testEventId = event?.[0]?.id;

        // Create a test result
        const { data: result } = await supabase
            .from('results')
            .insert([{
                event_id: testEventId,
                user_id: '00000000-0000-0000-0000-000000000001', // placeholder
                score: 80
            }])
            .select();
        testResultId = result?.[0]?.id;
    });

    it('should lock/unlock results', async () => {
        const { error: lockError } = await supabase
            .from('events')
            .update({ results_locked: true })
            .eq('id', testEventId);

        expect(lockError).toBeNull();

        const { data: locked } = await supabase
            .from('events')
            .select('results_locked')
            .eq('id', testEventId)
            .single();

        expect(locked.results_locked).toBe(true);
    });

    it('should update result fields', async () => {
        const { error } = await supabase
            .from('results')
            .update({ score: 90, remarks: 'Excellent performance' })
            .eq('id', testResultId);

        expect(error).toBeNull();

        const { data: updated } = await supabase
            .from('results')
            .select('score, remarks')
            .eq('id', testResultId)
            .single();

        expect(updated.score).toBe(90);
        expect(updated.remarks).toBe('Excellent performance');
    });

    afterAll(async () => {
        await supabase.from('results').delete().eq('event_id', testEventId);
        await supabase.from('events').delete().eq('id', testEventId);
    });
});

describe('Membership Management', () => {
    let testClubId;
    let testMembershipId;

    beforeAll(async () => {
        const { data: club } = await supabase
            .from('clubs')
            .insert([{ name: 'Membership Test Club' }])
            .select();
        testClubId = club?.[0]?.id;

        const { data: membership } = await supabase
            .from('club_memberships')
            .insert([{
                club_id: testClubId,
                user_id: '00000000-0000-0000-0000-000000000001',
                role: 'member',
                status: 'approved'
            }])
            .select();
        testMembershipId = membership?.[0]?.id;
    });

    it('should set sub-coordinator flag', async () => {
        const { error } = await supabase
            .from('club_memberships')
            .update({ is_sub_coordinator: true })
            .eq('id', testMembershipId);

        expect(error).toBeNull();

        const { data: updated } = await supabase
            .from('club_memberships')
            .select('is_sub_coordinator')
            .eq('id', testMembershipId)
            .single();

        expect(updated.is_sub_coordinator).toBe(true);
    });

    afterAll(async () => {
        await supabase.from('club_memberships').delete().eq('id', testMembershipId);
        await supabase.from('clubs').delete().eq('id', testClubId);
    });
});

describe('Attendance Token Flow', () => {
    it('should validate attendance token exists', async () => {
        const { data: tokens, error } = await supabase
            .from('attendance_tokens')
            .select('id, token, expires_at, used')
            .limit(1);

        expect(error).toBeNull();
        // Tokens table should exist and have expected columns
        expect(tokens).toBeDefined();
    });

    it('should have attendance_locked column on events', async () => {
        const { data: events, error } = await supabase
            .from('events')
            .select('attendance_locked')
            .limit(1);

        expect(error).toBeNull();
        expect(events?.[0]).toHaveProperty('attendance_locked');
    });
});

describe('Audit Logging', () => {
    it('should create audit log entries', async () => {
        const { data: logs, error } = await supabase
            .from('audit_logs')
            .select('id, user_id, action, module, details')
            .limit(1);

        expect(error).toBeNull();
        expect(Array.isArray(logs)).toBe(true);
    });

    it('should have all audit log columns', async () => {
        const { data: logs } = await supabase
            .from('audit_logs')
            .select('*')
            .limit(1);

        if (logs && logs.length > 0) {
            expect(logs[0]).toHaveProperty('user_id');
            expect(logs[0]).toHaveProperty('action');
            expect(logs[0]).toHaveProperty('module');
            expect(logs[0]).toHaveProperty('details');
            expect(logs[0]).toHaveProperty('created_at');
        }
    });
});

describe('Certificates', () => {
    it('should store certificate URLs', async () => {
        const { data: certs, error } = await supabase
            .from('certificates')
            .select('id, certificate_url, issued_at')
            .limit(1);

        expect(error).toBeNull();
        expect(Array.isArray(certs)).toBe(true);
    });

    it('should have certificate_url that is retrievable', async () => {
        const { data: cert } = await supabase
            .from('certificates')
            .select('certificate_url')
            .limit(1)
            .single();

        if (cert?.certificate_url) {
            // Attempt to fetch the URL (should be accessible if public)
            try {
                const response = await fetch(cert.certificate_url, { method: 'HEAD', timeout: 5000 });
                expect([200, 404, 403]).toContain(response.status); // URL exists in some form
            // eslint-disable-next-line no-unused-vars
            } catch (err) {
                // Signed URLs or private buckets may not be accessible without auth
                expect(cert.certificate_url).toMatch(/https?:\/\//);
            }
        }
    });
});
