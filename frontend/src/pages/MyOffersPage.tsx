import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, CheckCircle, XCircle, RotateCcw, Bot, Clock, ArrowRight, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { offersApi, marketplaceApi } from '../services/api';
import { Offer, OfferHistory, SaltListing, SaltType, SaltGrade } from '../types';
import { Spinner, EmptyState } from '../components/UI';

export default function MyOffersPage() {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const gu = language === 'gu';

  const [offers, setOffers] = useState<Offer[]>([]);
  const [saltTypes, setSaltTypes] = useState<SaltType[]>([]);
  const [saltGrades, setSaltGrades] = useState<SaltGrade[]>([]);
  const [listings, setListings] = useState<SaltListing[]>([]);
  const [selected, setSelected] = useState<Offer | null>(null);
  const [history, setHistory] = useState<OfferHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [histLoading, setHistLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterMsg, setCounterMsg] = useState('');
  const [showCounter, setShowCounter] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [offersRes, typesRes, gradesRes] = await Promise.allSettled([
        offersApi.getMyOffers(),
        marketplaceApi.getSaltTypes(),
        marketplaceApi.getSaltGrades(),
      ]);
      if (offersRes.status === 'fulfilled') setOffers(offersRes.value.data ?? []);
      if (typesRes.status === 'fulfilled') setSaltTypes(typesRes.value.data ?? []);
      if (gradesRes.status === 'fulfilled') setSaltGrades(gradesRes.value.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function selectOffer(offer: Offer) {
    setSelected(offer);
    setShowCounter(false);
    setError('');
    setHistLoading(true);
    try {
      const res = await offersApi.getOffer(offer.id);
      // API returns { offer, history } in data
      if (res.data?.history) setHistory(res.data.history);
      else setHistory([]);
    } finally {
      setHistLoading(false);
    }
  }

  async function acceptOffer() {
    if (!selected) return;
    setActionLoading(true);
    setError('');
    try {
      await offersApi.acceptOffer(selected.id, gu ? 'ઑ. ?' : 'Accepted');
      await load();
      setSelected(null);
    } catch (e: any) {
      setError(e.message ?? (gu ? 'ઑ.' : 'Failed to accept.'));
    } finally {
      setActionLoading(false);
    }
  }

  async function rejectOffer() {
    if (!selected) return;
    setActionLoading(true);
    setError('');
    try {
      await offersApi.rejectOffer(selected.id, gu ? 'ઑ.' : 'Rejected');
      await load();
      setSelected(null);
    } catch (e: any) {
      setError(e.message ?? (gu ? 'ઑ.' : 'Failed to reject.'));
    } finally {
      setActionLoading(false);
    }
  }

  async function submitCounter() {
    if (!selected || !counterPrice) return;
    setActionLoading(true);
    setError('');
    try {
      await offersApi.counterOffer(selected.id, {
        pricePerKg: Number(counterPrice),
        quantityKg: selected.quantityKg,
        message: counterMsg || undefined,
      });
      setShowCounter(false);
      setCounterPrice(''); setCounterMsg('');
      await load();
      setSelected(null);
    } catch (e: any) {
      setError(e.message ?? (gu ? 'ઑ.' : 'Failed to counter.'));
    } finally {
      setActionLoading(false);
    }
  }

  const statusClass: Record<string, string> = {
    PENDING: 'badge-pending', ACCEPTED: 'badge-completed', REJECTED: 'badge-cancelled',
    COUNTERED: 'bg-amber-100 text-amber-700', EXPIRED: 'bg-charcoal-100 text-charcoal-600', WITHDRAWN: 'bg-charcoal-100 text-charcoal-600',
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-5">
        <p className="section-label mb-0.5">{gu ? 'ઑ.' : 'Negotiations'}</p>
        <h1 className="text-2xl font-bold text-charcoal-900">{gu ? 'મારી ઑ.' : 'My Offers'}</h1>
        <p className="text-sm text-charcoal-500 mt-0.5">{offers.length} {gu ? 'ઑ.' : 'offer(s) total'}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Offer list */}
        <div className="lg:col-span-2 space-y-2">
          {offers.length === 0 ? (
            <EmptyState message={gu ? 'ક.' : 'No offers yet.'}>
              <Link to="/market" className="btn-secondary mt-2 inline-block text-sm">{gu ? 'બ.' : 'Browse Market'}</Link>
            </EmptyState>
          ) : offers.map(offer => {
            const type = saltTypes.find(t => t.id === offer.listing?.saltTypeId);
            const grade = saltGrades.find(g => g.id === offer.listing?.saltGradeId);
            const isActive = selected?.id === offer.id;
            return (
              <button
                key={offer.id}
                onClick={() => selectOffer(offer)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isActive ? 'border-eucalyptus-500 bg-eucalyptus-50/40' : 'border-charcoal-100 bg-white hover:border-eucalyptus-200'}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-medium text-charcoal-900 text-sm">
                    {type?.name ?? 'Salt'} {grade ? `— ${grade.name}` : ''}
                  </span>
                  <span className={`badge text-xs ${statusClass[offer.status] ?? 'badge-pending'}`}>{offer.status}</span>
                </div>
                <p className="text-lg font-bold text-charcoal-900">₹{offer.pricePerKg}/kg</p>
                <p className="text-xs text-charcoal-400 mt-0.5">{offer.quantityKg.toLocaleString()} kg · {new Date(offer.createdAt).toLocaleDateString('en-IN')}</p>
              </button>
            );
          })}
        </div>

        {/* Offer detail panel */}
        <div className="lg:col-span-3">
          {!selected ? (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <DollarSign size={32} className="text-charcoal-200 mb-3" />
              <p className="text-charcoal-400 text-sm">{gu ? 'ઑ.' : 'Select an offer to view details'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="section-label">{gu ? 'ઑ.' : 'Offer Details'}</p>
                    <p className="text-2xl font-bold text-charcoal-900 mt-1">₹{selected.pricePerKg}/kg</p>
                    <p className="text-charcoal-500 text-sm">{selected.quantityKg.toLocaleString()} kg · {gu ? 'ક.' : 'Total'}: ₹{(selected.pricePerKg * selected.quantityKg).toLocaleString('en-IN')}</p>
                  </div>
                  <span className={`badge ${statusClass[selected.status] ?? 'badge-pending'}`}>{selected.status}</span>
                </div>

                {/* Negotiation timeline */}
                {histLoading ? (
                  <div className="flex items-center gap-2 text-sm text-charcoal-400 py-3">
                    <Spinner size={16} /> {gu ? 'ઇ.' : 'Loading history…'}
                  </div>
                ) : history.length > 0 && (
                  <div className="border-t border-charcoal-50 pt-4 mb-4">
                    <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wide mb-3">{gu ? 'ઇ.' : 'Negotiation Timeline'}</p>
                    <div className="space-y-3">
                      {history.map((h, i) => {
                        const isBuyerAction = h.actor === 'buyer';
                        return (
                          <div key={h.id} className={`flex gap-3 ${isBuyerAction ? 'flex-row' : 'flex-row-reverse'}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isBuyerAction ? 'bg-charcoal-700 text-white' : 'bg-eucalyptus-100 text-eucalyptus-700'}`}>
                              {isBuyerAction ? 'B' : 'S'}
                            </div>
                            <div className={`flex-1 rounded-xl p-3 text-sm ${isBuyerAction ? 'bg-charcoal-50' : 'bg-eucalyptus-50'}`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-charcoal-900">{h.action}</span>
                                {h.pricePerKg && <span className="font-bold text-charcoal-900">₹{h.pricePerKg}/kg</span>}
                              </div>
                              {h.message && <p className="text-charcoal-500 text-xs">{h.message}</p>}
                              <p className="text-xs text-charcoal-400 mt-1">{new Date(h.createdAt).toLocaleString('en-IN')}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

                {/* Actions — only for PENDING offers and the right role */}
                {selected.status === 'PENDING' && (
                  <div className="space-y-3">
                    {!showCounter ? (
                      <div className="flex flex-wrap gap-2">
                        {/* Accept — seller accepts buyer offer, or buyer accepts counter */}
                        <button onClick={acceptOffer} disabled={actionLoading} className="btn-primary flex items-center gap-1.5 text-sm">
                          <CheckCircle size={15} /> {gu ? 'સ.' : 'Accept'}
                        </button>
                        <button onClick={() => setShowCounter(true)} disabled={actionLoading} className="btn-secondary flex items-center gap-1.5 text-sm">
                          <RotateCcw size={15} /> {gu ? 'ક.' : 'Counter Offer'}
                        </button>
                        <button onClick={rejectOffer} disabled={actionLoading} className="flex items-center gap-1.5 text-sm text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors">
                          <XCircle size={15} /> {gu ? 'ર.' : 'Reject'}
                        </button>
                        <Link to="/ai-assistant" className="btn-secondary flex items-center gap-1.5 text-sm">
                          <Bot size={15} /> {gu ? 'AI ?' : 'Ask AI'}
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3 bg-charcoal-50 rounded-xl p-4">
                        <p className="text-sm font-semibold text-charcoal-900">{gu ? 'ક.' : 'Counter Offer'}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="label">{gu ? 'ભ.' : 'Your price (₹/kg)'} *</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400">₹</span>
                              <input className="input pl-7" type="number" step="0.1" placeholder={String(selected.pricePerKg)} value={counterPrice} onChange={e => setCounterPrice(e.target.value)} />
                            </div>
                          </div>
                          <div className="flex items-end">
                            {counterPrice && selected.quantityKg && (
                              <p className="text-xs text-charcoal-500 pb-2">
                                = ₹{(Number(counterPrice) * selected.quantityKg).toLocaleString('en-IN')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="label">{gu ? 'સ.' : 'Message'} ({gu ? 'વ.' : 'optional'})</label>
                          <input className="input" placeholder={gu ? 'ઉ.' : 'Reason for counter…'} value={counterMsg} onChange={e => setCounterMsg(e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={submitCounter} disabled={actionLoading || !counterPrice} className="btn-primary flex-1 text-sm">
                            {actionLoading ? (gu ? 'સ.' : 'Sending…') : (gu ? 'ક.' : 'Send Counter')}
                          </button>
                          <button onClick={() => setShowCounter(false)} className="btn-secondary text-sm">{gu ? 'ર.' : 'Cancel'}</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AI insight */}
              <div className="card bg-charcoal-800 text-white border-0">
                <div className="flex items-center gap-2 mb-2">
                  <Bot size={16} className="text-eucalyptus-400" />
                  <span className="text-xs text-charcoal-300">AgariyaCare AI</span>
                </div>
                <p className="text-sm text-charcoal-200 mb-3">
                  {gu
                    ? '"AI ને પૂછો: આ ઑ. સ્વ. ??"'
                    : '"Ask AI: Should I accept this offer?" — Get a data-driven recommendation.'}
                </p>
                <Link
                  to="/ai-assistant"
                  state={{ prompt: gu ? 'શું હું આ ઑ. ?' : 'Should I accept my latest offer?' }}
                  className="text-eucalyptus-400 text-sm hover:text-eucalyptus-300 flex items-center gap-1.5"
                >
                  {gu ? 'AI ?' : 'Ask AI about this offer'} <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
