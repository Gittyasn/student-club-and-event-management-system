import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { toast } from 'sonner';
import { validateFile } from '../utils/validation';

const normalizeEventPayload = (eventPayload = {}) => {
    const normalized = {
        ...eventPayload,
    };

    if (normalized.start_time) {
        normalized.date = String(normalized.start_time).includes('T')
            ? String(normalized.start_time).slice(0, 10)
            : new Date(normalized.start_time).toISOString().slice(0, 10);
    }

    delete normalized.min_team_size;
    delete normalized.max_team_size;

    return normalized;
};

export const useEventMutations = () => {
    const queryClient = useQueryClient();

    const createEvent = useMutation({
        mutationFn: async (newEvent) => {
            const normalizedEvent = {
                ...normalizeEventPayload(newEvent),
                approval_status: newEvent.approval_status || (newEvent.status === 'draft' ? 'draft' : 'pending')
            };

            const { data, error } = await supabase
                .from('events')
                .insert([normalizedEvent])
                .select()
                .single();

            if (error) throw error;

            // Auto-create live event chat channel used by the current chat UI.
            const { error: chatError } = await supabase
                .from('chats')
                .insert({ type: 'event', reference_id: data.id, title: `${data.title || 'Event'} Discussion` });

            if (chatError) {
                console.error('Error creating event chat:', chatError);
                toast.error('Event created, but event chat setup failed.');
            }

            // Legacy room creation kept for older code paths that still read chat_rooms.
            const { error: legacyChatError } = await supabase
                .from('chat_rooms')
                .insert({ event_id: data.id });

            if (legacyChatError) {
                console.error('Error creating legacy chat room:', legacyChatError);
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['coordinatorStats'] });
            toast.success('Event and chat room created');
        },
        onError: (error) => {
            toast.error(`Error creating event: ${error.message}`);
        }
    });

    const updateEvent = useMutation({
        mutationFn: async ({ id, updates }) => {
            const normalizedUpdates = normalizeEventPayload(updates);
            const { data, error } = await supabase
                .from('events')
                .update(normalizedUpdates)
                .eq('id', id)
                .select('*')
                .maybeSingle();

            if (error) throw error;
            if (!data) {
                throw new Error('Database policy blocked this event update. Apply the latest events RLS migration, then try saving again.');
            }

            return data;
        },
        onSuccess: async (updatedEvent) => {
            queryClient.setQueriesData({ queryKey: ['events'] }, (existingEvents) => {
                if (!Array.isArray(existingEvents)) return existingEvents;

                return existingEvents.map((event) => (
                    event.id === updatedEvent.id
                        ? { ...event, ...updatedEvent }
                        : event
                ));
            });

            queryClient.setQueriesData({ queryKey: ['event'] }, (existingEvent) => {
                if (!existingEvent || Array.isArray(existingEvent)) return existingEvent;
                if (existingEvent.id !== updatedEvent.id) return existingEvent;
                return { ...existingEvent, ...updatedEvent };
            });

            await queryClient.invalidateQueries({ queryKey: ['events'], refetchType: 'all' });
            await queryClient.invalidateQueries({ queryKey: ['event'], refetchType: 'all' });
            toast.success('Event updated successfully');
        },
        onError: (error) => {
            toast.error(`Error updating event: ${error.message}`);
        }
    });

    const deleteEvent = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['coordinatorStats'] });
            toast.success('Event deleted successfully');
        },
        onError: (error) => {
            toast.error(`Error deleting event: ${error.message}`);
        }
    });

    const uploadPoster = async (file) => {
        // Validation
        const validation = validateFile(file, 'image');
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('event-posters')
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('event-posters')
            .getPublicUrl(filePath);

        return data.publicUrl;
    };

    return { createEvent, updateEvent, deleteEvent, uploadPoster };
};
