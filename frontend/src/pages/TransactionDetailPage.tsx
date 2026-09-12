import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { transactionService, Transaction, TransactionStatus } from '../services/offerService';
import { useAuthStore } from '../context/authStore';
import { Spinner, SkeletonCard, Alert } from '../components/ui/index';
import { NegotiationTimeline } from '../components/ui/NegotiationTimeline';

function fmt(n: number | string | null | undefined, dec = 2): string {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: dec });
}
function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(d: string): string {
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const TX_STATUS_CFG: Record<string, { label: string; gu: string; cls: string }> = {
  AGREED:             { label: 'Agreed',            gu: 'સ.',    cls: 'bg-eucalyptus-100 text-eucalyptus-800' },
  PROCESSING:         { label: 'Processing',        gu: 'પ.ક.',  cls: 'bg-amber-100 text-amber-700' },
  READY_FOR_DISPATCH: { label: 'Ready for Dispatch',gu: 'ત.',    cls: 'bg-sand-100 text-sand-700' },
  DISPATCHED:         { label: 'Dispatched',        gu: 'મ.',    cls: 'bg-blue-100 text-blue-700' },
  DELIVERED:          { label: 'Delivered',         gu: 'ડ.',    cls: 'bg-eucalyptus-100 text-eucalyptus-800' },
  COMPLETED:          { label: 'Completed',         gu: 'પ.',    cls: 'bg-eucalyptus-200 text-eucalyptus-900' },
  CANCELLED:          { label: 'Cancelled',         gu: 'ર.ત.',  cls: 'bg-charcoal-100 text-charcoal-500' },
  DISPUTED:           { label: 'Disputed',          gu: 'ઝ.',    cls: 'bg-red-100 text-red-700' },
};

// Status transitions per role
const NEXT_STATUS: Record<string, Record<string, TransactionStatus[]>> = {
  AGARIYA_WORKER: {
    AGREED:             ['PROCESSING'],
    PROCESSING:         ['READY_FOR_DISPATCH'],
    READY_FOR_DISPATCH: ['DISPATCHED'],
    DISPATCHED:         [],
  },
  BUYER: {
    DELIVERED:          ['COMPLETED', 'DISPUTED'],
  },
};

const TX_STATUS_ORDER = [
  'AGREED', 'PROCESSING', 'READY_FOR_DISPATCH', 'DISPATCHED', 'DELIVERED', 'COMPLETED',
];

export const TransactionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const gu = i18n.language === 'gu';
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await transactionService.getById(id);
      if (!res.success || !res.data) {
        setError(res.error || 'Transaction not found');
        return;
      }
      setTx(res.data);
    } catch {
      setError('Failed to load transaction');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleStatusUpdate = async (newStatus: TransactionStatus) => {
    if (!tx) return;
    setUpdating(true);
    try {
      const res = await transactionService.updateStatus(tx.id, newStatus);
      if (!res.success) throw new Error(res.error);
      toast.success(gu ? 'સ.અ.' : `Status updated to ${newStatus}`);
      await load();
    } catch (err: unknown) {
      toast.error((err as Error).message || t('common.error'));
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <SkeletonCard lines={5} />
        <SkeletonCard lines={3} />
      </div>
    );
  }

  if (error || !tx) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert type="error" message={error || 'Transaction not found'} />
        <button onClick={() => navigate('/transactions')} className="btn-secondary btn-md mt-4">
          {gu ? 'વ.ય.' : 'Back to Transactions'}
        </button>
      </div>
    );
  }

  const cfg = TX_STATUS_CFG[tx.status] || TX_STATUS_CFG.AGREED;
  const isBuyer  = user?.id === tx.buyer_id;
  const isWorker = user?.id === tx.seller_id;
  const role     = user?.role || '';

  const nextStatuses: TransactionStatus[] = NEXT_STATUS[role]?.[tx.status] || [];

  const statusIdx = TX_STATUS_ORDER.indexOf(tx.status);
  const progress  = statusIdx >= 0 ? ((statusIdx + 1) / TX_STATUS_ORDER.length) * 100 : 0;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back nav */}
      <div className="mb-5">
        <button
          onClick={() => navigate('/transactions')}
          className="text-sm text-charcoal-400 hover:text-charcoal-600 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {gu ? 'વ.ય.' : 'Back to Transactions'}
        </button>
      </div>

      {/* Header card */}
      <div className="card card-body mb-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-1">
              {t('nav.transactions')} · {tx.transaction_ref}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-charcoal-900">
                ₹{fmt(tx.total_amount, 0)}
              </span>
            </div>
            <p className="text-sm text-charcoal-500 mt-0.5">
              {fmt(tx.quantity_kg, 0)} kg · ₹{fmt(tx.agreed_price_per_kg, 2)}/kg
            </p>
          </div>
          <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${cfg.cls}`}>
            {gu ? cfg.gu : cfg.label}
          </span>
        </div>

        {/* Progress bar */}
        {statusIdx >= 0 && tx.status !== 'CANCELLED' && tx.status !== 'DISPUTED' && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-charcoal-400 mb-1.5">
              {TX_STATUS_ORDER.map((s, i) => (
                <span key={s} className={`${i <= statusIdx ? 'text-eucalyptus-700 font-semibold' : ''}`}>
                  {i === 0 ? '✓' : i === TX_STATUS_ORDER.length - 1 ? '★' : '·'}
                </span>
              ))}
            </div>
            <div className="w-full bg-ivory-200 rounded-full h-2">
              <div
                className="bg-eucalyptus-500 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-charcoal-400 mt-1">
              <span>{gu ? 'સ.' : 'Agreed'}</span>
              <span className="font-medium text-eucalyptus-700">{gu ? cfg.gu : cfg.label}</span>
              <span>{gu ? 'પ.' : 'Complete'}</span>
            </div>
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: gu ? 'જ.' : 'Quantity',    value: `${fmt(tx.quantity_kg, 0)} kg` },
            { label: gu ? 'ભ.' : 'Price/kg',    value: `₹${fmt(tx.agreed_price_per_kg, 2)}` },
            { label: gu ? 'ક.' : 'Total Value',  value: `₹${fmt(tx.total_amount, 0)}` },
            { label: gu ? 'ત.' : 'Created',      value: fmtDate(tx.created_at) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-ivory-50 rounded-xl p-3">
              <p className="text-xs text-charcoal-400 mb-0.5">{label}</p>
              <p className="text-sm font-semibold text-charcoal-900">{value}</p>
            </div>
          ))}
        </div>

        {/* Salt info */}
        {tx.salt_type && (
          <div className="bg-ivory-50 rounded-xl px-3 py-2 mb-4">
            <p className="text-sm font-semibold text-charcoal-800">
              {tx.salt_type}{tx.quality_grade ? ` — ${tx.quality_grade}` : ''}
            </p>
            {tx.listing_location && (
              <p className="text-xs text-charcoal-500">{tx.listing_location}</p>
            )}
          </div>
        )}

        {/* Parties */}
        <div className="flex gap-4 flex-wrap text-sm">
          <div>
            <p className="text-xs text-charcoal-400 mb-0.5">{gu ? 'વ.' : 'Seller'}</p>
            <p className="font-medium text-charcoal-800">{tx.seller_name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-charcoal-400 mb-0.5">{gu ? 'ખ.' : 'Buyer'}</p>
            <p className="font-medium text-charcoal-800">{tx.buyer_name || '—'}</p>
          </div>
        </div>

        {/* Action buttons */}
        {nextStatuses.length > 0 && (
          <div className="border-t border-ivory-200 pt-4 mt-4">
            <p className="text-xs text-charcoal-400 mb-2">
              {gu ? 'ક્ .' : 'Update status:'}
            </p>
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map(nextS => {
                const nextCfg = TX_STATUS_CFG[nextS] || { label: nextS, gu: nextS, cls: '' };
                return (
                  <button
                    key={nextS}
                    onClick={() => handleStatusUpdate(nextS)}
                    disabled={updating}
                    className="btn-primary btn-md flex items-center gap-1.5"
                  >
                    {updating ? <Spinner size="sm" /> : null}
                    {gu ? nextCfg.gu : nextCfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Status history */}
      {tx.statusHistory && tx.statusHistory.length > 0 && (
        <div className="card card-body mb-4">
          <h3 className="text-sm font-semibold text-charcoal-700 mb-3">
            {gu ? 'સ.ઇ.' : 'Status History'}
          </h3>
          <div className="space-y-2">
            {tx.statusHistory.map(sh => (
              <div key={sh.id} className="flex items-start gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-eucalyptus-400 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium text-charcoal-800">
                    {sh.from_status ? `${sh.from_status} → ` : ''}
                    {sh.to_status}
                  </span>
                  {sh.actor_name && (
                    <span className="text-charcoal-400"> · {sh.actor_name}</span>
                  )}
                  {sh.note && (
                    <p className="text-charcoal-500 italic mt-0.5">{sh.note}</p>
                  )}
                  <p className="text-charcoal-400">{fmtTime(sh.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Negotiation history */}
      {tx.offerHistory && tx.offerHistory.length > 0 && (
        <div className="card card-body">
          <h3 className="text-sm font-semibold text-charcoal-700 mb-3">
            {gu ? 'ચ.ઇ.' : 'Negotiation Summary'}
          </h3>
          <NegotiationTimeline history={tx.offerHistory} buyerId={tx.buyer_id} />
        </div>
      )}
    </div>
  );
};
