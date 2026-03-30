import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

/**
 * Enterprise Chat Hook managing historical fetching, real-time subscription,
 * threaded replies, pinned items, and file attachments.
 */
export const useChat = (chatType, referenceId) => {
    const { user, profile } = useAuthStore();
    const queryClient = useQueryClient();
    const [realtimeMessages, setRealtimeMessages] = useState([]);
    const [realtimeNonce, setRealtimeNonce] = useState(0);
    const channelRef = useRef(null);
    const userId = user?.id;
    const isModerator = ['admin', 'coordinator'].includes(profile?.role);

    const resolveEventOrClubChat = async () => {
        let { data, error } = await supabase
            .from('chats')
            .select('*')
            .eq('type', chatType)
            .eq('reference_id', referenceId)
            .maybeSingle();

        if (error) throw error;
        if (data) return data;

        // Some events were created before the app switched from legacy chat_rooms to chats.
        // When the chat row is missing, try to create it so registered students can enter immediately.
        const fallbackTitle = chatType === 'event' ? 'Event Discussion' : 'Club Discussion';
        const { data: insertedRoom, error: insertError } = await supabase
            .from('chats')
            .insert({ type: chatType, reference_id: referenceId, title: fallbackTitle })
            .select()
            .maybeSingle();

        if (!insertError && insertedRoom) return insertedRoom;

        // If insert is blocked by RLS, re-read once in case another client or trigger created it.
        const { data: rereadRoom, error: rereadError } = await supabase
            .from('chats')
            .select('*')
            .eq('type', chatType)
            .eq('reference_id', referenceId)
            .maybeSingle();

        if (rereadError) throw rereadError;
        return rereadRoom || null;
    };

    // 1. Resolve or Create Chat Room ID based on type and refId
    const { data: chatRoom, isLoading: loadingRoom } = useQuery({
        queryKey: ['chatRoom', chatType, referenceId],
        enabled: !!chatType && !!userId && (chatType === 'broadcast' || !!referenceId),
        staleTime: 5 * 60 * 1000,
        queryFn: async () => {
            if (chatType === 'broadcast') {
                const { data, error } = await supabase
                    .from('chats')
                    .select('*')
                    .eq('type', 'broadcast')
                    .maybeSingle();

                if (error) throw error;
                if (data) return data;

                if (!['admin', 'coordinator'].includes(profile?.role)) {
                    return null;
                }

                const { data: newRoom, error: createErr } = await supabase
                    .from('chats')
                    .insert({ type: 'broadcast', title: 'Campus Announcements' })
                    .select()
                    .single();

                if (createErr) throw createErr;
                return newRoom;
            }

            return resolveEventOrClubChat();
        }
    });

    const chatId = chatRoom?.id;

    // 2. Fetch Historical Messages
    const { data: historicalMessages = [], isLoading: loadingMessages } = useQuery({
        queryKey: ['messages', chatId],
        enabled: !!chatId,
        staleTime: 5 * 60 * 1000,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('messages')
                .select(`
                    id, chat_id, sender_id, content, file_url, file_type, file_name, 
                    is_announcement, is_pinned, deleted, parent_id, created_at, edited_at,
                    profiles:sender_id (full_name, avatar_url, role)
                `)
                .eq('chat_id', chatId)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            return data.reverse(); // Display oldest to newest inside UI container
        }
    });

    // 3. Real-time Subscription Setup
    useEffect(() => {
        if (!chatId) return;

        const channel = supabase.channel(`chat_${chatId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
                async (payload) => {
                    // Fetch profile details for new msg
                    const { data: sender } = await supabase.from('profiles').select('full_name, avatar_url, role').eq('id', payload.new.sender_id).single();
                    const newMsg = { ...payload.new, profiles: sender };
                    setRealtimeMessages(prev => [...prev, newMsg]);
                    queryClient.setQueryData(['messages', chatId], old => {
                        if (!old) return [newMsg];
                        if (old.some(message => message.id === newMsg.id)) return old;
                        return [...old, newMsg];
                    });
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
                (payload) => {
                    // Update both historical and realtime pools
                    setRealtimeMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
                    queryClient.setQueryData(['messages', chatId], old =>
                        old ? old.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m) : old
                    );
                }
            )
            .subscribe((status) => {
                if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
                    toast.error('Chat connection interrupted. Reconnecting...');
                    setRealtimeNonce((value) => value + 1);
                }
            });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) supabase.removeChannel(channelRef.current);
        };
    }, [chatId, queryClient, realtimeNonce]);

    // 4. Mutations
    const sendMessage = useMutation({
        mutationFn: async ({ content, isAnnouncement = false, parentId = null, fileDetails = null }) => {
            if (!userId) throw new Error("Missing chat context");

            // Broadcast messages use the same messages table as the rest of the chat system.
            // This avoids a hard dependency on a separately cached RPC signature in live DB.
            if (chatType === 'broadcast') {
                if (!chatId) throw new Error('Broadcast chat is unavailable right now.');

                const { error } = await supabase.from('messages').insert({
                    chat_id: chatId,
                    sender_id: userId,
                    content,
                    is_announcement: true,
                    parent_id: parentId,
                    file_url: fileDetails?.url,
                    file_type: fileDetails?.type,
                    file_name: fileDetails?.name
                });
                if (error) throw error;
                return;
            }

            if (!chatId) throw new Error("Missing chat context");

            const { error } = await supabase.from('messages').insert({
                chat_id: chatId,
                sender_id: userId,
                content,
                is_announcement: isAnnouncement,
                parent_id: parentId,
                file_url: fileDetails?.url,
                file_type: fileDetails?.type,
                file_name: fileDetails?.name
            });
            if (error) throw error;
        },
        onError: (err) => toast.error(err.message)
    });

    const togglePin = useMutation({
        mutationFn: async ({ messageId, isPinned }) => {
            if (!isModerator) {
                throw new Error('Only coordinators and admins can pin messages.');
            }
            const { error } = await supabase.from('messages').update({ is_pinned: isPinned }).eq('id', messageId);
            if (error) throw error;
        },
        onError: (err) => toast.error("Failed to pin message: " + err.message)
    });

    const deleteMessage = useMutation({
        mutationFn: async (messageId) => {
            const { data: message, error: fetchError } = await supabase
                .from('messages')
                .select('sender_id')
                .eq('id', messageId)
                .single();

            if (fetchError) throw fetchError;

            if (!isModerator && message?.sender_id !== userId) {
                throw new Error('You can only delete your own messages.');
            }

            const { error } = await supabase.from('messages').update({ deleted: true, content: 'This message was deleted' }).eq('id', messageId);
            if (error) throw error;
        },
        onError: (err) => toast.error("Failed to delete message: " + err.message)
    });

    // 5. File Upload Handler
    const uploadFile = async (file) => {
        if (!file) return null;
        if (file.size > 5 * 1024 * 1024) throw new Error("File size must be under 5MB");

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `${chatId}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('chat_attachments').upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('chat_attachments').getPublicUrl(filePath);

        let type = 'document';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type === 'application/pdf') type = 'pdf';

        return { url: data.publicUrl, type, name: file.name };
    };

    // Combine Historical + Realtime avoiding duplicates
    const allMessagesMap = new Map();
    historicalMessages.forEach(m => allMessagesMap.set(m.id, m));
    realtimeMessages
        .filter(message => message.chat_id === chatId)
        .forEach(m => allMessagesMap.set(m.id, { ...allMessagesMap.get(m.id), ...m }));

    // Sort array by created_at
    const displayMessages = Array.from(allMessagesMap.values()).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    return {
        chatRoom,
        messages: displayMessages,
        isLoading: loadingRoom || loadingMessages,
        sendMessage,
        togglePin,
        deleteMessage,
        uploadFile
    };
};
