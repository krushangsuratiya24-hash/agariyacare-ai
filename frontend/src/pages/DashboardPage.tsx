import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, ShoppingCart, DollarSign, BarChart2, Bot, ShieldAlert,
  Heart, Plus, ArrowRight, TrendingUp, Bell, AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { marketplaceApi, offersApi, safetyApi, notificationsApi } from '../services/api';
import { SaltInventory, SaltListing, Offer, Transaction } from '../types';
import { Spinner } from '../components/UI';

function greeting(name: string, gu: boolean) {
  const h = new Date().getHours();
  if (gu) {
    const g = h < 12 ? 'સુપ્રભાત' : h < 17 ? 'નમસ્ટે' : 'શુભ સાંજ';
    return `${g}, ${name}`;
  }
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${g}, ${name}`;
}

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const gu = language === 'gu';
  const navigate = useNavigate();

  const [inventory, setInventory] = useState<SaltInventory[]>([]);
  const [listings, setListings] = useState<SaltListing[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [safetyLevel, setSafetyLevel] = useState<'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME'>('LOW');

  useEffect(() => {
    async function load() {
      try {
        const results = await Promise.allSettled([
          marketplaceApi.getInventory(),
          marketplaceApi.getMyListings(),
          offersApi.getMyOffers(),
          offersApi.getMyTransactions(),
          currentUser ? notificationsApi.getUnread(currentUser.id) : Promise.resolve({ data: [] }),
        ]);
        if (results[0].status === 'fulfilled') setInventory(results[0].value.data ?? []);
        if (results[1].status === 'fulfilled') setListings(results[1].value.data ?? []);
        if (results[2].status === 'fulfilled') setOffers(results[2].value.data ?? []);
        if (results[3].status === 'fulfilled') setTransactions(results[3].value.data ?? []);
        if (results[4].status === 'fulfilled') setUnreadCount((results[4].value.data ?? []).length);

        // Simple safety heuristic from hour
        const h = new Date().getHours();
        if (h >= 11 && h <= 16) setSafetyLevel('HIGH');
        else if (h >= 9 && h <= 17) setSafetyLevel('MODERATE');
        else setSafetyLevel('LOW');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser]);

  const totalAvailableKg = inventory.reduce((s, i) => s + i.availableQuantityKg, 0);
  const activeListings = listings.filter(l => l.status === 'ACTIVE').length;
  const pendingOffers = offers.filter(o => o.status === 'PENDING').length;
  const totalSalesValue = transactions
    .filter(tx => tx.status === 'COMPLETED' || tx.status === 'CONFIRMED')
    .reduce((s, tx) => s + (tx.totalAmount ?? 0), 0);

  const latestOffer = offers.filter(o => o.status === 'PENDING').sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

  const isBuyer = currentUser?.role === 'buyer';
  const isWorker = currentUser?.role === 'worker';

  const safetyConfig = {
    LOW: { label: gu ? 'સામાન્ય' : 'Normal', color: 'text-eucalyptus-700', bg: 'bg-eucalyptus-50 border-eucalyptus-100', dot: 'bg-eucalyptus-400', tip: gu ? 'કામ સુરક્ષિત છે. પૂરતું પાણી પીઓ.' : 'Safe to work. Stay hydrated.' },
    MODERATE: { label: gu ? 'સાધારણ' : 'Moderate', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100', dot: 'bg-amber-400', tip: gu ? 'ઝડપ ઓછી કરો. છાંટ લો.' : 'Take shade breaks regularly.' },
    HIGH: { label: gu ? 'ઊંચો' : 'High Heat', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-100', dot: 'bg-orange-400', tip: gu ? '11–4 વાગ્યે ભારે કામ ટાળો.' : 'Avoid heavy work between 11am–4pm.' },
    EXTREME: { label: gu ? 'અત્યંત' : 'Extreme', color: 'text-red-700', bg: 'bg-red-50 border-red-100', dot: 'bg-red-400', tip: gu ? 'કામ બંધ કરો. પ્રાથમિક ઉપચાર કરો.' : 'Stop work. Seek shade immediately.' },
  };
  const sc = safetyConfig[safetyLevel];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wide mb-0.5">
            {gu ? 'ડૅશબૉર્ડ' : 'Dashboard'}
          </p>
          <h1 className="text-2xl font-bold text-charcoal-900">
            {greeting(currentUser?.name?.split(' ')[0] ?? '', gu)}
          </h1>
          <p className="text-sm text-charcoal-500 mt-0.5">
            {gu ? 'તમારો મીઠો ઉદ્યોગ — એક નજરે.' : 'Your salt business at a glance.'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Link to="/notifications" className="flex items-center gap-2 bg-eucalyptus-50 border border-eucalyptus-100 text-eucalyptus-700 text-sm px-3 py-2 rounded-lg hover:bg-eucalyptus-100 transition-colors">
            <Bell size={16} />
            <span className="font-medium">{unreadCount} {gu ? 'નવી' : 'new'}</span>
          </Link>
        )}
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {isWorker && (
          <>
            <MetricTile
              label={gu ? 'ઉપલબ્ધ મીઠું' : 'Salt Available'}
              value={totalAvailableKg > 0 ? `${totalAvailableKg.toLocaleString()} kg` : '—'}
              icon={Package}
              to="/my-salt"
            />
            <MetricTile
              label={gu ? 'સક્રિય લિસ્ટિંગ' : 'Active Listings'}
              value={activeListings}
              icon={ShoppingCart}
              to="/market"
            />
          </>
        )}
        <MetricTile
          label={gu ? 'ઑફર બાકી' : 'Pending Offers'}
          value={pendingOffers}
          icon={DollarSign}
          to="/my-offers"
          highlight={pendingOffers > 0}
        />
        <MetricTile
          label={gu ? 'વેચાણ' : 'Total Sales'}
          value={totalSalesValue > 0 ? `₹${(totalSalesValue / 1000).toFixed(1)}K` : '₹0'}
          icon={BarChart2}
          to="/my-sales"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">

          {/* Salt inventory card — worker only */}
          {isWorker && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="section-label">{gu ? 'મારું મીઠું' : 'My Salt'}</p>
                  <h2 className="text-lg font-semibold text-charcoal-900">
                    {totalAvailableKg > 0
                      ? `${totalAvailableKg.toLocaleString()} kg ${gu ? 'ઉપલબ્ધ' : 'available'}`
                      : gu ? 'કોઈ ઇન્વૅન્ટ્રી નથી' : 'No inventory yet'}
                  </h2>
                  <p className="text-sm text-charcoal-400 mt-0.5">
                    {listings.length > 0
                      ? `${activeListings} ${gu ? 'સક્રિય લિસ્ટિંગ' : 'active listing(s)'}`
                      : gu ? 'કોઈ લિસ્ટિંગ નથી' : 'No listings yet'}
                  </p>
                </div>
                <Package size={32} className="text-eucalyptus-300" />
              </div>
              <div className="flex gap-2">
                <Link to="/my-salt" className="btn-primary flex items-center gap-1.5 text-sm">
                  <Package size={14} /> {gu ? 'મીઠું ઉમેરો' : 'Manage Salt'}
                </Link>
                <Link to="/my-salt/create-listing" className="btn-secondary flex items-center gap-1.5 text-sm">
                  <Plus size={14} /> {gu ? 'વેચો' : 'Sell Salt'}
                </Link>
              </div>
            </div>
          )}

          {/* Latest pending offer */}
          {latestOffer && (
            <div className="card border-l-4 border-l-eucalyptus-400">
              <div className="flex items-start justify-between">
                <div>
                  <p className="section-label">{gu ? 'નવી ઑફર' : 'Latest Offer'}</p>
                  <h2 className="text-lg font-semibold text-charcoal-900">
                    ₹{latestOffer.pricePerKg}/kg · {latestOffer.quantityKg.toLocaleString()} kg
                  </h2>
                  <p className="text-sm text-charcoal-500 mt-0.5">
                    {gu ? 'ઑફર બાકી — AgariyaCare AI ને પૂછો' : 'Pending — Ask AgariyaCare AI for advice'}
                  </p>
                </div>
                <span className="badge-pending">{gu ? 'બાકી' : 'Pending'}</span>
              </div>
              <div className="flex gap-2 mt-4">
                <Link to="/my-offers" className="btn-primary text-sm flex items-center gap-1.5">
                  <DollarSign size={14} /> {gu ? 'ઑફર જુઓ' : 'View Offer'}
                </Link>
                <Link to="/ai-assistant" className="btn-secondary text-sm flex items-center gap-1.5">
                  <Bot size={14} /> {gu ? 'AI ને પૂછો' : 'Ask AI'}
                </Link>
              </div>
            </div>
          )}

          {/* Market opportunity */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="section-label">{gu ? 'બજારની તક' : 'Market Opportunity'}</p>
                <h2 className="text-lg font-semibold text-charcoal-900">
                  {gu ? 'Salt Market' : 'Salt Market'}
                </h2>
                <p className="text-sm text-charcoal-400 mt-0.5">
                  {gu ? 'ખરીદદારો અને ઑફર્સ શોધો' : 'Browse buyer demand and active listings.'}
                </p>
              </div>
              <ShoppingCart size={32} className="text-sage-300" />
            </div>
            <Link to="/market" className="btn-secondary flex items-center gap-2 text-sm w-fit">
              {gu ? 'બજાર જુઓ' : 'View Market'} <ArrowRight size={14} />
            </Link>
          </div>

          {/* Buyer-specific */}
          {isBuyer && (
            <div className="card">
              <p className="section-label">{gu ? 'ખરીદ કેન્દ્ર' : 'Buyer Hub'}</p>
              <div className="flex gap-2 mt-3">
                <Link to="/buyer-requests" className="btn-primary text-sm">
                  {gu ? 'મારી વિનંતી' : 'My Requests'}
                </Link>
                <Link to="/saved-listings" className="btn-secondary text-sm">
                  {gu ? 'સાચવેલ' : 'Saved Listings'}
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* AI assistant shortcut */}
          <div className="card bg-charcoal-800 text-white border-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-eucalyptus-600 rounded-lg flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-charcoal-300">AgariyaCare AI</p>
                <p className="text-sm font-semibold text-white">IBM Granite</p>
              </div>
            </div>
            <p className="text-sm text-charcoal-300 mb-4 leading-relaxed">
              {gu
                ? '"આજે તમારા મીઠા ઉદ્યોગ માટે હું કઈ રીતે મદદ કરી શકું?"'
                : '"How can I help with your salt business today?"'}
            </p>
            <Link to="/ai-assistant" className="flex items-center justify-center gap-2 bg-eucalyptus-600 hover:bg-eucalyptus-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors w-full">
              <Bot size={14} /> {gu ? 'AI ને પૂછો' : 'Ask AI'}
            </Link>
          </div>

          {/* Safety card */}
          <div className={`card border ${sc.bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${sc.dot}`} />
              <p className="text-xs font-semibold uppercase tracking-wide text-charcoal-500">
                {gu ? 'આજની સુરક્ષા' : "Today's Safety"}
              </p>
            </div>
            <p className={`text-base font-bold ${sc.color} mb-1`}>{sc.label}</p>
            <p className="text-sm text-charcoal-500">{sc.tip}</p>
            <Link to="/safety" className="text-xs text-eucalyptus-600 hover:underline mt-2 inline-block">
              {gu ? 'વધારે' : 'Safety details →'}
            </Link>
          </div>

          {/* Quick links */}
          <div className="card">
            <p className="section-label mb-3">{gu ? 'ઝડપી લિંક' : 'Quick Links'}</p>
            <div className="space-y-1">
              {[
                { to: '/healthcare', icon: Heart, label: gu ? 'આરોગ્ય' : 'Healthcare' },
                { to: '/welfare', icon: BarChart2, label: gu ? 'કલ્યાણ' : 'Welfare' },
                { to: '/community', icon: TrendingUp, label: gu ? 'સમુદાય' : 'Community' },
              ].map(item => (
                <Link key={item.to} to={item.to} className="flex items-center gap-2 text-sm text-charcoal-600 hover:text-eucalyptus-700 py-1.5 rounded group">
                  <item.icon size={14} className="text-charcoal-400 group-hover:text-eucalyptus-500" />
                  {item.label}
                  <ArrowRight size={12} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricTile({ label, value, icon: Icon, to, highlight }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  to: string;
  highlight?: boolean;
}) {
  return (
    <Link to={to} className={`card flex flex-col gap-2 hover:shadow-md transition-shadow cursor-pointer ${highlight ? 'border-eucalyptus-200 bg-eucalyptus-50/30' : ''}`}>
      <div className="flex items-center justify-between">
        <Icon size={18} className={highlight ? 'text-eucalyptus-600' : 'text-charcoal-400'} />
        {highlight && <span className="w-2 h-2 bg-eucalyptus-500 rounded-full" />}
      </div>
      <div>
        <p className="text-2xl font-bold text-charcoal-900">{value}</p>
        <p className="text-xs text-charcoal-500 mt-0.5 leading-tight">{label}</p>
      </div>
    </Link>
  );
}
