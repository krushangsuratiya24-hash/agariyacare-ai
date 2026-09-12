import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  buyerRequestService,
  BuyerRequest, SaltListing,
} from '../services/marketplaceService';
import { useAuthStore } from '../context/authStore';
import { SkeletonCard, EmptyState, Alert, Spinner, ConfirmDialog } from '../components/ui/index';

function fmt(n: number | string | null | undefined, decimals = 0): string {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: decimals });
}
function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface ReqFormState {
  title: string;
  salt_type: string;
  quantity_kg: string;
  max_price_per_kg: string;
  preferred_location: string;
  required_date: string;
  quality_notes: string;
  description: string;
}

const BLANK_REQ: ReqFormState = {
  title: '', salt_type: '', quantity_kg: '',
  max_price_per_kg: '', preferred_location: '',
  required_date: '', quality_notes: '', description: '',
};

function toReqForm(r: BuyerRequest): ReqFormState {
  return {
    title:             r.title || '',
    salt_type:         r.salt_type || '',
    quantity_kg:       String(r.quantity_kg),
    max_price_per_kg:  r.max_price_per_kg ? String(r.max_price_per_kg) : '',
    preferred_location: r.preferred_location || '',
    required_date:     r.required_date ? r.required_date.substring(0, 10) : '',
    quality_notes:     r.quality_notes || '',
    description:       r.description || '',
  };
}

interface RequestFormProps {
  initial: ReqFormState;
  isEdit: boolean;
  onSave: (d: ReqFormState) => Promise<void>;
  onCancel: () => void;
}

const RequestForm: React.FC<RequestFormProps> = ({ initial, isEdit, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<ReqFormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof ReqFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.salt_type.trim()) { setError('Salt type is required'); return; }
    if (!form.quantity_kg || parseFloat(form.quantity_kg) < 1) { setError('Quantity must be at least 1 kg'); return; }
    setSaving(true);
    try { await onSave(form); }
    catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-2xl shadow-float w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-charcoal-900">
              {isEdit ? t('buyerRequests.editRequest') : t('buyerRequests.createRequest')}
            </h2>
            <button onClick={onCancel} className="p-2 rounded-lg text-charcoal-400 hover:bg-ivory-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('buyerRequests.fields.title')}</label>
              <input className="input" value={form.title} onChange={set('title')} placeholder={t('buyerRequests.fields.titlePlaceholder')} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('buyerRequests.fields.saltType')} <span className="text-red-400">*</span></label>
                <input className="input" value={form.salt_type} onChange={set('salt_type')} placeholder={t('buyerRequests.fields.saltTypePlaceholder')} required />
              </div>
              <div>
                <label className="label">{t('buyerRequests.fields.quantityKg')} <span className="text-red-400">*</span></label>
                <input className="input" type="number" min="1" step="1" value={form.quantity_kg} onChange={set('quantity_kg')} placeholder="10000" required />
              </div>
              <div>
                <label className="label">{t('buyerRequests.fields.maxPricePerKgOptional')}</label>
                <input className="input" type="number" min="0.01" step="0.01" value={form.max_price_per_kg} onChange={set('max_price_per_kg')} placeholder="10.00" />
              </div>
              <div>
                <label className="label">{t('buyerRequests.fields.requiredDate')}</label>
                <input className="input" type="date" value={form.required_date} onChange={set('required_date')} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">{t('buyerRequests.fields.preferredLocation')}</label>
                <input className="input" value={form.preferred_location} onChange={set('preferred_location')} placeholder={t('buyerRequests.fields.preferredLocationPlaceholder')} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">{t('buyerRequests.fields.qualityNotes')}</label>
                <textarea className="input resize-none" rows={2} value={form.quality_notes} onChange={set('quality_notes')} placeholder={t('buyerRequests.fields.qualityNotesPlaceholder')} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">{t('buyerRequests.fields.description')}</label>
                <textarea className="input resize-none" rows={2} value={form.description} onChange={set('description')} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onCancel} className="btn-secondary btn-md flex-1">{t('common.cancel')}</button>
              <button type="submit" className="btn-primary btn-md flex-1" disabled={saving}>
                {saving ? <Spinner size="sm" /> : (isEdit ? t('common.update') : t('common.post'))}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export const BuyerRequestsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isBuyer = user?.role === 'BUYER';

  const [tab, setTab] = useState<'all' | 'mine'>(isBuyer ? 'mine' : 'all');
  const [allRequests, setAllRequests] = useState<BuyerRequest[]>([]);
  const [myRequests, setMyRequests] = useState<BuyerRequest[]>([]);
  const [matches, setMatches] = useState<Record<string, SaltListing[]>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editReq, setEditReq] = useState<BuyerRequest | null>(null);
  const [closeTarget, setCloseTarget] = useState<BuyerRequest | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allRes, myRes] = await Promise.allSettled([
        buyerRequestService.getAll(),
        isBuyer ? buyerRequestService.getMine() : Promise.resolve({ success: true, data: [] }),
      ]);
      if (allRes.status === 'fulfilled' && allRes.value.success && allRes.value.data)
        setAllRequests(allRes.value.data.requests || []);
      if (myRes.status === 'fulfilled' && myRes.value.success && myRes.value.data)
        setMyRequests(myRes.value.data as BuyerRequest[]);
    } finally {
      setLoading(false);
    }
  }, [isBuyer]);

  useEffect(() => { load(); }, [load]);

  // Load matches for my requests (worker sees matches on listings page)
  useEffect(() => {
    if (!isBuyer) return;
    myRequests.forEach(r => {
      if (matches[r.id]) return;
      buyerRequestService.getMatchesForRequest(r.id).then(res => {
        if (res.success && res.data) {
          setMatches(prev => ({ ...prev, [r.id]: res.data as SaltListing[] }));
        }
      }).catch(() => {});
    });
  }, [myRequests, isBuyer]);

  const handleSave = async (form: ReqFormState) => {
    const payload = {
      title:             form.title || undefined,
      salt_type:         form.salt_type,
      quantity_kg:       parseFloat(form.quantity_kg),
      max_price_per_kg:  form.max_price_per_kg ? parseFloat(form.max_price_per_kg) : undefined,
      preferred_location: form.preferred_location || undefined,
      required_date:     form.required_date || undefined,
      quality_notes:     form.quality_notes || undefined,
      description:       form.description || undefined,
    };

    if (editReq) {
      const res = await buyerRequestService.update(editReq.id, payload);
      if (!res.success) throw new Error(res.error);
      toast.success(t('buyerRequests.updated'));
    } else {
      const res = await buyerRequestService.create(payload);
      if (!res.success) throw new Error(res.error);
      toast.success(t('buyerRequests.saved'));
    }
    setShowForm(false);
    setEditReq(null);
    load();
  };

  const handleClose = async () => {
    if (!closeTarget) return;
    const res = await buyerRequestService.update(closeTarget.id, { status: 'CLOSED' });
    if (!res.success) { toast.error(res.error || 'Failed'); return; }
    toast.success(t('buyerRequests.updated'));
    setCloseTarget(null);
    load();
  };

  const STATUS_STYLES: Record<string, string> = {
    OPEN:      'badge-green',
    FULFILLED: 'badge-sand',
    CLOSED:    'badge-gray',
  };

  const RequestCard: React.FC<{ req: BuyerRequest; showActions: boolean }> = ({ req, showActions }) => {
    const reqMatches = matches[req.id];
    return (
      <div className="card card-body">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-charcoal-900">
                {req.title || `${req.salt_type} — ${fmt(Number(req.quantity_kg))} kg`}
              </h3>
              <span className={`badge ${STATUS_STYLES[req.status] || 'badge-gray'} text-xs`}>
                {t(`buyerRequests.status.${req.status}`)}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-charcoal-500 mt-1">
              <span><strong>{fmt(Number(req.quantity_kg))} kg</strong> of {req.salt_type}</span>
              {req.max_price_per_kg && <span>≤ ₹{fmt(Number(req.max_price_per_kg), 2)}/kg</span>}
              {req.preferred_location && <span>📍 {req.preferred_location}</span>}
              {req.required_date && <span>🗓 By {fmtDate(req.required_date)}</span>}
            </div>
            {req.quality_notes && <p className="text-xs text-charcoal-400 mt-1 line-clamp-1">{req.quality_notes}</p>}
            <p className="text-xs text-charcoal-400 mt-1">
              {t('buyerRequests.postedBy')} {req.buyer_name || 'Buyer'} · {fmtDate(req.created_at)}
            </p>
          </div>

          {showActions && req.status === 'OPEN' && (
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button onClick={() => { setEditReq(req); setShowForm(true); }} className="btn-secondary btn-sm">
                {t('common.edit')}
              </button>
              <button onClick={() => setCloseTarget(req)} className="btn-danger btn-sm">
                {t('buyerRequests.actions.close')}
              </button>
            </div>
          )}
        </div>

        {/* Matches for this request */}
        {showActions && reqMatches && reqMatches.length > 0 && (
          <div className="mt-3 pt-3 border-t border-ivory-200">
            <p className="text-xs font-medium text-charcoal-500 mb-2">{t('buyerRequests.matchingListings')}</p>
            <div className="space-y-2">
              {reqMatches.slice(0, 3).map((l: SaltListing & { match_score?: number }) => (
                <div key={l.id} className="flex items-center justify-between bg-ivory-50 rounded-xl px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-charcoal-900">{l.salt_type} · {fmt(Number(l.quantity_kg))} kg</p>
                    <p className="text-xs text-charcoal-400">₹{fmt(Number(l.price_per_kg), 2)}/kg · {l.location}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.match_score !== undefined && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        l.match_score >= 70 ? 'bg-eucalyptus-100 text-eucalyptus-800' : 'bg-sand-100 text-sand-600'
                      }`}>{l.match_score}%</span>
                    )}
                    <Link to={`/salt-market/${l.id}`} className="btn-secondary btn-sm text-xs">
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal-900">{t('buyerRequests.title')}</h1>
          <p className="text-sm text-charcoal-500 mt-0.5">{t('buyerRequests.subtitle')}</p>
        </div>
        {isBuyer && (
          <button onClick={() => { setEditReq(null); setShowForm(true); }} className="btn-primary btn-sm">
            + {t('buyerRequests.createRequest')}
          </button>
        )}
      </div>

      {/* Tabs */}
      {isBuyer && (
        <div className="flex border-b border-ivory-200 mb-5">
          {(['mine', 'all'] as const).map(t2 => (
            <button
              key={t2}
              onClick={() => setTab(t2)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t2 ? 'border-eucalyptus-600 text-eucalyptus-700' : 'border-transparent text-charcoal-500'
              }`}
            >
              {t2 === 'mine' ? t('buyerRequests.myRequests') : t('buyerRequests.title')}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <SkeletonCard key={i} lines={3} />)}</div>
      ) : (
        <div className="space-y-3">
          {(tab === 'mine' ? myRequests : allRequests).length === 0 ? (
            <EmptyState
              title={tab === 'mine' ? t('buyerRequests.noMyRequests') : t('buyerRequests.noRequests')}
              description={tab === 'all' ? t('buyerRequests.noRequestsDesc') : undefined}
              action={isBuyer ? { label: t('buyerRequests.createRequest'), onClick: () => setShowForm(true) } : undefined}
              icon={<svg className="w-7 h-7 text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            />
          ) : (
            (tab === 'mine' ? myRequests : allRequests).map(req => (
              <RequestCard key={req.id} req={req} showActions={tab === 'mine' && isBuyer} />
            ))
          )}
        </div>
      )}

      {showForm && (
        <RequestForm
          initial={editReq ? toReqForm(editReq) : BLANK_REQ}
          isEdit={!!editReq}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditReq(null); }}
        />
      )}

      <ConfirmDialog
        open={!!closeTarget}
        title={t('buyerRequests.actions.close')}
        message="This buyer request will be marked as closed and removed from the marketplace."
        confirmLabel={t('buyerRequests.actions.close')}
        variant="danger"
        onConfirm={handleClose}
        onCancel={() => setCloseTarget(null)}
      />
    </div>
  );
};
