import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { toast } from 'sonner';
import { validateFile } from '../utils/validation';

export const useEventMutations = () => {
    const queryClient = useQueryClient();

    const createEvent = useMutation({
        mutationFn: async (newEvent) => {
            const normalizedEvent = {
                ...newEvent,
                approval_status: newEvent.approval_status || (newEvent.status === 'draft' ? 'draft' : 'pending')
            };

            const { data, error } = await supabase
                .from('events')
                .insert([normalizedEvent])
                .select()
                .single();

            if (error) throw error;

            // Auto-create chat room
            const { error: chatError } = await supabase
                .from('chat_rooms')
                .insert({ event_id: data.id });

            if (chatError) {
                console.error('Error creating chat room:', chatError);
                toast.error('Event created, but chat room failed.');
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
            const { data, error } = await supabase
                .from('events')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
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
