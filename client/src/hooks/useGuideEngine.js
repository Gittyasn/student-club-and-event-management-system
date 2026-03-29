import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

const DEFAULT_FEATURES = [
    { feature_key: 'event_recommendations', is_enabled: true, description: 'Suggest relevant events based on clubs, attendance, and interest patterns.' },
    { feature_key: 'club_recommendations', is_enabled: true, description: 'Suggest clubs that match a student’s department and activity history.' },
    { feature_key: 'engagement_prediction', is_enabled: true, description: 'Estimate engagement trends from registrations, attendance, and certificates.' },
    { feature_key: 'attendance_prediction', is_enabled: true, description: 'Forecast likely turnout for upcoming events.' },
    { feature_key: 'smart_scheduling', is_enabled: true, description: 'Highlight timing conflicts and better scheduling windows.' },
    { feature_key: 'sentiment_analysis', is_enabled: true, description: 'Summarize feedback sentiment from students and attendees.' },
    { feature_key: 'dropout_detection', is_enabled: true, description: 'Detect students who repeatedly register but do not attend.' },
    { feature_key: 'automated_summary', is_enabled: true, description: 'Generate short event and engagement summaries for staff.' },
];

const GOVERNANCE_TABLES = ['ai_governance', 'ai_governance_features'];

const normalizeFeatures = (rows = []) =>
    rows.map((row) => ({
        feature_key: row.feature_key,
        is_enabled: row.is_enabled !== false,
        description: row.description || 'AI feature setting.',
    }));

const readGovernanceFromSource = async (tableName) => {
    const { data, error } = await supabase
        .from(tableName)
        .select('feature_key, is_enabled, description')
        .order('feature_key', { ascending: true });

    if (error) throw error;

    return {
        features: normalizeFeatures(data),
        source: tableName,
        isFallback: false,
        error: null,
    };
};

const readGovernanceConfig = async () => {
    let lastError = null;

    for (const tableName of GOVERNANCE_TABLES) {
        try {
            const result = await readGovernanceFromSource(tableName);
            if (result.features.length) return result;
        } catch (error) {
            lastError = error;
        }
    }

    return {
        features: DEFAULT_FEATURES,
        source: 'defaults',
        isFallback: true,
        error: lastError,
    };
};

const writeGovernanceFeature = async ({ featureKey, isEnabled }) => {
    const payload = {
        feature_key: featureKey,
        is_enabled: Boolean(isEnabled),
    };

    let lastError = null;

    for (const tableName of GOVERNANCE_TABLES) {
        const { error } = await supabase
            .from(tableName)
            .upsert(payload, { onConflict: 'feature_key' });

        if (!error) {
            return { ok: true, source: tableName };
        }

        lastError = error;
    }

    return { ok: false, error: lastError };
};

export const useGlobalAIGovernance = () =>
    useQuery({
        queryKey: ['ai-governance-global'],
        queryFn: readGovernanceConfig,
        staleTime: 60 * 1000,
    });

export const useToggleAIFeature = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: writeGovernanceFeature,
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-governance-global'] });
        },
    });
};
