// @ts-nocheck

import React, { useEffect, useState } from 'react';
import { ShieldAlert, Plus, Thermometer, Droplets, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { safetyApi } from '../services/api';
import { SafetyReading, SafetyIncident, SafetyAlert } from '../types';
import { PageHeader, SafetyBadge, StatusBadge, Spinner, AlertBanner, Disclaimer } from '../components/UI';

const INCIDENT_TYPES = [
  { value: 'HEAT_ILLNESS', label: 'Heat Illness' },
  { value: 'DEHYDRATION', label: 'Dehydration' },
  { value: 'INJURY', label: 'Injury' },
  { value: 'UNSAFE_CONDITIONS', label: 'Unsafe Working Conditions' },
  { value: 'WATER_SHORTAGE', label: 'Water Shortage' },
  { value: 'EQUIPMENT_ISSUE', label: 'Equipment Issue' },
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'OTHER', label: 'Other' },
];

export default function SafetyPage() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState<'status' | 'reading' | 'incident'>('status');
  const [readings, setReadings] = useState<SafetyReading[]>([]);
  const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Reading form
  const [temp, setTemp] = useState('');
  const [humidity, setHumidity] = useState('');
  const [workHours, setWorkHours] = useState('');
  const [water, setWater] = useState('SUFFICIENT');
  const [breaks, setBreaks] = useState('');
  const [readingResult, setReadingResult] = useState<any>(null);

  // Incident form
  const [incType, setIncType] = useState('HEAT_ILLNESS');
  const [incDesc, setIncDesc] = useState('');
  const [incLocation, setIncLocation] = useState('Salt Pan Area');
  const [incSeverity, setIncSeverity] = useState('CAUTION');

  useEffect(() => {
    loadData();
  }, [currentUser?.id]);

  async function loadData() {
    setLoading(true);
    try {
      const [readRes, incRes, alertRes] = await Promise.all([
        safetyApi.getReadings(currentUser?.id),
        safetyApi.getIncidents(currentUser?.id),
        safetyApi.getAlerts(),
      ]);
      setReadings(readRes.data ?? []);
      setIncidents(incRes.data ?? []);
      setAlerts(alertRes.data ?? []);
    } catch {
      setError('Unable to load safety data.');
    } finally {
      setLoading(false);
    }
  }

  async function handleReadingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!temp || !humidity) { setError('Temperature and humidity are required.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await safetyApi.submitReading({
        workerId: currentUser?.id,
        temperature: parseFloat(temp),
        humidity: parseFloat(humidity),
        workingDurationHours: parseFloat(workHours) || 0,
        waterAvailability: water,
        restBreaksTaken: parseInt(breaks) || 0,
      });
      setReadingResult(res.data);
      setSuccess('Safety reading submitted and risk level calculated.');
      loadData();
    } catch (e: any) {
      setError(e.message || 'Failed to submit reading.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleIncidentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!incDesc) { setError('Incident description is required.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await safetyApi.reportIncident({
        workerId: currentUser?.id,
        workerName: currentUser?.name ?? 'Unknown',
        type: incType,
        description: incDesc,
        severity: incSeverity,
        location: incLocation,
      });
      setSuccess('Incident reported successfully. A coordinator will follow up.');
      setIncDesc('');
      setTab('status');
      loadData();
    } catch (e: any) {
      setError(e.message || 'Failed to report incident.');
    } finally {
      setSubmitting(false);
    }
  }

  const latestReading = readings.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

  return (
    <div>
      <PageHeader title={t.safety.title} subtitle={t.safety.subtitle}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setTab('reading')} className="btn-secondary text-sm">Submit Reading</button>
            <button onClick={() => setTab('incident')} className="btn-primary text-sm flex items-center gap-1">
              <Plus size={12} /> Report Incident
            </button>
          </div>
        }
      />

      {/* Active alerts */}
      {alerts.filter(a => a.isActive).map(alert => (
        <div key={alert.id} className={`flex items-start gap-2 rounded-lg px-4 py-3 border text-sm mb-3 ${
          alert.type === 'EMERGENCY' ? 'bg-red-50 border-red-200 text-red-800'
          : alert.type === 'HIGH_RISK' ? 'bg-orange-50 border-orange-200 text-orange-800'
          : 'bg-yellow-50 border-yellow-200 text-yellow-800'
        }`}>
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <div>
            <strong className="mr-1">[{alert.type.replace('_', ' ')}]</strong>
            {alert.message}
            {alert.affectedArea && <span className="ml-2 text-xs opacity-75">· {alert.affectedArea}</span>}
          </div>
        </div>
      ))}

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: 'status', label: 'Current Status' },
          { key: 'reading', label: 'Submit Reading' },
          { key: 'incident', label: 'Report Incident' },
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
      ) : tab === 'status' ? (
        <div className="space-y-4">
          {/* Latest reading */}
          {latestReading ? (
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center justify-between">
                Latest Safety Reading
                <SafetyBadge level={latestReading.safetyLevel} />
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { icon: Thermometer, label: 'Temperature', value: `${latestReading.temperature}°C`, color: 'text-red-500' },
                  { icon: Droplets, label: 'Humidity', value: `${latestReading.humidity}%`, color: 'text-blue-500' },
                  { icon: Thermometer, label: 'Heat Index', value: `${latestReading.heatIndex}°C`, color: 'text-orange-500' },
                  { icon: Clock, label: 'Working Hours', value: `${latestReading.workingDurationHours}h`, color: 'text-gray-500' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="text-center p-3 bg-gray-50 rounded-lg">
                    <Icon size={18} className={`${color} mx-auto mb-1`} />
                    <div className="text-xs text-gray-500">{label}</div>
                    <div className="font-bold text-gray-900 mt-0.5">{value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-gray-400">
                Source: {latestReading.source} · {new Date(latestReading.timestamp).toLocaleString('en-IN')}
                <span className="ml-2 text-amber-600">⚠️ Manual/development data — not real sensor data</span>
              </div>
            </div>
          ) : (
            <div className="card text-center py-8 text-gray-400">
              No safety readings yet.
              <button onClick={() => setTab('reading')} className="block mx-auto mt-3 btn-primary text-sm">Submit a Reading</button>
            </div>
          )}

          {/* Incidents */}
          {incidents.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-3">Recent Incidents</h3>
              <div className="space-y-2">
                {incidents.map(inc => (
                  <div key={inc.id} className="flex items-start justify-between py-2 border-b last:border-0 border-gray-50">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{inc.type.replace('_', ' ')}</div>
                      <div className="text-xs text-gray-500">{inc.description.substring(0, 80)}...</div>
                      <div className="text-xs text-gray-400">{inc.location} · {new Date(inc.createdAt).toLocaleDateString('en-IN')}</div>
                    </div>
                    <StatusBadge status={inc.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : tab === 'reading' ? (
        <div className="card max-w-lg">
          <h3 className="font-semibold text-gray-900 mb-4">Submit Safety Reading</h3>
          <p className="text-sm text-gray-500 mb-4">The system will automatically calculate your heat risk level.</p>
          {readingResult && (
            <div className={`p-3 rounded-lg mb-4 text-sm ${
              readingResult.safetyLevel === 'EMERGENCY' ? 'bg-red-50 border border-red-200 text-red-800'
              : readingResult.safetyLevel === 'HIGH_RISK' ? 'bg-orange-50 border border-orange-200 text-orange-800'
              : readingResult.safetyLevel === 'CAUTION' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
              : 'bg-green-50 border border-green-200 text-green-800'
            }`}>
              <strong>Safety Level: {readingResult.safetyLevel}</strong>
              {readingResult.recommendations?.map((r: string, i: number) => (
                <div key={i} className="mt-1">• {r}</div>
              ))}
            </div>
          )}
          <form onSubmit={handleReadingSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
                <input type="number" value={temp} onChange={e => setTemp(e.target.value)}
                  className="input-field" placeholder="e.g. 44" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Humidity (%)</label>
                <input type="number" value={humidity} onChange={e => setHumidity(e.target.value)}
                  className="input-field" placeholder="e.g. 30" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Working Hours</label>
                <input type="number" value={workHours} onChange={e => setWorkHours(e.target.value)}
                  className="input-field" placeholder="e.g. 6" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rest Breaks Taken</label>
                <input type="number" value={breaks} onChange={e => setBreaks(e.target.value)}
                  className="input-field" placeholder="e.g. 2" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Water Availability</label>
              <select value={water} onChange={e => setWater(e.target.value)} className="input-field">
                <option value="SUFFICIENT">Sufficient</option>
                <option value="LIMITED">Limited</option>
                <option value="NONE">None</option>
              </select>
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Calculating...' : 'Calculate Safety Level'}
            </button>
          </form>
        </div>
      ) : (
        // Incident form
        <div className="card max-w-lg">
          <h3 className="font-semibold text-gray-900 mb-1">Report Safety Incident</h3>
          <p className="text-sm text-gray-500 mb-4">For emergencies call <strong>108</strong> immediately.</p>
          <form onSubmit={handleIncidentSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Incident Type</label>
              <select value={incType} onChange={e => setIncType(e.target.value)} className="input-field">
                {INCIDENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={incDesc} onChange={e => setIncDesc(e.target.value)}
                className="input-field h-20 resize-none" placeholder="Describe what happened..." required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input value={incLocation} onChange={e => setIncLocation(e.target.value)}
                className="input-field" placeholder="e.g. Zone 3, Dhrangadhra" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select value={incSeverity} onChange={e => setIncSeverity(e.target.value)} className="input-field">
                <option value="NORMAL">Normal</option>
                <option value="CAUTION">Caution</option>
                <option value="HIGH_RISK">High Risk</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Submitting...' : 'Report Incident'}
              </button>
              <button type="button" onClick={() => setTab('status')} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
