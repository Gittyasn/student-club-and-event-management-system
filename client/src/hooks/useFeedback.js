import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { toast } from 'sonner';

export const useSubmitFeedback = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (feedback) => {
            const { data, error } = await supabase
                .from('feedback')
                .insert(feedback)
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    throw new Error('You have already submitted feedback for this event.');
                }
                throw new Error(error.message);
            }
            return data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['feedback', variables.event_id] });
            queryClient.invalidateQueries({ queryKey: ['hasSubmittedFeedback', variables.event_id, variables.user_id] });
            toast.success('Feedback submitted successfully!');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });
};

export const useEventFeedback = (eventId) => {
    return useQuery({
        queryKey: ['feedback', eventId],
        enabled: !!eventId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('feedback')
                .select('*, profiles(full_name, avatar_url)')
                .eq('event_id', eventId)
                .order('created_at', { ascending: false });

            if (error) throw new Error(error.message);
            return data;
        }
    });
};

export const useCheckFeedback = (eventId, userId) => {
    return useQuery({
        queryKey: ['hasSubmittedFeedback', eventId, userId],
        enabled: !!eventId && !!userId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('feedback')
                .select('*')
                .eq('event_id', eventId)
                .eq('user_id', userId)
                .maybeSingle();

            if (error) throw new Error(error.message);
            return data;
        }
    });
};

export const useMarkFeedbackReviewed = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (feedbackId) => {
            const { data, error } = await supabase
                .from('feedback')
                .update({ is_reviewed: true })
                .eq('id', feedbackId)
                .select()
                .single();

            if (error) throw new Error(error.message);
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['feedback', data.event_id] });
            toast.success('Feedback marked as reviewed');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });
};

export const useAdminFeedbackOverview = () => {
    return useQuery({
        queryKey: ['adminFeedbackOverview'],
        queryFn: async () => {
            // Get all events with feedback counts and average ratings
            const { data: events, error: eventError } = await supabase
                .from('events')
                .select(`
                    id,
                    title,
                    club_id,
                    club:clubs (name),
                    feedback (
                        rating
                    )
                `);

            if (eventError) throw new Error(eventError.message);

            const overview = events.map(event => {
                const feedbacks = event.feedback || [];
                const avgRating = feedbacks.length > 0
                    ? feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length
                    : 0;

                return {
                    id: event.id,
                    title: event.title,
                    clubName: event.club?.name || 'Unknown',
                    feedbackCount: feedbacks.length,
                    averageRating: avgRating
                };
            });

            // Most liked event
            const mostLiked = [...overview].sort((a, b) => b.averageRating - a.averageRating)[0];

            return {
                overview,
                mostLiked
            };
        }
    });
};
