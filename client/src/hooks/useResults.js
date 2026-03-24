import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';
import { generateCertificatePDF } from '../utils/generateCertificate';

// ─── Fetch results for an event ───────────────────────────────────────────────
export const useEventResults = (eventId) => {
    return useQuery({
        queryKey: ['eventResults', eventId],
        enabled: !!eventId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('results')
                .select(`
                    id, rank, score, max_score, grade, result_type, status,
                    prize_title, prize_description, cash_prize, sponsor_info,
                    remarks, is_winner, published_at, locked_at,
                    user_id, team_id,
                    student:profiles!results_user_id_fkey(id, full_name, email, avatar_url, department),
                    team:teams(id, team_name)
                `)
                .eq('event_id', eventId)
                .order('rank', { ascending: true, nullsFirst: false });
            if (error) throw error;
            return data;
        }
    });
};

// ─── Fetch student's own results across all events ────────────────────────────
export const useMyResults = () => {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['myResults', user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('results')
                .select(`
                    id, rank, score, max_score, grade, result_type, status,
                    prize_title, prize_description, is_winner, published_at, remarks,
                    event:events(
                        id, title, start_time, result_type,
                        club:clubs(name, logo_url),
                        category:event_categories(name)
                    )
                `)
                .eq('user_id', user.id)
                .in('status', ['published', 'locked'])
                .order('published_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });
};

// ─── Fetch judges for an event ────────────────────────────────────────────────
export const useEventJudges = (eventId) => {
    return useQuery({
        queryKey: ['eventJudges', eventId],
        enabled: !!eventId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('judges')
                .select('id, weight, role_label, user_id, profile:profiles(full_name, email, avatar_url)')
                .eq('event_id', eventId);
            if (error) throw error;
            return data;
        }
    });
};

// ─── Fetch result audit logs for an event ────────────────────────────────────
export const useResultLogs = (eventId) => {
    return useQuery({
        queryKey: ['resultLogs', eventId],
        enabled: !!eventId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('result_logs')
                .select('*, actor:profiles!result_logs_actor_id_fkey(full_name)')
                .eq('event_id', eventId)
                .order('created_at', { ascending: false })
                .limit(100);
            if (error) throw error;
            return data;
        }
    });
};

// ─── Save / Upsert results (draft mode) ──────────────────────────────────────
export const useSaveResults = (eventId) => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    return useMutation({
        mutationFn: async (entries) => {
            // Check lock
            const { data: ev } = await supabase
                .from('events')
                .select('results_locked')
                .eq('id', eventId)
                .single();
            if (ev?.results_locked) throw new Error('Results are locked. Contact admin to unlock.');

            const mapped = entries.map(e => ({
                event_id: eventId,
                user_id: e.user_id || null,
                team_id: e.team_id || null,
                result_type: e.result_type || 'rank',
                rank: e.rank || null,
                score: e.score !== undefined ? parseFloat(e.score) : null,
                max_score: e.max_score !== undefined ? parseFloat(e.max_score) : null,
                grade: e.grade || null,
                prize_title: e.prize_title || null,
                prize_description: e.prize_description || null,
                cash_prize: e.cash_prize || null,
                sponsor_info: e.sponsor_info || null,
                remarks: e.remarks || null,
                is_winner: e.is_winner || false,
                status: 'draft'
            }));

            const { error } = await supabase
                .from('results')
                .upsert(mapped, { onConflict: 'event_id,user_id', ignoreDuplicates: false });
            if (error) throw error;

            // Audit log
            await supabase.from('result_logs').insert({
                event_id: eventId, actor_id: user?.id,
                action: 'draft_saved', note: `Saved ${entries.length} result entries (draft).`
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventResults', eventId] });
            toast.success('Results saved as draft.');
        },
        onError: (err) => toast.error(err.message)
    });
};

// ─── Publish results (RPC-powered) + generate certificates ───────────────────
export const usePublishResults = (eventId) => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    return useMutation({
        mutationFn: async (entries) => {
            const { data: ev } = await supabase
                .from('events')
                .select('results_locked, title, start_time, certificate_enabled')
                .eq('id', eventId)
                .single();
            if (ev?.results_locked) throw new Error('Results are locked.');

            // Upsert entries as draft first
            const mapped = entries.map(e => ({
                event_id: eventId,
                user_id: e.user_id || null,
                team_id: e.team_id || null,
                result_type: e.result_type || 'rank',
                rank: e.rank || null,
                score: e.score !== undefined ? parseFloat(e.score) : null,
                max_score: e.max_score !== undefined ? parseFloat(e.max_score) : null,
                grade: e.grade || null,
                prize_title: e.prize_title || null,
                prize_description: e.prize_description || null,
                cash_prize: e.cash_prize || null,
                remarks: e.remarks || null,
                is_winner: e.is_winner || false,
                status: 'draft'
            }));

            const { error: upsertErr } = await supabase
                .from('results')
                .upsert(mapped, { onConflict: 'event_id,user_id' });
            if (upsertErr) throw upsertErr;

            // Call Postgres publish function (calculates ranks + publishes)
            const { error: rpcErr } = await supabase.rpc('publish_event_results', {
                p_event_id: eventId, p_actor_id: user?.id
            });
            if (rpcErr) throw rpcErr;

            // Notify all registered students
            const { data: regs } = await supabase
                .from('registrations')
                .select('user_id')
                .eq('event_id', eventId)
                .in('status', ['registered', 'confirmed']);

            if (regs?.length > 0) {
                await supabase.from('notifications').insert(
                    regs.map(r => ({
                        user_id: r.user_id,
                        message: `Results published for "${ev.title}"! Check your ranking now.`,
                        type: 'info'
                    }))
                );
            }

            // Auto-generate certificates for participants if enabled
            if (ev?.certificate_enabled) {
                await _generateCertificatesForEvent(eventId, ev.title);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventResults', eventId] });
            queryClient.invalidateQueries({ queryKey: ['event', eventId] });
            toast.success('Results published! Students have been notified.');
        },
        onError: (err) => toast.error(err.message)
    });
};

// ─── Lock results ─────────────────────────────────────────────────────────────
export const useLockResults = (eventId) => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    return useMutation({
        mutationFn: async () => {
            const { error } = await supabase.rpc('lock_event_results', {
                p_event_id: eventId, p_actor_id: user?.id
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventResults', eventId] });
            queryClient.invalidateQueries({ queryKey: ['event', eventId] });
            toast.success('Results locked. Certificates and analytics are finalized.');
        },
        onError: (err) => toast.error(err.message)
    });
};

// ─── Recalculate ranks (auto, score-based) ────────────────────────────────────
export const useRecalculateRanks = (eventId) => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    return useMutation({
        mutationFn: async () => {
            const { error } = await supabase.rpc('calculate_ranks_for_event', { p_event_id: eventId });
            if (error) throw error;

            await supabase.from('result_logs').insert({
                event_id: eventId, actor_id: user?.id,
                action: 'recalculated', note: 'Ranks auto-recalculated from scores.'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventResults', eventId] });
            toast.success('Ranks recalculated with tie-skipping logic.');
        },
        onError: (err) => toast.error(err.message)
    });
};

// ─── CSV Import helper ─────────────────────────────────────────────────────────
export const parseResultsCSV = async (file, eventId) => {
    const text = await file.text();
    const lines = text.trim().split('\n');
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows = lines.slice(1);

    const results = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
        const cols = rows[i].split(',').map(c => c.trim());
        const row = {};
        header.forEach((h, idx) => { row[h] = cols[idx] || ''; });

        if (!row.email) { errors.push(`Row ${i + 2}: missing email`); continue; }

        // Lookup user_id from email
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', row.email.toLowerCase())
            .maybeSingle();

        if (!profile) { errors.push(`Row ${i + 2}: no user found for ${row.email}`); continue; }

        results.push({
            event_id: eventId,
            user_id: profile.id,
            score: row.score ? parseFloat(row.score) : null,
            max_score: row.max_score ? parseFloat(row.max_score) : null,
            grade: row.grade || null,
            rank: row.rank ? parseInt(row.rank) : null,
            prize_title: row.prize_title || null,
            remarks: row.remarks || null,
            is_winner: row.is_winner?.toLowerCase() === 'true',
            result_type: row.result_type || 'score',
            status: 'draft'
        });
    }
    return { results, errors };
};

// ─── Admin: Override result ───────────────────────────────────────────────────
export const useAdminResultOverride = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    const unlockResults = useMutation({
        mutationFn: async (eventId) => {
            const { error } = await supabase
                .from('events')
                .update({ results_locked: false })
                .eq('id', eventId);
            if (error) throw error;

            await supabase.from('results')
                .update({ status: 'published' })
                .eq('event_id', eventId)
                .eq('status', 'locked');

            await supabase.from('result_logs').insert({
                event_id: eventId, actor_id: user?.id,
                action: 'unlocked', note: 'Admin unlocked results for editing.'
            });
            await supabase.from('audit_logs').insert({
                user_id: user?.id, action: 'results_unlocked', target_id: eventId
            });
        },
        onSuccess: () => { toast.success('Results unlocked by admin.'); queryClient.invalidateQueries({ queryKey: ['event'] }); },
        onError: (err) => toast.error(err.message)
    });

    const overrideResult = useMutation({
        mutationFn: async ({ resultId, eventId, changes, reason }) => {
            const { data: before } = await supabase.from('results').select('*').eq('id', resultId).single();
            const { error } = await supabase.from('results')
                .update({ ...changes, override_by: user?.id, override_reason: reason })
                .eq('id', resultId);
            if (error) throw error;

            await supabase.from('result_logs').insert({
                event_id: eventId, result_id: resultId, actor_id: user?.id,
                action: 'admin_override',
                previous_data: before,
                new_data: { ...before, ...changes },
                note: reason || 'Admin correction'
            });
            await supabase.from('audit_logs').insert({
                user_id: user?.id, action: 'result_override', target_id: resultId,
                meta: { reason, changes }
            });
        },
        onSuccess: () => { toast.success('Result overridden.'); queryClient.invalidateQueries({ queryKey: ['eventResults'] }); },
        onError: (err) => toast.error(err.message)
    });

    return { unlockResults, overrideResult };
};

// ─── Platform-wide analytics (Admin) ─────────────────────────────────────────
export const useResultsAnalytics = () => {
    return useQuery({
        queryKey: ['resultsAnalytics'],
        queryFn: async () => {
            const { data } = await supabase
                .from('results')
                .select('score, max_score, rank, result_type, status, event_id, is_winner');

            if (!data) return {};
            const published = data.filter(r => ['published', 'locked'].includes(r.status));
            const scored = published.filter(r => r.score !== null);
            const avgScore = scored.length > 0 ? (scored.reduce((s, r) => s + r.score, 0) / scored.length).toFixed(1) : 0;
            const totalWinners = data.filter(r => r.is_winner).length;
            const totalRanked = data.filter(r => r.rank !== null).length;

            // Score distribution buckets
            const buckets = { '0-25': 0, '26-50': 0, '51-75': 0, '76-100': 0 };
            scored.forEach(r => {
                const pct = r.max_score > 0 ? (r.score / r.max_score) * 100 : r.score;
                if (pct <= 25) buckets['0-25']++;
                else if (pct <= 50) buckets['26-50']++;
                else if (pct <= 75) buckets['51-75']++;
                else buckets['76-100']++;
            });
            const scoreDistribution = Object.entries(buckets).map(([name, value]) => ({ name, value }));

            return {
                totalResults: published.length,
                totalWinners,
                totalRanked,
                avgScore: Number(avgScore),
                scoreDistribution,
                typeBreakdown: [
                    { name: 'Rank-Based', value: published.filter(r => r.result_type === 'rank').length, color: '#3b82f6' },
                    { name: 'Score-Based', value: published.filter(r => r.result_type === 'score').length, color: '#10b981' },
                    { name: 'Participation', value: published.filter(r => r.result_type === 'participation').length, color: '#8b5cf6' },
                ].filter(d => d.value > 0)
            };
        }
    });
};

// ─── Internal: certificate generation after publish ───────────────────────────
async function _generateCertificatesForEvent(eventId, eventTitle) {
    try {
        const { data: attendees } = await supabase
            .from('attendance_records')
            .select('user_id, profile:profiles!attendance_records_user_id_fkey(full_name)')
            .eq('event_id', eventId)
            .in('status', ['present', 'late']);

        if (!attendees?.length) return;

        for (const att of attendees) {
            const studentName = att.profile?.full_name;
            if (!studentName) continue;

            const { data: cert } = await supabase
                .from('certificates')
                .upsert({ event_id: eventId, user_id: att.user_id, certificate_url: 'pending' }, { onConflict: 'event_id,user_id' })
                .select().single();

            if (!cert) continue;

            try {
                const pdfBlob = await generateCertificatePDF({
                    studentName,
                    eventTitle,
                    eventDate: new Date().toLocaleDateString(),
                    certificateId: cert.id,
                    verificationUrl: `${window.location.origin}/verify/${cert.id}`
                });

                const fileName = `${eventId}/${att.user_id}.pdf`;
                await supabase.storage.from('certificates').upload(fileName, pdfBlob, { contentType: 'application/pdf', upsert: true });

                const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(fileName);
                await supabase.from('certificates').update({ certificate_url: publicUrl }).eq('id', cert.id);

                await supabase.from('notifications').insert({
                    user_id: att.user_id,
                    message: `Your certificate for "${eventTitle}" is ready to download!`,
                    type: 'success'
                });
            } catch (err) {
                console.error('Certificate generation failed for', att.user_id, err);
            }
        }
    } catch (err) {
        console.error('Auto-certificate generation failed:', err);
    }
}
