import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import authService from '../services/authService';

export const useAuthStore = create(
    persist(
        (set) => ({
            user: null,
            profile: null,
            role: null,
            loading: true,
            isAdmin: false,
            isCoordinator: false,
            isStudent: false,

            setAuth: (user, profile) => set({
                user,
                profile,
                role: profile?.role || null,
                isAdmin: profile?.role === 'admin',
                isCoordinator: profile?.role === 'coordinator',
                isStudent: profile?.role === 'student',
                loading: false
            }),

            setLoading: (loading) => set({ loading }),

            checkAuth: async () => {
                // If we already have a profile in state (from persist), don't set loading to true
                // This prevents the full-screen flicker on app start
                set((state) => ({ loading: !state.profile }));

                try {
                    const data = await authService.getCurrentUser();
                    if (data) {
                        const { user, profile } = data;
                        set({
                            user,
                            profile,
                            role: profile?.role || null,
                            isAdmin: profile?.role === 'admin',
                            isCoordinator: profile?.role === 'coordinator',
                            isStudent: profile?.role === 'student',
                        });
                    } else {
                        set({ user: null, profile: null, role: null, isAdmin: false, isCoordinator: false, isStudent: false });
                    }
                } catch (error) {
                    console.error('Check auth error:', error);
                    set({ user: null, profile: null, role: null, isAdmin: false, isCoordinator: false, isStudent: false });
                } finally {
                    set({ loading: false });
                }
            },

            logout: async () => {
                await authService.logout();
                set({
                    user: null,
                    profile: null,
                    role: null,
                    isAdmin: false,
                    isCoordinator: false,
                    isStudent: false,
                    loading: false
                });
                // Clean up session storage
                sessionStorage.removeItem('clubnexus-auth-storage');
            },
        }),
        {
            name: 'clubnexus-auth-storage',
            storage: createJSONStorage(() => sessionStorage),
            partialize: (state) => ({
                user: state.user,
                profile: state.profile,
                role: state.role,
                isAdmin: state.isAdmin,
                isCoordinator: state.isCoordinator,
                isStudent: state.isStudent
            }),
        }
    )
);

