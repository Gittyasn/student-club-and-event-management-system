
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './globals.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5 minutes — most event/club data doesn't change second-to-second
      staleTime: 5 * 60 * 1000,
      // Keep in cache for 10 minutes after component unmounts
      gcTime: 10 * 60 * 1000,
      // Don't re-fetch just because the user tabbed away
      refetchOnWindowFocus: false,
      // Single retry with exponential backoff — avoids hammering Supabase on network hiccup
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      // Don't throw errors to React's error boundary by default; let queries handle gracefully
      throwOnError: false,
    },
    mutations: {
      // Mutations should not retry automatically to prevent duplicate writes
      retry: 0,
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Failed to find the root element');
} else {
  createRoot(rootElement).render(
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
