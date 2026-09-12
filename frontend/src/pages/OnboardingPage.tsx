import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, Bot, Heart, Shield, FileText, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { authApi } from '../services/api';

const GOALS = [
  { id: 'sell', icon: Package, label: 'Sell My Salt', labelGu: 'મારું મીઠું વેચો', color: 'bg-eucalyptus-50 border-eucalyptus-200 text-eucalyptus-700' },
  { id: 'buyers', icon: ShoppingCart, label: 'Find Better Buyers', labelGu: 'વધારે ખરીદદારો', color: 'bg-eucalyptus-50 border-eucalyptus-200 text-eucalyptus-700' },
  { id: 'ai', icon: Bot, label: 'Ask AI', labelGu: 'AI ને પૂછો', color: 'bg-sage-50 border-sage-200 text-sage-700' },
  { id: 'healthcare', icon: Heart, label: 'Healthcare', labelGu: 'આરોગ્ય', color: 'bg-red-50 border-red-200 text-red-600' },
  { id: 'safety', icon: Shield, label: 'Safety', labelGu: 'સુરક્ષા', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { id: 'welfare', icon: FileText, label: 'Welfare', labelGu: 'કલ્યાણ', color: 'bg-purple-50 border-purple-200 text-purple-700' },
];

export default function OnboardingPage() {
  const { currentUser, refreshUser } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [yearsOfWork, setYearsOfWork] = useState('');
  const [saltProduction, setSaltProduction] = useState('');
  const [saving, setSaving] = useState(false);

  function toggleGoal(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  }

  async function finish() {
    setSaving(true);
    try {
      if (currentUser?.role === 'worker' && (village || district || yearsOfWork)) {
        await authApi.updateWorkerProfile({
          village: village || undefined,
          district: district || undefined,
          yearsOfWork: yearsOfWork ? parseInt(yearsOfWork) : undefined,
          saltProductionTonnesPerSeason: saltProduction ? parseFloat(saltProduction) : undefined,
        });
      }
      await authApi.completeOnboarding();
      await refreshUser();
      const dest = selected.includes('sell') || selected.includes('buyers') ? '/market' : '/dashboard';
      navigate(dest);
    } catch {
      navigate('/dashboard');
    } finally {
      setSaving(false);
    }
  }

  const gu = language === 'gu';

  return (
    <div className="min-h-screen bg-ivory-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-eucalyptus-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🧂</span>
          </div>
          <h1 className="text-xl font-bold text-charcoal-900">AgariyaCare AI</h1>
          <p className="text-sm text-charcoal-500 mt-1">{gu ? 'સ્વાગત છે' : 'Welcome'}, {currentUser?.name?.split(' ')[0]}</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 rounded-full transition-all ${s === step ? 'w-8 bg-eucalyptus-600' : s < step ? 'w-5 bg-eucalyptus-300' : 'w-5 bg-charcoal-200'}`} />
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-charcoal-100 shadow-sm p-6">
          {step === 1 && (
            <>
              <h2 className="text-lg font-semibold text-charcoal-900 mb-1">
                {gu ? 'આપને શેમાં મદદ જોઈએ છે?' : 'What would you like help with?'}
              </h2>
              <p className="text-sm text-charcoal-500 mb-5">
                {gu ? 'એક કે વધારે પસંદ કરો' : 'Select one or more that apply to you.'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {GOALS.map(g => {
                  const Icon = g.icon;
                  const active = selected.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      onClick={() => toggleGoal(g.id)}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium ${active ? 'border-eucalyptus-500 bg-eucalyptus-50 text-eucalyptus-700' : 'border-charcoal-100 bg-white text-charcoal-700 hover:border-eucalyptus-200'}`}
                    >
                      {active && <Check size={14} className="absolute top-2 right-2 text-eucalyptus-600" />}
                      <Icon size={22} />
                      <span className="text-center leading-tight">{gu ? g.labelGu : g.label}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setStep(2)}
                className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
              >
                {gu ? 'આગળ' : 'Continue'} <ArrowRight size={16} />
              </button>
            </>
          )}

          {step === 2 && currentUser?.role === 'worker' && (
            <>
              <h2 className="text-lg font-semibold text-charcoal-900 mb-1">
                {gu ? 'તમારા વિશે જણાવો' : 'Tell us about yourself'}
              </h2>
              <p className="text-sm text-charcoal-500 mb-5">
                {gu ? 'આ માહિતી AI ને વધારે ઉપયોગી બનાવે છે' : 'This helps AgariyaCare AI give you better answers.'}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="label">{gu ? 'ગામ' : 'Village'}</label>
                  <input className="input" placeholder={gu ? 'ગામ નું નામ' : 'Your village name'} value={village} onChange={e => setVillage(e.target.value)} />
                </div>
                <div>
                  <label className="label">{gu ? 'જિલ્લો' : 'District'}</label>
                  <input className="input" placeholder="e.g. Surendranagar" value={district} onChange={e => setDistrict(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">{gu ? 'મીઠું કામના વર્ષ' : 'Years of salt work'}</label>
                    <input className="input" type="number" placeholder="e.g. 10" value={yearsOfWork} onChange={e => setYearsOfWork(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">{gu ? 'ઉત્પાદન (ટન/સિઝન)' : 'Production (tonnes/season)'}</label>
                    <input className="input" type="number" placeholder="e.g. 50" value={saltProduction} onChange={e => setSaltProduction(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">{gu ? 'પાછા' : 'Back'}</button>
                <button onClick={() => setStep(3)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {gu ? 'આગળ' : 'Continue'} <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}

          {(step === 2 && currentUser?.role !== 'worker') && (
            <>{setStep(3)}</>
          )}

          {step === 3 && (
            <>
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-eucalyptus-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={28} className="text-eucalyptus-600" />
                </div>
                <h2 className="text-xl font-bold text-charcoal-900 mb-2">
                  {gu ? 'બધું તૈયાર છે!' : "You're all set!"}
                </h2>
                <p className="text-sm text-charcoal-500 mb-6">
                  {gu ? 'AgariyaCare AI હવે તૈયાર છે. ચાલો શરૂ કરીએ!' : 'AgariyaCare AI is ready to help you. Let\'s get started!'}
                </p>
                <button
                  onClick={finish}
                  disabled={saving}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {saving ? (gu ? 'સ્ટોર કરી રહ્યા...' : 'Saving…') : (gu ? 'પ્લૅટફૉર્મ ખોલો' : 'Enter Platform')}
                  {!saving && <ArrowRight size={16} />}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-charcoal-400 mt-4">
          {gu ? 'AgariyaCare AI — IBM Granite AI દ્વારા સંચાલિત' : 'AgariyaCare AI — Powered by IBM Granite AI'}
        </p>
      </div>
    </div>
  );
}
