import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { listingService, inventoryService, SaltInventory } from '../services/marketplaceService';
import { Spinner, Alert } from '../components/ui/index';

interface FormState {
  salt_type: string;
  quantity_kg: string;
  price_per_kg: string;
  quality_grade: string;
  location: string;
  village: string;
  district: string;
  min_quantity_kg: string;
  season: string;
  available_date: string;
  description: string;
  inventory_id: string;
}

const BLANK: FormState = {
  salt_type: '', quantity_kg: '', price_per_kg: '',
  quality_grade: '', location: '', village: '', district: '',
  min_quantity_kg: '100', season: '', available_date: '',
  description: '', inventory_id: '',
};

export const CreateListingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = (location.state as Partial<{
    inventoryId: string; saltType: string; quantity: number; price: number
  }>) || {};

  const [form, setForm] = useState<FormState>({
    ...BLANK,
    inventory_id:  prefill.inventoryId || '',
    salt_type:     prefill.saltType || '',
    quantity_kg:   prefill.quantity ? String(prefill.quantity) : '',
    price_per_kg:  prefill.price    ? String(prefill.price)    : '',
  });
  const [inventory, setInventory] = useState<SaltInventory[]>([]);
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inventoryService.getAll().then(res => {
      if (res.success && res.data) setInventory(res.data.filter(i => i.status === 'AVAILABLE'));
    }).catch(() => {});
  }, []);

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const totalValue = form.quantity_kg && form.price_per_kg
    ? parseFloat(form.quantity_kg) * parseFloat(form.price_per_kg)
    : null;

  const validate = (): string | null => {
    if (!form.salt_type.trim()) return 'Salt type is required';
    if (!form.quantity_kg || parseFloat(form.quantity_kg) < 1) return 'Quantity must be at least 1 kg';
    if (!form.price_per_kg || parseFloat(form.price_per_kg) < 0.01) return 'Price must be greater than 0';
    if (!form.location.trim()) return 'Location is required';
    return null;
  };

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setStep('confirm');
  };

  const handlePublish = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await listingService.create({
        salt_type:      form.salt_type,
        quantity_kg:    parseFloat(form.quantity_kg),
        price_per_kg:   parseFloat(form.price_per_kg),
        quality_grade:  form.quality_grade  || undefined,
        location:       form.location,
        village:        form.village        || undefined,
        district:       form.district       || undefined,
        min_quantity_kg: form.min_quantity_kg ? parseFloat(form.min_quantity_kg) : undefined,
        season:         form.season         || undefined,
        available_date: form.available_date || undefined,
        description:    form.description    || undefined,
        inventory_id:   form.inventory_id   || undefined,
      } as Parameters<typeof listingService.create>[0]);

      if (!res.success) throw new Error(res.error || 'Publish failed');
      toast.success(t('listing.saved'));
      navigate('/my-salt');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string })
        ?.response?.data?.error || (err as Error)?.message || 'Failed to publish';
      setError(msg);
      setStep('form');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="text-sm text-charcoal-400 hover:text-charcoal-600 flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          {t('common.back')}
        </button>
        <h1 className="text-2xl font-semibold text-charcoal-900">
          {step === 'confirm' ? t('listing.confirmPublish') : t('listing.createTitle')}
        </h1>
        {step === 'form' && (
          <p className="text-sm text-charcoal-500 mt-0.5">Your listing will be visible to all buyers on the Salt Market</p>
        )}
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}

      {/* ── FORM STEP ─────────────────────────────────────────────────────── */}
      {step === 'form' && (
        <form onSubmit={handlePreview} className="space-y-5">
          {/* Link to inventory */}
          {inventory.length > 0 && (
            <div className="card card-body bg-ivory-50">
              <label className="label">{t('listing.fields.linkInventory')}</label>
              <p className="text-xs text-charcoal-400 mb-2">{t('listing.fields.linkInventoryDesc')}</p>
              <select
                className="input"
                value={form.inventory_id}
                onChange={e => {
                  const inv = inventory.find(i => i.id === e.target.value);
                  setForm(f => ({
                    ...f,
                    inventory_id: e.target.value,
                    ...(inv ? {
                      salt_type: inv.salt_type || f.salt_type,
                      quantity_kg: f.quantity_kg || String(inv.quantity_kg),
                      price_per_kg: f.price_per_kg || (inv.price_per_kg ? String(inv.price_per_kg) : ''),
                      quality_grade: f.quality_grade || (inv.quality_grade || ''),
                      season: f.season || (inv.season || ''),
                    } : {}),
                  }));
                }}
              >
                <option value="">— Don't link to inventory —</option>
                {inventory.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.salt_type} — {Number(i.quantity_kg).toLocaleString('en-IN')} kg
                    {i.quality_grade ? ` (${i.quality_grade})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Core fields */}
          <div className="card card-body space-y-4">
            <h3 className="section-title">Salt Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('listing.fields.saltType')} <span className="text-red-400">*</span></label>
                <input className="input" value={form.salt_type} onChange={set('salt_type')} placeholder={t('listing.fields.saltTypePlaceholder')} required />
              </div>
              <div>
                <label className="label">{t('listing.fields.qualityGrade')}</label>
                <input className="input" value={form.quality_grade} onChange={set('quality_grade')} placeholder="e.g. A-Grade, Export Quality" />
              </div>
              <div>
                <label className="label">{t('listing.fields.quantityKg')} <span className="text-red-400">*</span></label>
                <input className="input" type="number" min="1" step="0.01" value={form.quantity_kg} onChange={set('quantity_kg')} placeholder="5000" required />
              </div>
              <div>
                <label className="label">{t('listing.fields.pricePerKg')} <span className="text-red-400">*</span></label>
                <input className="input" type="number" min="0.01" step="0.01" value={form.price_per_kg} onChange={set('price_per_kg')} placeholder="8.50" required />
              </div>
              <div>
                <label className="label">{t('listing.fields.minQuantityKg')}</label>
                <input className="input" type="number" min="1" step="1" value={form.min_quantity_kg} onChange={set('min_quantity_kg')} placeholder="100" />
              </div>
              <div>
                <label className="label">{t('listing.fields.season')}</label>
                <input className="input" value={form.season} onChange={set('season')} placeholder="e.g. Rabi 2024" />
              </div>
            </div>

            {/* Live total value */}
            {totalValue && totalValue > 0 && (
              <div className="bg-eucalyptus-50 border border-eucalyptus-200 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-eucalyptus-700 font-medium">{t('listing.totalValue')}</span>
                <span className="text-xl font-semibold text-eucalyptus-800">
                  ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="card card-body space-y-4">
            <h3 className="section-title">Location</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">{t('listing.fields.location')} <span className="text-red-400">*</span></label>
                <input className="input" value={form.location} onChange={set('location')} placeholder={t('listing.fields.locationPlaceholder')} required />
              </div>
              <div>
                <label className="label">{t('listing.fields.village')}</label>
                <input className="input" value={form.village} onChange={set('village')} placeholder="e.g. Sansarka" />
              </div>
              <div>
                <label className="label">{t('listing.fields.district')}</label>
                <input className="input" value={form.district} onChange={set('district')} placeholder="e.g. Surendranagar" />
              </div>
              <div>
                <label className="label">{t('listing.fields.availableDate')}</label>
                <input className="input" type="date" value={form.available_date} onChange={set('available_date')} />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="card card-body">
            <label className="label">{t('listing.fields.description')}</label>
            <textarea
              className="input resize-none"
              rows={4}
              value={form.description}
              onChange={set('description')}
              placeholder={t('listing.fields.descriptionPlaceholder')}
            />
          </div>

          <button type="submit" className="btn-primary btn-lg w-full">
            {t('listing.confirmPublish')} →
          </button>
        </form>
      )}

      {/* ── CONFIRM STEP ──────────────────────────────────────────────────── */}
      {step === 'confirm' && (
        <div className="space-y-4">
          <div className="card card-body space-y-4">
            <p className="text-sm text-charcoal-500">{t('listing.confirmPublishMsg')}</p>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Salt Type',    value: form.salt_type },
                { label: 'Quantity',     value: `${Number(form.quantity_kg).toLocaleString('en-IN')} kg` },
                { label: 'Price',        value: `₹${form.price_per_kg}/kg` },
                ...(totalValue ? [{ label: 'Total Value', value: `₹${totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` }] : []),
                { label: 'Location',     value: form.location },
                ...(form.quality_grade ? [{ label: 'Grade', value: form.quality_grade }] : []),
                ...(form.min_quantity_kg ? [{ label: 'Min Order', value: `${form.min_quantity_kg} kg` }] : []),
                ...(form.available_date ? [{ label: 'Available From', value: new Date(form.available_date).toLocaleDateString('en-IN') }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="bg-ivory-50 rounded-xl p-3">
                  <p className="text-xs text-charcoal-400 mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-charcoal-900">{value}</p>
                </div>
              ))}
            </div>

            {form.description && (
              <div>
                <p className="text-xs text-charcoal-400 mb-1">Description</p>
                <p className="text-sm text-charcoal-700">{form.description}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('form')} className="btn-secondary btn-md flex-1">
              {t('common.back')}
            </button>
            <button onClick={handlePublish} className="btn-primary btn-md flex-1" disabled={saving}>
              {saving ? <Spinner size="sm" /> : t('listing.publishListing')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
