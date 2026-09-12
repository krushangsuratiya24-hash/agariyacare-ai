import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, BookmarkX, MapPin } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { marketplaceApi } from '../services/api';
import { SaltType, SaltGrade } from '../types';
import { EmptyState, Spinner } from '../components/UI';

export default function SavedListingsPage() {
  const { language } = useLanguage();
  const gu = language === 'gu';

  const [saved, setSaved] = useState<any[]>([]);
  const [saltTypes, setSaltTypes] = useState<SaltType[]>([]);
  const [saltGrades, setSaltGrades] = useState<SaltGrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [savedRes, typesRes, gradesRes] = await Promise.allSettled([
        marketplaceApi.getSaved(),
        marketplaceApi.getSaltTypes(),
        marketplaceApi.getSaltGrades(),
      ]);
      if (savedRes.status === 'fulfilled') setSaved(savedRes.value.data ?? []);
      if (typesRes.status === 'fulfilled') setSaltTypes(typesRes.value.data ?? []);
      if (gradesRes.status === 'fulfilled') setSaltGrades(gradesRes.value.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function unsave(listingId: string) {
    await marketplaceApi.unsaveListing(listingId);
    setSaved(prev => prev.filter(s => (s.listingId ?? s.id) !== listingId));
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <p className="section-label mb-0.5">{gu ? 'ĺ.' : 'Bookmarks'}</p>
        <h1 className="text-2xl font-bold text-charcoal-900">{gu ? 'ĺ.' : 'Saved Listings'}</h1>
        <p className="text-sm text-charcoal-500 mt-0.5">{saved.length} {gu ? 'ĺ.' : 'saved listing(s)'}</p>
      </div>

      {saved.length === 0 ? (
        <EmptyState
          message={gu ? 'ĺ.' : 'No saved listings. Browse the market and bookmark listings you\'re interested in.'}
          action={<Link to="/market" className="btn-primary mt-2 inline-block">{gu ? 'ĺ.' : 'Browse Market'}</Link>}
        />
      ) : saved.map((s: any) => {
        const listing = s.listing ?? s;
        const type = saltTypes.find(t => t.id === listing.saltTypeId);
        const grade = saltGrades.find(g => g.id === listing.saltGradeId);
        const listingId = s.listingId ?? s.id;
        return (
          <div key={s.id} className="card flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-charcoal-900">{type?.name ?? 'Salt'} — {grade?.name ?? ''}</span>
                <span className="badge badge-active text-xs">{listing.status}</span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-charcoal-600">
                <span className="text-lg font-bold text-charcoal-900">₹{listing.askingPricePerKg}/kg</span>
                <span>{listing.quantityKg?.toLocaleString()} kg</span>
                {listing.pickupDistrict && (
                  <span className="flex items-center gap-1 text-charcoal-400"><MapPin size={12} />{listing.pickupDistrict}</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Link to={`/market/${listingId}`} className="btn-primary text-xs px-3 py-1.5">
                {gu ? 'ĺ.' : 'View & Offer'}
              </Link>
              <button onClick={() => unsave(listingId)} className="btn-secondary text-xs px-2 py-1.5">
                <BookmarkX size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
