import { useEffect, useRef } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import { Providers } from '@/app/providers';
import { AppRouter } from '@/app/router';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const hasCheckedInitialRoute = useRef(false);

  useEffect(() => {
    if (hasCheckedInitialRoute.current) return;
    hasCheckedInitialRoute.current = true;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const isCaseRoute = /^\/cases\/[^/]+(?:\/(?:graph|findings))?\/?$/.test(location.pathname);

    if (navigation?.type === 'reload' && isCaseRoute) {
      navigate('/', { replace: true });
    }
  }, [location.pathname, navigate]);

  return <AppRouter />;
}

export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </Providers>
  );
}
