import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../context/authStore';
import { userService } from '../../services/userService';
import { Spinner } from '../ui/index';
import toast from 'react-hot-toast';

type WorkerOption = 'sellSalt' | 'findBuyers' | 'askAI' | 'healthcare' | 'safety' | 'welfare';

const WORKER_OPTIONS: WorkerOption[] = ['sellSalt', 'findBuyers', 'askAI', 'healthcare', 'safety', 'welfare'];

const OPTION_ICONS: Record<WorkerOption, React.ReactNode> = {
  sellSalt:   <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  findBuyers: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  askAI:      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
  healthcare: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
  safety:     <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  welfare:    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>,
};

export const OnboardingPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<WorkerOption | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await userService.completeOnboarding();
      updateUser({ onboarding_completed: true });
      toast.success(t('onboarding.complete') + '!');
      navigate('/dashboard');
    } catch {
      toast.error('Failed to complete onboarding');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-eucalyptus-700 flex items-center justify-center">
              <span className="text-white text-lg font-bold">A</span>
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-charcoal-900 mb-2">
            {t('onboarding.title')}, {user?.full_name.split(' ')[0]}!
          </h1>
          <p className="text-charcoal-500 text-sm">{t('onboarding.subtitle')}</p>
        </div>

        {/* Options grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {WORKER_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setSelected(opt)}
              className={`flex flex-col items-center gap-3 p-5 rounded-2xl border text-center transition-all duration-150 ${
                selected === opt
                  ? 'border-eucalyptus-500 bg-eucalyptus-50 shadow-soft'
                  : 'border-ivory-200 bg-white hover:border-eucalyptus-300 hover:bg-ivory-50'
              }`}
            >
              <div className={`transition-colors ${selected === opt ? 'text-eucalyptus-700' : 'text-charcoal-500'}`}>
                {OPTION_ICONS[opt]}
              </div>
              <div>
                <div className={`text-sm font-semibold mb-0.5 ${selected === opt ? 'text-eucalyptus-800' : 'text-charcoal-800'}`}>
                  {t(`onboarding.options.${opt}`)}
                </div>
                <div className="text-xs text-charcoal-500 leading-snug">
                  {t(`onboarding.descriptions.${opt}`)}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleComplete}
            className="btn-primary btn-lg w-full sm:w-auto sm:min-w-[200px]"
            disabled={isLoading}
          >
            {isLoading ? <Spinner size="sm" /> : t('onboarding.complete')}
          </button>
          <button
            onClick={handleComplete}
            className="text-sm text-charcoal-400 hover:text-charcoal-600 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};
