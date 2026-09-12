import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { transactionService, Transaction, TransactionStatus } from '../services/offerService';
import { useAuthStore } from '../context/authStore';
import { Spinner, EmptyState } from '../components/ui/index';

function fmt(n: number | string | null | undefined, dec = 0): string {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: dec });
}
function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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

const TX_STATUS_ORDER: TransactionStatus[] = [
  'AGREED', 'PROCESSING', 'READY_FOR_DISPATCH', 'DISPATCHED', 'DELIVERED', 'COMPLETED',
];

export const TransactionsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const gu = i18n.language === 'gu';
  const { user } = useAuthStore();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await transactionService.getMyTransactions();
      if (res.success && res.data) setTransactions(res.data);
    } catch { /* empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isBuyer  = user?.role === 'BUYER';
  const filtered = filterStatus === 'ALL' ? transactions : transactions.filter(t => t.status === filterStatus);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-0.5">
          {t('nav.transactions')}
        </p>
        <h1 className="text-2xl font-semibold text-charcoal-900">
          {gu ? 'મારા વ્ય.' : isBuyer ? 'My Purchases' : 'My Sales'}
        </h1>
        <p className="text-sm text-charcoal-500 mt-0.5">
          {transactions.length} {gu ? 'વ્ય.' : 'transaction(s) total'}
        </p>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap mb-4">
        {['ALL', 'AGREED', 'PROCESSING', 'DISPATCHED', 'COMPLETED', 'CANCELLED'].map(s => (
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
                {transactions.filter(tx => tx.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={gu ? 'વ.ન.' : 'No transactions yet'}
          description={gu ? 'ઑ.સ.ક. વ.ત.' : 'Transactions will appear here when an offer is accepted.'}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(tx => {
            const cfg = TX_STATUS_CFG[tx.status] || TX_STATUS_CFG.AGREED;
            const statusIdx = TX_STATUS_ORDER.indexOf(tx.status as TransactionStatus);
            const totalSteps = TX_STATUS_ORDER.length;
            const progress = statusIdx >= 0 ? ((statusIdx + 1) / totalSteps) * 100 : 0;

            return (
              <Link
                key={tx.id}
                to={`/transactions/${tx.id}`}
                className="card card-body block hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-charcoal-900">
                        {tx.transaction_ref}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.cls}`}>
                        {gu ? cfg.gu : cfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-charcoal-600 mt-0.5">
                      {tx.salt_type || 'Salt'}
                      {tx.quality_grade ? ` — ${tx.quality_grade}` : ''}
                    </p>
                    <p className="text-xs text-charcoal-400">
                      {isBuyer
                        ? `${gu ? 'વ:' : 'Seller:'} ${tx.seller_name || '—'}`
                        : `${gu ? 'ખ:' : 'Buyer:'} ${tx.buyer_name || '—'}`}
                      {' · '}{fmtDate(tx.created_at)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-charcoal-900">
                      ₹{fmt(tx.total_amount)}
                    </p>
                    <p className="text-xs text-charcoal-400">
                      {fmt(tx.quantity_kg, 0)} kg · ₹{fmt(tx.agreed_price_per_kg, 2)}/kg
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                {statusIdx >= 0 && tx.status !== 'CANCELLED' && tx.status !== 'DISPUTED' && (
                  <div>
                    <div className="w-full bg-ivory-200 rounded-full h-1.5">
                      <div
                        className="bg-eucalyptus-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-charcoal-400">{gu ? 'સ.' : 'Agreed'}</span>
                      <span className="text-xs text-charcoal-400">{gu ? 'પ.' : 'Complete'}</span>
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
