import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { applyTheme } from './theme/theme-store';
import { AuthProvider } from './auth/AuthProvider';
import { ToastProvider } from './components/ToastProvider';
import { TooltipProvider } from './components/ui/Tooltip';

applyTheme(
  (() => {
    try {
      const raw = localStorage.getItem('logo-platform-theme');
      if (!raw) return 'dark';
      const parsed = JSON.parse(raw) as { state?: { theme?: 'dark' | 'light' } };
      return parsed.state?.theme === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  })(),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (failureCount >= 3) return false;
        if (error instanceof TypeError) return true;
        return failureCount < 1;
      },
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </TooltipProvider>
  </QueryClientProvider>,
);
