import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../context/authStore';
import { userService } from '../../services/userService';
import toast from 'react-hot-toast';

export const TopNav: React.FC<{
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
}> = ({ onMenuToggle, showMenuButton }) => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success(t('auth.logout') + ' successful');
    navigate('/login');
  };

  const toggleLang = () => {
    const next = i18n.language === 'en' ? 'gu' : 'en';
    i18n.changeLanguage(next);
    if (user) {
      // Sync to user preference (fire and forget)
      userService.updateProfile({ language_pref: next as 'en' | 'gu' }).catch(() => {});
    }
  };

  return (
    <header className="h-14 flex items-center justify-between px-4 sm:px-6 bg-white border-b border-ivory-200 flex-shrink-0">
      {/* Left: Menu button (mobile) + brand */}
      <div className="flex items-center gap-3">
        {showMenuButton && (
          <button
            onClick={onMenuToggle}
            className="p-2 -ml-2 rounded-lg text-charcoal-600 hover:bg-ivory-100 transition-colors lg:hidden"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2">
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-charcoal-600 hover:bg-ivory-100 border border-ivory-200 transition-colors"
          title="Switch language"
        >
          {i18n.language === 'en' ? 'ગુ' : 'EN'}
        </button>

        {/* User menu */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-ivory-100 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-eucalyptus-100 flex items-center justify-center overflow-hidden">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-eucalyptus-700">
                    {user.full_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="hidden sm:block text-sm font-medium text-charcoal-700 max-w-[120px] truncate">
                {user.full_name.split(' ')[0]}
              </span>
              <svg className="w-4 h-4 text-charcoal-400 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-ivory-200 rounded-xl shadow-float z-30 py-1 animate-slide-down">
                  <Link
                    to="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-charcoal-700 hover:bg-ivory-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {t('nav.profile')}
                  </Link>
                  <hr className="my-1 border-ivory-200" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {t('auth.logout')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
