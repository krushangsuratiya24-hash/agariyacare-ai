import React, { useEffect, useState, useCallback } from 'react';
import {
  Heart, Plus, MapPin, Calendar, Phone, AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuthStore } from '../context/authStore';
import { healthcareApi } from '../services/api';
import { HealthcareRequest, HealthcareCamp } from '../types';
import { PageHeader, StatusBadge, Spinner, AlertBanner, Disclaimer } from '../components/UI';

// ─── Symptom list ─────────────────────────────────────────────────────────────

const SYMPTOMS_EN = [
  'Dizziness', 'Headache', 'Nausea / Vomiting', 'Weakness / Fatigue', 'Eye Irritation',
  'Skin Rash / Irritation', 'Fever', 'Dehydration', 'Chest Pain',
  'Difficulty Breathing', 'Joint / Muscle Pain', 'Other',
];

const SYMPTOMS_GU = [
  'ચક્કર', 'માથાનો દુખાવો', 'ઊબકળ / ઊલ્ટી', 'નબળાઈ / થાક', 'આંખ ખૂંચે',
  'ત્વચા પર ખંજવાળ', 'તાવ', 'પાણી ઓછું', 'છાતીમાં દર્દ',
  'શ્વાસ લેવામાં તકલીફ', 'સાંધા/સ્નાયુ દર્દ', 'બીજું',
];

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED: 'bg-blue-50 text-blue-800 border border-blue-100',
  REVIEWING: 'bg-amber-50 text-amber-800 border border-amber-100',
  REFERRED: 'bg-purple-50 text-purple-800 border border-purple-100',
  SCHEDULED: 'bg-indigo-50 text-indigo-800 border border-indigo-100',
  RESOLVED: 'bg-green-50 text-green-800 border border-green-100',
  CLOSED: 'bg-gray-100 text-gray-600 border border-gray-100',
};

const SEV_STYLES: Record<string, string> = {
  EMERGENCY: 'bg-red-100 text-red-800 border border-red-200',
  HIGH:      'bg-orange-100 text-orange-800 border border-orange-200',
  MEDIUM:    'bg-yellow-100 text-yellow-800 border border-yellow-200',
  LOW:       'bg-green-50 text-green-700 border border-green-100',
};

const STATUSES = ['SUBMITTED', 'REVIEWING', 'REFERRED', 'SCHEDULED', 'RESOLVED', 'CLOSED'];

// ─── HealthcarePage ───────────────────────────────────────────────────────────

export default function HealthcarePage() {
  const { user: currentUser } = useAuthStore();
  const { t, language } = useLanguage();
  const gu = language === 'gu';
  const th = t.healthcare;

  const isCoordinator = currentUser?.role === 'COORDINATOR' || currentUser?.role === 'ADMIN';

  const [tab, setTab] = useState<'requests' | 'camps' | 'new'>('requests');
  const [requests, setRequests] = useState<HealthcareRequest[]>([]);
  const [camps, setCamps] = useState<HealthcareCamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Form state
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');

  // Coordinator state
  const [selectedRequest, setSelectedRequest] = useState<HealthcareRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [coordStatus, setCoordStatus] = useState('');
  const [coordNote, setCoordNote] = useState('');
  const [updatingRequest, setUpdatingRequest] = useState(false);

  const symptoms = gu ? SYMPTOMS_GU : SYMPTOMS_EN;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, campRes] = await Promise.all([
        isCoordinator
          ? healthcareApi.coordinator.getRequests({ status: filterStatus || undefined, severity: filterSeverity || undefined })
          : healthcareApi.getRequests(),
        healthcareApi.getCamps(),
      ]);
      setRequests(reqRes.data ?? []);
      setCamps(campRes.data ?? []);
    } catch {
      setError(gu ? 'ડેટા લોડ થઈ શક્યો નહીં.' : 'Unable to load healthcare data.');
    } finally {
      setLoading(false);
    }
  }, [isCoordinator, filterStatus, filterSeverity, gu]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (selectedSymptoms.length === 0) {
      setError(gu ? 'ઓછામાં ઓછું એક લક્ષણ પસંદ કરો.' : 'Please select at least one symptom.');
      return;
    }
    if (!description.trim()) {
      setError(gu ? 'વિવરણ જરૂરી છે.' : 'Please provide a description.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await healthcareApi.createRequest({ symptoms: selectedSymptoms, description, severity });
      setSuccess(gu
        ? 'વિનંતી મોકલાઈ. Coordinator ટૂંક સમયમાં સંપર્ક કરશે.'
        : 'Healthcare request submitted. A coordinator will contact you.');
      setSelectedSymptoms([]);
      setDescription('');
      setSeverity('MEDIUM');
      setTab('requests');
      loadData();
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || (gu ? 'મોકલી શકાઈ નહીં.' : 'Failed to submit.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCoordUpdate = async () => {
    if (!selectedRequest) return;
    setUpdatingRequest(true);
    try {
      const updateData: any = {};
      if (coordStatus && coordStatus !== selectedRequest.status) updateData.status = coordStatus;
      if (Object.keys(updateData).length === 0 && !coordNote.trim()) {
        setUpdatingRequest(false);
        return;
      }
      if (Object.keys(updateData).length > 0) {
        await healthcareApi.coordinator.updateRequest(selectedRequest.id, updateData);
      }
      if (coordNote.trim()) {
        await healthcareApi.coordinator.addNote(selectedRequest.id, coordNote.trim());
        setCoordNote('');
      }
      setSuccess(gu ? 'વિનંતી અપડેટ થઈ.' : 'Request updated.');
      setSelectedRequest(null);
      loadData();
    } catch (e: any) {
      setError(e?.response?.data?.error || (gu ? 'અપડેટ થઈ શક્યું નહીં.' : 'Update failed.'));
    } finally {
      setUpdatingRequest(false);
    }
  };

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  // ─── Coordinator view ─────────────────────────────────────────────────────

  if (isCoordinator) {
    return (
      <div>
        <PageHeader
          title={gu ? 'આરોગ્ય — Coordinator' : 'Healthcare — Coordinator View'}
          subtitle={gu ? 'Worker ની વિનંતીઓ manage કરો' : 'Manage worker healthcare requests'}
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); }}
            className="input-field text-sm py-1.5 w-40">
            <option value="">{gu ? 'બધા status' : 'All Status'}</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterSeverity} onChange={e => { setFilterSeverity(e.target.value); }}
            className="input-field text-sm py-1.5 w-40">
            <option value="">{gu ? 'બધી તાકીદ' : 'All Urgency'}</option>
            {['EMERGENCY','HIGH','MEDIUM','LOW'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={loadData} className="btn-secondary text-sm py-1.5">
            {gu ? 'Filter કરો' : 'Apply Filter'}
          </button>
        </div>

        {success && <AlertBanner type="success" message={success} />}
        {error && <AlertBanner type="error" message={error} />}

        {loading ? (
          <div className="flex justify-center h-40 items-center"><Spinner size={28} /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Request list */}
            <div className="lg:col-span-2 space-y-3">
              {requests.length === 0 ? (
                <div className="card text-center py-10 text-gray-400">
                  {gu ? 'કોઈ વિનંતી નથી.' : 'No requests found.'}
                </div>
              ) : requests.map(req => (
                <button
                  key={req.id}
                  onClick={() => { setSelectedRequest(req); setCoordStatus(req.status); setCoordNote(''); }}
                  className={`card w-full text-left transition-all hover:shadow-md ${selectedRequest?.id === req.id ? 'ring-2 ring-eucalyptus-400' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SEV_STYLES[req.severity ?? 'MEDIUM']}`}>
                          {req.severity}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[req.status] ?? 'bg-gray-50 text-gray-700'}`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="font-medium text-gray-800 text-sm truncate">
                        {req.workerName ?? 'Worker'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {Array.isArray(req.symptoms) ? req.symptoms.slice(0, 3).join(', ') : req.symptoms}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(req.createdAt).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  {req.description && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">{req.description}</p>
                  )}
                </button>
              ))}
            </div>

            {/* Detail panel */}
            <div>
              {selectedRequest ? (
                <div className="card sticky top-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Heart size={14} className="text-rose-400" />
                    {selectedRequest.workerName ?? 'Worker'}
                  </h3>

                  <div className="space-y-2 mb-4">
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEV_STYLES[selectedRequest.severity ?? 'MEDIUM']}`}>
                        {selectedRequest.severity}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[selectedRequest.status] ?? ''}`}>
                        {selectedRequest.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">{gu ? 'લક્ષણો:' : 'Symptoms:'}</span>{' '}
                      {Array.isArray(selectedRequest.symptoms) ? selectedRequest.symptoms.join(', ') : selectedRequest.symptoms}
                    </div>
                    <p className="text-sm text-gray-600">{selectedRequest.description}</p>
                    <p className="text-xs text-gray-400">{new Date(selectedRequest.createdAt).toLocaleString('en-IN')}</p>
                    {selectedRequest.scheduledDate && (
                      <p className="text-xs text-indigo-600">
                        <Calendar size={11} className="inline mr-1" />
                        {new Date(selectedRequest.scheduledDate).toLocaleDateString('en-IN')}
                      </p>
                    )}
                    {selectedRequest.coordinatorNotes && (
                      <div className="bg-gray-50 rounded-lg p-2 text-xs text-gray-600">
                        <span className="font-medium">{gu ? 'નોંધ:' : 'Notes:'}</span> {selectedRequest.coordinatorNotes}
                      </div>
                    )}
                  </div>

                  {/* Status update */}
                  <div className="space-y-3 border-t border-gray-100 pt-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">{gu ? 'Status બદલો' : 'Update Status'}</label>
                      <select value={coordStatus} onChange={e => setCoordStatus(e.target.value)} className="input-field text-sm py-1.5">
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">{gu ? 'નોંધ' : 'Add Note'}</label>
                      <textarea
                        value={coordNote}
                        onChange={e => setCoordNote(e.target.value)}
                        className="input-field h-16 resize-none text-sm"
                        placeholder={gu ? 'નોંધ લખો…' : 'Add coordinator note…'}
                      />
                    </div>
                    <button
                      onClick={handleCoordUpdate}
                      disabled={updatingRequest}
                      className="btn-primary w-full text-sm"
                    >
                      {updatingRequest ? (gu ? 'Update થઈ રહ્યું…' : 'Updating…') : (gu ? 'Update કરો' : 'Save Update')}
                    </button>
                    <button
                      onClick={() => setSelectedRequest(null)}
                      className="btn-secondary w-full text-sm"
                    >
                      {gu ? 'બંધ કરો' : 'Close'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card text-center py-10 text-gray-400 text-sm">
                  {gu ? 'વિનંતી પસંદ કરો' : 'Select a request to review'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Worker view ──────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title={th.title}
        subtitle={th.subtitle}
        actions={
          <button onClick={() => setTab('new')} className="btn-primary flex items-center gap-2">
            <Plus size={14} /> {th.requestHelp}
          </button>
        }
      />

      {/* Emergency banner */}
      <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm mb-4">
        <AlertCircle size={14} className="flex-shrink-0" />
        <span>{gu ? 'Emergency? 108 પર તુરંત phone કરો.' : 'Medical emergency? Call 108 immediately.'}</span>
        <a href="tel:108" className="ml-auto font-bold underline hover:no-underline">108</a>
      </div>

      <Disclaimer text={th.disclaimer} />

      {/* Tabs */}
      <div className="flex gap-1 mt-4 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: 'requests', label: th.myRequests },
          { key: 'camps', label: th.myCamps },
          { key: 'new', label: th.newRequest },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === key ? 'bg-white text-eucalyptus-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >{label}</button>
        ))}
      </div>

      {success && <div className="mb-3"><AlertBanner type="success" message={success} /></div>}
      {error && <div className="mb-3"><AlertBanner type="error" message={error} /></div>}

      {loading ? (
        <div className="flex items-center justify-center h-40"><Spinner size={28} /></div>
      ) : tab === 'requests' ? (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-gray-400 mb-3">{th.noRequests}</p>
              <p className="text-gray-400 text-sm mb-4">{th.noRequestsHint}</p>
              <button onClick={() => setTab('new')} className="btn-primary text-sm">
                {th.requestHelp}
              </button>
            </div>
          ) : requests.map(req => (
            <div key={req.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[req.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {req.status}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SEV_STYLES[req.severity ?? 'MEDIUM']}`}>
                      {req.severity}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-800 mb-1">
                    {Array.isArray(req.symptoms) ? req.symptoms.join(', ') : req.symptoms}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{req.description}</p>
                  {req.scheduledDate && (
                    <div className="flex items-center gap-1 text-xs text-indigo-600 mt-1.5">
                      <Calendar size={11} />
                      {gu ? 'Appointment:' : 'Scheduled:'}{' '}
                      {new Date(req.scheduledDate).toLocaleDateString('en-IN')}
                    </div>
                  )}
                  {req.coordinatorNotes && (
                    <div className="mt-2 bg-gray-50 rounded p-2 text-xs text-gray-600">
                      <MessageSquare size={11} className="inline mr-1" />
                      {req.coordinatorNotes}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(req.createdAt).toLocaleDateString('en-IN')}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'camps' ? (
        <div className="space-y-4">
          {camps.filter(c => c.isActive).length === 0 ? (
            <div className="card text-center py-10 text-gray-400">{th.noCamps}</div>
          ) : camps.filter(c => c.isActive).map(camp => (
            <div key={camp.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{camp.name}</h3>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-2">
                    <span className="flex items-center gap-1"><MapPin size={12} /> {camp.location}</span>
                    <span className="flex items-center gap-1"><Calendar size={12} /> {camp.date} · {camp.time}</span>
                    <span className="flex items-center gap-1"><Phone size={12} /> {camp.contact}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {camp.services.map(s => (
                      <span key={s} className="badge bg-teal-50 text-teal-700 border border-teal-100 text-xs">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {camp.capacity && (
                    <div className="text-xs text-gray-400">{camp.registered}/{camp.capacity} {gu ? 'seats' : 'registered'}</div>
                  )}
                  <span className="badge bg-green-50 text-green-700 border border-green-100 text-xs mt-1 inline-block">
                    {gu ? 'સક્રિય' : 'Active'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // New request form
        <div className="card max-w-2xl">
          <h3 className="font-semibold text-gray-900 mb-4">{th.requestHelp}</h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{th.symptoms}</label>
              <div className="flex flex-wrap gap-2">
                {symptoms.map((s, i) => {
                  const key = SYMPTOMS_EN[i] ?? s;
                  return (
                    <button type="button" key={key} onClick={() => toggleSymptom(key)}
                      className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                        selectedSymptoms.includes(key)
                          ? 'bg-eucalyptus-600 text-white border-eucalyptus-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-eucalyptus-300'
                      }`}
                    >{s}</button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{th.description}</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="input-field h-24 resize-none"
                placeholder={th.descriptionPlaceholder}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{th.severity}</label>
              <select value={severity} onChange={e => setSeverity(e.target.value)} className="input-field">
                <option value="LOW">{th.severityLow}</option>
                <option value="MEDIUM">{th.severityMedium}</option>
                <option value="HIGH">{th.severityHigh}</option>
                <option value="EMERGENCY">{th.severityEmergency}</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? th.submitting : th.submitRequest}
              </button>
              <button type="button" onClick={() => setTab('requests')} className="btn-secondary">
                {gu ? 'રદ કરો' : 'Cancel'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
