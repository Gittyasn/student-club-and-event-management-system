import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { toast } from 'sonner';

export const useClubMutations = () => {
    const queryClient = useQueryClient();

    const createClub = useMutation({
        mutationFn: async (newClub) => {
            const { data, error } = await supabase
                .from('clubs')
                .insert([newClub])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clubs'] });
            toast.success('Club created successfully');
        },
        onError: (error) => {
            toast.error(`Error creating club: ${error.message}`);
        }
    });

    const updateClub = useMutation({
        mutationFn: async ({ id, updates }) => {
            const { data, error } = await supabase
                .from('clubs')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clubs'] });
            toast.success('Club updated successfully');
        },
        onError: (error) => {
            toast.error(`Error updating club: ${error.message}`);
        }
    });

    const deleteClub = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase
                .from('clubs')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clubs'] });
            toast.success('Club deleted successfully');
        },
        onError: (error) => {
            toast.error(`Error deleting club: ${error.message}`);
        }
    });

    return { createClub, updateClub, deleteClub };
};
