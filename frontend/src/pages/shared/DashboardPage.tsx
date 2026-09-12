import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../context/authStore';
import { ComingSoonCard } from '../../components/ui/index';

// ── Metric Card ───────────────────────────────────────────────────────────────
const MetricCard: React.FC<{
  label: string;
  value: string;
  isEmpty?: boolean;
  emptyLabel?: string;
  icon?: React.ReactNode;
  accent?: string;
}> = ({ label, value, isEmpty, emptyLabel, icon, accent = 'bg-ivory-100' }) => (
  <div className="card card-body">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-2">{label}</p>
        {isEmpty ? (
          <p className="text-sm text-charcoal-400 italic">{emptyLabel}</p>
        ) : (
          <p className="text-2xl font-semibold text-charcoal-900">{value}</p>
        )}
      </div>
      {icon && (
        <div className={`w-9 h-9 rounded-xl ${accent} flex items-center justify-center flex-shrink-0 ml-3`}>
          {icon}
        </div>
      )}
    </div>
  </div>
);

// ── Section container ─────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ title: string; subtitle?: string; badge?: string }> = ({
  title, subtitle, badge,
}) => (
  <div className="flex items-start justify-between mb-3">
    <div>
      <h2 className="section-title">{title}</h2>
      {subtitle && <p className="section-subtitle">{subtitle}</p>}
    </div>
    {badge && <span className="badge-sand">{badge}</span>}
  </div>
);

// ── Worker Dashboard ──────────────────────────────────────────────────────────
export const WorkerDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-semibold text-charcoal-900">
          {t('dashboard.welcome')}, {user?.full_name.split(' ')[0]}
        </h1>
        <p className="text-sm text-charcoal-500 mt-0.5">{t('dashboard.workerTitle')}</p>
      </div>

      {/* Core metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label={t('dashboard.saltAvailable')}
          value=""
          isEmpty
          emptyLabel={t('dashboard.noSaltYet')}
          icon={<svg className="w-5 h-5 text-eucalyptus-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
          accent="bg-eucalyptus-50"
        />
        <MetricCard
          label={t('dashboard.activeListings')}
          value=""
          isEmpty
          emptyLabel={t('dashboard.noListingsYet')}
          icon={<svg className="w-5 h-5 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
          accent="bg-sage-50"
        />
        <MetricCard
          label={t('dashboard.pendingOffers')}
          value=""
          isEmpty
          emptyLabel={t('dashboard.noOffersYet')}
          icon={<svg className="w-5 h-5 text-sand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          accent="bg-sand-50"
        />
        <MetricCard
          label={t('dashboard.totalSales')}
          value=""
          isEmpty
          emptyLabel={t('dashboard.noSalesYet')}
          icon={<svg className="w-5 h-5 text-charcoal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          accent="bg-charcoal-50"
        />
      </div>

      {/* Lower panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Market opportunity */}
        <div className="card card-body">
          <SectionHeader
            title={t('dashboard.marketOpportunity')}
            subtitle="Current market signals"
            badge="Phase 2"
          />
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-ivory-200 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-sm text-charcoal-500">{t('dashboard.noMarketData')}</p>
          </div>
        </div>

        {/* Latest offer */}
        <div className="card card-body">
          <SectionHeader
            title={t('dashboard.latestOffer')}
            badge="Phase 2"
          />
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-ivory-200 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-charcoal-500">{t('dashboard.noRecentOffers')}</p>
          </div>
        </div>

        {/* Today's safety */}
        <div className="card card-body">
          <SectionHeader
            title={t('dashboard.todaySafety')}
            badge="Phase 3"
          />
          <div className="flex items-center gap-3 p-3 bg-eucalyptus-50 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-eucalyptus-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-eucalyptus-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p className="text-sm text-eucalyptus-800 font-medium">{t('dashboard.safetyNormal')}</p>
          </div>
        </div>

        {/* AI assistant */}
        <div className="card card-body">
          <SectionHeader
            title={t('dashboard.aiAssistant')}
            badge="Phase 4"
          />
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-10 h-10 rounded-full bg-ivory-200 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p className="text-sm text-charcoal-500">{t('dashboard.aiComingSoon')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Buyer Dashboard ───────────────────────────────────────────────────────────
export const BuyerDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal-900">
          {t('dashboard.welcome')}, {user?.full_name.split(' ')[0]}
        </h1>
        <p className="text-sm text-charcoal-500 mt-0.5">{t('dashboard.buyerTitle')}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <ComingSoonCard title={t('nav.saltMarket')} phase={2} description="Browse and buy salt from verified Agariya workers" />
        <ComingSoonCard title={t('nav.buyerRequests')} phase={2} description="Post buying requests and receive offers" />
        <ComingSoonCard title={t('nav.aiAssistant')} phase={4} description="AI-powered sourcing assistance" />
      </div>
    </div>
  );
};

// ── Coordinator Dashboard ─────────────────────────────────────────────────────
export const CoordinatorDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal-900">
          {t('dashboard.welcome')}, {user?.full_name.split(' ')[0]}
        </h1>
        <p className="text-sm text-charcoal-500 mt-0.5">{t('dashboard.coordinatorTitle')}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ComingSoonCard title={t('nav.support')} phase={3} description="Manage worker support requests" />
        <ComingSoonCard title={t('nav.healthcare')} phase={3} description="Coordinate healthcare access and camps" />
        <ComingSoonCard title={t('nav.safety')} phase={3} description="Monitor and respond to safety alerts" />
        <ComingSoonCard title={t('nav.community')} phase={3} description="Post community notices and updates" />
      </div>
    </div>
  );
};

// ── Admin Dashboard ───────────────────────────────────────────────────────────
export const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal-900">{t('dashboard.adminTitle')}</h1>
        <p className="text-sm text-charcoal-500 mt-0.5">System overview and management</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="card card-body">
          <h3 className="text-sm font-medium text-charcoal-500 uppercase tracking-wider mb-2">Users</h3>
          <p className="text-2xl font-semibold text-charcoal-900">—</p>
          <p className="text-xs text-charcoal-400 mt-1">Loading…</p>
        </div>
        <ComingSoonCard title={t('nav.marketplace')} phase={2} />
        <ComingSoonCard title={t('nav.analytics')} phase={5} />
      </div>
    </div>
  );
};

// ── Dashboard router ──────────────────────────────────────────────────────────
export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  if (!user) return null;
  switch (user.role) {
    case 'AGARIYA_WORKER': return <WorkerDashboard />;
    case 'BUYER':          return <BuyerDashboard />;
    case 'COORDINATOR':    return <CoordinatorDashboard />;
    case 'ADMIN':          return <AdminDashboard />;
    default:               return <WorkerDashboard />;
  }
};
