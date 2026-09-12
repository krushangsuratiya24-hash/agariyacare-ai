import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  listingService, savedListingService,
  SaltListing, BuyerRequest,
} from '../services/marketplaceService';
import { useAuthStore } from '../context/authStore';
import { Spinner, SkeletonCard, Alert } from '../components/ui/index';

function fmt(n: number | string | null | undefined, decimals = 0): string {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: decimals });
}
function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'Active',  cls: 'badge-green' },
  PAUSED: { label: 'Paused',  cls: 'badge-sand' },
  CLOSED: { label: 'Closed',  cls: 'badge-gray' },
  SOLD:   { label: 'Sold',    cls: 'bg-charcoal-100 text-charcoal-600 badge' },
};

export const ListingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [listing, setListing] = useState<SaltListing & { is_saved?: boolean } | null>(null);
  const [matches, setMatches] = useState<BuyerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isOwner  = user?.id === listing?.worker_id;
  const isBuyer  = user?.role === 'BUYER';
  const isWorker = user?.role === 'AGARIYA_WORKER';

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listingService.getById(id);
      if (!res.success || !res.data) {
        setError(res.error || 'Listing not found');
        return;
      }
      setListing(res.data);
      setSaved(res.data.is_saved ?? false);

      // Load matches (non-blocking)
      listingService.getMatchesForListing(id).then(mr => {
        if (mr.success && mr.data) setMatches(mr.data);
      }).catch(() => {});
    } catch {
      setError('Failed to load listing');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!user) { navigate('/login'); return; }
    if (!id) return;
    setLoadingAction(true);
    try {
      if (saved) {
        await savedListingService.unsave(id);
        setSaved(false);
        toast.success(t('marketplace.unsavedSuccess'));
      } else {
        await savedListingService.save(id);
        setSaved(true);
        toast.success(t('marketplace.savedSuccess'));
      }
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoadingAction(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!id) return;
    setLoadingAction(true);
    try {
      const res = await listingService.update(id, { status: status as SaltListing['status'] });
      if (!res.success) throw new Error(res.error);
      toast.success(t('listing.updated'));
      load();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoadingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <SkeletonCard lines={5} />
        <SkeletonCard lines={3} />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-3xl mx-auto">
        <Alert type="error" message={error || 'Listing not found'} />
        <button onClick={() => navigate('/salt-market')} className="btn-secondary btn-md mt-4">
          {t('listingDetail.backToMarket')}
        </button>
      </div>
    );
  }

  const totalValue = Number(listing.quantity_kg) * Number(listing.price_per_kg);
  const statusInfo = STATUS_LABEL[listing.status] || STATUS_LABEL.ACTIVE;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back nav */}
      <div className="mb-5">
        <button
          onClick={() => navigate('/salt-market')}
          className="text-sm text-charcoal-400 hover:text-charcoal-600 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('listingDetail.backToMarket')}
        </button>
      </div>

      {/* Status banner for non-active listings */}
      {listing.status !== 'ACTIVE' && (
        <div className={`rounded-xl px-4 py-3 mb-4 text-sm font-medium ${
          listing.status === 'PAUSED' ? 'bg-sand-50 text-sand-500 border border-sand-200' :
          listing.status === 'SOLD'   ? 'bg-charcoal-50 text-charcoal-600 border border-charcoal-200' :
          'bg-ivory-100 text-charcoal-500 border border-ivory-300'
        }`}>
          {listing.status === 'PAUSED' ? t('listingDetail.listingPaused') :
           listing.status === 'SOLD'   ? t('listingDetail.listingSold') :
           t('listingDetail.listingClosed')}
        </div>
      )}

      {/* Header card */}
      <div className="card card-body mb-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-xl font-semibold text-charcoal-900">{listing.salt_type}</h1>
              <span className={statusInfo.cls}>{statusInfo.label}</span>
              {listing.quality_grade && <span className="badge badge-sage">{listing.quality_grade}</span>}
              {listing.season && <span className="badge badge-sand">{listing.season}</span>}
            </div>
            <p className="text-xs text-charcoal-400">
              {t('listingDetail.listedOn')} {fmtDate(listing.created_at)}
              {listing.views_count > 0 && ` · ${listing.views_count} ${t('listingDetail.views')}`}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-3xl font-bold text-eucalyptus-800">₹{fmt(Number(listing.price_per_kg), 2)}</p>
            <p className="text-xs text-charcoal-400">{t('marketplace.perKg')}</p>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: t('listingDetail.quantity'),   value: `${fmt(Number(listing.quantity_kg))} kg` },
            { label: t('listingDetail.totalValue'),  value: `₹${fmt(totalValue)}` },
            { label: t('listingDetail.minOrder'),    value: `${fmt(Number(listing.min_quantity_kg))} kg` },
            { label: t('listingDetail.price'),       value: `₹${fmt(Number(listing.price_per_kg), 2)}/kg` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-ivory-50 rounded-xl p-3">
              <p className="text-xs text-charcoal-400 mb-0.5">{label}</p>
              <p className="text-sm font-semibold text-charcoal-900">{value}</p>
            </div>
          ))}
        </div>

        {/* Location */}
        <div className="flex flex-wrap gap-4 text-sm text-charcoal-600 mb-4">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            {listing.location}
            {listing.village && ` · ${listing.village}`}
            {listing.district && ` · ${listing.district}`}
          </span>
          {listing.available_date && (
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {t('listingDetail.availableFrom')} {fmtDate(listing.available_date)}
            </span>
          )}
        </div>

        {/* Description */}
        {listing.description && (
          <div className="border-t border-ivory-200 pt-4">
            <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-2">{t('listingDetail.description')}</p>
            <p className="text-sm text-charcoal-700 whitespace-pre-line">{listing.description}</p>
          </div>
        )}

        {/* Actions */}
        <div className="border-t border-ivory-200 pt-4 mt-4 flex flex-wrap gap-2">
          {/* Buyer actions */}
          {isBuyer && listing.status === 'ACTIVE' && (
            <>
              <button
                onClick={handleSave}
                disabled={loadingAction}
                className={`btn-md flex items-center gap-2 ${saved ? 'btn-secondary text-eucalyptus-700' : 'btn-secondary'}`}
              >
                {loadingAction ? <Spinner size="sm" /> : (
                  <svg className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                )}
                {saved ? t('listingDetail.removeSaved') : t('listingDetail.saveThisListing')}
              </button>
              <button className="btn-secondary btn-md text-charcoal-500" disabled>
                {t('listingDetail.makeOffer')} <span className="text-xs ml-1 text-charcoal-400">(Phase 3)</span>
              </button>
            </>
          )}

          {/* Owner actions */}
          {isOwner && (
            <>
              <Link to="/create-listing" state={{ editId: listing.id }} className="btn-secondary btn-md">
                {t('listingDetail.editListing')}
              </Link>
              {listing.status === 'ACTIVE' && (
                <button
                  onClick={() => handleStatusChange('PAUSED')}
                  disabled={loadingAction}
                  className="btn-secondary btn-md"
                >
                  {loadingAction ? <Spinner size="sm" /> : t('listingDetail.pauseListing')}
                </button>
              )}
              {listing.status === 'PAUSED' && (
                <button
                  onClick={() => handleStatusChange('ACTIVE')}
                  disabled={loadingAction}
                  className="btn-primary btn-md"
                >
                  {loadingAction ? <Spinner size="sm" /> : t('listingDetail.reactivate')}
                </button>
              )}
              {(listing.status === 'ACTIVE' || listing.status === 'PAUSED') && (
                <button
                  onClick={() => handleStatusChange('CLOSED')}
                  disabled={loadingAction}
                  className="btn-danger btn-md"
                >
                  {t('listingDetail.closeListing')}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Seller info */}
      <div className="card card-body mb-4">
        <h3 className="section-title mb-3">{t('listingDetail.sellerInfo')}</h3>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-eucalyptus-100 flex items-center justify-center flex-shrink-0">
            {listing.seller_avatar ? (
              <img src={listing.seller_avatar} alt="" className="w-full h-full object-cover rounded-full" />
            ) : (
              <span className="text-sm font-semibold text-eucalyptus-700">
                {(listing.seller_name || 'A').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-charcoal-900">{listing.seller_name}</p>
            {(listing.seller_village || listing.seller_district) && (
              <p className="text-xs text-charcoal-400">
                {[listing.seller_village, listing.seller_district].filter(Boolean).join(', ')}
              </p>
            )}
            {listing.seller_experience && (
              <p className="text-xs text-charcoal-400">
                {t('listingDetail.experience', { years: listing.seller_experience })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Matching buyer requests — visible to worker (listing owner) */}
      {isOwner && (
        <div className="card card-body">
          <h3 className="section-title mb-3">{t('listingDetail.matchingRequests')}</h3>
          {matches.length === 0 ? (
            <p className="text-sm text-charcoal-400">{t('listingDetail.noMatchingRequests')}</p>
          ) : (
            <div className="space-y-3">
              {matches.map(m => (
                <div key={m.id} className="bg-ivory-50 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-charcoal-900">
                        {m.title || `${m.salt_type} — ${fmt(Number(m.quantity_kg))} kg`}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-charcoal-500">
                        <span>{fmt(Number(m.quantity_kg))} kg needed</span>
                        {m.max_price_per_kg && <span>≤ ₹{fmt(Number(m.max_price_per_kg), 2)}/kg</span>}
                        {m.preferred_location && <span>📍 {m.preferred_location}</span>}
                      </div>
                    </div>
                    {m.match_score !== undefined && (
                      <div className="flex-shrink-0 text-right">
                        <div className={`text-sm font-bold rounded-full px-2.5 py-0.5 inline-block ${
                          m.match_score >= 70 ? 'bg-eucalyptus-100 text-eucalyptus-800' :
                          m.match_score >= 40 ? 'bg-sand-100 text-sand-600' :
                          'bg-ivory-200 text-charcoal-500'
                        }`}>
                          {m.match_score}%
                        </div>
                        <p className="text-xs text-charcoal-400 mt-0.5">{t('marketplace.matchScore')}</p>
                      </div>
                    )}
                  </div>
                  {m.match_reasons && m.match_reasons.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      {m.match_reasons.map((r, i) => (
                        <p key={i} className="text-xs text-eucalyptus-700 flex items-center gap-1">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                          {r}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
