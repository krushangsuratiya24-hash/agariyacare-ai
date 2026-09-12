import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Package, ShoppingCart, Edit2, Archive, TrendingUp, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { marketplaceApi } from '../services/api';
import { SaltInventory, SaltListing, SaltType, SaltGrade } from '../types';
import { Spinner, EmptyState } from '../components/UI';

type Tab = 'inventory' | 'listings';

export default function MySaltPage() {
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const gu = language === 'gu';
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('inventory');
  const [inventory, setInventory] = useState<SaltInventory[]>([]);
  const [listings, setListings] = useState<SaltListing[]>([]);
  const [saltTypes, setSaltTypes] = useState<SaltType[]>([]);
  const [saltGrades, setSaltGrades] = useState<SaltGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add inventory form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editItem, setEditItem] = useState<SaltInventory | null>(null);
  const [form, setForm] = useState({
    saltTypeId: '', saltGradeId: '', totalQuantityKg: '', availableQuantityKg: '',
    productionDate: '', location: '', expectedPricePerKg: '', qualityNotes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [invRes, listRes, typesRes, gradesRes] = await Promise.allSettled([
        marketplaceApi.getInventory(),
        marketplaceApi.getMyListings(),
        marketplaceApi.getSaltTypes(),
        marketplaceApi.getSaltGrades(),
      ]);
      if (invRes.status === 'fulfilled') setInventory(invRes.value.data ?? []);
      if (listRes.status === 'fulfilled') setListings(listRes.value.data ?? []);
      if (typesRes.status === 'fulfilled') setSaltTypes(typesRes.value.data ?? []);
      if (gradesRes.status === 'fulfilled') setSaltGrades(gradesRes.value.data ?? []);
    } catch {
      setError(gu ? 'ડેટા લોડ થઈ શક્યો નહીં.' : 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }

  function startEdit(item: SaltInventory) {
    setEditItem(item);
    setForm({
      saltTypeId: item.saltTypeId,
      saltGradeId: item.saltGradeId,
      totalQuantityKg: String(item.totalQuantityKg),
      availableQuantityKg: String(item.availableQuantityKg),
      productionDate: item.productionDate ?? '',
      location: item.location,
      expectedPricePerKg: String(item.expectedPricePerKg),
      qualityNotes: item.qualityNotes ?? '',
    });
    setShowAddForm(true);
  }

  function resetForm() {
    setEditItem(null);
    setShowAddForm(false);
    setForm({ saltTypeId: '', saltGradeId: '', totalQuantityKg: '', availableQuantityKg: '', productionDate: '', location: '', expectedPricePerKg: '', qualityNotes: '' });
  }

  async function saveInventory(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        saltTypeId: form.saltTypeId,
        saltGradeId: form.saltGradeId,
        totalQuantityKg: Number(form.totalQuantityKg),
        availableQuantityKg: Number(form.availableQuantityKg || form.totalQuantityKg),
        productionDate: form.productionDate || undefined,
        location: form.location,
        expectedPricePerKg: Number(form.expectedPricePerKg),
        qualityNotes: form.qualityNotes || undefined,
      };
      if (editItem) {
        await marketplaceApi.updateInventory(editItem.id, payload);
      } else {
        await marketplaceApi.createInventory(payload);
      }
      resetForm();
      await load();
    } catch {
      setError(gu ? 'સ્ટોર કરી શક્યા નહીં.' : 'Failed to save inventory.');
    } finally {
      setSaving(false);
    }
  }

  const totalKg = inventory.reduce((s, i) => s + i.availableQuantityKg, 0);
  const soldKg = inventory.reduce((s, i) => s + i.soldQuantityKg, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="section-label mb-0.5">{gu ? 'ઇન્વૅન્ટ્રી' : 'Inventory'}</p>
          <h1 className="text-2xl font-bold text-charcoal-900">{gu ? 'મારું મીઠું' : 'My Salt'}</h1>
          <p className="text-sm text-charcoal-500 mt-0.5">{gu ? 'ઇન્વૅન્ટ્રી અને લિસ્ટિંગ મૅનેજ કરો' : 'Manage inventory and listings'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { resetForm(); setShowAddForm(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={15} /> {gu ? 'મીઠું ઉમેરો' : 'Add Salt'}
          </button>
          <Link to="/my-salt/create-listing" className="btn-secondary flex items-center gap-2 text-sm">
            <ShoppingCart size={15} /> {gu ? 'વેચો' : 'Sell Salt'}
          </Link>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-charcoal-900">{totalKg.toLocaleString()}</p>
          <p className="text-xs text-charcoal-500 mt-0.5">{gu ? 'ઉપલબ્ધ (kg)' : 'Available (kg)'}</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-charcoal-900">{soldKg.toLocaleString()}</p>
          <p className="text-xs text-charcoal-500 mt-0.5">{gu ? 'વેચાઈ ગયું (kg)' : 'Sold (kg)'}</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-charcoal-900">{listings.filter(l => l.status === 'ACTIVE').length}</p>
          <p className="text-xs text-charcoal-500 mt-0.5">{gu ? 'સક્રિય લિસ્ટ' : 'Active Listings'}</p>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">{error}</div>}

      {/* Add/Edit form */}
      {showAddForm && (
        <div className="card border-eucalyptus-200 bg-eucalyptus-50/30">
          <h2 className="text-base font-semibold text-charcoal-900 mb-4">
            {editItem ? (gu ? 'ઇન્વૅન્ટ્રી સંપાદિત' : 'Edit Inventory') : (gu ? 'મીઠું ઉમેરો' : 'Add Salt Batch')}
          </h2>
          <form onSubmit={saveInventory} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{gu ? 'મીઠાનો પ્રકાર' : 'Salt Type'} *</label>
              <select className="input" required value={form.saltTypeId} onChange={e => setForm(p => ({ ...p, saltTypeId: e.target.value }))}>
                <option value="">{gu ? 'પ્રકાર પસંદ' : 'Select type'}</option>
                {saltTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{gu ? 'ગ્રેડ' : 'Grade'} *</label>
              <select className="input" required value={form.saltGradeId} onChange={e => setForm(p => ({ ...p, saltGradeId: e.target.value }))}>
                <option value="">{gu ? 'ગ્રેડ પસંદ' : 'Select grade'}</option>
                {saltGrades.filter(g => !form.saltTypeId || g.saltTypeId === form.saltTypeId).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{gu ? 'કુલ જથ્થો (kg)' : 'Total Quantity (kg)'} *</label>
              <input className="input" type="number" required min="1" placeholder="e.g. 5000" value={form.totalQuantityKg} onChange={e => setForm(p => ({ ...p, totalQuantityKg: e.target.value }))} />
            </div>
            <div>
              <label className="label">{gu ? 'ઉત્પાદન તારીખ' : 'Production Date'}</label>
              <input className="input" type="date" value={form.productionDate} onChange={e => setForm(p => ({ ...p, productionDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">{gu ? 'સ્થળ / ખેતર' : 'Location / Field'} *</label>
              <input className="input" required placeholder={gu ? 'ખેતર નં. / ગામ' : 'Field no. / village'} value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
            </div>
            <div>
              <label className="label">{gu ? 'અપેક્ષિત ભાવ (₹/kg)' : 'Expected Price (₹/kg)'} *</label>
              <input className="input" type="number" required min="0.1" step="0.1" placeholder="e.g. 8.50" value={form.expectedPricePerKg} onChange={e => setForm(p => ({ ...p, expectedPricePerKg: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">{gu ? 'ગુણવત્તા નોંધ' : 'Quality Notes'}</label>
              <textarea className="input" rows={2} placeholder={gu ? 'ગુણવત્તા વિશે...' : 'Quality description, any notes…'} value={form.qualityNotes} onChange={e => setForm(p => ({ ...p, qualityNotes: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? (gu ? 'સ્ટોર...' : 'Saving…') : (editItem ? (gu ? 'અૅપ્ડૅટ' : 'Update') : (gu ? 'ઉમેરો' : 'Add Salt'))}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary flex-1">{gu ? 'રદ' : 'Cancel'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-charcoal-100">
        {(['inventory', 'listings'] as Tab[]).map(tb => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === tb ? 'border-eucalyptus-600 text-eucalyptus-700' : 'border-transparent text-charcoal-500 hover:text-charcoal-700'}`}
          >
            {tb === 'inventory' ? (gu ? 'ઇન્વૅન્ટ્રી' : 'Inventory') : (gu ? 'લિસ્ટિંગ' : 'Listings')}
          </button>
        ))}
      </div>

      {tab === 'inventory' && (
        <div className="space-y-3">
          {inventory.length === 0 ? (
            <EmptyState
              message={gu ? 'કોઈ ઇન્વૅન્ટ્રી નથી. પ્રથમ સૉલ્ટ ઉમેરો.' : 'No salt inventory yet. Add your first batch to get started.'}
              action={<button onClick={() => setShowAddForm(true)} className="btn-primary mt-2">{gu ? 'મીઠું ઉમેરો' : 'Add Salt'}</button>}
            />
          ) : inventory.map(item => {
            const st = saltTypes.find(t => t.id === item.saltTypeId);
            const gr = saltGrades.find(g => g.id === item.saltGradeId);
            return (
              <div key={item.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Package size={16} className="text-eucalyptus-500" />
                    <span className="font-semibold text-charcoal-900">{st?.name ?? 'Salt'} — {gr?.name ?? ''}</span>
                    <span className={`badge text-xs ${item.availableQuantityKg > 0 ? 'badge-active' : 'bg-charcoal-100 text-charcoal-600'}`}>
                      {item.availableQuantityKg > 0 ? (gu ? 'ઉપલબ્ધ' : 'Available') : (gu ? 'ખૂટ્યો' : 'Depleted')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-charcoal-600">
                    <span>{gu ? 'ઉપ.' : 'Avail.'} <strong>{item.availableQuantityKg.toLocaleString()} kg</strong></span>
                    <span>{gu ? 'કુ.' : 'Total'} <strong>{item.totalQuantityKg.toLocaleString()} kg</strong></span>
                    <span>{gu ? 'ભાવ' : 'Price'} <strong>₹{item.expectedPricePerKg}/kg</strong></span>
                    <span className="text-charcoal-400">{item.location}</span>
                  </div>
                  {item.qualityNotes && <p className="text-xs text-charcoal-400 mt-1">{item.qualityNotes}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => startEdit(item)} className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1.5">
                    <Edit2 size={12} /> {gu ? 'સંપાદિત' : 'Edit'}
                  </button>
                  <Link to="/my-salt/create-listing" state={{ inventoryId: item.id }} className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5">
                    <ShoppingCart size={12} /> {gu ? 'વેચો' : 'List for Sale'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'listings' && (
        <div className="space-y-3">
          {listings.length === 0 ? (
            <EmptyState
              message={gu ? 'કોઈ લિસ્ટિંગ નથી.' : 'No listings yet. Create a listing to reach buyers.'}
              action={<Link to="/my-salt/create-listing" className="btn-primary mt-2 inline-block">{gu ? 'વેચો' : 'Sell Salt'}</Link>}
            />
          ) : listings.map(listing => {
            const st = saltTypes.find(t => t.id === listing.saltTypeId);
            const gr = saltGrades.find(g => g.id === listing.saltGradeId);
            const statusClasses: Record<string, string> = {
              ACTIVE: 'badge-active', DRAFT: 'badge-pending', UNDER_OFFER: 'badge bg-amber-100 text-amber-700',
              SOLD: 'badge-completed', CANCELLED: 'badge-cancelled', EXPIRED: 'bg-charcoal-100 text-charcoal-600',
            };
            return (
              <div key={listing.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-charcoal-900">{st?.name ?? 'Salt'} — {gr?.name ?? ''}</span>
                      <span className={`badge text-xs ${statusClasses[listing.status] ?? 'badge-pending'}`}>{listing.status}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-charcoal-600">
                      <span><strong>{listing.quantityKg.toLocaleString()} kg</strong></span>
                      <span>₹{listing.askingPricePerKg}/kg</span>
                      <span className="text-charcoal-400">{listing.pickupDistrict}</span>
                    </div>
                    <p className="text-xs text-charcoal-400 mt-1">
                      {gu ? 'ઉપલ.' : 'From'} {listing.availableFrom ? new Date(listing.availableFrom).toLocaleDateString('en-IN') : '—'}
                    </p>
                  </div>
                  <Link to={`/market/${listing.id}`} className="btn-secondary text-xs px-3 py-1.5">
                    {gu ? 'જુઓ' : 'View'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
