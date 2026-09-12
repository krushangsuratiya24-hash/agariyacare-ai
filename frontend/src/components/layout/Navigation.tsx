import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../context/authStore';
import { UserRole } from '../../types';

interface NavItem {
  key: string;
  label: string;
  path: string;
  phase?: number;
  icon: React.ReactNode;
}

// ── Icons (inline SVG, no external dep) ──────────────────────────────────────
const Icon = {
  Dashboard: () => <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" /></svg>,
  Salt: () => <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  Market: () => <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  Offers: () => <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  Sales: () => <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  Health: () => <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
  Safety: () => <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  Welfare: () => <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  Community: () => <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>,
  AI: () => <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
  Users: () => <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  Analytics: () => <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  Purchases: () => <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>,
  Bookmark: () => <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>,
  Support: () => <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
};

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  AGARIYA_WORKER: [
    { key: 'dashboard',     label: 'nav.dashboard',     path: '/dashboard',     icon: <Icon.Dashboard /> },
    { key: 'mySalt',        label: 'nav.mySalt',        path: '/my-salt',       phase: 2, icon: <Icon.Salt /> },
    { key: 'saltMarket',    label: 'nav.saltMarket',    path: '/salt-market',   phase: 2, icon: <Icon.Market /> },
    { key: 'myOffers',      label: 'nav.myOffers',      path: '/my-offers',     icon: <Icon.Offers /> },
    { key: 'transactions',  label: 'nav.transactions',  path: '/transactions',  icon: <Icon.Sales /> },
    { key: 'healthcare',    label: 'nav.healthcare',    path: '/healthcare',    phase: 3, icon: <Icon.Health /> },
    { key: 'safety',        label: 'nav.safety',        path: '/safety',        phase: 3, icon: <Icon.Safety /> },
    { key: 'welfare',       label: 'nav.welfare',       path: '/welfare',       phase: 3, icon: <Icon.Welfare /> },
    { key: 'community',     label: 'nav.community',     path: '/community',     phase: 3, icon: <Icon.Community /> },
    { key: 'aiAssistant',   label: 'nav.aiAssistant',   path: '/ai',            phase: 4, icon: <Icon.AI /> },
  ],
  BUYER: [
    { key: 'dashboard',      label: 'nav.dashboard',      path: '/dashboard',         icon: <Icon.Dashboard /> },
    { key: 'saltMarket',     label: 'nav.saltMarket',     path: '/salt-market',       phase: 2, icon: <Icon.Market /> },
    { key: 'buyerRequests',  label: 'nav.buyerRequests',  path: '/buyer-requests',    phase: 2, icon: <Icon.Offers /> },
    { key: 'myOffers',       label: 'nav.myOffers',       path: '/my-offers',         icon: <Icon.Offers /> },
    { key: 'transactions',   label: 'nav.transactions',   path: '/transactions',      icon: <Icon.Purchases /> },
    { key: 'savedListings',  label: 'nav.savedListings',  path: '/saved-listings',    phase: 2, icon: <Icon.Bookmark /> },
    { key: 'aiAssistant',    label: 'nav.aiAssistant',    path: '/ai',                phase: 4, icon: <Icon.AI /> },
  ],
  COORDINATOR: [
    { key: 'dashboard',   label: 'nav.dashboard',   path: '/dashboard',  icon: <Icon.Dashboard /> },
    { key: 'support',     label: 'nav.support',     path: '/support',    phase: 3, icon: <Icon.Support /> },
    { key: 'healthcare',  label: 'nav.healthcare',  path: '/healthcare', phase: 3, icon: <Icon.Health /> },
    { key: 'safety',      label: 'nav.safety',      path: '/safety',     phase: 3, icon: <Icon.Safety /> },
    { key: 'community',   label: 'nav.community',   path: '/community',  phase: 3, icon: <Icon.Community /> },
  ],
  ADMIN: [
    { key: 'dashboard',    label: 'nav.dashboard',    path: '/dashboard',    icon: <Icon.Dashboard /> },
    { key: 'users',        label: 'nav.users',        path: '/admin/users',  icon: <Icon.Users /> },
    { key: 'marketplace',  label: 'nav.marketplace',  path: '/admin/marketplace', phase: 2, icon: <Icon.Market /> },
    { key: 'offers',       label: 'nav.offers',       path: '/admin/offers',      phase: 2, icon: <Icon.Offers /> },
    { key: 'transactions', label: 'nav.transactions', path: '/admin/transactions',phase: 2, icon: <Icon.Sales /> },
    { key: 'welfare',      label: 'nav.welfare',      path: '/admin/welfare',     phase: 3, icon: <Icon.Welfare /> },
    { key: 'healthcare',   label: 'nav.healthcare',   path: '/admin/healthcare',  phase: 3, icon: <Icon.Health /> },
    { key: 'safety',       label: 'nav.safety',       path: '/admin/safety',      phase: 3, icon: <Icon.Safety /> },
    { key: 'analytics',    label: 'nav.analytics',    path: '/admin/analytics',   phase: 5, icon: <Icon.Analytics /> },
  ],
};

// ── Sidebar ───────────────────────────────────────────────────────────────────
export const Sidebar: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) return null;
  const items = NAV_ITEMS[user.role] || [];

  return (
    <nav className="flex flex-col h-full py-4 overflow-y-auto scrollbar-thin">
      {/* Brand */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-eucalyptus-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-charcoal-900">AgariyaCare</div>
            <div className="text-xs text-charcoal-400">AI Platform</div>
          </div>
        </div>
      </div>

      {/* Navigation items */}
      <div className="flex-1 px-2 space-y-0.5">
        {items.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          const isComingSoon = item.phase !== undefined;

          return (
            <NavLink
              key={item.key}
              to={isComingSoon ? '#' : item.path}
              onClick={(e) => {
                if (isComingSoon) e.preventDefault();
                onClose?.();
              }}
              className={({ isActive: routerActive }) =>
                isActive && !isComingSoon
                  ? 'nav-item-active block'
                  : isComingSoon
                  ? 'nav-item opacity-50 cursor-not-allowed block'
                  : routerActive
                  ? 'nav-item-active block'
                  : 'nav-item block'
              }
            >
              <span className="w-4.5 h-4.5 flex-shrink-0">{item.icon}</span>
              <span className="flex-1 truncate">{t(item.label)}</span>
              {isComingSoon && (
                <span className="text-xs text-charcoal-400 font-normal ml-auto">P{item.phase}</span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* User info */}
      <div className="mt-4 px-2 pt-4 border-t border-ivory-200">
        <NavLink
          to="/profile"
          onClick={onClose}
          className={({ isActive }) => isActive ? 'nav-item-active block' : 'nav-item block'}
        >
          <div className="w-6 h-6 rounded-full bg-eucalyptus-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-semibold text-eucalyptus-700">
                {user.full_name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-charcoal-800 truncate">{user.full_name}</div>
            <div className="text-xs text-charcoal-400 truncate">{t(`auth.roles.${user.role}`)}</div>
          </div>
        </NavLink>
      </div>
    </nav>
  );
};

// ── Bottom Mobile Nav ─────────────────────────────────────────────────────────
export const BottomNav: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) return null;

  const mobileItems: Record<UserRole, NavItem[]> = {
    AGARIYA_WORKER: [
      { key: 'dashboard',    label: 'nav.dashboard',    path: '/dashboard',    icon: <Icon.Dashboard /> },
      { key: 'mySalt',       label: 'nav.mySalt',       path: '/my-salt',      phase: 2, icon: <Icon.Salt /> },
      { key: 'saltMarket',   label: 'nav.saltMarket',   path: '/salt-market',  phase: 2, icon: <Icon.Market /> },
      { key: 'myOffers',     label: 'nav.myOffers',     path: '/my-offers',    icon: <Icon.Offers /> },
      { key: 'transactions', label: 'nav.transactions', path: '/transactions', icon: <Icon.Sales /> },
    ],
    BUYER: [
      { key: 'dashboard',    label: 'nav.dashboard',    path: '/dashboard',    icon: <Icon.Dashboard /> },
      { key: 'saltMarket',   label: 'nav.saltMarket',   path: '/salt-market',  phase: 2, icon: <Icon.Market /> },
      { key: 'myOffers',     label: 'nav.myOffers',     path: '/my-offers',    icon: <Icon.Offers /> },
      { key: 'transactions', label: 'nav.transactions', path: '/transactions', icon: <Icon.Purchases /> },
    ],
    COORDINATOR: [
      { key: 'dashboard',  label: 'nav.dashboard',  path: '/dashboard', icon: <Icon.Dashboard /> },
      { key: 'support',    label: 'nav.support',    path: '/support',   phase: 3, icon: <Icon.Support /> },
      { key: 'healthcare', label: 'nav.healthcare', path: '/healthcare',phase: 3, icon: <Icon.Health /> },
    ],
    ADMIN: [
      { key: 'dashboard', label: 'nav.dashboard', path: '/dashboard',   icon: <Icon.Dashboard /> },
      { key: 'users',     label: 'nav.users',     path: '/admin/users', icon: <Icon.Users /> },
    ],
  };

  const items = mobileItems[user.role] || [];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-ivory-200 safe-area-pb">
      <div className="flex items-stretch">
        {items.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          const isComingSoon = item.phase !== undefined;

          return (
            <NavLink
              key={item.key}
              to={isComingSoon ? '#' : item.path}
              onClick={(e) => { if (isComingSoon) e.preventDefault(); }}
              className="flex-1 flex flex-col items-center justify-center py-2.5 px-1 gap-0.5 min-h-[56px]"
            >
              <span className={isActive ? 'text-eucalyptus-700' : isComingSoon ? 'text-charcoal-300' : 'text-charcoal-400'}>
                {item.icon}
              </span>
              <span className={`text-xs truncate max-w-full ${isActive ? 'text-eucalyptus-700 font-semibold' : isComingSoon ? 'text-charcoal-300' : 'text-charcoal-500'}`}>
                {t(item.label)}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
