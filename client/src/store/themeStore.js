import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'dark',
      toggleTheme: () =>
        set((state) => {
          const next = state.theme === 'dark' ? 'light' : 'dark';
          document.documentElement.classList.remove('dark', 'light');
          document.documentElement.classList.add(next);
          return { theme: next };
        }),
      applyTheme: (theme) => {
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(theme);
      },
    }),
    { name: 'theme-store', partialize: (s) => ({ theme: s.theme }) }
  )
);
