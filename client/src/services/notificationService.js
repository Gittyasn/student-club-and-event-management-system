import { supabase } from './supabaseClient';

export const sendNotification = async ({
    user_id,
    type = 'info',
    title = 'Notification',
    message,
    related_id = null,
    related_type = null,
}) => {
    const { data, error } = await supabase.rpc('dispatch_notification', {
        p_user_id: user_id,
        p_type: type,
        p_title: title,
        p_message: message,
        p_related_id: related_id,
        p_related_type: related_type,
    });

    if (error) throw error;
    return data;
};

export const sendNotifications = async (notifications) => {
    for (const notification of notifications) {
        await sendNotification(notification);
    }
};
