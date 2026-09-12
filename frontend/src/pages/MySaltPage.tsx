import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { inventoryService, SaltInventory } from '../services/marketplaceService';
import { SkeletonCard, EmptyState, Alert, ConfirmDialog, Spinner } from '../components/ui/index';

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, decimals = 0): string {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('en-IN', { maximumFractionDigits: decimals });
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: 'bg-eucalyptus-100 text-eucalyptus-800',
  RESERVED:  'bg-sand-100 text-sand-500',
  SOLD:      'bg-charcoal-100 text-charcoal-600',
};

// ── Form modal ────────────────────────────────────────────────────────────────

interface FormState {
  salt_type: string;
  quantity_kg: string;
  quality_grade: string;
  harvest_date: string;
  season: string;
  storage_location: string;
  price_per_kg: string;
  moisture_pct: string;
  notes: string;
  status: string;
}

const BLANK_FORM: FormState = {
  salt_type: '', quantity_kg: '', quality_grade: '', harvest_date: '',
  season: '', storage_location: '', price_per_kg: '', moisture_pct: '',
  notes: '', status: 'AVAILABLE',
};

function toFormState(item: SaltInventory): FormState {
  return {
    salt_type:        item.salt_type || '',
    quantity_kg:      String(item.quantity_kg),
    quality_grade:    item.quality_grade || '',
    harvest_date:     item.harvest_date ? item.harvest_date.substring(0, 10) : '',
    season:           item.season || '',
    storage_location: item.storage_location || '',
    price_per_kg:     item.price_per_kg !== null ? String(item.price_per_kg) : '',
    moisture_pct:     item.moisture_pct !== null ? String(item.moisture_pct) : '',
    notes:            item.notes || '',
    status:           item.status,
  };
}

interface InventoryFormProps {
  initial: FormState;
  onSave: (data: FormState) => Promise<void>;
  onCancel: () => void;
  isEdit: boolean;
}

const InventoryForm: React.FC<InventoryFormProps> = ({ initial, onSave, onCancel, isEdit }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.salt_type.trim()) { setError('Salt type is required'); return; }
    if (!form.quantity_kg || parseFloat(form.quantity_kg) <= 0) { setError('Quantity must be greater than 0'); return; }
    setSaving(true);
    try {
      await onSave(form);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Save failed';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-2xl shadow-float w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-charcoal-900">
              {isEdit ? t('inventory.editStock') : t('inventory.addStock')}
            </h2>
            <button onClick={onCancel} className="p-2 rounded-lg text-charcoal-400 hover:bg-ivory-100 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('inventory.fields.saltType')} <span className="text-red-400">*</span></label>
                <input className="input" value={form.salt_type} onChange={set('salt_type')} placeholder={t('inventory.fields.saltTypePlaceholder')} required />
              </div>
              <div>
                <label className="label">{t('inventory.fields.quantityKg')} <span className="text-red-400">*</span></label>
                <input className="input" type="number" min="0.01" step="0.01" value={form.quantity_kg} onChange={set('quantity_kg')} placeholder="5000" required />
              </div>
              <div>
                <label className="label">{t('inventory.fields.qualityGrade')}</label>
                <input className="input" value={form.quality_grade} onChange={set('quality_grade')} placeholder={t('inventory.fields.qualityGradePlaceholder')} />
              </div>
              <div>
                <label className="label">{t('inventory.fields.pricePerkgExpected')}</label>
                <input className="input" type="number" min="0.01" step="0.01" value={form.price_per_kg} onChange={set('price_per_kg')} placeholder="8.50" />
              </div>
              <div>
                <label className="label">{t('inventory.fields.harvestDate')}</label>
                <input className="input" type="date" value={form.harvest_date} onChange={set('harvest_date')} />
              </div>
              <div>
                <label className="label">{t('inventory.fields.season')}</label>
                <input className="input" value={form.season} onChange={set('season')} placeholder={t('inventory.fields.seasonPlaceholder')} />
              </div>
              <div>
                <label className="label">{t('inventory.fields.storageLocation')}</label>
                <input className="input" value={form.storage_location} onChange={set('storage_location')} placeholder={t('inventory.fields.storageLocationPlaceholder')} />
              </div>
              <div>
                <label className="label">{t('inventory.fields.moisturePct')}</label>
                <input className="input" type="number" min="0" max="100" step="0.1" value={form.moisture_pct} onChange={set('moisture_pct')} placeholder="2.5" />
              </div>
            </div>

            {isEdit && (
              <div>
                <label className="label">{t('inventory.fields.status')}</label>
                <select className="input" value={form.status} onChange={set('status')}>
                  {(['AVAILABLE', 'RESERVED', 'SOLD'] as const).map(s => (
                    <option key={s} value={s}>{t(`inventory.status.${s}`)}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="label">{t('inventory.fields.notes')}</label>
              <textarea className="input resize-none" rows={3} value={form.notes} onChange={set('notes')} />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onCancel} className="btn-secondary btn-md flex-1">{t('common.cancel')}</button>
              <button type="submit" className="btn-primary btn-md flex-1" disabled={saving}>
                {saving ? <Spinner size="sm" /> : t('common.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export const MySaltPage: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<SaltInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<SaltInventory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SaltInventory | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await inventoryService.getAll();
      if (res.success && res.data) setItems(res.data);
      else setError(res.error || 'Failed to load');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form: FormState) => {
    const payload = {
      salt_type: form.salt_type,
      quantity_kg: parseFloat(form.quantity_kg),
      quality_grade: form.quality_grade || undefined,
      harvest_date: form.harvest_date || undefined,
      season: form.season || undefined,
      storage_location: form.storage_location || undefined,
      price_per_kg: form.price_per_kg ? parseFloat(form.price_per_kg) : undefined,
      moisture_pct: form.moisture_pct ? parseFloat(form.moisture_pct) : undefined,
      notes: form.notes || undefined,
      ...(editItem ? { status: form.status as 'AVAILABLE' | 'RESERVED' | 'SOLD' } : {}),
    };

    if (editItem) {
      const res = await inventoryService.update(editItem.id, payload);
      if (!res.success) throw new Error(res.error);
      toast.success(t('inventory.saved'));
    } else {
      const res = await inventoryService.create(payload);
      if (!res.success) throw new Error(res.error);
      toast.success(t('inventory.saved'));
    }
    setShowForm(false);
    setEditItem(null);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await inventoryService.delete(deleteTarget.id);
      if (!res.success) { toast.error(res.error || 'Delete failed'); return; }
      toast.success(t('inventory.deleted'));
      setDeleteTarget(null);
      load();
    } catch {
      toast.error('Delete failed');
    }
  };

  // Summary calculations from real data
  const totalKg   = items.filter(i => i.status !== 'SOLD').reduce((s, i) => s + Number(i.quantity_kg), 0);
  const totalValue = items
    .filter(i => i.status === 'AVAILABLE' && i.price_per_kg)
    .reduce((s, i) => s + Number(i.quantity_kg) * Number(i.price_per_kg), 0);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal-900">{t('inventory.title')}</h1>
          <p className="text-sm text-charcoal-500 mt-0.5">{t('inventory.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/create-listing" className="btn-secondary btn-sm hidden sm:flex">{t('listing.createTitle')}</Link>
          <button onClick={() => { setEditItem(null); setShowForm(true); }} className="btn-primary btn-sm">
            + {t('inventory.addStock')}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="card card-body">
            <p className="text-xs text-charcoal-500 uppercase tracking-wider mb-1">{t('dashboard.saltAvailable')}</p>
            <p className="text-2xl font-semibold text-charcoal-900">{fmt(totalKg)} <span className="text-sm font-normal text-charcoal-400">kg</span></p>
          </div>
          {totalValue > 0 && (
            <div className="card card-body">
              <p className="text-xs text-charcoal-500 uppercase tracking-wider mb-1">{t('inventory.totalValue')}</p>
              <p className="text-2xl font-semibold text-eucalyptus-800">₹{fmt(totalValue)}</p>
            </div>
          )}
          <div className="card card-body">
            <p className="text-xs text-charcoal-500 uppercase tracking-wider mb-1">Items in Inventory</p>
            <p className="text-2xl font-semibold text-charcoal-900">{items.length}</p>
          </div>
        </div>
      )}

      {/* Content */}
      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <SkeletonCard key={i} lines={3} />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={t('inventory.noInventory')}
          description={t('inventory.noInventoryDesc')}
          action={{ label: t('inventory.addStock'), onClick: () => setShowForm(true) }}
          icon={<svg className="w-7 h-7 text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
        />
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const estValue = item.price_per_kg ? Number(item.quantity_kg) * Number(item.price_per_kg) : null;
            return (
              <div key={item.id} className="card card-body">
                <div className="flex items-start gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-charcoal-900">{item.salt_type}</h3>
                      <span className={`badge ${STATUS_STYLES[item.status] || 'badge-gray'}`}>
                        {t(`inventory.status.${item.status}`)}
                      </span>
                      {item.quality_grade && (
                        <span className="badge badge-sage">{item.quality_grade}</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-2">
                      <div>
                        <span className="text-xs text-charcoal-400">Quantity</span>
                        <p className="text-sm font-semibold text-charcoal-900">{fmt(Number(item.quantity_kg))} kg</p>
                      </div>
                      {item.price_per_kg && (
                        <div>
                          <span className="text-xs text-charcoal-400">Exp. Price</span>
                          <p className="text-sm font-semibold text-charcoal-900">₹{fmt(Number(item.price_per_kg), 2)}/kg</p>
                        </div>
                      )}
                      {estValue && (
                        <div>
                          <span className="text-xs text-charcoal-400">Est. Value</span>
                          <p className="text-sm font-semibold text-eucalyptus-800">₹{fmt(estValue)}</p>
                        </div>
                      )}
                      {item.harvest_date && (
                        <div>
                          <span className="text-xs text-charcoal-400">Harvested</span>
                          <p className="text-sm text-charcoal-700">{fmtDate(item.harvest_date)}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-charcoal-400">
                      {item.storage_location && <span>📍 {item.storage_location}</span>}
                      {item.season && <span>🌾 {item.season}</span>}
                      {item.moisture_pct !== null && <span>💧 {item.moisture_pct}% moisture</span>}
                    </div>

                    {item.notes && (
                      <p className="text-xs text-charcoal-500 mt-2 line-clamp-2">{item.notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => { setEditItem(item); setShowForm(true); }}
                      className="btn-secondary btn-sm"
                    >
                      {t('common.edit')}
                    </button>
                    {item.status === 'AVAILABLE' && (
                      <Link to="/create-listing" state={{ inventoryId: item.id, saltType: item.salt_type, quantity: item.quantity_kg, price: item.price_per_kg }} className="btn-ghost btn-sm text-eucalyptus-700">
                        {t('inventory.createListing')}
                      </Link>
                    )}
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="btn-danger btn-sm"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <InventoryForm
          initial={editItem ? toFormState(editItem) : BLANK_FORM}
          isEdit={!!editItem}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditItem(null); }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('inventory.confirmDelete')}
        message={t('inventory.confirmDeleteMsg')}
        confirmLabel={t('common.delete')}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
