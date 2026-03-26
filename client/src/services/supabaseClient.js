import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase URL or Anon Key');
    // Don't throw here to avoid crashing the entire app at module load time
}

// Provides true tab-level isolation: different accounts can exist 
// in sibling tabs without cross-over during testing.
const customStorage = {
    getItem: (key) => {
        if (typeof window === 'undefined') return null;
        return window.sessionStorage.getItem(key);
    },
    setItem: (key, value) => {
        if (typeof window === 'undefined') return;
        window.sessionStorage.setItem(key, value);
    },
    removeItem: (key) => {
        if (typeof window === 'undefined') return;
        window.sessionStorage.removeItem(key);
    }
};

// Fallback to avoid crash, but auth will fail
export const supabase = createClient(
    supabaseUrl || 'https://thvsjqghttadnqzhqskx.supabase.co',
    supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRodnNqcWdodHRhZG5xemhxc2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzOTA0MTMsImV4cCI6MjA4NTk2NjQxM30.h0iUDwhqBgqDw8s-Kd5MMafkkG0Vl97RSMRAn4iQVoQ',
    {
        auth: {
            storageKey: 'clubnexus-auth-token',
            storage: customStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            multiTab: false // CRUCIAL: Disable broadcast channel to prevent tabs from logging each other out
        }
    }
);
