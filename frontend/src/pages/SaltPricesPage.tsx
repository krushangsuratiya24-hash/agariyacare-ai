// @ts-nocheck

import React, { useEffect, useState } from 'react';
import { TrendingUp, Calculator, AlertCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { marketApi } from '../services/api';
import { SaltPriceEntry, PriceComparison } from '../types';
import { PageHeader, Spinner, AlertBanner, Disclaimer } from '../components/UI';

export default function SaltPricesPage() {
  const { t } = useLanguage();
  const [prices, setPrices] = useState<SaltPriceEntry[]>([]);
  const [trend, setTrend] = useState<SaltPriceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'prices' | 'calculator'>('prices');

  // Calculator state
  const [quantity, setQuantity] = useState('');
  const [buyerOffer, setBuyerOffer] = useState('');
  const [comparison, setComparison] = useState<PriceComparison | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [latestRes, trendRes] = await Promise.all([
          marketApi.getLatestPrices(),
          marketApi.getTrends(7),
        ]);
        setPrices(latestRes.data ?? []);
        setTrend(trendRes.data ?? []);
      } catch {
        setError('Unable to load market data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleCompare(e: React.FormEvent) {
    e.preventDefault();
    const q = parseFloat(quantity);
    const b = parseFloat(buyerOffer);
    if (!q || !b || q <= 0 || b <= 0) {
      setCalcError('Please enter valid positive numbers.');
      return;
    }
    setCalcLoading(true);
    setCalcError('');
    try {
      const res = await marketApi.compare(q, b);
      setComparison(res.data);
    } catch (e: any) {
      setCalcError(e.message || 'Calculation failed.');
    } finally {
      setCalcLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title={t.saltPrice.title} subtitle={t.saltPrice.subtitle} />
      <Disclaimer text={t.saltPrice.disclaimer} />

      <div className="flex gap-1 mt-4 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: 'prices', label: 'Market Prices' },
          { key: 'calculator', label: 'Price Calculator' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === key ? 'bg-white text-ocean-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >{label}</button>
        ))}
      </div>

      {error && <AlertBanner type="error" message={error} />}

      {loading ? (
        <div className="flex items-center justify-center h-40"><Spinner size={28} /></div>
      ) : tab === 'prices' ? (
        <div className="space-y-4">
          {/* Price summary */}
          {prices.length > 0 && (() => {
            const vals = prices.map(p => p.pricePerTonne);
            const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
            const min = Math.min(...vals);
            const max = Math.max(...vals);
            return (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[['Average', avg], ['Minimum', min], ['Maximum', max]].map(([label, val]) => (
                  <div key={label as string} className="card text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">{label as string}</div>
                    <div className="text-xl font-bold text-gray-900 mt-1">₹{(val as number).toLocaleString('en-IN')}</div>
                    <div className="text-xs text-gray-400">per tonne</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Prices table */}
          <div className="card overflow-auto">
            <h3 className="font-semibold text-gray-800 mb-3">Current Reference Prices</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                  <th className="pb-2 pr-4">Market</th>
                  <th className="pb-2 pr-4">Salt Type</th>
                  <th className="pb-2 pr-4">Grade</th>
                  <th className="pb-2 pr-4 text-right">Price/Tonne</th>
                  <th className="pb-2">Buyer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {prices.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-800">{p.market}</td>
                    <td className="py-2 pr-4 text-gray-600">{p.saltType}</td>
                    <td className="py-2 pr-4"><span className="badge bg-blue-50 text-blue-700">{p.qualityGrade}</span></td>
                    <td className="py-2 pr-4 text-right font-bold text-gray-900">₹{p.pricePerTonne.toLocaleString('en-IN')}</td>
                    <td className="py-2 text-gray-500 text-xs">{p.buyer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 7-day trend */}
          {trend.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <TrendingUp size={16} /> 7-Day Price Trend (Development Data)
              </h3>
              <div className="flex items-end gap-2 h-24">
                {trend.map((entry, i) => {
                  const max = Math.max(...trend.map(e => e.pricePerTonne));
                  const min = Math.min(...trend.map(e => e.pricePerTonne));
                  const range = max - min || 1;
                  const height = Math.round(((entry.pricePerTonne - min) / range) * 70 + 20);
                  return (
                    <div key={entry.id} className="flex flex-col items-center flex-1 min-w-0">
                      <div className="text-xs text-gray-500 mb-1 hidden sm:block">₹{entry.pricePerTonne}</div>
                      <div className="bg-ocean-400 rounded-t w-full" style={{ height: `${height}px` }} title={`₹${entry.pricePerTonne}`} />
                      <div className="text-xs text-gray-400 mt-1 truncate w-full text-center">
                        {new Date(entry.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Price calculator
        <div className="max-w-lg">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Calculator size={16} /> Buyer Offer Comparison
            </h3>
            <p className="text-sm text-gray-500 mb-4">Compare your buyer's offer against reference market prices.</p>
            {calcError && <AlertBanner type="error" message={calcError} />}
            <form onSubmit={handleCompare} className="space-y-4 mt-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.saltPrice.quantity}</label>
                <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)}
                  className="input-field" placeholder="e.g. 10" min="0.1" step="0.1" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.saltPrice.buyerOffer}</label>
                <input type="number" value={buyerOffer} onChange={e => setBuyerOffer(e.target.value)}
                  className="input-field" placeholder="e.g. 1800" min="1" required />
              </div>
              <button type="submit" disabled={calcLoading} className="btn-primary w-full">
                {calcLoading ? 'Calculating...' : t.saltPrice.calculate}
              </button>
            </form>

            {comparison && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h4 className="font-semibold text-gray-900 mb-3">Comparison Result</h4>
                <div className="space-y-2 text-sm">
                  {[
                    ['Reference Price', `₹${comparison.referencePrice.toLocaleString('en-IN')}/tonne`],
                    ['Your Buyer\'s Offer', `₹${comparison.buyerOffer.toLocaleString('en-IN')}/tonne`],
                    ['Reference Value', `₹${comparison.referenceValue.toLocaleString('en-IN')}`],
                    ['Offer Value', `₹${comparison.offerValue.toLocaleString('en-IN')}`],
                    ['Difference', `₹${Math.abs(comparison.difference).toLocaleString('en-IN')} ${comparison.difference < 0 ? 'less' : 'more'}`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-semibold text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
                <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${
                  comparison.percentageDifference >= -5 ? 'bg-green-50 text-green-800'
                  : comparison.percentageDifference >= -15 ? 'bg-yellow-50 text-yellow-800'
                  : 'bg-red-50 text-red-800'
                }`}>
                  {comparison.percentageDifference >= 0
                    ? `✓ Your buyer's offer is ${comparison.percentageDifference}% above the reference price.`
                    : `⚠️ Your buyer's offer is ${Math.abs(comparison.percentageDifference)}% below the reference price.`}
                </div>
                <p className="text-xs text-gray-400 mt-2">⚠️ Reference prices are development data. Verify with official sources.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
