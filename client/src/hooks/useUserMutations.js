import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { toast } from 'sonner';

export const useUserMutations = () => {
    const queryClient = useQueryClient();

    const updateUser = useMutation({
        mutationFn: async ({ id, updates }) => {
            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['clubs'] });
            toast.success('User updated successfully');
        },
        onError: (error) => {
            toast.error(`Error updating user: ${error.message}`);
        }
    });

    return { updateUser };
};
