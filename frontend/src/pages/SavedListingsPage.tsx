import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { savedListingService, SaltListing } from '../services/marketplaceService';
import { SkeletonCard, EmptyState } from '../components/ui/index';

function fmt(n: number | string | null | undefined, decimals = 0): string {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: decimals });
}

export const SavedListingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [listings, setListings] = useState<(SaltListing & { saved_at?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await savedListingService.getAll();
      if (res.success && res.data) setListings(res.data as (SaltListing & { saved_at?: string })[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (id: string) => {
    try {
      await savedListingService.unsave(id);
      setListings(prev => prev.filter(l => l.id !== id));
      toast.success(t('marketplace.unsavedSuccess'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-charcoal-900">{t('savedListings.title')}</h1>
        <p className="text-sm text-charcoal-500 mt-0.5">{t('savedListings.subtitle')}</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <SkeletonCard key={i} lines={3} />)}</div>
      ) : listings.length === 0 ? (
        <EmptyState
          title={t('savedListings.noSaved')}
          description={t('savedListings.noSavedDesc')}
          action={{ label: t('nav.saltMarket'), onClick: () => window.location.href = '/salt-market' }}
          icon={<svg className="w-7 h-7 text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>}
        />
      ) : (
        <div className="space-y-3">
          {listings.map(listing => (
            <div key={listing.id} className="card card-body">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-charcoal-900">{listing.salt_type}</h3>
                    {listing.quality_grade && <span className="badge badge-sage text-xs">{listing.quality_grade}</span>}
                    {listing.status !== 'ACTIVE' && (
                      <span className="badge badge-gray text-xs">{listing.status}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-charcoal-500 mt-1">
                    <span className="font-semibold text-eucalyptus-800">₹{fmt(Number(listing.price_per_kg), 2)}/kg</span>
                    <span>{fmt(Number(listing.quantity_kg))} kg available</span>
                    <span>📍 {listing.location}</span>
                    {listing.seller_name && <span>by {listing.seller_name}</span>}
                  </div>
                  {listing.saved_at && (
                    <p className="text-xs text-charcoal-400 mt-1">
                      {t('savedListings.savedOn')} {new Date(listing.saved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Link to={`/salt-market/${listing.id}`} className="btn-primary btn-sm">
                    {t('savedListings.viewListing')}
                  </Link>
                  <button onClick={() => handleRemove(listing.id)} className="btn-secondary btn-sm text-charcoal-500">
                    {t('savedListings.remove')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
