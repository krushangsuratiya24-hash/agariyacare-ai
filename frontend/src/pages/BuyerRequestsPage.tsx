import React, { useEffect, useState } from 'react';
import { Plus, Edit2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { marketplaceApi } from '../services/api';
import { BuyerRequest, SaltType, SaltGrade } from '../types';
import { EmptyState, Spinner } from '../components/UI';

export default function BuyerRequestsPage() {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const gu = language === 'gu';

  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [saltTypes, setSaltTypes] = useState<SaltType[]>([]);
  const [saltGrades, setSaltGrades] = useState<SaltGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    saltTypeId: '', saltGradeId: '', quantityKg: '', targetPricePerKg: '',
    preferredDistrict: '', requiredByDate: '', requirementsText: '', status: 'OPEN',
  });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [reqRes, typesRes, gradesRes] = await Promise.allSettled([
        marketplaceApi.getMyBuyerRequests(),
        marketplaceApi.getSaltTypes(),
        marketplaceApi.getSaltGrades(),
      ]);
      if (reqRes.status === 'fulfilled') setRequests(reqRes.value.data ?? []);
      if (typesRes.status === 'fulfilled') setSaltTypes(typesRes.value.data ?? []);
      if (gradesRes.status === 'fulfilled') setSaltGrades(gradesRes.value.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function saveRequest(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await marketplaceApi.createBuyerRequest({
        saltTypeId: form.saltTypeId || undefined,
        saltGradeId: form.saltGradeId || undefined,
        quantityKg: Number(form.quantityKg),
        targetPricePerKg: form.targetPricePerKg ? Number(form.targetPricePerKg) : undefined,
        preferredDistrict: form.preferredDistrict || undefined,
        requiredByDate: form.requiredByDate || undefined,
        requirementsText: form.requirementsText || undefined,
        status: 'OPEN',
      });
      setShowForm(false);
      setForm({ saltTypeId: '', saltGradeId: '', quantityKg: '', targetPricePerKg: '', preferredDistrict: '', requiredByDate: '', requirementsText: '', status: 'OPEN' });
      await load();
    } catch (e: any) {
      setError(e.message ?? (gu ? 'ĺ.' : 'Failed to submit request.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="section-label mb-0.5">{gu ? 'ĺ.' : 'Procurement'}</p>
          <h1 className="text-2xl font-bold text-charcoal-900">{gu ? 'ĺ.' : 'Buyer Requests'}</h1>
          <p className="text-sm text-charcoal-500 mt-0.5">{gu ? 'ĺ.' : 'Post your salt requirements so sellers can find you.'}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> {gu ? 'ĺ.' : 'New Request'}
        </button>
      </div>

      {showForm && (
        <div className="card border-eucalyptus-200 bg-eucalyptus-50/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-charcoal-900">{gu ? 'ĺ.' : 'Post Salt Requirement'}</h2>
            <button onClick={() => setShowForm(false)} className="text-charcoal-400 hover:text-charcoal-600"><X size={18} /></button>
          </div>
          <form onSubmit={saveRequest} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{gu ? 'ĺ.' : 'Salt Type'}</label>
              <select className="input" value={form.saltTypeId} onChange={e => setForm(p => ({ ...p, saltTypeId: e.target.value }))}>
                <option value="">{gu ? 'ĺ.' : 'Any type'}</option>
                {saltTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{gu ? 'ĺ.' : 'Grade'}</label>
              <select className="input" value={form.saltGradeId} onChange={e => setForm(p => ({ ...p, saltGradeId: e.target.value }))}>
                <option value="">{gu ? 'ĺ.' : 'Any grade'}</option>
                {saltGrades.filter(g => !form.saltTypeId || g.saltTypeId === form.saltTypeId).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{gu ? 'ĺ.' : 'Quantity needed (kg)'} *</label>
              <input className="input" type="number" required min="1" value={form.quantityKg} onChange={e => setForm(p => ({ ...p, quantityKg: e.target.value }))} />
            </div>
            <div>
              <label className="label">{gu ? 'ĺ.' : 'Target price (₹/kg)'}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400">₹</span>
                <input className="input pl-7" type="number" step="0.1" value={form.targetPricePerKg} onChange={e => setForm(p => ({ ...p, targetPricePerKg: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">{gu ? 'ĺ.' : 'Preferred District'}</label>
              <input className="input" placeholder="e.g. Surendranagar" value={form.preferredDistrict} onChange={e => setForm(p => ({ ...p, preferredDistrict: e.target.value }))} />
            </div>
            <div>
              <label className="label">{gu ? 'ĺ.' : 'Required by'}</label>
              <input className="input" type="date" value={form.requiredByDate} onChange={e => setForm(p => ({ ...p, requiredByDate: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">{gu ? 'ĺ.' : 'Requirements / Notes'}</label>
              <textarea className="input" rows={2} placeholder={gu ? 'ĺ.' : 'Quality specs, packaging, transport info…'} value={form.requirementsText} onChange={e => setForm(p => ({ ...p, requirementsText: e.target.value }))} />
            </div>
            {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? (gu ? 'ĺ.' : 'Posting…') : (gu ? 'ĺ.' : 'Post Request')}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">{gu ? 'ĺ.' : 'Cancel'}</button>
            </div>
          </form>
        </div>
      )}

      {requests.length === 0 ? (
        <EmptyState
          message={gu ? 'ĺ.' : 'No buyer requests yet. Post a request so sellers can find and contact you.'}
          action={<button onClick={() => setShowForm(true)} className="btn-primary mt-2">{gu ? 'ĺ.' : 'Post Request'}</button>}
        />
      ) : requests.map(req => {
        const type = saltTypes.find(t => t.id === req.saltTypeId);
        const grade = saltGrades.find(g => g.id === req.saltGradeId);
        return (
          <div key={req.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-charcoal-900">{type?.name ?? (gu ? 'ĺ.' : 'Any Salt')} {grade ? `— ${grade.name}` : ''}</span>
                  <span className={`badge text-xs ${req.status === 'OPEN' ? 'badge-active' : 'badge-cancelled'}`}>{req.status}</span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-charcoal-600">
                  <span><strong>{req.quantityKg.toLocaleString()} kg</strong></span>
                  {req.targetPricePerKg && <span>≤ ₹{req.targetPricePerKg}/kg</span>}
                  {req.preferredDistrict && <span className="text-charcoal-400">{req.preferredDistrict}</span>}
                </div>
                {req.requirementsText && <p className="text-sm text-charcoal-400 mt-1">{req.requirementsText}</p>}
                <p className="text-xs text-charcoal-400 mt-1">
                  {gu ? 'ĺ.' : 'Required by'}: {req.requiredByDate ? new Date(req.requiredByDate).toLocaleDateString('en-IN') : (gu ? 'ĺ.' : 'Flexible')}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
