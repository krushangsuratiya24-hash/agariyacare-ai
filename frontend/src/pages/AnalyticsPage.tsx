import React, { useEffect, useState } from 'react';
import { BarChart2, TrendingUp, ShieldAlert, Heart, Users, AlertTriangle } from 'lucide-react';
import { analyticsApi } from '../services/api';
import { PageHeader, MetricCard, Spinner, AlertBanner } from '../components/UI';

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [safety, setSafety] = useState<any>(null);
  const [healthcare, setHealthcare] = useState<any>(null);
  const [market, setMarket] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [sumRes, safeRes, hcRes, mkRes] = await Promise.all([
          analyticsApi.getSummary(),
          analyticsApi.getSafety(),
          analyticsApi.getHealthcare(),
          analyticsApi.getMarket(),
        ]);
        setSummary(sumRes.data);
        setSafety(safeRes.data);
        setHealthcare(hcRes.data);
        setMarket(mkRes.data ?? []);
      } catch {
        setError('Unable to load analytics data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Development Platform Metrics — fictional data" />
      <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
        ⚠️ <strong>Development Platform Metrics</strong> — these figures are from development demonstration data and do not represent real-world statistics.
      </div>

      {error && <AlertBanner type="error" message={error} />}

      {loading ? (
        <div className="flex items-center justify-center h-40"><Spinner size={28} /></div>
      ) : (
        <>
          {/* Summary metrics */}
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              <MetricCard title="Total Workers" value={summary.totalWorkers} icon={Users} color="ocean" />
              <MetricCard title="Active Safety Alerts" value={summary.activeAlerts} icon={ShieldAlert} color="red" />
              <MetricCard title="Pending Healthcare Requests" value={summary.pendingHealthcareRequests} icon={Heart} color="amber" />
              <MetricCard title="Total Healthcare Requests" value={summary.totalHealthcareRequests} icon={Heart} color="teal" />
              <MetricCard title="Open Support Requests" value={summary.openSupportRequests} icon={Users} color="green" />
              <MetricCard title="Safety Incidents" value={summary.totalIncidents} icon={AlertTriangle} color="red" />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Healthcare breakdown */}
            {healthcare && (
              <div className="card">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Heart size={16} /> Healthcare Requests by Status</h3>
                {Object.entries(healthcare.byStatus as Record<string, number>).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between py-1.5 border-b last:border-0 border-gray-50 text-sm">
                    <span className="text-gray-600">{status}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-ocean-400 rounded-full" style={{ width: `${(count / healthcare.total) * 100}%` }} />
                      </div>
                      <span className="font-semibold text-gray-800 w-4 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Safety readings */}
            {safety && (
              <div className="card">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><ShieldAlert size={16} /> Safety Readings by Level</h3>
                {Object.entries(safety.readingsByLevel as Record<string, number>).map(([level, count]) => {
                  const color = level === 'EMERGENCY' ? 'bg-red-400' : level === 'HIGH_RISK' ? 'bg-orange-400' : level === 'CAUTION' ? 'bg-yellow-400' : 'bg-green-400';
                  const total = Object.values(safety.readingsByLevel as Record<string, number>).reduce((a, b) => a + b, 0);
                  return (
                    <div key={level} className="flex items-center justify-between py-1.5 border-b last:border-0 border-gray-50 text-sm">
                      <span className="text-gray-600">{level.replace('_', ' ')}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full`} style={{ width: `${(count / total) * 100}%` }} />
                        </div>
                        <span className="font-semibold text-gray-800 w-4 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Market trend */}
            {market.length > 0 && (
              <div className="card lg:col-span-2">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <TrendingUp size={16} /> Salt Price Trend — 7 Days (Development Reference Data)
                </h3>
                <div className="flex items-end gap-2 h-32">
                  {market.map((entry, i) => {
                    const max = Math.max(...market.map(e => e.pricePerTonne));
                    const min = Math.min(...market.map(e => e.pricePerTonne));
                    const range = max - min || 1;
                    const h = Math.round(((entry.pricePerTonne - min) / range) * 90 + 20);
                    return (
                      <div key={i} className="flex flex-col items-center flex-1 min-w-0">
                        <div className="text-xs text-gray-500 mb-1 hidden lg:block">₹{entry.pricePerTonne}</div>
                        <div className="bg-ocean-400 hover:bg-ocean-500 rounded-t w-full transition-colors" style={{ height: `${h}px` }}
                          title={`${entry.market}: ₹${entry.pricePerTonne}`} />
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
        </>
      )}
    </div>
  );
}
