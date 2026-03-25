import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

const DEFAULT_FEATURES = [
    { feature_key: 'dropout_detection', is_enabled: true, description: 'Detect at-risk students based on participation patterns.' },
    { feature_key: 'engagement_prediction', is_enabled: true, description: 'Predict engagement outcomes for events and clubs.' },
    { feature_key: 'sentiment_analysis', is_enabled: true, description: 'Analyze student feedback sentiment trends.' },
];

export const useGlobalAIGovernance = () =>
    useQuery({
        queryKey: ['ai-governance-global'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('ai_governance_features')
                .select('feature_key, is_enabled, description');

            // Fallback to safe defaults if table doesn't exist yet.
            if (error || !data) return DEFAULT_FEATURES;
            return data.length ? data : DEFAULT_FEATURES;
        },
        staleTime: 60 * 1000,
    });

export const useToggleAIFeature = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ featureKey, isEnabled }) => {
            const payload = {
                feature_key: featureKey,
                is_enabled: Boolean(isEnabled),
            };

            const { error } = await supabase
                .from('ai_governance_features')
                .upsert(payload, { onConflict: 'feature_key' });

            // Swallow mutation failures to avoid breaking UI where backend schema is incomplete.
            if (error) return { ok: false, error };
            return { ok: true };
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-governance-global'] });
        },
    });
};

