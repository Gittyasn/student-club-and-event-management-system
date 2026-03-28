import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { fetchAuditLogs, writeAuditLog } from '../services/auditLogService';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY KPI HOOK
// ─────────────────────────────────────────────────────────────────────────────

export const useSecurityKPIs = () =>
    useQuery({
        queryKey: ['securityKPIs'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('v_security_kpis')
                .select('*')
                .single();
            if (error) throw error;
            return data;
        },
        refetchInterval: 30_000, // Refresh every 30s
    });

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS HOOK
// ─────────────────────────────────────────────────────────────────────────────

export const useAuditLogs = (limit = 200) =>
    useQuery({
        queryKey: ['auditLogs', limit],
        queryFn: async () => fetchAuditLogs({ limit }),
        refetchInterval: 60_000,
    });

// Write a structured audit log entry from the frontend
export const useAuditLog = () => {
    return useMutation({
        mutationFn: async ({ action, module, targetTable, targetId, oldValue, newValue, meta }) => {
            const { data: { user } } = await supabase.auth.getUser();
            await writeAuditLog({
                actor_id: user?.id,
                user_id: user?.id,
                action,
                module,
                target_table: targetTable,
                target_id: targetId,
                old_value: oldValue,
                new_value: newValue,
                meta,
            });
        },
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN LOGS HOOK
// ─────────────────────────────────────────────────────────────────────────────

export const useLoginLogs = (limit = 100) =>
    useQuery({
        queryKey: ['loginLogs', limit],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('login_logs')
                .select(`
                    id,
                    email,
                    status,
                    ip_address,
                    user_agent,
                    failure_reason,
                    created_at,
                    profile:profiles!profile_id(full_name, role)
                `)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) throw error;
            return data || [];
        },
        refetchInterval: 30_000,
    });

export const useFailedLogins24h = () =>
    useQuery({
        queryKey: ['failedLogins24h'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('v_failed_logins_24h')
                .select('*');
            if (error) throw error;
            return data || [];
        },
        refetchInterval: 60_000,
    });

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY EVENTS HOOK
// ─────────────────────────────────────────────────────────────────────────────

export const useSecurityEvents = (resolvedFilter = false) =>
    useQuery({
        queryKey: ['securityEvents', resolvedFilter],
        queryFn: async () => {
            let query = supabase
                .from('security_events')
                .select(`
                    id,
                    event_type,
                    severity,
                    description,
                    resolved,
                    created_at,
                    meta,
                    actor:profiles!actor_id(full_name, email, role)
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (!resolvedFilter) {
                query = query.eq('resolved', false);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        refetchInterval: 30_000,
    });

// Resolve a security incident
export const useResolveSecurityEvent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (eventId) => {
            const { error } = await supabase.rpc('resolve_security_event', {
                p_event_id: eventId,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['securityEvents'] });
            queryClient.invalidateQueries({ queryKey: ['securityKPIs'] });
            toast.success('Security incident marked as resolved');
        },
        onError: (err) => toast.error(err.message),
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK USER HOOK
// ─────────────────────────────────────────────────────────────────────────────

export const useBlockUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, reason }) => {
            const { error } = await supabase.rpc('block_user', {
                p_target_id: userId,
                p_reason: reason,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['securityKPIs'] });
            queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
            toast.success('User has been blocked.');
        },
        onError: (err) => toast.error(`Block failed: ${err.message}`),
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMIT STATUS HOOK
// ─────────────────────────────────────────────────────────────────────────────

export const useRateLimitStatus = () =>
    useQuery({
        queryKey: ['rateLimitStatus'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('rate_limit_tracker')
                .select('action, hit_count, window_start, user_id')
                .order('hit_count', { ascending: false })
                .limit(50);
            if (error) throw error;

            // Aggregate by action
            const byAction = (data || []).reduce((acc, row) => {
                if (!acc[row.action]) acc[row.action] = { action: row.action, total: 0, users: 0 };
                acc[row.action].total += row.hit_count;
                acc[row.action].users += 1;
                return acc;
            }, {});

            return Object.values(byAction);
        },
        refetchInterval: 60_000,
    });

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE INCIDENTS HOOK
// ─────────────────────────────────────────────────────────────────────────────

export const useActiveIncidents = () =>
    useQuery({
        queryKey: ['activeIncidents'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('v_active_security_incidents')
                .select('*');
            if (error) throw error;
            return data || [];
        },
        refetchInterval: 30_000,
    });
