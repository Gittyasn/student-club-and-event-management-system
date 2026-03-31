import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

export const useNotificationStore = create((set, get) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    preferences: null,

    belongsToUser: (notification, userId) => {
        if (!notification || !userId) return false;
        return String(notification.user_id) === String(userId);
    },

    fetchNotifications: async (userId) => {
        set({ loading: true });
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(100); // Expanded limit for enterprise center

        if (!error && data) {
            set({
                notifications: data,
                unreadCount: data.filter(n => !n.is_read).length,
                loading: false
            });
        } else {
            console.error("Error fetching notifications:", error);
            set({ loading: false });
        }
    },

    fetchPreferences: async (userId) => {
        const { data, error } = await supabase
            .from('user_notification_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();
        if (!error && data) {
            set({ preferences: data });
        }
    },

    updatePreferences: async (userId, newPrefs) => {
        const { error } = await supabase
            .from('user_notification_preferences')
            .update(newPrefs)
            .eq('user_id', userId);

        if (!error) {
            set({ preferences: { ...get().preferences, ...newPrefs } });
        } else {
            throw error;
        }
    },

    markAsRead: async (id) => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (!error) {
            const notifications = get().notifications.map(n =>
                n.id === id ? { ...n, is_read: true } : n
            );
            set({
                notifications,
                unreadCount: notifications.filter(n => !n.is_read).length
            });
        }
    },

    markAllAsRead: async (userId) => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (!error) {
            const notifications = get().notifications.map(n => ({ ...n, is_read: true }));
            set({
                notifications,
                unreadCount: 0
            });
        }
    },

    deleteNotification: async (id) => {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (!error) {
            const notifications = get().notifications.filter(n => n.id !== id);
            set({
                notifications,
                unreadCount: notifications.filter(n => !n.is_read).length
            });
        }
    },

    addNotification: (notification) => {
        const currentNotifications = get().notifications;
        if (currentNotifications.some(n => n.id === notification.id)) return;

        const notifications = [notification, ...currentNotifications].slice(0, 100);
        set({
            notifications,
            unreadCount: notifications.filter(n => !n.is_read).length
        });
    },

    updateNotification: (notification) => {
        const notifications = get().notifications.map(n =>
            n.id === notification.id ? { ...n, ...notification } : n
        );
        set({
            notifications,
            unreadCount: notifications.filter(n => !n.is_read).length
        });
    },

    removeNotification: (notificationId) => {
        const notifications = get().notifications.filter(n => n.id !== notificationId);
        set({
            notifications,
            unreadCount: notifications.filter(n => !n.is_read).length
        });
    },

    broadcastNotification: async (title, message, targetRole = 'all', targetClubId = null) => {
        const { error } = await supabase.rpc('create_broadcast_notification', {
            p_title: title,
            p_message: message,
            p_target_role: targetRole,
            p_target_club_id: targetClubId
        });
        if (error) throw error;
    },

    subscribeToNotifications: (userId) => {
        let active = true;
        let channel = null;
        let retryTimeout = null;
        let refreshInterval = null;

        const clearRetry = () => {
            if (retryTimeout) {
                clearTimeout(retryTimeout);
                retryTimeout = null;
            }
        };

        const clearRefresh = () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
                refreshInterval = null;
            }
        };

        const startRefreshFallback = () => {
            if (refreshInterval) return;
            refreshInterval = setInterval(() => {
                if (!active) return;
                get().fetchNotifications(userId);
            }, 15000);
        };

        const scheduleReconnect = () => {
            if (!active || retryTimeout) return;
            retryTimeout = setTimeout(async () => {
                retryTimeout = null;
                if (!active) return;
                if (channel) {
                    try { await supabase.removeChannel(channel); } catch { /* ignore */ }
                    channel = null;
                }
                get().fetchNotifications(userId);
                connect();
            }, 1500);
        };

        const connect = () => {
            if (!active) return;

            channel = supabase
                .channel(`notifications:enterprise:${userId}:${Date.now()}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications'
                    },
                    (payload) => {
                        if (get().belongsToUser(payload.new, userId)) {
                            get().addNotification(payload.new);
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'notifications'
                    },
                    (payload) => {
                        if (get().belongsToUser(payload.new, userId)) {
                            get().updateNotification(payload.new);
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'DELETE',
                        schema: 'public',
                        table: 'notifications'
                    },
                    (payload) => {
                        if (get().belongsToUser(payload.old, userId)) {
                            get().removeNotification(payload.old.id);
                        }
                    }
                );

            channel.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    clearRetry();
                    clearRefresh();
                    get().fetchNotifications(userId);
                    return;
                }

                if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
                    startRefreshFallback();
                    scheduleReconnect();
                }
            });
        };

        connect();

        return () => {
            active = false;
            clearRetry();
            clearRefresh();
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }
}));
