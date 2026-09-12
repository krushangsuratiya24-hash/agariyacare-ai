import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, ShoppingCart, MapPin, Package, RefreshCw, Bookmark, BookmarkCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { marketplaceApi } from '../services/api';
import { SaltListing, SaltType, SaltGrade, BuyerRequest } from '../types';
import { EmptyState, Spinner } from '../components/UI';

type Tab = 'listings' | 'demand';

export default function MarketplacePage() {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const gu = language === 'gu';

  const [tab, setTab] = useState<Tab>('listings');
  const [listings, setListings] = useState<SaltListing[]>([]);
  const [buyerRequests, setBuyerRequests] = useState<BuyerRequest[]>([]);
  const [saltTypes, setSaltTypes] = useState<SaltType[]>([]);
  const [saltGrades, setSaltGrades] = useState<SaltGrade[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [listRes, demandRes, typesRes, gradesRes, savedRes] = await Promise.allSettled([
        marketplaceApi.getListings({ status: 'ACTIVE' }),
        marketplaceApi.getBuyerRequests({ status: 'OPEN' }),
        marketplaceApi.getSaltTypes(),
        marketplaceApi.getSaltGrades(),
        currentUser?.role === 'buyer' ? marketplaceApi.getSaved() : Promise.resolve({ data: [] }),
      ]);
      if (listRes.status === 'fulfilled') setListings(listRes.value.data ?? []);
      if (demandRes.status === 'fulfilled') setBuyerRequests(demandRes.value.data ?? []);
      if (typesRes.status === 'fulfilled') setSaltTypes(typesRes.value.data ?? []);
      if (gradesRes.status === 'fulfilled') setSaltGrades(gradesRes.value.data ?? []);
      if (savedRes.status === 'fulfilled') setSaved((savedRes.value.data ?? []).map((s: any) => s.listingId ?? s.id));
    } finally {
      setLoading(false);
    }
  }

  async function toggleSave(listingId: string) {
    if (saved.includes(listingId)) {
      await marketplaceApi.unsaveListing(listingId);
      setSaved(p => p.filter(id => id !== listingId));
    } else {
      await marketplaceApi.saveListing(listingId);
      setSaved(p => [...p, listingId]);
    }
  }

  const filtered = listings
    .filter(l => {
      const type = saltTypes.find(t => t.id === l.saltTypeId)?.name ?? '';
      const grade = saltGrades.find(g => g.id === l.saltGradeId)?.name ?? '';
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || type.toLowerCase().includes(q) || grade.toLowerCase().includes(q) || (l.pickupDistrict ?? '').toLowerCase().includes(q);
      const matchType = !filterType || l.saltTypeId === filterType;
      const matchGrade = !filterGrade || l.saltGradeId === filterGrade;
      return matchSearch && matchType && matchGrade;
    })
    .sort((a, b) => {
      if (sort === 'price_low') return a.askingPricePerKg - b.askingPricePerKg;
      if (sort === 'price_high') return b.askingPricePerKg - a.askingPricePerKg;
      if (sort === 'quantity') return b.quantityKg - a.quantityKg;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="section-label mb-0.5">{gu ? 'બજાર' : 'Marketplace'}</p>
          <h1 className="text-2xl font-bold text-charcoal-900">{gu ? 'Salt Market' : 'Salt Market'}</h1>
          <p className="text-sm text-charcoal-500 mt-0.5">
            {gu ? 'ખ. શો.' : `${filtered.length} active listing(s) · ${buyerRequests.length} buyer request(s)`}
          </p>
        </div>
        {currentUser?.role === 'worker' && (
          <Link to="/my-salt/create-listing" className="btn-primary flex items-center gap-2 text-sm">
            <ShoppingCart size={15} /> {gu ? 'વ. ?' : 'Sell Salt'}
          </Link>
        )}
        {currentUser?.role === 'buyer' && (
          <Link to="/buyer-requests" className="btn-primary flex items-center gap-2 text-sm">
            <Package size={15} /> {gu ? 'વ. !' : 'Post Demand'}
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-charcoal-100">
        {(['listings', 'demand'] as Tab[]).map(tb => (
          <button key={tb} onClick={() => setTab(tb)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === tb ? 'border-eucalyptus-600 text-eucalyptus-700' : 'border-transparent text-charcoal-500 hover:text-charcoal-700'}`}
          >
            {tb === 'listings'
              ? `${gu ? 'ઉ. ?' : 'Active Listings'} (${filtered.length})`
              : `${gu ? 'ખ. !' : 'Buyer Demand'} (${buyerRequests.length})`}
          </button>
        ))}
      </div>

      {tab === 'listings' && (
        <>
          {/* Search + filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
              <input className="input pl-9" placeholder={gu ? 'ખ. શ., !) ' : 'Search by type, grade, location…'}
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <select className="input w-auto min-w-32" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">{gu ? 'બ. ?' : 'All Types'}</option>
              {saltTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select className="input w-auto min-w-32" value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
              <option value="">{gu ? 'બ. ?' : 'All Grades'}</option>
              {saltGrades.filter(g => !filterType || g.saltTypeId === filterType).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <select className="input w-auto min-w-32" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="newest">{gu ? 'ન.' : 'Newest'}</option>
              <option value="price_low">{gu ? 'ભ. ↑' : 'Price ↑'}</option>
              <option value="price_high">{gu ? 'ભ. ↓' : 'Price ↓'}</option>
              <option value="quantity">{gu ? 'જ.' : 'Quantity'}</option>
            </select>
          </div>

          {/* Listing cards */}
          {filtered.length === 0 ? (
            <EmptyState
              message={gu ? 'કોઈ ?' : 'No active listings match your search.'}
              action={
                <button onClick={() => { setSearchQuery(''); setFilterType(''); setFilterGrade(''); }} className="btn-secondary mt-2">
                  {gu ? 'ફ. ?' : 'Clear Filters'}
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(listing => {
                const type = saltTypes.find(t => t.id === listing.saltTypeId);
                const grade = saltGrades.find(g => g.id === listing.saltGradeId);
                const isSaved = saved.includes(listing.id);
                const isOwn = currentUser?.id === listing.workerId || currentUser?.id === listing.sellerId;
                return (
                  <div key={listing.id} className="card hover:shadow-md transition-shadow flex flex-col gap-3">
                    {/* Salt type badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-sand-100 rounded-lg flex items-center justify-center">
                          <span className="text-lg">🧂</span>
                        </div>
                        <div>
                          <p className="text-xs text-charcoal-400">{type?.name ?? 'Salt'}</p>
                          <p className="text-sm font-semibold text-charcoal-900">{grade?.name ?? '—'}</p>
                        </div>
                      </div>
                      {currentUser?.role === 'buyer' && !isOwn && (
                        <button onClick={() => toggleSave(listing.id)} className="p-1.5 rounded-lg hover:bg-charcoal-50 text-charcoal-400 hover:text-eucalyptus-600 transition-colors">
                          {isSaved ? <BookmarkCheck size={16} className="text-eucalyptus-600" /> : <Bookmark size={16} />}
                        </button>
                      )}
                    </div>

                    {/* Price + quantity */}
                    <div>
                      <p className="text-2xl font-bold text-charcoal-900">₹{listing.askingPricePerKg}<span className="text-sm font-normal text-charcoal-400">/kg</span></p>
                      <p className="text-sm text-charcoal-600 mt-0.5">{listing.quantityKg.toLocaleString()} kg</p>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1.5 text-sm text-charcoal-500">
                      <MapPin size={12} />
                      <span>{listing.district ?? listing.pickupLocation}</span>
                    </div>

                    {/* Availability */}
                    <p className="text-xs text-charcoal-400">
                      {gu ? 'ઉ.' : 'Available from'} {listing.availableFrom ? new Date(listing.availableFrom).toLocaleDateString('en-IN') : '—'}
                    </p>

                    {/* Grade typical range */}
                    {grade && (
                      <p className="text-xs text-charcoal-400">
                        {gu ? 'સ.' : 'Typical'}: ₹{grade.typicalPriceRangeMin}–₹{grade.typicalPriceRangeMax}/kg
                      </p>
                    )}

                    {/* Action */}
                    <div className="mt-auto pt-2 border-t border-charcoal-50">
                      {isOwn ? (
                        <span className="text-xs text-charcoal-400">{gu ? 'ત.' : 'Your listing'}</span>
                      ) : (
                        <Link to={`/market/${listing.id}`} className="btn-primary w-full text-sm text-center block">
                          {currentUser?.role === 'buyer' ? (gu ? 'ઑ.' : 'View & Offer') : (gu ? 'જ.' : 'View Details')}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'demand' && (
        <div className="space-y-4">
          {buyerRequests.length === 0 ? (
            <EmptyState message={gu ? 'ક. ?' : 'No open buyer requests at this time.'} />
          ) : buyerRequests.map(req => {
            const type = saltTypes.find(t => t.id === req.saltTypeId);
            const grade = saltGrades.find(g => g.id === req.saltGradeId);
            return (
              <div key={req.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-charcoal-900">{type?.name ?? 'Salt'}{grade ? ` — ${grade.name}` : ''}</span>
                    <span className="badge badge-active text-xs">{gu ? 'ખ.' : 'Open'}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-charcoal-600">
                    <span><strong>{req.quantityKg.toLocaleString()} kg</strong></span>
                    {req.targetPricePerKg && <span>≤ ₹{req.targetPricePerKg}/kg</span>}
                    <span className="text-charcoal-400">{req.preferredDistrict}</span>
                  </div>
                  {req.requirementsText && <p className="text-sm text-charcoal-400 mt-1">{req.requirementsText}</p>}
                  <p className="text-xs text-charcoal-400 mt-1">
                    {gu ? 'જ.' : 'Required by'}: {req.requiredByDate ? new Date(req.requiredByDate).toLocaleDateString('en-IN') : '—'}
                  </p>
                </div>
                {currentUser?.role === 'worker' && (
                  <Link to="/my-salt/create-listing" className="btn-primary text-sm flex-shrink-0">
                    {gu ? 'ઓ.' : 'Respond'}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
