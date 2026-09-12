import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart2, TrendingUp, Package, DollarSign, ArrowRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { offersApi, marketplaceApi } from '../services/api';
import { Transaction, SaltType, SaltGrade } from '../types';
import { EmptyState, Spinner } from '../components/UI';

export default function MySalesPage() {
  const { language } = useLanguage();
  const gu = language === 'gu';

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [saltTypes, setSaltTypes] = useState<SaltType[]>([]);
  const [saltGrades, setSaltGrades] = useState<SaltGrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [txRes, typesRes, gradesRes] = await Promise.allSettled([
        offersApi.getMyTransactions(),
        marketplaceApi.getSaltTypes(),
        marketplaceApi.getSaltGrades(),
      ]);
      if (txRes.status === 'fulfilled') setTransactions(txRes.value.data ?? []);
      if (typesRes.status === 'fulfilled') setSaltTypes(typesRes.value.data ?? []);
      if (gradesRes.status === 'fulfilled') setSaltGrades(gradesRes.value.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const completed = transactions.filter(tx => ['COMPLETED', 'CONFIRMED', 'DELIVERED'].includes(tx.status));
  const totalValue = completed.reduce((s, tx) => s + (tx.totalAmount ?? 0), 0);
  const totalKg = completed.reduce((s, tx) => s + (tx.quantityKg ?? 0), 0);
  const avgPrice = totalKg > 0 ? totalValue / totalKg : 0;

  const statusClass: Record<string, string> = {
    CONFIRMED: 'badge bg-eucalyptus-100 text-eucalyptus-700',
    IN_TRANSIT: 'badge bg-amber-100 text-amber-700',
    DELIVERED: 'badge bg-blue-100 text-blue-700',
    COMPLETED: 'badge-completed',
    DISPUTED: 'badge bg-red-100 text-red-700',
    CANCELLED: 'badge-cancelled',
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="section-label mb-0.5">{gu ? 'ઇ.' : 'History'}</p>
          <h1 className="text-2xl font-bold text-charcoal-900">{gu ? 'મારા ?' : 'My Sales'}</h1>
          <p className="text-sm text-charcoal-500 mt-0.5">{completed.length} {gu ? '&#x07E8;.' : 'completed sale(s)'}</p>
        </div>
        <Link to="/ai-assistant" className="btn-secondary flex items-center gap-2 text-sm">
          <BarChart2 size={15} /> {gu ? 'AI ?' : 'Ask AI'}
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={gu ? 'ક. !' : 'Total Sales'} value={`₹${(totalValue / 1000).toFixed(1)}K`} icon={DollarSign} />
        <StatCard label={gu ? 'ĺ.' : 'Salt Sold'} value={`${totalKg.toLocaleString()} kg`} icon={Package} />
        <StatCard label={gu ? 'ĺ.' : 'Avg. Price'} value={avgPrice > 0 ? `₹${avgPrice.toFixed(2)}/kg` : '—'} icon={TrendingUp} />
        <StatCard label={gu ? 'ĺ.' : 'Transactions'} value={completed.length} icon={BarChart2} />
      </div>

      {/* Monthly simple chart placeholder */}
      {completed.length > 0 && (
        <div className="card">
          <p className="section-label mb-3">{gu ? 'ĺ.' : 'Sales by Month'}</p>
          <MiniBarChart transactions={completed} />
        </div>
      )}

      {/* Transaction list */}
      <div className="space-y-3">
        {transactions.length === 0 ? (
          <EmptyState
            message={gu ? 'ĺ.' : 'No sales yet. Create a listing and accept an offer to get started.'}
            action={<Link to="/market" className="btn-primary mt-2 inline-block text-sm">{gu ? 'ĺ.' : 'View Market'}</Link>}
          />
        ) : transactions.map(tx => {
          const type = saltTypes.find(t => t.id === tx.listing?.saltTypeId);
          const grade = saltGrades.find(g => g.id === tx.listing?.saltGradeId);
          return (
            <div key={tx.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-charcoal-400">{tx.transactionRef}</span>
                    <span className={`${statusClass[tx.status] ?? 'badge-pending'} text-xs`}>{tx.status}</span>
                  </div>
                  <p className="font-semibold text-charcoal-900">
                    {type?.name ?? 'Salt'}{grade ? ` — ${grade.name}` : ''} · {tx.quantityKg?.toLocaleString()} kg
                  </p>
                  <p className="text-sm text-charcoal-500 mt-0.5">
                    ₹{tx.agreedPricePerKg}/kg · {gu ? 'ĺ.' : 'Total'}: <strong className="text-charcoal-900">₹{tx.totalAmount?.toLocaleString('en-IN')}</strong>
                  </p>
                  <p className="text-xs text-charcoal-400 mt-1">{new Date(tx.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <Link to="/ai-assistant" className="btn-secondary text-xs px-2 py-1 flex items-center gap-1">
                  Ask AI
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <div className="card">
      <Icon size={16} className="text-charcoal-400 mb-2" />
      <p className="text-xl font-bold text-charcoal-900">{value}</p>
      <p className="text-xs text-charcoal-500 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

function MiniBarChart({ transactions }: { transactions: Transaction[] }) {
  // Group by month
  const monthly: Record<string, number> = {};
  transactions.forEach(tx => {
    const m = new Date(tx.createdAt).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    monthly[m] = (monthly[m] ?? 0) + (tx.totalAmount ?? 0);
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
