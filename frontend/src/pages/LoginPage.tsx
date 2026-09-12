import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Wheat } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function LoginPage() {
  const { login, loginAsDemo } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || t.auth.loginError);
    } finally {
      setLoading(false);
    }
  }

  async function handleDemo(role: 'worker' | 'buyer' | 'coordinator' | 'admin') {
    setDemoLoading(role);
    setError('');
    try {
      await loginAsDemo(role);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setDemoLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-ivory-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 bg-eucalyptus-600 rounded-xl flex items-center justify-center">
              <Wheat size={22} className="text-white" />
            </div>
            <div className="text-left">
              <div className="text-lg font-bold text-charcoal-800">AgariyaCare AI</div>
              <div className="text-xs text-charcoal-500">Sell Better. Work Safer.</div>
            </div>
          </Link>
        </div>

        <div className="card">
          <h1 className="text-xl font-bold text-charcoal-900 mb-1">{t.auth.login}</h1>
          <p className="text-sm text-charcoal-500 mb-6">Sign in to your account to continue</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">{t.auth.email}</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                placeholder="your@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="input-label">{t.auth.password}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Signing in…' : t.auth.login}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-charcoal-500">
            {t.auth.noAccount}{' '}
            <Link to="/signup" className="text-eucalyptus-600 font-medium hover:underline">
              {t.auth.createAccount}
            </Link>
          </div>
        </div>

        {/* Demo accounts */}
        <div className="mt-4 card">
          <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wide mb-3">
            {t.auth.orContinueWith}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(['worker', 'buyer', 'coordinator', 'admin'] as const).map(role => (
              <button
                key={role}
                onClick={() => handleDemo(role)}
                disabled={!!demoLoading}
                className="btn-secondary btn-sm flex items-center justify-center gap-1.5 text-xs"
              >
                {demoLoading === role && <Loader2 size={12} className="animate-spin" />}
                {{
                  worker: '🧂 Worker',
                  buyer: '🏢 Buyer',
                  coordinator: '👥 Coordinator',
                  admin: '⚙️ Admin',
                }[role]}
              </button>
            ))}
          </div>
          <p className="text-xs text-charcoal-400 mt-2 text-center">Development demo accounts</p>
        </div>
      </div>
    </div>
  );
}
