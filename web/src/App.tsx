import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Loading } from '@/components/ui';
import { ForceChangePasswordPage, ForgotPasswordPage, LoginPage, ResetPasswordPage } from '@/pages/shared/AuthPages';
import { NotFoundPage } from '@/pages/shared/NotFound';
import { portal as admin } from '@/portals/admin';
import { portal as partner } from '@/portals/partner';
import { portal as school } from '@/portals/school';
import { portal as teacher } from '@/portals/teacher';
import { portal as student } from '@/portals/student';
import { portal as parent } from '@/portals/parent';
import { PORTAL_BASE, type Portal } from '@/portals/types';

const PORTALS: Portal[] = [admin, partner, school, teacher, student, parent];

function Guard({ portal, children }: { portal: Portal; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading label="Loading…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (user.role !== portal.role) return <Navigate to={PORTAL_BASE[user.role]} replace />;
  return <>{children}</>;
}

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <Loading label="Loading…" />;
  return <Navigate to={user ? PORTAL_BASE[user.role] : '/login'} replace />;
}

export default function App() {
  const { user, loading } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={!loading && user ? <Navigate to={PORTAL_BASE[user.role]} replace /> : <LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/change-password" element={loading ? <Loading /> : user ? <ForceChangePasswordPage /> : <Navigate to="/login" replace />} />
      {PORTALS.map((p) => (
        <Route
          key={p.base}
          path={p.base}
          element={
            <Guard portal={p}>
              <AppLayout portal={p} />
            </Guard>
          }
        >
          {p.routes
            // A portal's own route wins over a shared route with the same path
            .filter((r, i, all) => all.findIndex((x) => x.path === r.path) === i)
            .map((r) => (r.path === '' ? <Route key="index" index element={r.element} /> : <Route key={r.path} path={r.path} element={r.element} />))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      ))}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
