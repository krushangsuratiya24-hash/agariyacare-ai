import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../context/authStore';
import { Alert, Spinner } from '../ui/index';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch {
      // error handled by store
    }
  };

  return (
    <AuthShell>
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-charcoal-900 mb-1">{t('auth.loginTitle')}</h1>
        <p className="text-sm text-charcoal-500 mb-7">{t('auth.loginSubtitle')}</p>

        {error && (
          <div className="mb-4">
            <Alert type="error" message={error} onClose={clearError} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">{t('auth.email')}</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label !mb-0">{t('auth.password')}</label>
              <span className="text-xs text-charcoal-400">{t('auth.forgotPassword')}</span>
            </div>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn-primary btn-md w-full mt-1" disabled={isLoading}>
            {isLoading ? <Spinner size="sm" /> : t('auth.login')}
          </button>
        </form>

        <p className="text-sm text-center text-charcoal-500 mt-6">
          {t('auth.noAccount')}{' '}
          <Link to="/signup" className="text-eucalyptus-700 font-medium hover:underline">
            {t('auth.signup')}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
};

export const SignupPage: React.FC = () => {
  const { t } = useTranslation();
  const { signup, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    role: 'AGARIYA_WORKER',
    language_pref: 'en',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await signup(form);
      toast.success('Account created!');
      navigate('/onboarding');
    } catch {
      // error handled by store
    }
  };

  const roles = ['AGARIYA_WORKER', 'BUYER', 'COORDINATOR'] as const;

  return (
    <AuthShell>
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-charcoal-900 mb-1">{t('auth.signupTitle')}</h1>
        <p className="text-sm text-charcoal-500 mb-6">{t('auth.signupSubtitle')}</p>

        {error && (
          <div className="mb-4">
            <Alert type="error" message={error} onClose={clearError} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">{t('auth.fullName')}</label>
            <input
              type="text"
              className="input"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Raman Agariya"
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="label">{t('auth.email')}</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="label">{t('auth.phone')} <span className="text-charcoal-400 font-normal">({t('common.optional')})</span></label>
            <input
              type="tel"
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </div>
          <div>
            <label className="label">{t('auth.password')}</label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">{t('auth.role')}</label>
            <div className="grid grid-cols-1 gap-2">
              {roles.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    form.role === r
                      ? 'border-eucalyptus-500 bg-eucalyptus-50'
                      : 'border-ivory-300 bg-white hover:border-eucalyptus-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={form.role === r}
                    onChange={() => setForm({ ...form, role: r })}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    form.role === r ? 'border-eucalyptus-600' : 'border-charcoal-300'
                  }`}>
                    {form.role === r && <div className="w-2 h-2 rounded-full bg-eucalyptus-600" />}
                  </div>
                  <span className="text-sm font-medium text-charcoal-800">{t(`auth.roles.${r}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary btn-md w-full" disabled={isLoading}>
            {isLoading ? <Spinner size="sm" /> : t('auth.signup')}
          </button>
        </form>

        <p className="text-sm text-center text-charcoal-500 mt-6">
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="text-eucalyptus-700 font-medium hover:underline">
            {t('auth.login')}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
};

// ── Auth shell layout ─────────────────────────────────────────────────────────
const AuthShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-ivory-100 flex">
    {/* Left panel — brand */}
    <div className="hidden lg:flex flex-col justify-between w-2/5 xl:w-1/3 bg-eucalyptus-800 p-12">
      <div>
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <span className="text-white text-lg font-bold">A</span>
          </div>
          <span className="text-white text-lg font-semibold">AgariyaCare AI</span>
        </div>
        <h2 className="text-3xl font-semibold text-white leading-snug mb-4">
          Sell Better.<br />Work Safer.<br />Live Better.
        </h2>
        <p className="text-eucalyptus-200 text-sm leading-relaxed">
          A platform built for Agariya salt-pan workers in the Little Rann of Kutch,
          connecting them to buyers, healthcare, and welfare support.
        </p>
      </div>
      <div className="space-y-3">
        {[
          { label: 'Salt Marketplace', desc: 'Reach verified buyers across Gujarat' },
          { label: 'IBM Granite AI', desc: 'Intelligent assistance in Gujarati & English' },
          { label: 'Healthcare & Safety', desc: 'Protect your health and livelihood' },
        ].map((item) => (
          <div key={item.label} className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-eucalyptus-600 flex items-center justify-center mt-0.5 flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-white">{item.label}</div>
              <div className="text-xs text-eucalyptus-300">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Right panel — form */}
    <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
      {children}
    </div>
  </div>
);
