import { supabase } from './supabaseClient';

const cleanPayload = (payload) =>
    Object.fromEntries(
        Object.entries(payload || {}).filter(([, value]) => value !== undefined)
    );

export const writeAuditLog = async (payload = {}) => {
    const richPayload = cleanPayload(payload);
    const actorId = payload.actor_id ?? payload.user_id;

    const attempts = [
        richPayload,
        cleanPayload({
            actor_id: actorId,
            user_id: payload.user_id ?? actorId,
            action: payload.action,
        }),
        cleanPayload({
            user_id: payload.user_id ?? actorId,
            action: payload.action,
        }),
        cleanPayload({
            actor_id: actorId,
            action: payload.action,
        }),
    ].filter((attempt, index, arr) => {
        if (!attempt.action) return false;
        return arr.findIndex((entry) => JSON.stringify(entry) === JSON.stringify(attempt)) === index;
    });

    let lastError = null;

    for (const attempt of attempts) {
        const { error } = await supabase.from('audit_logs').insert(attempt);
        if (!error) return true;
        lastError = error;
    }

    console.warn('Audit log write skipped due to schema mismatch:', lastError?.message || lastError);
    return false;
};

export const fetchAuditLogs = async ({ limit = 100, actions = null } = {}) => {
    let query = supabase
        .from('audit_logs')
        .select('id, actor_id, user_id, action, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (actions?.length) {
        query = query.in('action', actions);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];
    const actorIds = [...new Set(rows.map((row) => row.actor_id || row.user_id).filter(Boolean))];

    if (!actorIds.length) {
        return rows.map((row) => ({
            ...row,
            actor: null,
        }));
    }

    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .in('id', actorIds);

    if (profileError) {
        console.warn('Audit actor hydration failed:', profileError.message);
        return rows.map((row) => ({
            ...row,
            actor: null,
        }));
    }

    const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));

    return rows.map((row) => ({
        ...row,
        actor: profileMap.get(row.actor_id || row.user_id) || null,
    }));
};
