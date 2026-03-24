// eslint-disable-next-line no-unused-vars
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

// ─────────────────────────────────────────────────────────────────────────────
// useDebounce — Delays updating a value until user stops typing
// Usage: const debouncedSearch = useDebounce(searchTerm, 350);
// ─────────────────────────────────────────────────────────────────────────────
export const useDebounce = (value, delay = 350) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
};

// ─────────────────────────────────────────────────────────────────────────────
// useMemoizedFilter — Memoized client-side list filter
// Usage: const filtered = useMemoizedFilter(events, { status: 'approved', query: searchTerm });
// ─────────────────────────────────────────────────────────────────────────────
export const useMemoizedFilter = (data, filters) => {
    return useMemo(() => {
        if (!data || !filters) return data || [];

        return data.filter(item => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value || value === '') return true;

                // Full-text search mode (key = '_search', value = query string)
                if (key === '_search') {
                    const query = value.toLowerCase();
                    return Object.values(item).some(v =>
                        typeof v === 'string' && v.toLowerCase().includes(query)
                    );
                }

                // Nested key support (e.g. 'club.name')
                if (key.includes('.')) {
                    const [parent, child] = key.split('.');
                    return item[parent]?.[child] === value;
                }

                return item[key] === value;
            });
        });
    }, [data, filters]);
};

// ─────────────────────────────────────────────────────────────────────────────
// useInfiniteEvents — Cursor-based pagination for events list
// Returns: { events, fetchNextPage, hasNextPage, isFetchingNextPage }
// ─────────────────────────────────────────────────────────────────────────────
export const useInfiniteEvents = ({ status = null, clubId = null, pageSize = 20 } = {}) => {
    const query = useInfiniteQuery({
        queryKey: ['events-infinite', status, clubId, pageSize],
        queryFn: async ({ pageParam = null }) => {
            let q = supabase
                .from('events')
                .select(`
                    id, title, description, status, approval_status,
                    start_time, end_time, capacity, event_type, location,
                    club:clubs(id, name, logo_url)
                `, { count: 'exact' })
                .order('start_time', { ascending: false })
                .limit(pageSize);

            if (status) q = q.eq('status', status);
            if (clubId) q = q.eq('club_id', clubId);
            if (pageParam) q = q.lt('start_time', pageParam);

            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        },
        getNextPageParam: (lastPage) => {
            if (!lastPage || lastPage.length < pageSize) return undefined;
            return lastPage[lastPage.length - 1].start_time;
        },
        initialPageParam: null,
        staleTime: 5 * 60 * 1000,
    });

    const events = useMemo(
        () => query.data?.pages.flatMap(page => page) || [],
        [query.data]
    );

    return { events, ...query };
};

// ─────────────────────────────────────────────────────────────────────────────
// useInfiniteNotifications — Cursor-based notification feed
// ─────────────────────────────────────────────────────────────────────────────
export const useInfiniteNotifications = (userId, pageSize = 25) => {
    const query = useInfiniteQuery({
        queryKey: ['notifications-infinite', userId, pageSize],
        queryFn: async ({ pageParam = null }) => {
            let q = supabase
                .from('notifications')
                .select('id, type, message, is_read, created_at, meta')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(pageSize);

            if (pageParam) q = q.lt('created_at', pageParam);

            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        },
        getNextPageParam: (lastPage) => {
            if (!lastPage || lastPage.length < pageSize) return undefined;
            return lastPage[lastPage.length - 1].created_at;
        },
        initialPageParam: null,
        enabled: !!userId,
        staleTime: 2 * 60 * 1000, // 2min — notifications change more often
    });

    const notifications = useMemo(
        () => query.data?.pages.flatMap(p => p) || [],
        [query.data]
    );

    return { notifications, ...query };
};

// ─────────────────────────────────────────────────────────────────────────────
// useInfiniteMessages — Chat history with cursor-based pagination
// pageSize = 50 (user requirement: load last 50 messages)
// ─────────────────────────────────────────────────────────────────────────────
export const useInfiniteMessages = (chatId, pageSize = 50) => {
    const query = useInfiniteQuery({
        queryKey: ['messages-infinite', chatId, pageSize],
        queryFn: async ({ pageParam = null }) => {
            let q = supabase
                .from('messages')
                .select(`
                    id, content, file_url, file_type, file_name,
                    is_announcement, is_pinned, deleted, parent_id,
                    created_at, edited_at,
                    sender:profiles!sender_id(id, full_name, avatar_url, role)
                `)
                .eq('chat_id', chatId)
                .eq('deleted', false)
                .order('created_at', { ascending: false })
                .limit(pageSize);

            if (pageParam) q = q.lt('created_at', pageParam);

            const { data, error } = await q;
            if (error) throw error;
            // Return in chronological order for display
            return (data || []).reverse();
        },
        getNextPageParam: (_, allPages) => {
            const firstPage = allPages[allPages.length - 1];
            if (!firstPage || firstPage.length < pageSize) return undefined;
            // Oldest message in the chronological-reversed page
            const oldest = firstPage[0];
            return oldest?.created_at;
        },
        initialPageParam: null,
        enabled: !!chatId,
        staleTime: 30 * 1000, // 30s — chat is near-realtime
    });

    const messages = useMemo(
        () => query.data?.pages.flatMap(p => p) || [],
        [query.data]
    );

    return { messages, ...query };
};

// ─────────────────────────────────────────────────────────────────────────────
// useInfiniteAuditLogs — Paginated audit log for Security dashboard
// ─────────────────────────────────────────────────────────────────────────────
export const useInfiniteAuditLogs = (pageSize = 50) => {
    const query = useInfiniteQuery({
        queryKey: ['audit-logs-infinite', pageSize],
        queryFn: async ({ pageParam = null }) => {
            let q = supabase
                .from('audit_logs')
                .select(`
                    id, action, module, target_table, target_id,
                    meta, ip_address, created_at,
                    actor:profiles!actor_id(full_name, email, role)
                `)
                .order('created_at', { ascending: false })
                .limit(pageSize);

            if (pageParam) q = q.lt('created_at', pageParam);

            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        },
        getNextPageParam: (lastPage) => {
            if (!lastPage || lastPage.length < pageSize) return undefined;
            return lastPage[lastPage.length - 1].created_at;
        },
        initialPageParam: null,
        staleTime: 60 * 1000,
    });

    const logs = useMemo(
        () => query.data?.pages.flatMap(p => p) || [],
        [query.data]
    );

    return { logs, ...query };
};

// ─────────────────────────────────────────────────────────────────────────────
// useIntersectionObserver — Infinite scroll trigger (attach to sentinel div)
// Usage: const sentinelRef = useIntersectionObserver(fetchNextPage);
// ─────────────────────────────────────────────────────────────────────────────
export const useIntersectionObserver = (callback, { threshold = 0.1, rootMargin = '100px' } = {}) => {
    const ref = useRef(null);
    const savedCallback = useRef(callback);

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    savedCallback.current();
                }
            },
            { threshold, rootMargin }
        );

        observer.observe(el);
        return () => observer.unobserve(el);
    }, [threshold, rootMargin]);

    return ref;
};

// ─────────────────────────────────────────────────────────────────────────────
// formatBytes — Human-readable file size
// Usage: formatBytes(1536) => "1.5 KB"
// ─────────────────────────────────────────────────────────────────────────────
export const formatBytes = (bytes, decimals = 1) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// usePerformanceTimer — Measures component mount time
// Usage: const { elapsed } = usePerformanceTimer('DashboardLoad');
// ─────────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
export const usePerformanceTimer = (label) => {
    const [startTime] = useState(() => performance.now());
    const [elapsed, setElapsed] = useState(null);

    useEffect(() => {
        const ms = Math.round(performance.now() - startTime);
        // Use a microtask/timeout to avoid synchronous state update in effect warning
        const timeout = setTimeout(() => setElapsed(ms), 0);
        return () => clearTimeout(timeout);
    }, [startTime]);

    return { elapsed };
};
