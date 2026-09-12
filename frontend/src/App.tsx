import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './i18n';
import { useAuthStore } from './context/authStore';

// Layout
import { AppLayout } from './components/layout/AppLayout';

// Auth
import { LoginPage, SignupPage } from './components/auth/AuthPages';
import {
  RequireAuth, RequireOnboarding, RedirectIfAuth,
  UnauthorizedPage, NotFoundPage,
} from './components/auth/Guards';

// Onboarding
import { OnboardingPage } from './components/onboarding/OnboardingPage';

// Profile
import { ProfilePage } from './components/profile/ProfilePage';

// Dashboard
import { DashboardPage } from './pages/shared/DashboardPage';

// Phase 2 — Marketplace pages
import { MySaltPage } from './pages/MySaltPage';
import { CreateListingPage } from './pages/CreateListingPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { ListingDetailPage } from './pages/ListingDetailPage';
import { BuyerRequestsPage } from './pages/BuyerRequestsPage';
import { SavedListingsPage } from './pages/SavedListingsPage';

// Phase 3 — Offers & Transactions
import { WorkerOffersPage } from './pages/WorkerOffersPage';
import { BuyerOffersPage } from './pages/BuyerOffersPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { TransactionDetailPage } from './pages/TransactionDetailPage';

// Placeholder pages
import { PlaceholderPage } from './pages/shared/PlaceholderPage';

// Smart router: worker sees WorkerOffersPage, buyer sees BuyerOffersPage
const OffersRouter: React.FC = () => {
  const { user } = useAuthStore();
  if (user?.role === 'AGARIYA_WORKER') return <WorkerOffersPage />;
  return <BuyerOffersPage />;
};

const App: React.FC = () => {
  const { initialize, isInitialized } = useAuthStore();

  useEffect(() => {
    initialize();
    // Handle auth:expired event
    const handler = () => {
      useAuthStore.getState().setUser(null);
      useAuthStore.getState().setToken(null);
    };
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#fff',
            color: '#262626',
            border: '1px solid #e9dfcc',
            borderRadius: '12px',
            fontSize: '14px',
            boxShadow: '0 4px 16px -2px rgba(0,0,0,0.10)',
          },
          success: {
            iconTheme: { primary: '#346b4e', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#dc2626', secondary: '#fff' },
          },
        }}
      />
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Auth pages — redirect if already logged in */}
        <Route element={<RedirectIfAuth />}>
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        {/* Onboarding — requires auth but not onboarding completion */}
        <Route element={<RequireAuth />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>

        {/* App pages — requires auth + onboarding */}
        <Route element={<RequireAuth />}>
          <Route element={<RequireOnboarding />}>
            <Route element={<AppLayout />}>
              {/* Dashboard */}
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Profile */}
              <Route path="/profile" element={<ProfilePage />} />

              {/* Worker pages — Phase 2 */}
              <Route path="/my-salt"          element={<MySaltPage />} />
              <Route path="/create-listing"   element={<CreateListingPage />} />
              <Route path="/salt-market"      element={<MarketplacePage />} />
              <Route path="/salt-market/:id"  element={<ListingDetailPage />} />
              <Route path="/my-sales"         element={<PlaceholderPage titleKey="nav.mySales" phase={2} />} />

              {/* Buyer pages — Phase 2 */}
              <Route path="/buyer-requests"   element={<BuyerRequestsPage />} />
              <Route path="/purchases"        element={<PlaceholderPage titleKey="nav.purchases" phase={2} />} />
              <Route path="/saved-listings"   element={<SavedListingsPage />} />

              {/* Phase 3 — Offers & Transactions */}
              <Route path="/my-offers"          element={<OffersRouter />} />
              <Route path="/offers"             element={<OffersRouter />} />
              <Route path="/offers/:id"         element={<OffersRouter />} />
              <Route path="/transactions"       element={<TransactionsPage />} />
              <Route path="/transactions/:id"   element={<TransactionDetailPage />} />

              {/* Phase 3 — Coming features */}
              <Route path="/healthcare" element={<PlaceholderPage titleKey="nav.healthcare" phase={3} />} />
              <Route path="/safety"     element={<PlaceholderPage titleKey="nav.safety"     phase={3} />} />
              <Route path="/welfare"    element={<PlaceholderPage titleKey="nav.welfare"    phase={3} />} />
              <Route path="/community"  element={<PlaceholderPage titleKey="nav.community"  phase={3} />} />
              <Route path="/support"    element={<PlaceholderPage titleKey="nav.support"    phase={3} />} />

              {/* Phase 4 */}
              <Route path="/ai" element={<PlaceholderPage titleKey="nav.aiAssistant" phase={4} />} />

              {/* Admin routes */}
              <Route path="/admin/users"        element={<PlaceholderPage titleKey="nav.users"        phase={1} />} />
              <Route path="/admin/marketplace"  element={<PlaceholderPage titleKey="nav.marketplace"  phase={2} />} />
              <Route path="/admin/offers"       element={<PlaceholderPage titleKey="nav.offers"       phase={2} />} />
              <Route path="/admin/transactions" element={<PlaceholderPage titleKey="nav.transactions" phase={2} />} />
              <Route path="/admin/welfare"      element={<PlaceholderPage titleKey="nav.welfare"      phase={3} />} />
              <Route path="/admin/healthcare"   element={<PlaceholderPage titleKey="nav.healthcare"   phase={3} />} />
              <Route path="/admin/safety"       element={<PlaceholderPage titleKey="nav.safety"       phase={3} />} />
              <Route path="/admin/analytics"    element={<PlaceholderPage titleKey="nav.analytics"    phase={5} />} />
            </Route>
          </Route>
        </Route>

        {/* Error pages */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="*"             element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
