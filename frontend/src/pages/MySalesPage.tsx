import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart2, TrendingUp, Package, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { transactionService, Transaction } from '../services/offerService';
import { Spinner } from '../components/UI';

export const MySalesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const gu = i18n.language === 'gu';

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    transactionService.getMyTransactions()
      .then(res => { if (res.success && res.data) setTransactions(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const completed = transactions.filter(tx =>
    ['COMPLETED', 'DELIVERED'].includes(tx.status)
  );
  const totalValue = completed.reduce((s, tx) => s + (tx.total_amount ?? 0), 0);
  const totalKg    = completed.reduce((s, tx) => s + (tx.quantity_kg ?? 0), 0);
  const avgPrice   = totalKg > 0 ? totalValue / totalKg : 0;

  const statusBadge: Record<string, string> = {
    AGREED:             'bg-yellow-100 text-yellow-800',
    PROCESSING:         'bg-blue-100 text-blue-800',
    READY_FOR_DISPATCH: 'bg-purple-100 text-purple-800',
    DISPATCHED:         'bg-indigo-100 text-indigo-800',
    DELIVERED:          'bg-eucalyptus-100 text-eucalyptus-800',
    COMPLETED:          'bg-eucalyptus-50 text-eucalyptus-700 font-semibold',
    CANCELLED:          'bg-red-50 text-red-600',
    DISPUTED:           'bg-red-100 text-red-700',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="section-label mb-0.5">
            {gu ? 'વ્યવહાર ઇતિહાસ' : 'Transaction History'}
          </p>
          <h1 className="text-2xl font-bold text-charcoal-900">
            {gu ? 'મારા વેચાણ' : 'My Sales'}
          </h1>
          <p className="text-sm text-charcoal-500 mt-0.5">
            {completed.length} {gu ? 'પૂર્ણ થયેલ વ્યવહાર' : 'completed sale(s)'}
          </p>
        </div>
        <Link to="/ai-assistant" className="btn-secondary flex items-center gap-2 text-sm">
          <BarChart2 size={15} />
          {gu ? 'AI ને પૂછો' : 'Ask AI'}
        </Link>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: gu ? 'કુલ વેચાણ' : 'Total Sales',    value: `₹${(totalValue / 1000).toFixed(1)}K`, icon: DollarSign },
          { label: gu ? 'મીઠું વેચ્યું' : 'Salt Sold',   value: `${totalKg.toLocaleString()} kg`,        icon: Package },
          { label: gu ? 'સ. ભાવ' : 'Avg. Price',         value: avgPrice > 0 ? `₹${avgPrice.toFixed(2)}/kg` : '—', icon: TrendingUp },
          { label: gu ? 'વ્યવહાર' : 'Transactions',       value: completed.length,                        icon: BarChart2 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="card">
            <Icon size={16} className="text-charcoal-400 mb-2" />
            <p className="text-xl font-bold text-charcoal-900">{value}</p>
            <p className="text-xs text-charcoal-500 mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Mini bar chart */}
      {completed.length > 0 && (
        <div className="card">
          <p className="section-label mb-3">
            {gu ? 'માસ પ્રમાણે વેચાણ' : 'Sales by Month'}
          </p>
          <MiniBarChart transactions={completed} />
        </div>
      )}

      {/* Transaction list */}
      <div className="space-y-3">
        {transactions.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-12 text-center">
            <Package size={40} className="text-charcoal-200 mb-3" />
            <p className="text-charcoal-500 font-medium">
              {gu ? 'હજી કોઈ વ્યવહાર નથી' : 'No transactions yet'}
            </p>
            <p className="text-sm text-charcoal-400 mt-1 mb-4">
              {gu ? 'લિસ્ટિંગ બનાવો અને ઑફર સ્વીકારો' : 'Create a listing and accept an offer to get started.'}
            </p>
            <Link to="/salt-market" className="btn-primary text-sm">
              {gu ? 'બજાર જુઓ' : 'View Market'}
            </Link>
          </div>
        ) : transactions.map(tx => (
          <Link key={tx.id} to={`/transactions/${tx.id}`} className="card block hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-charcoal-400">{tx.transaction_ref}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge[tx.status] ?? 'bg-charcoal-100 text-charcoal-600'}`}>
                    {tx.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="font-semibold text-charcoal-900">
                  {tx.salt_type ?? 'Salt'}{tx.quality_grade ? ` — ${tx.quality_grade}` : ''} · {tx.quantity_kg?.toLocaleString()} kg
                </p>
                <p className="text-sm text-charcoal-500 mt-0.5">
                  ₹{tx.agreed_price_per_kg}/kg · {gu ? 'કુલ' : 'Total'}:{' '}
                  <strong className="text-charcoal-900">₹{tx.total_amount?.toLocaleString('en-IN')}</strong>
                </p>
                <p className="text-xs text-charcoal-400 mt-1">
                  {new Date(tx.created_at).toLocaleDateString('en-IN')}
                </p>
              </div>
              <span className="text-xs text-eucalyptus-600 font-medium mt-1">
                {gu ? 'જુઓ →' : 'View →'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MySalesPage;

function MiniBarChart({ transactions }: { transactions: Transaction[] }) {
  const monthly: Record<string, number> = {};
  transactions.forEach(tx => {
    const m = new Date(tx.created_at).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    monthly[m] = (monthly[m] ?? 0) + (tx.total_amount ?? 0);
  });
  const entries = Object.entries(monthly).slice(-6);
  const max = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div className="flex items-end gap-2 h-20">
      {entries.map(([month, value]) => (
        <div key={month} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-eucalyptus-200 rounded-t-sm transition-all"
            style={{ height: `${(value / max) * 64}px`, minHeight: 4 }}
          />
          <span className="text-xs text-charcoal-400 truncate w-full text-center">{month}</span>
        </div>
      ))}
    </div>
  );
}
