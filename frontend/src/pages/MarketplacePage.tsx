import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  listingService, savedListingService,
  SaltListing, ListingFilters,
} from '../services/marketplaceService';
import { useAuthStore } from '../context/authStore';
import { SkeletonCard, EmptyState } from '../components/ui/index';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | string | null | undefined, decimals = 0): string {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: decimals });
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'badge-green',
  PAUSED: 'badge-sand',
  CLOSED: 'badge-gray',
  SOLD:   'bg-charcoal-100 text-charcoal-600 badge',
};

// ─── Listing Card ─────────────────────────────────────────────────────────────

interface ListingCardProps {
  listing: SaltListing;
  isBuyer: boolean;
  savedIds: Set<string>;
  onToggleSave: (id: string, saved: boolean) => void;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, isBuyer, savedIds, onToggleSave }) => {
  const { t } = useTranslation();
  const saved = savedIds.has(listing.id);
  const totalValue = Number(listing.quantity_kg) * Number(listing.price_per_kg);

  return (
    <div className="card card-body group hover:shadow-card transition-shadow duration-150">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-charcoal-900 truncate">{listing.salt_type}</h3>
            {listing.quality_grade && (
              <span className="badge badge-sage text-xs">{listing.quality_grade}</span>
            )}
          </div>
          <p className="text-xs text-charcoal-400">
            {t('marketplace.by')} <span className="text-charcoal-600 font-medium">{listing.seller_name}</span>
            {listing.seller_village && <span> · {listing.seller_village}</span>}
            {listing.seller_district && !listing.seller_village && <span> · {listing.seller_district}</span>}
          </p>
        </div>
        {/* Price badge */}
        <div className="flex-shrink-0 text-right">
          <p className="text-xl font-bold text-eucalyptus-800">₹{fmt(Number(listing.price_per_kg), 2)}</p>
          <p className="text-xs text-charcoal-400">{t('marketplace.perKg')}</p>
        </div>
      </div>

      {/* Middle row — key stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-ivory-50 rounded-xl p-2.5">
          <p className="text-xs text-charcoal-400 mb-0.5">Quantity</p>
          <p className="text-sm font-semibold text-charcoal-900">{fmt(Number(listing.quantity_kg))} kg</p>
        </div>
        <div className="bg-ivory-50 rounded-xl p-2.5">
          <p className="text-xs text-charcoal-400 mb-0.5">Total Value</p>
          <p className="text-sm font-semibold text-eucalyptus-800">₹{fmt(totalValue)}</p>
        </div>
        <div className="bg-ivory-50 rounded-xl p-2.5">
          <p className="text-xs text-charcoal-400 mb-0.5">Min Order</p>
          <p className="text-sm font-semibold text-charcoal-900">{fmt(Number(listing.min_quantity_kg))} kg</p>
        </div>
      </div>

      {/* Location + date */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-charcoal-400 mb-3">
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          {listing.location}
        </span>
        {listing.available_date && (
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            {t('marketplace.availableFrom')} {fmtDate(listing.available_date)}
          </span>
        )}
        {listing.views_count > 0 && (
          <span>{listing.views_count} {t('marketplace.views')}</span>
        )}
      </div>

      {/* Description preview */}
      {listing.description && (
        <p className="text-xs text-charcoal-500 line-clamp-2 mb-3">{listing.description}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-ivory-200">
        <Link
          to={`/salt-market/${listing.id}`}
          className="btn-primary btn-sm flex-1 text-center"
        >
          {t('marketplace.viewDetails')}
        </Link>
        {isBuyer && (
          <button
            onClick={() => onToggleSave(listing.id, saved)}
            className={`btn-sm px-3 flex items-center gap-1 transition-colors ${
              saved
                ? 'bg-eucalyptus-50 text-eucalyptus-700 border border-eucalyptus-200'
                : 'btn-secondary'
            }`}
            title={saved ? t('marketplace.unsave') : t('marketplace.save')}
          >
            <svg
              className="w-4 h-4"
              fill={saved ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="text-xs">{saved ? t('marketplace.saved') : t('marketplace.save')}</span>
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Main marketplace page ────────────────────────────────────────────────────

export const MarketplacePage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isBuyer = user?.role === 'BUYER';
  const isWorker = user?.role === 'AGARIYA_WORKER';

  const [listings, setListings] = useState<SaltListing[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [loading, setLoading]   = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<ListingFilters>({
    search: '', salt_type: '', grade: '', location: '',
    min_price: '', max_price: '', min_qty: '',
    sort: 'newest',
  });
  const [applied, setApplied] = useState<ListingFilters>(filters);

  // Load saved IDs for buyers
  useEffect(() => {
    if (isBuyer) {
      savedListingService.getAll().then(res => {
        if (res.success && res.data) {
          setSavedIds(new Set(res.data.map((l: SaltListing) => l.id)));
        }
      }).catch(() => {});
    }
  }, [isBuyer]);

  const load = useCallback(async (f: ListingFilters, p: number) => {
    setLoading(true);
    try {
      const res = await listingService.getMarketplace({ ...f, page: p });
      if (res.success && res.data) {
        setListings(res.data.listings);
        setTotal(res.data.total);
        setPage(res.data.page);
        setPages(res.data.pages);
      }
    } catch {
      // silent — empty state will show
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(applied, 1); }, [load, applied]);

  const handleApplyFilters = () => {
    setApplied({ ...filters });
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    const blank: ListingFilters = {
      search: '', salt_type: '', grade: '', location: '',
      min_price: '', max_price: '', min_qty: '', sort: 'newest',
    };
    setFilters(blank);
    setApplied(blank);
  };

  const handleToggleSave = async (listingId: string, currentlySaved: boolean) => {
    if (!user) { navigate('/login'); return; }
    try {
      if (currentlySaved) {
        await savedListingService.unsave(listingId);
        setSavedIds(prev => { const s = new Set(prev); s.delete(listingId); return s; });
        toast.success(t('marketplace.unsavedSuccess'));
      } else {
        await savedListingService.save(listingId);
        setSavedIds(prev => new Set([...prev, listingId]));
        toast.success(t('marketplace.savedSuccess'));
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  const hasActiveFilters = !!(
    applied.search || applied.salt_type || applied.grade ||
    applied.location || applied.min_price || applied.max_price || applied.min_qty
  );

  const setF = (k: keyof ListingFilters) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFilters(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-charcoal-900">{t('marketplace.title')}</h1>
        <p className="text-sm text-charcoal-500 mt-0.5">{t('marketplace.subtitle')}</p>
      </div>

      {/* Worker: quick link to create listing */}
      {isWorker && (
        <div className="bg-eucalyptus-50 border border-eucalyptus-200 rounded-2xl px-5 py-4 flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-medium text-eucalyptus-800">Ready to sell your salt?</p>
            <p className="text-xs text-eucalyptus-600 mt-0.5">Create a listing and reach buyers across Gujarat</p>
          </div>
          <Link to="/create-listing" className="btn-primary btn-sm flex-shrink-0">
            + {t('listing.createTitle')}
          </Link>
        </div>
      )}

      {/* Search + Sort bar */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="input pl-10"
            placeholder={t('marketplace.searchPlaceholder')}
            value={filters.search}
            onChange={e => {
              setFilters(f => ({ ...f, search: e.target.value }));
              // Live search with debounce handled by apply
            }}
            onKeyDown={e => e.key === 'Enter' && handleApplyFilters()}
          />
        </div>
        <select
          className="input w-44 flex-shrink-0"
          value={filters.sort}
          onChange={e => { setFilters(f => ({ ...f, sort: e.target.value })); setApplied(f => ({ ...f, sort: e.target.value })); }}
        >
          {(['newest', 'price_asc', 'price_desc', 'qty_desc'] as const).map(s => (
            <option key={s} value={s}>{t(`marketplace.sort.${s}`)}</option>
          ))}
        </select>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`btn-sm px-4 flex items-center gap-1.5 ${hasActiveFilters ? 'btn-primary' : 'btn-secondary'}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {t('marketplace.filters')}
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-white" />}
        </button>
      </div>

      {/* Expandable filters */}
      {showFilters && (
        <div className="card card-body mb-4 animate-slide-down">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">{t('marketplace.filter.saltType')}</label>
              <input className="input" value={filters.salt_type} onChange={setF('salt_type')} placeholder="e.g. Rock Salt" />
            </div>
            <div>
              <label className="label">{t('marketplace.filter.grade')}</label>
              <input className="input" value={filters.grade} onChange={setF('grade')} placeholder="e.g. A-Grade" />
            </div>
            <div>
              <label className="label">{t('marketplace.filter.location')}</label>
              <input className="input" value={filters.location} onChange={setF('location')} placeholder="e.g. Surendranagar" />
            </div>
            <div>
              <label className="label">{t('marketplace.filter.minPrice')}</label>
              <input className="input" type="number" min="0" step="0.5" value={filters.min_price} onChange={setF('min_price')} placeholder="0" />
            </div>
            <div>
              <label className="label">{t('marketplace.filter.maxPrice')}</label>
              <input className="input" type="number" min="0" step="0.5" value={filters.max_price} onChange={setF('max_price')} placeholder="100" />
            </div>
            <div>
              <label className="label">{t('marketplace.filter.minQty')}</label>
              <input className="input" type="number" min="0" step="100" value={filters.min_qty} onChange={setF('min_qty')} placeholder="1000" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleClearFilters} className="btn-secondary btn-sm">{t('marketplace.clearFilters')}</button>
            <button onClick={handleApplyFilters} className="btn-primary btn-sm flex-1">{t('common.search')}</button>
          </div>
        </div>
      )}

      {/* Results count */}
      {!loading && (
        <p className="text-sm text-charcoal-400 mb-4">
          {total > 0
            ? `${total.toLocaleString('en-IN')} ${total === 1 ? t('marketplace.results', { count: total }) : t('marketplace.results_plural', { count: total })}`
            : ''}
          {pages > 1 && ` · ${t('marketplace.page', { page, pages })}`}
        </p>
      )}

      {/* Listings grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} lines={4} />)}
        </div>
      ) : listings.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? t('marketplace.noListings') : t('marketplace.noListingsYet')}
          description={hasActiveFilters ? t('marketplace.noListingsDesc') : t('marketplace.noListingsYetDesc')}
          action={hasActiveFilters
            ? { label: t('marketplace.clearFilters'), onClick: handleClearFilters }
            : (isWorker ? { label: t('listing.createTitle'), onClick: () => navigate('/create-listing') } : undefined)
          }
          icon={<svg className="w-7 h-7 text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {listings.map(listing => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isBuyer={isBuyer}
              savedIds={savedIds}
              onToggleSave={handleToggleSave}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => load(applied, page - 1)}
            disabled={page <= 1}
            className="btn-secondary btn-sm"
          >
            {t('common.previous')}
          </button>
          <span className="text-sm text-charcoal-500">
            {t('marketplace.page', { page, pages })}
          </span>
          <button
            onClick={() => load(applied, page + 1)}
            disabled={page >= pages}
            className="btn-secondary btn-sm"
          >
            {t('common.nextPage')}
          </button>
        </div>
      )}
    </div>
  );
};
