import React, { useEffect, useState } from 'react';
import { Heart, Plus, MapPin, Calendar, Phone, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { healthcareApi } from '../services/api';
import { HealthcareRequest, HealthcareCamp } from '../types';
import { PageHeader, StatusBadge, Spinner, AlertBanner, Disclaimer } from '../components/UI';

const SYMPTOMS = ['Dizziness', 'Headache', 'Nausea/Vomiting', 'Weakness/Fatigue', 'Eye Irritation',
  'Skin Rash/Irritation', 'Fever', 'Dehydration', 'Chest Pain', 'Difficulty Breathing', 'Joint/Muscle Pain', 'Other'];

export default function HealthcarePage() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
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

  useEffect(() => {
    loadData();
  }, [currentUser?.id]);

  async function loadData() {
    setLoading(true);
    try {
      const [reqRes, campRes] = await Promise.all([
        healthcareApi.getRequests(currentUser?.id),
        healthcareApi.getCamps(),
      ]);
      setRequests(reqRes.data ?? []);
      setCamps(campRes.data ?? []);
    } catch {
      setError('Unable to load healthcare data.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;
    if (selectedSymptoms.length === 0) {
      setError('Please select at least one symptom.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await healthcareApi.createRequest({
        workerId: currentUser.id,
        workerName: currentUser.name,
        symptoms: selectedSymptoms,
        description,
        severity,
      });
      setSuccess('Healthcare request submitted successfully. A coordinator will contact you.');
      setSelectedSymptoms([]);
      setDescription('');
      setSeverity('MEDIUM');
      setTab('requests');
      loadData();
    } catch (e: any) {
      setError(e.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  }

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  return (
    <div>
      <PageHeader title={t.healthcare.title} subtitle={t.healthcare.subtitle}
        actions={
          <button onClick={() => setTab('new')} className="btn-primary flex items-center gap-2">
            <Plus size={14} /> {t.healthcare.requestHelp}
          </button>
        }
      />

      <Disclaimer text={t.healthcare.disclaimer} />

      {/* Tabs */}
      <div className="flex gap-1 mt-4 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: 'requests', label: t.healthcare.myRequests },
          { key: 'camps', label: t.healthcare.myCamps },
          { key: 'new', label: 'New Request' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === key ? 'bg-white text-ocean-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >{label}</button>
        ))}
      </div>

      {success && <AlertBanner type="success" message={success} />}
      {error && <AlertBanner type="error" message={error} />}

      {loading ? (
        <div className="flex items-center justify-center h-40"><Spinner size={28} /></div>
      ) : tab === 'requests' ? (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="card text-center py-10 text-gray-400">
              No healthcare requests yet.
              <button onClick={() => setTab('new')} className="block mx-auto mt-3 btn-primary text-sm">Submit a Request</button>
            </div>
          ) : requests.map(req => (
            <div key={req.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={req.status} />
                    <span className={`badge text-xs ${
                      req.severity === 'EMERGENCY' ? 'bg-red-100 text-red-800'
                      : req.severity === 'HIGH' ? 'bg-orange-100 text-orange-800'
                      : req.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                    }`}>{req.severity}</span>
                  </div>
                  <div className="text-sm font-medium text-gray-800 mb-1">{req.symptoms.join(', ')}</div>
                  <p className="text-sm text-gray-600">{req.description}</p>
                  {req.assignedTo && (
                    <div className="text-xs text-gray-400 mt-1">Assigned to: {req.assignedTo}</div>
                  )}
                  {req.scheduledDate && (
                    <div className="text-xs text-ocean-600 mt-1">
                      Scheduled: {new Date(req.scheduledDate).toLocaleDateString('en-IN')}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400 ml-4 flex-shrink-0">
                  {new Date(req.createdAt).toLocaleDateString('en-IN')}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'camps' ? (
        <div className="space-y-4">
          {camps.length === 0 ? (
            <div className="card text-center py-10 text-gray-400">No camps currently scheduled.</div>
          ) : camps.map(camp => (
            <div key={camp.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{camp.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                    <span className="flex items-center gap-1"><MapPin size={12} /> {camp.location}</span>
                    <span className="flex items-center gap-1"><Calendar size={12} /> {camp.date} · {camp.time}</span>
                    <span className="flex items-center gap-1"><Phone size={12} /> {camp.contact}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {camp.services.map(s => (
                      <span key={s} className="badge bg-teal-50 text-teal-700 border border-teal-100">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                  <div className="text-xs text-gray-400">{camp.registered}/{camp.capacity}</div>
                  <div className="text-xs text-gray-400">registered</div>
                  {camp.isActive && (
                    <span className="badge badge-normal mt-1">Active</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // New request form
        <div className="card max-w-2xl">
          <h3 className="font-semibold text-gray-900 mb-4">Submit Healthcare Request</h3>
          <div className="disclaimer mb-4">
            <AlertCircle size={14} className="inline mr-1" />
            For emergencies, call <strong>108</strong> immediately. This form is for non-emergency requests.
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.healthcare.symptoms}</label>
              <div className="flex flex-wrap gap-2">
                {SYMPTOMS.map(s => (
                  <button type="button" key={s} onClick={() => toggleSymptom(s)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                      selectedSymptoms.includes(s)
                        ? 'bg-ocean-600 text-white border-ocean-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-ocean-300'
                    }`}
                  >{s}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.healthcare.description}</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="input-field h-24 resize-none"
                placeholder="Describe your symptoms in detail..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.healthcare.severity}</label>
              <select value={severity} onChange={e => setSeverity(e.target.value)} className="input-field">
                <option value="LOW">Low — Minor discomfort</option>
                <option value="MEDIUM">Medium — Moderate symptoms</option>
                <option value="HIGH">High — Significant pain/illness</option>
                <option value="EMERGENCY">Emergency — Immediate attention needed</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Submitting...' : t.healthcare.submitRequest}
              </button>
              <button type="button" onClick={() => setTab('requests')} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
