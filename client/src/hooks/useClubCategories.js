import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { toast } from 'sonner';

export const useClubCategories = () => {
    return useQuery({
        queryKey: ['clubCategories'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('club_categories')
                .select('*')
                .order('name');
            if (error) throw error;
            return data;
        },
    });
};

export const useAddCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (newCategory) => {
            const { data, error } = await supabase
                .from('club_categories')
                .insert([newCategory])
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clubCategories'] });
            toast.success('Category added successfully');
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });
};

export const useUpdateCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, updates }) => {
            const { data, error } = await supabase
                .from('club_categories')
                .update(updates)
                .eq('id', id)
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clubCategories'] });
            toast.success('Category updated successfully');
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });
};

export const useDeleteCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase
                .from('club_categories')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clubCategories'] });
            toast.success('Category deleted successfully');
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });
};
