import { supabase } from './supabaseClient';

/**
 * Authentication Service
 * Blueprints: Authenticate users, Assign roles, Control access, Protect routes, Integrate with Supabase Auth + RLS
 */
const authService = {
    /**
     * Sign up a new user
     */
    async register({ email, password, fullName, department, year }) {
        const assignedRole = 'student';
        const parsedYear = Number.isFinite(parseInt(year, 10)) ? parseInt(year, 10) : null;

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
                emailRedirectTo: `${window.location.origin}/login`
            }
        });

        if (authError) {
            const message = authError.message?.toLowerCase?.() || '';
            if (message.includes('already registered') || authError.status === 422) {
                throw new Error('An account with this email already exists. Please sign in instead.');
            }
            throw authError;
        }

        if (authData?.user) {
            const user = authData.user;
            // Create profile in the public.profiles table using upsert to handle partial registration
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert([
                    {
                        id: user.id,
                        email,
                        full_name: fullName,
                        role: assignedRole,
                        department,
                        year: parsedYear,
                        account_status: 'active'
                    },
                ], { onConflict: 'id' });

            if (profileError) {
                console.error('Profile upsert error:', profileError);
                throw profileError;
            }

            // Ensure the user is signed out after registration
            await supabase.auth.signOut();
        }

        return authData;
    },

    /**
     * Sign in with email and password
     */
    async login({ email, password }) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) throw authError;

        if (authData.user) {
            const isVerified = Boolean(authData.user.email_confirmed_at || authData.user.confirmed_at);
            if (!isVerified) {
                await supabase.auth.signOut();
                throw new Error('Email not verified. Please verify your email to continue.');
            }

            // Fetch profile and check status
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, email, full_name, role, department, year, account_status, club_id, avatar_url, phone, bio, social_links, login_history')
                .eq('id', authData.user.id)
                .maybeSingle();

            if (profileError) throw profileError;

            if (!profile) {
                // If profile doesn't exist, we can't check status. 
                // However, logically there should be a profile.
                // We'll proceed but without the status check.
                return { user: authData.user, profile: null };
            }

            if (profile.account_status !== 'active') {
                await supabase.auth.signOut();
                throw new Error(`Account restricted: Your account is currently ${profile.account_status}.`);
            }

            // Update last login and history
            await this.updateLoginMetadata(authData.user.id, profile.login_history || []);

            return { user: authData.user, profile };
        }

        return authData;
    },

    /**
     * Update login metadata (last_login and login_logs)
     */
    async updateLoginMetadata(userId, currentHistory) {
        const now = new Date().toISOString();

        // Update profile
        await supabase.from('profiles').update({
            last_login: now,
            login_history: [
                ...currentHistory,
                { last_login: now, method: 'password' }
            ].slice(-10)
        }).eq('id', userId);

        // Add to login_logs
        try {
            await supabase.from('login_logs').insert({
                profile_id: userId,
                status: 'success',
                user_agent: window.navigator.userAgent
            });
        } catch (e) {
            console.error('Failed to log login event:', e);
        }
    },

    /**
     * Sign out
     */
    async logout() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    /**
     * Get current session and profile
     */
    async getCurrentUser() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return null;

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, role, department, year, account_status, club_id, avatar_url, phone, bio, social_links')
            .eq('id', session.user.id)
            .maybeSingle();

        if (error) {
            console.error('Error fetching profile:', error);
            return { user: session.user, profile: null };
        }

        return { user: session.user, profile };
    },

    /**
     * Password Reset Request
     */
    async resetPassword(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
    },

    /**
     * Update Password
     */
    async updatePassword(newPassword) {
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });
        if (error) throw error;
    },

    /**
     * Resend email verification
     */
    async resendVerification(email) {
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email
        });
        if (error) throw error;
    },

    /**
     * Sign in with Google (OAuth)
     */
    async signInWithGoogle() {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            },
        });
        if (error) throw error;
    }
};

export default authService;
