import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  Home, User, Heart, TrendingUp, FileText, ShieldAlert, Users,
  BarChart2, MessageSquare, Info, Bell, Globe, LogOut, Menu, X,
  Wheat, Package, ShoppingCart, DollarSign, BookOpen, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { notificationsApi } from '../services/api';

function useNavItems(role: string) {
  const { t } = useLanguage();

  const workerNav = [
    { to: '/dashboard', icon: Home, label: t.nav.dashboard },
    { to: '/my-salt', icon: Package, label: t.nav.mySalt },
    { to: '/market', icon: ShoppingCart, label: t.nav.market },
    { to: '/my-offers', icon: DollarSign, label: t.nav.myOffers },
    { to: '/my-sales', icon: BarChart2, label: t.nav.mySales },
    { to: '/healthcare', icon: Heart, label: t.nav.healthcare },
    { to: '/safety', icon: ShieldAlert, label: t.nav.safety },
    { to: '/welfare', icon: FileText, label: t.nav.welfare },
    { to: '/community', icon: Users, label: t.nav.community },
    { to: '/ai-assistant', icon: MessageSquare, label: t.nav.aiAssistant },
  ];

  const buyerNav = [
    { to: '/dashboard', icon: Home, label: t.nav.dashboard },
    { to: '/market', icon: ShoppingCart, label: t.nav.market },
    { to: '/buyer-requests', icon: BookOpen, label: t.nav.buyerRequests },
    { to: '/my-offers', icon: DollarSign, label: t.nav.myOffers },
    { to: '/my-sales', icon: BarChart2, label: t.nav.purchases },
    { to: '/saved-listings', icon: TrendingUp, label: t.nav.savedListings },
    { to: '/ai-assistant', icon: MessageSquare, label: t.nav.aiAssistant },
  ];

  const coordNav = [
    { to: '/dashboard', icon: Home, label: t.nav.dashboard },
    { to: '/market', icon: ShoppingCart, label: t.nav.market },
    { to: '/healthcare', icon: Heart, label: t.nav.healthcare },
    { to: '/safety', icon: ShieldAlert, label: t.nav.safety },
    { to: '/community', icon: Users, label: t.nav.community },
    { to: '/welfare', icon: FileText, label: t.nav.welfare },
    { to: '/ai-assistant', icon: MessageSquare, label: t.nav.aiAssistant },
  ];

  const adminNav = [
    { to: '/dashboard', icon: Home, label: t.nav.dashboard },
    { to: '/market', icon: ShoppingCart, label: t.nav.market },
    { to: '/analytics', icon: BarChart2, label: t.nav.analytics },
    { to: '/healthcare', icon: Heart, label: t.nav.healthcare },
    { to: '/safety', icon: ShieldAlert, label: t.nav.safety },
    { to: '/welfare', icon: FileText, label: t.nav.welfare },
    { to: '/community', icon: Users, label: t.nav.community },
    { to: '/ai-assistant', icon: MessageSquare, label: t.nav.aiAssistant },
  ];

  if (role === 'buyer') return buyerNav;
  if (role === 'coordinator') return coordNav;
  if (role === 'admin') return adminNav;
  return workerNav;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const navItems = useNavItems(currentUser?.role ?? 'worker');

  useEffect(() => {
    if (currentUser?.id) {
      notificationsApi.getUnread(currentUser.id)
        .then(r => setUnreadCount((r.data as any[])?.length ?? 0))
        .catch(() => {});
    }
  }, [currentUser?.id]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="min-h-screen bg-ivory-100 flex">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-60 bg-eucalyptus-900 text-white flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:flex
      `}>
        {/* Branding */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-eucalyptus-700">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-eucalyptus-400 rounded-lg flex items-center justify-center flex-shrink-0">
              <Wheat size={16} className="text-eucalyptus-900" />
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-none">AgariyaCare AI</div>
              <div className="text-xs text-eucalyptus-300 mt-0.5 leading-none">Salt Platform</div>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-eucalyptus-300 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* User badge */}
        {currentUser && (
          <div className="px-5 py-3 border-b border-eucalyptus-700/50">
            <div className="flex items-center gap-3">
              {currentUser.profilePhoto ? (
                <img src={currentUser.profilePhoto} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-eucalyptus-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium text-white truncate">{currentUser.name}</div>
                <div className="text-xs text-eucalyptus-300 capitalize">{currentUser.role}</div>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                  isActive ? 'nav-item-active' : 'nav-item'
                }`
              }
            >
              <item.icon size={15} className="flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-eucalyptus-700/50 p-3 space-y-1">
          <button
            onClick={() => setLanguage(language === 'en' ? 'gu' : 'en')}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-eucalyptus-200 hover:text-white hover:bg-eucalyptus-700/50 rounded-lg transition-colors"
          >
            <Globe size={14} />
            {language === 'en' ? 'ગુજ' : 'EN'}
          </button>
          <NavLink
            to="/profile"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-eucalyptus-200 hover:text-white hover:bg-eucalyptus-700/50 rounded-lg transition-colors"
          >
            <User size={14} />
            {t.nav.profile}
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-eucalyptus-200 hover:text-white hover:bg-red-700/50 rounded-lg transition-colors"
          >
            <LogOut size={14} />
            {t.nav.logout}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-ivory-200 px-4 py-3 flex items-center justify-between lg:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-charcoal-500 hover:text-charcoal-800 p-1"
            >
              <Menu size={20} />
            </button>
            <div className="lg:hidden text-base font-bold text-eucalyptus-800">AgariyaCare AI</div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'gu' : 'en')}
              className="hidden lg:flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-charcoal-200 text-charcoal-600 hover:bg-ivory-200 transition-colors"
            >
              <Globe size={12} />
              {language === 'en' ? 'ગુ' : 'EN'}
            </button>

            {/* Notifications */}
            <NavLink
              to="/notifications"
              className="relative p-2 rounded-lg text-charcoal-500 hover:text-charcoal-800 hover:bg-ivory-200 transition-colors"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>

            {/* SOS */}
            <a
              href="tel:108"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
            >
              <AlertTriangle size={12} />
              SOS 108
            </a>

            {/* AI shortcut */}
            <NavLink
              to="/ai-assistant"
              className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-eucalyptus-600 text-white hover:bg-eucalyptus-700 transition-colors"
            >
              <MessageSquare size={12} />
              AI
            </NavLink>

            {/* Profile */}
            <NavLink to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              {currentUser?.profilePhoto ? (
                <img src={currentUser.profilePhoto} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-eucalyptus-600 flex items-center justify-center text-xs font-bold text-white">
                  {initials}
                </div>
              )}
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
