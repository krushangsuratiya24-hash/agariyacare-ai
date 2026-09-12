import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import { ComingSoonCard, Spinner } from '../../components/ui/index';
import {
  dashboardService,
  WorkerDashboardStats,
  BuyerDashboardStats,
} from '../../services/marketplaceService';
import { offerService, WorkerOfferStats, BuyerOfferStats } from '../../services/offerService';

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
  const [stats, setStats] = useState<WorkerDashboardStats | null>(null);
  const [offerStats, setOfferStats] = useState<WorkerOfferStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      dashboardService.getWorkerStats(),
      offerService.getWorkerStats(),
    ]).then(([marketRes, offerRes]) => {
      if (marketRes.status === 'fulfilled' && marketRes.value.success && marketRes.value.data) {
        setStats(marketRes.value.data);
      }
      if (offerRes.status === 'fulfilled' && offerRes.value.success && offerRes.value.data) {
        setOfferStats(offerRes.value.data);
      }
    }).finally(() => setLoading(false));
  }, []);

  const availableKg    = stats ? Number(stats.inventory.available_kg) : 0;
  const activeListings = stats ? Number(stats.listings.active_listings) : 0;
  const totalViews     = stats ? Number(stats.listings.total_views) : 0;
  const activeValue    = stats ? Number(stats.listings.active_value) : 0;
  const pendingOffers  = offerStats ? Number(offerStats.offers.pending_offers) : 0;
  const activeTx       = offerStats ? Number(offerStats.transactions.active_transactions) : 0;

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
      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="md" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label={t('dashboard.saltAvailable')}
              value={`${Number(availableKg).toLocaleString('en-IN')} kg`}
              isEmpty={availableKg === 0}
              emptyLabel={t('dashboard.noSaltYet')}
              icon={<svg className="w-5 h-5 text-eucalyptus-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
              accent="bg-eucalyptus-50"
            />
            <MetricCard
              label={t('dashboard.activeListings')}
              value={String(activeListings)}
              isEmpty={activeListings === 0}
              emptyLabel={t('dashboard.noListingsYet')}
              icon={<svg className="w-5 h-5 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
              accent="bg-sage-50"
            />
            <MetricCard
              label={t('dashboard.totalViews')}
              value={totalViews.toLocaleString('en-IN')}
              isEmpty={totalViews === 0}
              emptyLabel={t('dashboard.noViewsYet')}
              icon={<svg className="w-5 h-5 text-sand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
              accent="bg-sand-50"
            />
            <MetricCard
              label={t('dashboard.activeValue')}
              value={`₹${activeValue.toLocaleString('en-IN')}`}
              isEmpty={activeValue === 0}
              emptyLabel={t('dashboard.noSalesYet')}
              icon={<svg className="w-5 h-5 text-charcoal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
              accent="bg-charcoal-50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/my-offers" className="card card-body hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-2">
                {t('dashboard.pendingOffers')}
              </p>
              {pendingOffers > 0 ? (
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-semibold text-amber-700">{pendingOffers}</p>
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                    {t('dashboard.viewOffers')} →
                  </span>
                </div>
              ) : (
                <p className="text-sm text-charcoal-400 italic">{t('dashboard.noOffersYet')}</p>
              )}
            </Link>
            <Link to="/transactions" className="card card-body hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-2">
                {t('nav.transactions')}
              </p>
              {activeTx > 0 ? (
                <p className="text-2xl font-semibold text-charcoal-900">{activeTx}</p>
              ) : (
                <p className="text-sm text-charcoal-400 italic">{t('dashboard.noSalesYet')}</p>
              )}
            </Link>
          </div>
        </>
      )}

      {/* Lower panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent buyer requests */}
        <div className="card card-body">
          <SectionHeader
            title={t('dashboard.recentBuyerRequests')}
            subtitle={t('dashboard.buyerRequestsSubtitle')}
          />
          {loading ? (
            <div className="flex justify-center py-6"><Spinner size="sm" /></div>
          ) : stats && stats.recent_buyer_requests.length > 0 ? (
            <ul className="space-y-2">
              {stats.recent_buyer_requests.slice(0, 3).map(req => (
                <li key={req.id} className="flex items-center justify-between py-2 border-b border-ivory-200 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-charcoal-800">{req.title || req.salt_type}</p>
                    <p className="text-xs text-charcoal-500">{Number(req.quantity_kg).toLocaleString('en-IN')} kg{req.max_price_per_kg ? ` · ₹${req.max_price_per_kg}/kg max` : ''}</p>
                  </div>
                  <span className="text-xs bg-eucalyptus-50 text-eucalyptus-700 px-2 py-0.5 rounded-full">{req.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-ivory-200 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p className="text-sm text-charcoal-500">{t('dashboard.noBuyerRequests')}</p>
            </div>
          )}
          {stats && stats.recent_buyer_requests.length > 0 && (
            <Link to="/buyer-requests" className="text-xs text-eucalyptus-700 hover:underline mt-2 inline-block">
              {t('dashboard.viewAllRequests')} →
            </Link>
          )}
        </div>

        {/* Quick links */}
        <div className="card card-body">
          <SectionHeader title={t('dashboard.quickActions')} />
          <div className="space-y-2">
            <Link to="/my-salt" className="flex items-center gap-3 p-3 rounded-xl bg-ivory-50 hover:bg-ivory-100 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-eucalyptus-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-eucalyptus-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              </div>
              <span className="text-sm font-medium text-charcoal-800">{t('nav.mySalt')}</span>
            </Link>
            <Link to="/salt-market" className="flex items-center gap-3 p-3 rounded-xl bg-ivory-50 hover:bg-ivory-100 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-sage-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-sage-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <span className="text-sm font-medium text-charcoal-800">{t('nav.saltMarket')}</span>
            </Link>
            <Link to="/create-listing" className="flex items-center gap-3 p-3 rounded-xl bg-ivory-50 hover:bg-ivory-100 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-sand-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-sand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </div>
              <span className="text-sm font-medium text-charcoal-800">{t('listing.createListing')}</span>
            </Link>
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
  const [stats, setStats] = useState<BuyerDashboardStats | null>(null);
  const [offerStats, setOfferStats] = useState<BuyerOfferStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      dashboardService.getBuyerStats(),
      offerService.getBuyerStats(),
    ]).then(([marketRes, offerRes]) => {
      if (marketRes.status === 'fulfilled' && marketRes.value.success && marketRes.value.data) {
        setStats(marketRes.value.data);
      }
      if (offerRes.status === 'fulfilled' && offerRes.value.success && offerRes.value.data) {
        setOfferStats(offerRes.value.data);
      }
    }).finally(() => setLoading(false));
  }, []);

  const savedCount    = stats?.saved_count ?? 0;
  const openRequests  = stats ? Number(stats.requests.open_requests) : 0;
  const pendingOffers = offerStats ? Number(offerStats.offers.pending_offers) : 0;
  const countered     = offerStats ? Number(offerStats.offers.countered_offers) : 0;
  const totalTx       = offerStats ? Number(offerStats.transactions.total_transactions) : 0;

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal-900">
          {t('dashboard.welcome')}, {user?.full_name.split(' ')[0]}
        </h1>
        <p className="text-sm text-charcoal-500 mt-0.5">{t('dashboard.buyerTitle')}</p>
      </div>

      {/* Metrics */}
      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="md" /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <MetricCard
            label={t('dashboard.savedListings')}
            value={String(savedCount)}
            isEmpty={savedCount === 0}
            emptyLabel={t('dashboard.noSavedYet')}
            icon={<svg className="w-5 h-5 text-eucalyptus-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>}
            accent="bg-eucalyptus-50"
          />
          <MetricCard
            label={t('dashboard.openRequests')}
            value={String(openRequests)}
            isEmpty={openRequests === 0}
            emptyLabel={t('dashboard.noRequestsYet')}
            icon={<svg className="w-5 h-5 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            accent="bg-sage-50"
          />
          <div className="card card-body col-span-2 lg:col-span-1">
            <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-3">{t('dashboard.quickActions')}</p>
            <div className="space-y-2">
              <Link to="/salt-market" className="flex items-center gap-2 text-sm text-eucalyptus-700 hover:underline">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                {t('nav.saltMarket')}
              </Link>
              <Link to="/my-offers" className="flex items-center gap-2 text-sm text-eucalyptus-700 hover:underline">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                {t('nav.myOffers')}
                {(pendingOffers > 0 || countered > 0) && (
                  <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                    {pendingOffers + countered}
                  </span>
                )}
              </Link>
              <Link to="/transactions" className="flex items-center gap-2 text-sm text-eucalyptus-700 hover:underline">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                {t('nav.transactions')}
                {totalTx > 0 && (
                  <span className="ml-auto text-xs bg-eucalyptus-100 text-eucalyptus-700 px-1.5 py-0.5 rounded-full">
                    {totalTx}
                  </span>
                )}
              </Link>
              <Link to="/saved-listings" className="flex items-center gap-2 text-sm text-eucalyptus-700 hover:underline">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                {t('nav.savedListings')}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Recent listings */}
      <div className="card card-body">
        <SectionHeader
          title={t('dashboard.recentListings')}
          subtitle={t('dashboard.recentListingsSubtitle')}
        />
        {loading ? (
          <div className="flex justify-center py-6"><Spinner size="sm" /></div>
        ) : stats && stats.recent_listings.length > 0 ? (
          <ul className="space-y-2">
            {stats.recent_listings.slice(0, 4).map(listing => (
              <li key={listing.id} className="flex items-center justify-between py-2 border-b border-ivory-200 last:border-0">
                <div>
                  <p className="text-sm font-medium text-charcoal-800">{listing.salt_type}</p>
                  <p className="text-xs text-charcoal-500">{Number(listing.quantity_kg).toLocaleString('en-IN')} kg · {listing.location}</p>
                </div>
                <Link to={`/salt-market/${listing.id}`} className="text-xs text-eucalyptus-700 font-medium hover:underline">
                  ₹{listing.price_per_kg}/kg
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-charcoal-500">{t('dashboard.noRecentListings')}</p>
            <Link to="/salt-market" className="text-sm text-eucalyptus-700 hover:underline mt-2">{t('dashboard.browseMarket')}</Link>
          </div>
        )}
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
