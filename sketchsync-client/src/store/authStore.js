import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isInitializing: true,

      setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),
      updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),
      setInitializing: (isInitializing) => set({ isInitializing }),
    }),
    {
      name: 'auth-store',
      // Only persist user info, NOT the access token (security)
      partialize: (state) => ({ user: state.user }),
    }
  )
);
