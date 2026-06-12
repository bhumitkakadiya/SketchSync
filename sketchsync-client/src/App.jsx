import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppRouter from './router/AppRouter';
import { useAuthStore } from './store/authStore';
import { authService } from './services/authService';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const { setAuth, clearAuth, isInitializing, setInitializing } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await authService.refresh();
        setAuth(res.data.data.user, res.data.data.accessToken);
      } catch (err) {
        clearAuth();
      } finally {
        setInitializing(false);
      }
    };
    initAuth();
  }, [setAuth, clearAuth, setInitializing]);

  if (isInitializing) {
    return (
      <div className="h-screen bg-surface-0 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
    </QueryClientProvider>
  );
}
