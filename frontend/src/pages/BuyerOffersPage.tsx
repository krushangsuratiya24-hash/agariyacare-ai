import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { offerService, Offer, OfferHistoryEntry } from '../services/offerService';
import { useAuthStore } from '../context/authStore';
import { Spinner, EmptyState } from '../components/ui/index';
import { NegotiationTimeline } from '../components/ui/NegotiationTimeline';

function fmt(n: number | string | null | undefined, dec = 2): string {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: dec });
}
function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_CFG: Record<string, { label: string; gu: string; cls: string }> = {
  PENDING:   { label: 'Pending',   gu: 'રાહ',     cls: 'bg-amber-100 text-amber-700' },
  COUNTERED: { label: 'Countered', gu: 'ઉ.ઑ.',   cls: 'bg-sand-100 text-sand-600' },
  ACCEPTED:  { label: 'Accepted',  gu: 'સ્વ.',    cls: 'bg-eucalyptus-100 text-eucalyptus-800' },
  REJECTED:  { label: 'Rejected',  gu: 'અ.સ્વ.', cls: 'bg-red-50 text-red-600' },
  WITHDRAWN: { label: 'Withdrawn', gu: 'પ.ગ.',    cls: 'bg-charcoal-100 text-charcoal-500' },
  EXPIRED:   { label: 'Expired',   gu: 'સ.મ.',    cls: 'bg-charcoal-100 text-charcoal-500' },
  CANCELLED: { label: 'Cancelled', gu: 'ર.ત.',    cls: 'bg-charcoal-100 text-charcoal-500' },
};

export const BuyerOffersPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const gu = i18n.language === 'gu';
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [selected, setSelected] = useState<Offer | null>(null);
  const [history, setHistory] = useState<OfferHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [histLoading, setHistLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Counter form
  const [showCounter, setShowCounter] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterQty, setCounterQty] = useState('');
  const [counterMsg, setCounterMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await offerService.getMyOffers();
      if (res.success && res.data) setOffers(res.data);
    } catch { /* empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectOffer = async (offer: Offer) => {
    setSelected(offer);
    setShowCounter(false);
    setCounterPrice(String(offer.price_per_kg));
    setCounterQty(String(offer.quantity_kg));
    setCounterMsg('');
    setHistLoading(true);
    try {
      const res = await offerService.getById(offer.id);
      if (res.success && res.data) setHistory(res.data.history);
    } catch { /* empty */ }
    finally { setHistLoading(false); }
  };

  const handleAcceptCounter = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await offerService.accept(selected.id);
      if (!res.success) throw new Error(res.error);
      toast.success(gu ? 'ઉ.ઑ. સ્વ. — વ્ય. બ.' : 'Counter accepted — transaction created');
      await load();
      if (res.data?.transaction?.id) navigate(`/transactions/${res.data.transaction.id}`);
      else setSelected(null);
    } catch (err: unknown) {
      toast.error((err as Error).message || t('common.error'));
    } finally { setActionLoading(false); }
  };

  const handleRejectCounter = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await offerService.reject(selected.id);
      if (!res.success) throw new Error(res.error);
      toast.success(gu ? 'ઉ.ઑ. ફ.' : 'Counter rejected');
      await load();
      setSelected(null);
    } catch (err: unknown) {
      toast.error((err as Error).message || t('common.error'));
    } finally { setActionLoading(false); }
  };

  const handleWithdraw = async () => {
    if (!selected) return;
    if (!confirm(gu ? 'ઑ. પ.લ. ?' : 'Withdraw this offer?')) return;
    setActionLoading(true);
    try {
      const res = await offerService.withdraw(selected.id);
      if (!res.success) throw new Error(res.error);
      toast.success(gu ? 'ઑ. પ.ગ.' : 'Offer withdrawn');
      await load();
      setSelected(null);
    } catch (err: unknown) {
      toast.error((err as Error).message || t('common.error'));
    } finally { setActionLoading(false); }
  };

  const handleCounterBuyer = async () => {
    if (!selected || !counterPrice || !counterQty) return;
    setActionLoading(true);
    try {
      const res = await offerService.counter(selected.id, {
        price_per_kg: parseFloat(counterPrice),
        quantity_kg:  parseFloat(counterQty),
        message: counterMsg || undefined,
      });
      if (!res.success) throw new Error(res.error);
      toast.success(gu ? 'ઉ.ઑ. મ.' : 'Counter-offer sent');
      setShowCounter(false);
      await load();
      await selectOffer({ ...selected, ...res.data! });
    } catch (err: unknown) {
      toast.error((err as Error).message || t('common.error'));
    } finally { setActionLoading(false); }
  };

  const filtered = filterStatus === 'ALL' ? offers : offers.filter(o => o.status === filterStatus);

  const countersReceived = offers.filter(o => o.status === 'COUNTERED').length;
  const pending = offers.filter(o => o.status === 'PENDING').length;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-0.5">
          {t('nav.offers')}
        </p>
        <h1 className="text-2xl font-semibold text-charcoal-900">
          {gu ? 'મારી ઑ.' : t('nav.myOffers')}
        </h1>
        {(countersReceived > 0 || pending > 0) && (
          <p className="text-sm text-amber-600 mt-0.5">
            {countersReceived > 0 && `${countersReceived} ${gu ? 'ઉ.ઑ.' : 'counter-offer(s) received'}`}
            {countersReceived > 0 && pending > 0 && ' · '}
            {pending > 0 && `${pending} ${gu ? 'ઑ.ર.' : 'pending'}`}
          </p>
        )}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap mb-4">
        {['ALL', 'PENDING', 'COUNTERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              filterStatus === s
                ? 'bg-charcoal-800 text-white border-charcoal-800'
                : 'bg-white text-charcoal-600 border-ivory-300 hover:border-charcoal-400'
            }`}
          >
            {s === 'ALL' ? (gu ? 'બ.' : 'All') : s}
            {s !== 'ALL' && (
              <span className="ml-1 opacity-60">
                {offers.filter(o => o.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Offer list */}
          <div className="lg:col-span-2 space-y-2">
            {filtered.length === 0 ? (
              <EmptyState
                  title={gu ? 'ઑ.ન.' : 'No offers yet'}
                  description={gu ? 'મ.ઑ.ક.વ. !' : 'Make offers on listings in the marketplace.'}
                  action={{ label: gu ? 'બ.જ.' : 'Browse Market', onClick: () => navigate('/salt-market') }}
                />
            ) : filtered.map(offer => {
              const cfg = STATUS_CFG[offer.status] || STATUS_CFG.PENDING;
              const isSelected = selected?.id === offer.id;
              return (
                <button
                  key={offer.id}
                  onClick={() => selectOffer(offer)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-eucalyptus-400 bg-eucalyptus-50/40'
                      : 'border-ivory-200 bg-white hover:border-eucalyptus-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-charcoal-900 truncate">
                        {offer.salt_type || 'Salt'}
                        {offer.quality_grade ? ` — ${offer.quality_grade}` : ''}
                      </p>
                      <p className="text-xs text-charcoal-500 truncate">
                        {offer.seller_name || ''}{offer.listing_location ? ` · ${offer.listing_location}` : ''}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${cfg.cls}`}>
                      {gu ? cfg.gu : cfg.label}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-bold text-charcoal-900">
                      ₹{fmt(offer.price_per_kg)}/kg
                    </span>
                    <span className="text-sm text-charcoal-500">
                      {fmt(offer.quantity_kg, 0)} kg
                    </span>
                  </div>
                  <p className="text-xs text-charcoal-400 mt-0.5">
                    = ₹{fmt(offer.total_amount, 0)} · {fmtDate(offer.created_at)}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-3">
            {!selected ? (
              <div className="card card-body flex flex-col items-center justify-center py-16 text-center">
                <svg className="w-10 h-10 text-charcoal-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-charcoal-400">
                  {gu ? 'ઑ.ચ.' : 'Select an offer to view details'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="card card-body">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-1">
                        {gu ? 'ઑ.વ.' : 'Your Offer'}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-charcoal-900">
                          ₹{fmt(selected.price_per_kg)}/kg
                        </span>
                        <span className="text-base text-charcoal-500">
                          {fmt(selected.quantity_kg, 0)} kg
                        </span>
                      </div>
                      <p className="text-sm text-charcoal-500 mt-0.5">
                        {gu ? 'ક.' : 'Total'}: ₹{fmt(selected.total_amount, 0)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${(STATUS_CFG[selected.status] || STATUS_CFG.PENDING).cls}`}>
                        {selected.status}
                      </span>
                      {selected.seller_name && (
                        <span className="text-xs text-charcoal-500">
                          {gu ? 'વ:' : 'Seller:'} {selected.seller_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Salt listing info */}
                  {selected.salt_type && (
                    <div className="bg-ivory-50 rounded-xl px-3 py-2 mb-4 text-sm">
                      <p className="font-medium text-charcoal-800">
                        {selected.salt_type}
                        {selected.quality_grade ? ` — ${selected.quality_grade}` : ''}
                      </p>
                      {selected.listing_location && (
                        <p className="text-xs text-charcoal-500">{selected.listing_location}</p>
                      )}
                      {selected.listing_price_per_kg && (
                        <p className="text-xs text-charcoal-400">
                          {gu ? 'ભ.' : 'Listed at'} ₹{fmt(selected.listing_price_per_kg)}/kg
                        </p>
                      )}
                    </div>
                  )}

                  {/* Message */}
                  {selected.message && (
                    <div className="text-sm text-charcoal-600 bg-sand-50 rounded-xl px-3 py-2 mb-4 italic">
                      &ldquo;{selected.message}&rdquo;
                    </div>
                  )}

                  {/* Negotiation timeline */}
                  {histLoading ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-charcoal-400">
                      <Spinner size="sm" /> {gu ? 'ઇ.' : 'Loading history…'}
                    </div>
                  ) : history.length > 0 && (
                    <div className="border-t border-ivory-200 pt-4 mb-4">
                      <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider mb-3">
                        {gu ? 'ચ.ઇ.' : 'Negotiation Timeline'}
                      </p>
                      <NegotiationTimeline history={history} buyerId={user?.id || ''} />
                    </div>
                  )}

                  {/* Actions by status */}
                  <div className="border-t border-ivory-200 pt-4">
                    {selected.status === 'PENDING' && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={handleWithdraw}
                          disabled={actionLoading}
                          className="btn-secondary btn-md flex items-center gap-1.5 text-charcoal-600"
                        >
                          {actionLoading ? <Spinner size="sm" /> : null}
                          {gu ? 'ઑ.પ.' : 'Withdraw Offer'}
                        </button>
                      </div>
                    )}

                    {selected.status === 'COUNTERED' && (
                      <>
                        {!showCounter ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={handleAcceptCounter}
                              disabled={actionLoading}
                              className="btn-primary btn-md flex items-center gap-1.5"
                            >
                              {actionLoading ? <Spinner size="sm" /> : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              {gu ? 'ઉ.ઑ.સ.' : 'Accept Counter'}
                            </button>
                            <button
                              onClick={() => setShowCounter(true)}
                              disabled={actionLoading}
                              className="btn-secondary btn-md"
                            >
                              {gu ? 'ઉ.ઑ.' : 'Counter Again'}
                            </button>
                            <button
                              onClick={handleRejectCounter}
                              disabled={actionLoading}
                              className="btn-md text-red-600 border border-red-200 bg-red-50 hover:bg-red-100"
                            >
                              {gu ? 'ઉ.ઑ.ફ.' : 'Reject Counter'}
                            </button>
                          </div>
                        ) : (
                          <div className="bg-sand-50 border border-sand-200 rounded-xl p-4 space-y-3">
                            <p className="text-sm font-semibold text-charcoal-900">
                              {gu ? 'ઉ.ઑ.' : 'Send Counter-Offer'}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="label text-xs">{gu ? 'ભ.(₹/kg)' : 'Price (₹/kg)'}</label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400 text-sm">₹</span>
                                  <input
                                    type="number" step="0.01" min="0.01"
                                    className="input pl-7"
                                    value={counterPrice}
                                    onChange={e => setCounterPrice(e.target.value)}
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="label text-xs">{gu ? 'જ.(kg)' : 'Quantity (kg)'}</label>
                                <input
                                  type="number" step="1" min="1"
                                  className="input"
                                  value={counterQty}
                                  onChange={e => setCounterQty(e.target.value)}
                                />
                              </div>
                            </div>
                            {counterPrice && counterQty && (
                              <p className="text-xs text-charcoal-500">
                                {gu ? 'ક.' : 'Total:'} ₹{fmt(parseFloat(counterPrice) * parseFloat(counterQty), 0)}
                              </p>
                            )}
                            <input
                              type="text"
                              className="input"
                              placeholder={gu ? 'સ.(વ.)' : 'Message (optional)'}
                              value={counterMsg}
                              onChange={e => setCounterMsg(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleCounterBuyer}
                                disabled={actionLoading || !counterPrice || !counterQty}
                                className="btn-primary btn-md flex-1"
                              >
                                {actionLoading ? <Spinner size="sm" /> : (gu ? 'મ.' : 'Send Counter')}
                              </button>
                              <button onClick={() => setShowCounter(false)} className="btn-secondary btn-md">
                                {t('common.cancel')}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {selected.status === 'ACCEPTED' && (
                      <Link
                        to="/transactions"
                        className="btn-primary btn-md inline-flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        {gu ? 'વ.જ.' : 'View Transaction'}
                      </Link>
                    )}

                    {(selected.status === 'REJECTED' || selected.status === 'WITHDRAWN') && (
                      <div className="text-sm text-charcoal-500 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {gu ? 'ઑ.સ.' : 'This offer is closed.'}
                        {' '}
                        <Link to={`/salt-market/${selected.listing_id}`} className="text-eucalyptus-700 hover:underline text-xs">
                          {gu ? 'ફ.ઑ.' : 'Make a new offer →'}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
