import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Package, Calendar, DollarSign, Bot, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { marketplaceApi, offersApi } from '../services/api';
import { SaltListing, SaltType, SaltGrade, Offer } from '../types';
import { Spinner } from '../components/UI';

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const gu = language === 'gu';
  const navigate = useNavigate();

  const [listing, setListing] = useState<SaltListing | null>(null);
  const [saltTypes, setSaltTypes] = useState<SaltType[]>([]);
  const [saltGrades, setSaltGrades] = useState<SaltGrade[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerQty, setOfferQty] = useState('');
  const [offerMsg, setOfferMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (id) loadAll(id);
  }, [id]);

  async function loadAll(lid: string) {
    setLoading(true);
    try {
      const [listRes, typesRes, gradesRes, offersRes] = await Promise.allSettled([
        marketplaceApi.getListing(lid),
        marketplaceApi.getSaltTypes(),
        marketplaceApi.getSaltGrades(),
        offersApi.getListingOffers(lid),
      ]);
      if (listRes.status === 'fulfilled') setListing(listRes.value.data);
      if (typesRes.status === 'fulfilled') setSaltTypes(typesRes.value.data ?? []);
      if (gradesRes.status === 'fulfilled') setSaltGrades(gradesRes.value.data ?? []);
      if (offersRes.status === 'fulfilled') setOffers(offersRes.value.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function submitOffer() {
    if (!listing || !offerPrice || !offerQty) return;
    setSubmitting(true);
    setError('');
    try {
      await offersApi.makeOffer({
        listingId: listing.id,
        quantityKg: Number(offerQty),
        pricePerKg: Number(offerPrice),
        message: offerMsg || undefined,
      });
      setSuccess(gu ? 'ઑ.' : 'Offer submitted successfully!');
      setShowOfferForm(false);
      setOfferPrice(''); setOfferQty(''); setOfferMsg('');
      await loadAll(listing.id);
    } catch (e: any) {
      setError(e.message ?? (gu ? 'ઑ.' : 'Failed to submit offer.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;
  if (!listing) return <div className="text-center py-20 text-charcoal-400">{gu ? 'ઉ. ?' : 'Listing not found.'}</div>;

  const type = saltTypes.find(t => t.id === listing.saltTypeId);
  const grade = saltGrades.find(g => g.id === listing.saltGradeId);
  const isOwner = currentUser?.id === listing.workerId || currentUser?.id === listing.sellerId;
  const isBuyer = currentUser?.role === 'buyer';
  const canOffer = isBuyer && !isOwner && listing.status === 'ACTIVE';
  const myOffer = offers.find(o => o.buyerId === currentUser?.id);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-charcoal-500 hover:text-charcoal-800 group">
        <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
        {gu ? 'પ.' : 'Back to Market'}
      </button>

      {/* Main listing card */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-sand-100 rounded-xl flex items-center justify-center text-2xl">🧂</div>
            <div>
              <p className="text-xs text-charcoal-400">{type?.name ?? 'Salt'}</p>
              <h1 className="text-xl font-bold text-charcoal-900">{grade?.name ?? 'Salt'}</h1>
            </div>
          </div>
          <span className={`badge text-xs ${listing.status === 'ACTIVE' ? 'badge-active' : listing.status === 'SOLD' ? 'badge-completed' : 'badge-pending'}`}>
            {listing.status}
          </span>
        </div>

        {/* Key info */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
          <InfoBlock label={gu ? 'ભ.' : 'Asking Price'} value={`₹${listing.askingPricePerKg}/kg`} large />
          <InfoBlock label={gu ? 'જ.' : 'Quantity'} value={`${listing.quantityKg.toLocaleString()} kg`} />
          <InfoBlock label={gu ? 'ક. ?' : 'Total Value'} value={`₹${(listing.askingPricePerKg * listing.quantityKg).toLocaleString('en-IN')}`} />
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm border-t border-charcoal-50 pt-4">
          {(listing.district ?? listing.pickupLocation) && (
            <div className="flex items-center gap-2 text-charcoal-600">
              <MapPin size={14} className="text-charcoal-400" />
              <span>{listing.pickupLocation}, {listing.district}</span>
            </div>
          )}
          {listing.availableFrom && (
            <div className="flex items-center gap-2 text-charcoal-600">
              <Calendar size={14} className="text-charcoal-400" />
              <span>{gu ? 'ઉ.' : 'From'} {new Date(listing.availableFrom).toLocaleDateString('en-IN')}</span>
            </div>
          )}
          {grade && (
            <div className="flex items-center gap-2 text-charcoal-600">
              <Package size={14} className="text-charcoal-400" />
              <span>{gu ? 'સ.' : 'Typical range'}: ₹{grade.typicalPriceRangeMin}–₹{grade.typicalPriceRangeMax}/kg</span>
            </div>
          )}
        </div>

        {listing.qualityDescription && (
          <div className="mt-4 bg-charcoal-50 rounded-lg p-3">
            <p className="text-xs text-charcoal-500 font-medium mb-1">{gu ? 'ગ.' : 'Quality Description'}</p>
            <p className="text-sm text-charcoal-700">{listing.qualityDescription}</p>
          </div>
        )}

        {listing.deliveryNotes && (
          <div className="mt-3">
            <p className="text-xs text-charcoal-500 font-medium mb-1">{gu ? 'ટ.' : 'Delivery Notes'}</p>
            <p className="text-sm text-charcoal-600">{listing.deliveryNotes}</p>
          </div>
        )}
      </div>

      {/* Offer section */}
      {canOffer && !myOffer && (
        <div className="card border-eucalyptus-200">
          <h2 className="font-semibold text-charcoal-900 mb-3">{gu ? 'ઑ.' : 'Make an Offer'}</h2>
          {!showOfferForm ? (
            <div className="flex gap-3">
              <button onClick={() => setShowOfferForm(true)} className="btn-primary flex items-center gap-2">
                <DollarSign size={15} /> {gu ? 'ઑ.' : 'Make Offer'}
              </button>
              <Link to="/ai-assistant" className="btn-secondary flex items-center gap-2">
                <Bot size={15} /> {gu ? 'AI ?' : 'Ask AI First'}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{gu ? 'ભ.' : 'Your price (₹/kg)'} *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400">₹</span>
                    <input className="input pl-7" type="number" step="0.1" placeholder={String(listing.askingPricePerKg)} value={offerPrice} onChange={e => setOfferPrice(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="label">{gu ? 'જ.' : 'Quantity (kg)'} *</label>
                  <input className="input" type="number" placeholder={String(listing.quantityKg)} value={offerQty} onChange={e => setOfferQty(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">{gu ? 'સ.' : 'Message'} ({gu ? 'વ.' : 'optional'})</label>
                <textarea className="input" rows={2} placeholder={gu ? 'ઉ.' : 'Any note to the seller…'} value={offerMsg} onChange={e => setOfferMsg(e.target.value)} />
              </div>
              {offerPrice && offerQty && (
                <div className="bg-eucalyptus-50 border border-eucalyptus-100 rounded-lg p-3 text-sm">
                  <p className="text-charcoal-600">
                    {gu ? 'ક.' : 'Total offer'}: <strong className="text-charcoal-900">₹{(Number(offerPrice) * Number(offerQty)).toLocaleString('en-IN')}</strong>
                  </p>
                  {Number(offerPrice) < listing.askingPricePerKg && (
                    <p className="text-amber-600 text-xs mt-1">⚠️ {gu ? 'ઑ.' : `Your offer is ₹${(listing.askingPricePerKg - Number(offerPrice)).toFixed(2)}/kg below asking price.`}</p>
                  )}
                </div>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3">
                <button onClick={submitOffer} disabled={submitting || !offerPrice || !offerQty} className="btn-primary flex-1">
                  {submitting ? (gu ? 'સ.' : 'Submitting…') : (gu ? 'ઑ.' : 'Submit Offer')}
                </button>
                <button onClick={() => setShowOfferForm(false)} className="btn-secondary">{gu ? 'ર.' : 'Cancel'}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {myOffer && (
        <div className="card border-amber-200 bg-amber-50/30">
          <p className="text-sm font-semibold text-charcoal-900 mb-1">{gu ? 'ઑ.' : 'Your Offer'}</p>
          <p className="text-charcoal-600 text-sm">₹{myOffer.pricePerKg}/kg · {myOffer.quantityKg.toLocaleString()} kg</p>
          <span className={`badge mt-2 text-xs ${myOffer.status === 'PENDING' ? 'badge-pending' : myOffer.status === 'ACCEPTED' ? 'badge-completed' : 'badge-cancelled'}`}>
            {myOffer.status}
          </span>
          <div className="mt-3 flex gap-2">
            <Link to="/my-offers" className="btn-primary text-sm">{gu ? 'ઑ.' : 'View Offer'}</Link>
            <Link to="/ai-assistant" className="btn-secondary text-sm flex items-center gap-1.5">
              <Bot size={13} /> {gu ? 'AI ?' : 'Ask AI'}
            </Link>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 bg-eucalyptus-50 border border-eucalyptus-100 text-eucalyptus-700 rounded-lg px-4 py-3 text-sm">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* Offers on this listing (owner view) */}
      {isOwner && offers.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-charcoal-900 mb-3">{gu ? 'ઑ.' : 'Offers on This Listing'} ({offers.length})</h2>
          <div className="space-y-3">
            {offers.map(offer => (
              <div key={offer.id} className="flex items-center justify-between py-2 border-b border-charcoal-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-charcoal-900">₹{offer.pricePerKg}/kg · {offer.quantityKg.toLocaleString()} kg</p>
                  <p className="text-xs text-charcoal-400">{new Date(offer.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge text-xs ${offer.status === 'PENDING' ? 'badge-pending' : offer.status === 'ACCEPTED' ? 'badge-completed' : 'badge-cancelled'}`}>
                    {offer.status}
                  </span>
                  <Link to="/my-offers" className="btn-secondary text-xs px-2 py-1">{gu ? 'ઑ.' : 'Manage'}</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBlock({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <div>
      <p className="text-xs text-charcoal-400 mb-0.5">{label}</p>
      <p className={`font-bold text-charcoal-900 ${large ? 'text-2xl' : 'text-base'}`}>{value}</p>
    </div>
  );
}
