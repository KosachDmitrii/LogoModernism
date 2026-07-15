import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { useT } from '../i18n';

export function ProtectedRoute() {
  const { session, profile, loading } = useAuth();
  const location = useLocation();
  const t = useT();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-zinc-950 text-zinc-400">
        {t('auth.loading')}
      </div>
    );
  }
  if (!session || !profile) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
