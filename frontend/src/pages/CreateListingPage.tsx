import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, Check, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { marketplaceApi } from '../services/api';
import { SaltType, SaltGrade } from '../types';
import { Spinner } from '../components/UI';

type FormData = {
  inventoryId: string;
  quantityKg: string;
  saltTypeId: string;
  saltGradeId: string;
  qualityDescription: string;
  askingPricePerKg: string;
  availableFrom: string;
  availableUntil: string;
  pickupLocation: string;
  pickupDistrict: string;
  deliveryNotes: string;
  description: string;
  status: 'DRAFT' | 'ACTIVE';
};

export default function CreateListingPage() {
  const { language } = useLanguage();
  const gu = language === 'gu';
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1);
  const [saltTypes, setSaltTypes] = useState<SaltType[]>([]);
  const [saltGrades, setSaltGrades] = useState<SaltGrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<FormData>({
    inventoryId: (location.state as any)?.inventoryId ?? '',
    quantityKg: '',
    saltTypeId: '',
    saltGradeId: '',
    qualityDescription: '',
    askingPricePerKg: '',
    availableFrom: '',
    availableUntil: '',
    pickupLocation: '',
    pickupDistrict: 'Surendranagar',
    deliveryNotes: '',
    description: '',
    status: 'ACTIVE',
  });

  const TOTAL_STEPS = 8;
  const steps = [
    gu ? 'જથ્થો' : 'Quantity',
    gu ? 'પ્રકાર' : 'Salt Type',
    gu ? 'ગ્રેડ' : 'Grade',
    gu ? 'ગુણવત્તા' : 'Quality',
    gu ? 'ભાવ' : 'Pricing',
    gu ? 'ઉપ. તારીખ' : 'Availability',
    gu ? 'સ્થળ' : 'Location',
    gu ? 'પ્રકાશિત' : 'Publish',
  ];

  useEffect(() => {
    Promise.all([marketplaceApi.getSaltTypes(), marketplaceApi.getSaltGrades()]).then(([t, g]) => {
      setSaltTypes(t.data ?? []);
      setSaltGrades(g.data ?? []);
    });
  }, []);

  function setField(key: keyof FormData, value: string) {
    setForm(p => ({ ...p, [key]: value }));
  }

  function canNext(): boolean {
    if (step === 1) return !!form.quantityKg && Number(form.quantityKg) > 0;
    if (step === 2) return !!form.saltTypeId;
    if (step === 3) return !!form.saltGradeId;
    if (step === 5) return !!form.askingPricePerKg && Number(form.askingPricePerKg) > 0;
    if (step === 6) return !!form.availableFrom;
    if (step === 7) return !!form.pickupLocation;
    return true;
  }

  async function publish(asDraft = false) {
    setError('');
    setSaving(true);
    try {
      const payload = {
        inventoryId: form.inventoryId || undefined,
        quantityKg: Number(form.quantityKg),
        saltTypeId: form.saltTypeId,
        saltGradeId: form.saltGradeId,
        qualityDescription: form.qualityDescription || undefined,
        askingPricePerKg: Number(form.askingPricePerKg),
        availableFrom: form.availableFrom,
        availableUntil: form.availableUntil || undefined,
        pickupLocation: form.pickupLocation,
        district: form.pickupDistrict || 'Surendranagar',
        deliveryNotes: form.deliveryNotes || undefined,
        description: form.description || undefined,
        status: asDraft ? 'DRAFT' : 'ACTIVE',
      };
      await marketplaceApi.createListing(payload);
      navigate('/my-salt');
    } catch (e: any) {
      setError(e.message ?? (gu ? 'પ્રકાશિત કરી શક્યા નહીં.' : 'Failed to publish listing.'));
    } finally {
      setSaving(false);
    }
  }

  const filteredGrades = saltGrades.filter(g => !form.saltTypeId || g.saltTypeId === form.saltTypeId);
  const selectedType = saltTypes.find(t => t.id === form.saltTypeId);
  const selectedGrade = saltGrades.find(g => g.id === form.saltGradeId);

  return (
    <div className="max-w-xl mx-auto">
      {/* Back */}
      <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/my-salt')} className="flex items-center gap-1.5 text-sm text-charcoal-500 hover:text-charcoal-800 mb-4 group">
        <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
        {gu ? 'પાછા' : 'Back'}
      </button>

      {/* Header */}
      <div className="mb-6">
        <p className="section-label mb-0.5">{gu ? 'નવી લિસ્ટ' : 'New Listing'}</p>
        <h1 className="text-xl font-bold text-charcoal-900">{gu ? 'મીઠું વેચો' : 'Sell Salt'}</h1>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {steps.map((label, i) => {
          const num = i + 1;
          const done = num < step;
          const active = num === step;
          return (
            <React.Fragment key={num}>
              <div className={`flex items-center gap-1 flex-shrink-0 ${done ? 'text-eucalyptus-600' : active ? 'text-charcoal-900' : 'text-charcoal-300'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-eucalyptus-100' : active ? 'bg-charcoal-900 text-white' : 'bg-charcoal-100'}`}>
                  {done ? <Check size={12} /> : num}
                </div>
                <span className="text-xs hidden sm:block whitespace-nowrap">{label}</span>
              </div>
              {i < TOTAL_STEPS - 1 && <div className={`flex-1 min-w-3 h-0.5 rounded ${done ? 'bg-eucalyptus-300' : 'bg-charcoal-100'}`} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step content */}
      <div className="card">
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-charcoal-900 mb-1">{gu ? 'કેટલું મીઠું વેચવું છે?' : 'How much salt do you want to sell?'}</h2>
            <p className="text-sm text-charcoal-400 mb-5">{gu ? 'kg માં જથ્થો દર્શાવો' : 'Enter the quantity in kilograms.'}</p>
            <label className="label">{gu ? 'જથ્થો (kg)' : 'Quantity (kg)'} *</label>
            <input className="input text-xl" type="number" min="1" step="100" placeholder="e.g. 5000"
              value={form.quantityKg} onChange={e => setField('quantityKg', e.target.value)} autoFocus />
            {form.quantityKg && Number(form.quantityKg) > 0 && (
              <p className="text-sm text-charcoal-500 mt-2">
                = {(Number(form.quantityKg) / 1000).toFixed(1)} {gu ? 'ટ્ ̈ ̈ ̈ ̈ ̈ ̈ ̈' : 'tonnes'}
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-charcoal-900 mb-1">{gu ? 'મીઠાનો પ્રકાર' : 'Salt Type'}</h2>
            <p className="text-sm text-charcoal-400 mb-5">{gu ? 'તમારા મીઠાનો પ્રકાર પસંદ કરો' : 'Select the type of salt you are selling.'}</p>
            <div className="grid grid-cols-1 gap-3">
              {saltTypes.map(st => (
                <button key={st.id} onClick={() => setField('saltTypeId', st.id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${form.saltTypeId === st.id ? 'border-eucalyptus-500 bg-eucalyptus-50' : 'border-charcoal-100 hover:border-eucalyptus-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-charcoal-900">{st.name}</span>
                    {form.saltTypeId === st.id && <Check size={16} className="text-eucalyptus-600" />}
                  </div>
                  {st.description && <p className="text-sm text-charcoal-400 mt-0.5">{st.description}</p>}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-charcoal-900 mb-1">{gu ? 'ગ્રેડ' : 'Grade & Quality Level'}</h2>
            <p className="text-sm text-charcoal-400 mb-5">{gu ? 'ગ્રેડ પ્રભાવ ભાવ પર' : 'Grade affects the price buyers will expect.'}</p>
            <div className="grid grid-cols-1 gap-3">
              {filteredGrades.map(gr => (
                <button key={gr.id} onClick={() => setField('saltGradeId', gr.id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${form.saltGradeId === gr.id ? 'border-eucalyptus-500 bg-eucalyptus-50' : 'border-charcoal-100 hover:border-eucalyptus-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-charcoal-900">{gr.name}</span>
                    {form.saltGradeId === gr.id && <Check size={16} className="text-eucalyptus-600" />}
                  </div>
                  {gr.description && <p className="text-sm text-charcoal-400 mt-0.5">{gr.description}</p>}
                  <p className="text-xs text-charcoal-400 mt-1">
                    {gu ? 'સૂ. ભાવ' : 'Typical'}: ₹{gr.typicalPriceRangeMin}–₹{gr.typicalPriceRangeMax}/kg
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-lg font-semibold text-charcoal-900 mb-1">{gu ? 'ગુણવત્તા વિવરણ' : 'Quality Description'}</h2>
            <p className="text-sm text-charcoal-400 mb-5">{gu ? 'ખરીદદારોને ગુણવત્તા સમજાવો' : 'Help buyers understand the quality of your salt.'}</p>
            <label className="label">{gu ? 'ગુણ' : 'Quality details'} ({gu ? 'વૈ.' : 'optional'})</label>
            <textarea className="input" rows={4} placeholder={gu ? 'ઉદ.: સ્વચ્છ, સૂકી, ઉચ્ચ ગ્રેડ, ઓછી ભેજ...' : 'e.g. Clean dry crystals, low moisture, premium grade...'}
              value={form.qualityDescription} onChange={e => setField('qualityDescription', e.target.value)} />
            <label className="label mt-4">{gu ? 'લિસ્ટ વિવ.' : 'Listing description'} ({gu ? 'વૈ.' : 'optional'})</label>
            <textarea className="input" rows={3} placeholder={gu ? 'ઉ.ત.: ઉત્પાદક...' : 'Any additional information for buyers...'}
              value={form.description} onChange={e => setField('description', e.target.value)} />
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 className="text-lg font-semibold text-charcoal-900 mb-1">{gu ? 'ભાવ' : 'Your Asking Price'}</h2>
            {selectedGrade && (
              <p className="text-sm text-charcoal-400 mb-5">
                {gu ? 'સૂ. ભાવ:' : 'Typical for this grade:'} ₹{selectedGrade.typicalPriceRangeMin}–₹{selectedGrade.typicalPriceRangeMax}/kg
              </p>
            )}
            <label className="label">{gu ? 'ભાવ (₹/kg)' : 'Asking price (₹/kg)'} *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400 font-medium">₹</span>
              <input className="input pl-8 text-xl" type="number" min="0.1" step="0.1" placeholder="8.50"
                value={form.askingPricePerKg} onChange={e => setField('askingPricePerKg', e.target.value)} autoFocus />
            </div>
            {form.askingPricePerKg && form.quantityKg && (
              <div className="mt-4 bg-eucalyptus-50 border border-eucalyptus-100 rounded-lg p-3">
                <p className="text-sm text-charcoal-600">
                  {gu ? 'કુલ' : 'Estimated total'}: <strong className="text-charcoal-900">
                    ₹{(Number(form.askingPricePerKg) * Number(form.quantityKg)).toLocaleString('en-IN')}
                  </strong>
                </p>
                <p className="text-xs text-charcoal-400 mt-0.5">
                  {form.quantityKg} kg × ₹{form.askingPricePerKg}/kg
                </p>
              </div>
            )}
          </div>
        )}

        {step === 6 && (
          <div>
            <h2 className="text-lg font-semibold text-charcoal-900 mb-1">{gu ? 'ઉપ. સમય' : 'Availability'}</h2>
            <p className="text-sm text-charcoal-400 mb-5">{gu ? 'ક્યારથી ઉ. ?' : 'When is the salt available for pickup?'}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">{gu ? 'ઉ. તારીખ' : 'Available from'} *</label>
                <input className="input" type="date" value={form.availableFrom} onChange={e => setField('availableFrom', e.target.value)} />
              </div>
              <div>
                <label className="label">{gu ? 'અ. સુધી' : 'Available until'}</label>
                <input className="input" type="date" value={form.availableUntil} onChange={e => setField('availableUntil', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 7 && (
          <div>
            <h2 className="text-lg font-semibold text-charcoal-900 mb-1">{gu ? 'ઉ. / ડ.' : 'Pickup Location'}</h2>
            <p className="text-sm text-charcoal-400 mb-5">{gu ? 'ખ. ક્યાં?' : 'Where can buyers collect the salt?'}</p>
            <div className="space-y-4">
              <div>
                <label className="label">{gu ? 'સ્થળ' : 'Pickup location / village'} *</label>
                <input className="input" placeholder={gu ? 'ઉ.ત.: ભૂજ' : 'e.g. Bajana village, Little Rann of Kutch'}
                  value={form.pickupLocation} onChange={e => setField('pickupLocation', e.target.value)} autoFocus />
              </div>
              <div>
                <label className="label">{gu ? 'જિ.' : 'District'}</label>
                <input className="input" placeholder="e.g. Surendranagar"
                  value={form.pickupDistrict} onChange={e => setField('pickupDistrict', e.target.value)} />
              </div>
              <div>
                <label className="label">{gu ? 'પ. નોં.' : 'Delivery notes'}</label>
                <textarea className="input" rows={2} placeholder={gu ? 'ટ. ઉ. ...' : 'Transport notes, loading availability, truck access…'}
                  value={form.deliveryNotes} onChange={e => setField('deliveryNotes', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 8 && (
          <div>
            <h2 className="text-lg font-semibold text-charcoal-900 mb-4">{gu ? 'સ.' : 'Review & Publish'}</h2>
            <div className="space-y-3 text-sm">
              {[
                [gu ? 'જ.' : 'Quantity', `${Number(form.quantityKg).toLocaleString()} kg`],
                [gu ? 'પ.' : 'Salt Type', selectedType?.name ?? '—'],
                [gu ? 'ગ.' : 'Grade', selectedGrade?.name ?? '—'],
                [gu ? 'ભ.' : 'Asking Price', `₹${form.askingPricePerKg}/kg`],
                [gu ? 'ઉ. ત.' : 'Available From', form.availableFrom || '—'],
                [gu ? 'સ.' : 'Location', form.pickupLocation || '—'],
                [gu ? 'જ.' : 'District', form.pickupDistrict || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-charcoal-50">
                  <span className="text-charcoal-500">{k}</span>
                  <span className="font-medium text-charcoal-900">{v}</span>
                </div>
              ))}
              {form.quantityKg && form.askingPricePerKg && (
                <div className="bg-eucalyptus-50 border border-eucalyptus-100 rounded-lg p-3 mt-2">
                  <p className="text-sm text-charcoal-600">
                    {gu ? 'સ. કિ. મૂ.' : 'Total potential value'}: <strong className="text-eucalyptus-700 text-base">
                      ₹{(Number(form.askingPricePerKg) * Number(form.quantityKg)).toLocaleString('en-IN')}
                    </strong>
                  </p>
                </div>
              )}
            </div>
            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={() => publish(false)} disabled={saving} className="btn-primary flex-1">
                {saving ? (gu ? 'પ્...)' : 'Publishing…') : (gu ? 'પ્ ?' : 'Publish Listing')}
              </button>
              <button onClick={() => publish(true)} disabled={saving} className="btn-secondary">
                {gu ? 'ડ.' : 'Save Draft'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      {step < 8 && (
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext()}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {gu ? 'આ.' : 'Continue'} <ChevronRight size={16} />
          </button>
          {step >= 4 && (
            <button onClick={() => setStep(8)} className="btn-secondary text-sm px-3">
              {gu ? 'સ.' : 'Review'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
