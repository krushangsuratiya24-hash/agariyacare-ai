import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import { UserRole } from '../../types';
import { PageLoader } from '../ui/index';

// ── Requires authentication ───────────────────────────────────────────────────
export const RequireAuth: React.FC = () => {
  const { user, isInitialized } = useAuthStore();
  const location = useLocation();

  if (!isInitialized) {
    return <PageLoader message="Loading..." />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

// ── Requires specific roles ───────────────────────────────────────────────────
export const RequireRole: React.FC<{ roles: UserRole[] }> = ({ roles }) => {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

// ── Redirects logged-in users away from auth pages ───────────────────────────
export const RedirectIfAuth: React.FC = () => {
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return <PageLoader message="Loading..." />;
  }

  if (user) {
    if (!user.onboarding_completed) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

// ── Onboarding gate ───────────────────────────────────────────────────────────
export const RequireOnboarding: React.FC = () => {
  const { user } = useAuthStore();

  if (!user) return <Navigate to="/login" replace />;

  if (!user.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
};

// ── Unauthorized page ─────────────────────────────────────────────────────────
export const UnauthorizedPage: React.FC = () => {
  const { user } = useAuthStore();
  return (
    <div className="min-h-screen bg-ivory-100 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-charcoal-900 mb-2">Access Denied</h1>
        <p className="text-sm text-charcoal-500 mb-5">
          You don't have permission to view this page.
          {user && ` Your role is: ${user.role}.`}
        </p>
        <a href="/dashboard" className="btn-primary btn-md">Go to Dashboard</a>
      </div>
    </div>
  );
};

// ── Not Found page ────────────────────────────────────────────────────────────
export const NotFoundPage: React.FC = () => (
  <div className="min-h-screen bg-ivory-100 flex items-center justify-center p-4">
    <div className="text-center">
      <p className="text-6xl font-bold text-charcoal-200 mb-4">404</p>
      <h1 className="text-xl font-semibold text-charcoal-900 mb-2">Page not found</h1>
      <p className="text-sm text-charcoal-500 mb-5">The page you're looking for doesn't exist.</p>
      <a href="/dashboard" className="btn-primary btn-md">Go to Dashboard</a>
    </div>
  </div>
);
