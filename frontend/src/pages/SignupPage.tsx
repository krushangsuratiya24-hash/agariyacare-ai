import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Wheat } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function SignupPage() {
  const { signup } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'worker' as 'worker' | 'buyer' | 'coordinator',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await signup({ email: form.email, password: form.password, name: form.name, role: form.role, phone: form.phone });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || t.auth.signupError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ivory-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3">
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
          <h1 className="text-xl font-bold text-charcoal-900 mb-1">{t.auth.createAccount}</h1>
          <p className="text-sm text-charcoal-500 mb-6">Join thousands of Agariya salt workers</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">{t.auth.role}</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="input-field"
              >
                <option value="worker">🧂 {t.auth.worker}</option>
                <option value="buyer">🏢 {t.auth.buyer}</option>
                <option value="coordinator">👥 {t.auth.coordinator}</option>
              </select>
            </div>

            <div>
              <label className="input-label">{t.auth.name}</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="input-field"
                placeholder="Your full name"
                required
              />
            </div>

            <div>
              <label className="input-label">{t.auth.email}</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="input-field"
                placeholder="your@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="input-label">{t.auth.phone} <span className="text-charcoal-400">(optional)</span></label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="input-field"
                placeholder="9876543210"
              />
            </div>

            <div>
              <label className="input-label">{t.auth.password}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="input-field pr-10"
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400"
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
              {loading ? 'Creating account…' : t.auth.createAccount}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-charcoal-500">
            {t.auth.haveAccount}{' '}
            <Link to="/login" className="text-eucalyptus-600 font-medium hover:underline">
              {t.auth.login}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
