import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

export const useNotificationStore = create((set, get) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    preferences: null,

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
        const channel = supabase
            .channel(`notifications:enterprise:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    get().addNotification(payload.new);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }
}));
