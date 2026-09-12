import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldAlert, Plus, Thermometer, Droplets, Clock, AlertTriangle,
  Phone, Activity,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { safetyApi } from '../services/api';
import { SafetyReading, SafetyIncident, SafetyAlert } from '../types';
import { PageHeader, SafetyBadge, StatusBadge, Spinner, AlertBanner, Disclaimer } from '../components/UI';

// ─── Incident types ────────────────────────────────────────────────────────────

const INCIDENT_TYPES_EN = [
  { value: 'HEAT_ILLNESS', label: 'Heat Illness' },
  { value: 'DEHYDRATION', label: 'Dehydration' },
  { value: 'INJURY', label: 'Injury' },
  { value: 'UNSAFE_CONDITIONS', label: 'Unsafe Working Conditions' },
  { value: 'WATER_SHORTAGE', label: 'Water Shortage' },
  { value: 'EQUIPMENT_ISSUE', label: 'Equipment Issue' },
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'OTHER', label: 'Other' },
];

const SEVERITY_LEVELS = ['NORMAL', 'CAUTION', 'HIGH_RISK', 'EMERGENCY'];

const SAFETY_LEVEL_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  SAFE:      { bg: 'bg-green-50',  text: 'text-green-800',  border: 'border-green-200',  dot: 'bg-green-500' },
  NORMAL:    { bg: 'bg-green-50',  text: 'text-green-800',  border: 'border-green-200',  dot: 'bg-green-500' },
  CAUTION:   { bg: 'bg-amber-50',  text: 'text-amber-800',  border: 'border-amber-200',  dot: 'bg-amber-400' },
  HIGH_RISK: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200', dot: 'bg-orange-500' },
  EMERGENCY: { bg: 'bg-red-50',    text: 'text-red-800',    border: 'border-red-200',    dot: 'bg-red-500' },
};

type SafetyLevel = 'SAFE' | 'NORMAL' | 'CAUTION' | 'HIGH_RISK' | 'EMERGENCY';

// ─── SafetyPage ───────────────────────────────────────────────────────────────

export default function SafetyPage() {
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const gu = language === 'gu';

  const isCoordinator = currentUser?.role === 'COORDINATOR' || currentUser?.role === 'ADMIN';

  const [tab, setTab] = useState<'status' | 'reading' | 'incident'>('status');
  const [readings, setReadings] = useState<SafetyReading[]>([]);
  const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // SOS state
  const [showSOSConfirm, setShowSOSConfirm] = useState(false);
  const [sosActivated, setSOSActivated] = useState(false);
  const [sosResult, setSOSResult] = useState<any>(null);

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

  // Coordinator state
  const [allIncidents, setAllIncidents] = useState<SafetyIncident[]>([]);
  const [allSOS, setAllSOS] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<SafetyIncident | null>(null);
  const [coordIncStatus, setCoordIncStatus] = useState('');
  const [coordIncNote, setCoordIncNote] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [readRes, incRes, alertRes, assRes] = await Promise.allSettled([
        safetyApi.getReadings(),
        safetyApi.getIncidents(),
        safetyApi.getAlerts(),
        safetyApi.getAssessment(),
      ]);
      if (readRes.status === 'fulfilled') setReadings(readRes.value.data ?? []);
      if (incRes.status === 'fulfilled') setIncidents(incRes.value.data ?? []);
      if (alertRes.status === 'fulfilled') setAlerts(alertRes.value.data ?? []);
      if (assRes.status === 'fulfilled') setAssessment(assRes.value.data);

      if (isCoordinator) {
        const [allIncRes, sosRes] = await Promise.allSettled([
          safetyApi.coordinator.getIncidents(),
          safetyApi.coordinator.getSOS(),
        ]);
        if (allIncRes.status === 'fulfilled') setAllIncidents(allIncRes.value.data ?? []);
        if (sosRes.status === 'fulfilled') setAllSOS(sosRes.value.data ?? []);
      }
    } catch {
      setError(gu ? 'Data load thayu nahi.' : 'Unable to load safety data.');
    } finally {
      setLoading(false);
    }
  }, [isCoordinator, gu]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── SOS ────────────────────────────────────────────────────────────────────

  const handleSOS = async () => {
    setSubmitting(true);
    try {
      const res = await safetyApi.activateSOS();
      setSOSActivated(true);
      setSOSResult(res.data);
      setShowSOSConfirm(false);
      setSuccess(gu ? t.safety.sosActivated : 'SOS activated. Coordinators notified. Call 108 immediately.');
    } catch (e: any) {
      setError(e?.response?.data?.error || (gu ? 'SOS moklayu nahi.' : 'SOS failed. Call 108 directly.'));
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Reading ────────────────────────────────────────────────────────────────

  const handleReadingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!temp || !humidity) {
      setError(gu ? 'Temperature ane humidity joiye.' : 'Temperature and humidity are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await safetyApi.submitReading({
        temperature: parseFloat(temp),
        humidity: parseFloat(humidity),
        workingDurationHours: parseFloat(workHours) || 0,
        waterAvailability: water,
        restBreaksTaken: parseInt(breaks) || 0,
      });
      setReadingResult(res.data);
      setSuccess(gu ? t.safety.readingSubmitted : 'Safety reading submitted and risk level calculated.');
      loadData();
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || (gu ? 'Reading moklayu nahi.' : 'Failed to submit reading.'));
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Incident ───────────────────────────────────────────────────────────────

  const handleIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incDesc.trim()) {
      setError(gu ? 'Vivaran joiye.' : 'Incident description is required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await safetyApi.reportIncident({ type: incType, description: incDesc, severity: incSeverity, location: incLocation });
      setSuccess(gu ? t.safety.incidentReported : 'Incident reported. A coordinator will follow up.');
      setIncDesc('');
      setTab('status');
      loadData();
    } catch (e: any) {
      setError(e?.response?.data?.error || (gu ? 'Report thayu nahi.' : 'Failed to report incident.'));
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Coordinator update ──────────────────────────────────────────────────────

  const handleCoordIncUpdate = async () => {
    if (!selectedIncident) return;
    try {
      const data: any = {};
      if (coordIncStatus) data.status = coordIncStatus;
      if (coordIncNote.trim()) data.coordinatorNotes = coordIncNote.trim();
      await safetyApi.coordinator.updateIncident(selectedIncident.id, data);
      setSuccess(gu ? 'Update thayu.' : 'Incident updated.');
      setSelectedIncident(null);
      loadData();
    } catch {
      setError(gu ? 'Update thayu nahi.' : 'Update failed.');
    }
  };

  const handleCoordSOSUpdate = async (id: string, status: string) => {
    try {
      await safetyApi.coordinator.updateSOS(id, { status });
      setSuccess(gu ? 'SOS update thayu.' : `SOS ${status.toLowerCase()}.`);
      loadData();
    } catch {
      setError(gu ? 'Update thayu nahi.' : 'Update failed.');
    }
  };

  const safetyLevel: SafetyLevel = (assessment?.safetyLevel ?? 'CAUTION') as SafetyLevel;
  const levelStyle = SAFETY_LEVEL_STYLES[safetyLevel] ?? SAFETY_LEVEL_STYLES.CAUTION;

  // ─── SOS confirmation modal ─────────────────────────────────────────────────

  if (showSOSConfirm) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShieldAlert size={28} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t.safety.sosConfirm}</h2>
            <p className="text-sm text-gray-600">{t.safety.sosConfirmMsg}</p>
          </div>
          <div className="space-y-2">
            <button
              onClick={handleSOS}
              disabled={submitting}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {submitting ? (gu ? 'Moked rahe chhe...' : 'Sending...') : (gu ? 'Ha, SOS moklo' : 'Yes, Send SOS')}
            </button>
            <button
              onClick={() => setShowSOSConfirm(false)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl transition-colors"
            >
              {gu ? 'Nahi, cancel karo' : 'No, Cancel'}
            </button>
            <a
              href="tel:108"
              className="block w-full text-center bg-amber-50 text-amber-800 border border-amber-200 font-medium py-3 rounded-xl"
            >
              <Phone size={14} className="inline mr-1" /> {gu ? '108 par phone karo' : 'Call 108 directly'}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t.safety.title}
        subtitle={t.safety.subtitle}
        actions={
          <div className="flex gap-2">
            {!isCoordinator && (
              <button
                onClick={() => setShowSOSConfirm(true)}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <ShieldAlert size={14} /> {gu ? 'SOS' : 'SOS Emergency'}
              </button>
            )}
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
            <strong className="mr-1">{alert.title ?? `[${alert.type}]`}</strong>
            {alert.message}
            {alert.affectedArea && <span className="ml-2 text-xs opacity-75">· {alert.affectedArea}</span>}
          </div>
          {(alert.type === 'EMERGENCY') && (
            <a href="tel:108" className="ml-auto font-bold text-red-700 underline whitespace-nowrap">Call 108</a>
          )}
        </div>
      ))}

      {alerts.filter(a => a.isActive).length === 0 && (
        <div className="text-xs text-gray-400 italic mb-3">{t.safety.noAlerts}</div>
      )}

      {success && <div className="mb-3"><AlertBanner type="success" message={success} /></div>}
      {error && <div className="mb-3"><AlertBanner type="error" message={error} /></div>}

      {/* SOS result */}
      {sosActivated && sosResult && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <h3 className="font-bold text-red-800 mb-2">🚨 {gu ? 'SOS moklayo!' : 'SOS Activated!'}</h3>
          <ul className="space-y-1">
            {(sosResult.instructions ?? []).map((i: string, idx: number) => (
              <li key={idx} className="text-sm text-red-700">• {i}</li>
            ))}
          </ul>
          <a href={`tel:${sosResult.emergencyContact ?? '108'}`}
            className="mt-3 flex items-center gap-2 bg-red-600 text-white font-bold px-4 py-2.5 rounded-lg w-fit">
            <Phone size={14} /> {gu ? 'Turant phone karo' : 'Call Now'} {sosResult.emergencyContact ?? '108'}
          </a>
        </div>
      )}

      {/* Coordinator tabs */}
      {isCoordinator ? (
        <div>
          <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit">
            {[
              { key: 'status', label: gu ? 'Sakriya SOS' : 'Active SOS' },
              { key: 'incident', label: gu ? 'Badhi ghatanavov' : 'All Incidents' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key as any)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === key ? 'bg-white text-eucalyptus-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>{label}</button>
            ))}
          </div>

          {loading ? <div className="flex justify-center h-40 items-center"><Spinner size={28} /></div> : (
            tab === 'status' ? (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800">{gu ? 'Sakriya SOS Events' : 'Active SOS Events'}</h3>
                {allSOS.filter(s => s.status === 'ACTIVE').length === 0 ? (
                  <div className="card text-center py-8 text-gray-400">{t.safety.noSOS}</div>
                ) : allSOS.filter(s => s.status === 'ACTIVE').map(event => (
                  <div key={event.id} className="card border-l-4 border-l-red-500">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-red-800">🚨 {event.workerName ?? 'Worker'}</p>
                        <p className="text-sm text-gray-600">{event.location}</p>
                        <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(event.createdAt).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="flex flex-col gap-1 ml-4">
                        <button onClick={() => handleCoordSOSUpdate(event.id, 'ACKNOWLEDGED')}
                          className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-lg hover:bg-amber-100">
                          {gu ? 'Swikaaro' : 'Acknowledge'}
                        </button>
                        <button onClick={() => handleCoordSOSUpdate(event.id, 'RESOLVED')}
                          className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-lg hover:bg-green-100">
                          {gu ? 'Ukel' : 'Resolve'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-3">
                  {allIncidents.length === 0 ? (
                    <div className="card text-center py-8 text-gray-400">{t.safety.noIncidents}</div>
                  ) : allIncidents.map(inc => (
                    <button key={inc.id}
                      onClick={() => { setSelectedIncident(inc); setCoordIncStatus(inc.status); setCoordIncNote(''); }}
                      className={`card w-full text-left hover:shadow-md transition-all ${selectedIncident?.id === inc.id ? 'ring-2 ring-eucalyptus-400' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              inc.severity === 'EMERGENCY' ? 'bg-red-100 text-red-800' :
                              inc.severity === 'HIGH_RISK' ? 'bg-orange-100 text-orange-800' :
                              'bg-amber-50 text-amber-700'
                            }`}>{inc.severity}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">{inc.status}</span>
                          </div>
                          <p className="text-sm font-medium text-gray-800">{inc.workerName ?? 'Worker'}</p>
                          <p className="text-xs text-gray-500">{(inc.type ?? '').replace('_', ' ')} · {inc.location}</p>
                        </div>
                        <div className="text-xs text-gray-400">{new Date(inc.createdAt).toLocaleDateString('en-IN')}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div>
                  {selectedIncident ? (
                    <div className="card sticky top-4">
                      <p className="font-semibold text-gray-900 mb-3">{selectedIncident.workerName}</p>
                      <div className="text-sm text-gray-600 space-y-1 mb-3">
                        <p><span className="font-medium">{gu ? 'Prakar:' : 'Type:'}</span> {selectedIncident.type?.replace('_', ' ')}</p>
                        <p><span className="font-medium">{gu ? 'Gambhirta:' : 'Severity:'}</span> {selectedIncident.severity}</p>
                        <p>{selectedIncident.description}</p>
                        <p className="text-xs text-gray-400">{selectedIncident.location}</p>
                      </div>
                      <div className="space-y-2 border-t border-gray-100 pt-3">
                        <select value={coordIncStatus} onChange={e => setCoordIncStatus(e.target.value)} className="input-field text-sm py-1.5">
                          {['REPORTED','ACKNOWLEDGED','IN_PROGRESS','RESOLVED','CLOSED'].map(s =>
                            <option key={s} value={s}>{s}</option>
                          )}
                        </select>
                        <textarea value={coordIncNote} onChange={e => setCoordIncNote(e.target.value)}
                          className="input-field h-14 resize-none text-sm"
                          placeholder={gu ? 'Nondh lekho...' : 'Add note...'} />
                        <button onClick={handleCoordIncUpdate} className="btn-primary w-full text-sm">
                          {gu ? 'Update karo' : 'Save Update'}
                        </button>
                        <button onClick={() => setSelectedIncident(null)} className="btn-secondary w-full text-sm">
                          {gu ? 'Bandu' : 'Close'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="card text-center py-8 text-gray-400 text-sm">
                      {gu ? 'Ghatna pasand karo' : 'Select an incident to review'}
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      ) : (
        // Worker view
        <>
          {/* Tabs */}
          <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit">
            {[
              { key: 'status', label: gu ? 'Aajni sthiti' : 'Current Status' },
              { key: 'reading', label: gu ? 'Reading moklo' : 'Submit Reading' },
              { key: 'incident', label: gu ? 'Ghatna report' : 'Report Incident' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key as any)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === key ? 'bg-white text-eucalyptus-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >{label}</button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40"><Spinner size={28} /></div>
          ) : tab === 'status' ? (
            <div className="space-y-4">
              {/* Assessment card */}
              <div className={`card border-2 ${levelStyle.border} ${levelStyle.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                      {t.safety.currentStatus}
                    </p>
                    <h2 className={`text-2xl font-bold ${levelStyle.text}`}>
                      {safetyLevel === 'SAFE' || safetyLevel === 'NORMAL' ? (gu ? 'SURAKSHIT' : 'SAFE') :
                       safetyLevel === 'CAUTION' ? (gu ? 'SAVADHAN' : 'CAUTION') :
                       safetyLevel === 'HIGH_RISK' ? (gu ? 'UCHCHU JOKHUM' : 'HIGH RISK') :
                       (gu ? 'EMERGENCY' : 'EMERGENCY')}
                    </h2>
                  </div>
                  <div className={`w-4 h-4 rounded-full ${levelStyle.dot} animate-pulse`} />
                </div>

                {assessment?.hasReading ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      {[
                        { icon: Thermometer, label: gu ? 'Taapmaan' : 'Temperature', value: `${assessment.reading?.temperature}°C`, color: 'text-red-500' },
                        { icon: Droplets, label: gu ? 'Bhami' : 'Humidity', value: `${assessment.reading?.humidity}%`, color: 'text-blue-500' },
                        { icon: Activity, label: 'Heat Index', value: `${assessment.heatIndex}°C`, color: 'text-orange-500' },
                        { icon: Clock, label: gu ? 'Kaama kalaak' : 'Working Hours', value: `${assessment.reading?.workingDurationHours}h`, color: 'text-gray-500' },
                      ].map(({ icon: Icon, label, value, color }) => (
                        <div key={label} className="text-center p-3 bg-white/70 rounded-lg">
                          <Icon size={16} className={`${color} mx-auto mb-1`} />
                          <div className="text-xs text-gray-500">{label}</div>
                          <div className="font-bold text-gray-900 mt-0.5 text-sm">{value}</div>
                        </div>
                      ))}
                    </div>
                    {assessment.recommendations?.length > 0 && (
                      <div className="space-y-1">
                        {assessment.recommendations.map((r: string, i: number) => (
                          <p key={i} className={`text-sm ${levelStyle.text}`}>• {r}</p>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      ⚠️ {assessment.sourceNote}
                    </p>
                  </>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 mb-3">{t.safety.noReadings}</p>
                    <button onClick={() => setTab('reading')} className="btn-primary text-sm">
                      {t.safety.submitReading}
                    </button>
                  </div>
                )}
              </div>

              {/* Incidents */}
              {incidents.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-gray-800 mb-3">{t.safety.recentIncidents}</h3>
                  <div className="space-y-2">
                    {incidents.slice(0, 5).map(inc => (
                      <div key={inc.id} className="flex items-start justify-between py-2 border-b last:border-0 border-gray-50">
                        <div>
                          <div className="text-sm font-medium text-gray-800">{(inc.type ?? '').replace(/_/g, ' ')}</div>
                          <div className="text-xs text-gray-500">{inc.description.substring(0, 80)}</div>
                          <div className="text-xs text-gray-400">{inc.location} · {new Date(inc.createdAt).toLocaleDateString('en-IN')}</div>
                        </div>
                        <StatusBadge status={inc.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Disclaimer text={t.safety.disclaimer} />
            </div>
          ) : tab === 'reading' ? (
            <div className="card max-w-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{t.safety.reportReading}</h3>
              <p className="text-sm text-gray-500 mb-4">
                {gu ? 'Taapmaan ane bhami nakhso — heat risk aapomep ganavashe.' : 'Enter temperature and humidity — heat risk will be calculated automatically.'}
              </p>
              {readingResult && (
                <div className={`p-3 rounded-lg mb-4 text-sm ${
                  readingResult.safetyLevel === 'EMERGENCY' ? 'bg-red-50 border border-red-200 text-red-800'
                  : readingResult.safetyLevel === 'HIGH_RISK' ? 'bg-orange-50 border border-orange-200 text-orange-800'
                  : readingResult.safetyLevel === 'CAUTION' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                  : 'bg-green-50 border border-green-200 text-green-800'
                }`}>
                  <strong>{gu ? 'Safety Level:' : 'Safety Level:'} {readingResult.safetyLevel}</strong>
                  {readingResult.recommendations?.map((r: string, i: number) => (
                    <div key={i} className="mt-1">• {r}</div>
                  ))}
                  {(readingResult.safetyLevel === 'EMERGENCY' || readingResult.safetyLevel === 'HIGH_RISK') && (
                    <a href="tel:108" className="mt-2 flex items-center gap-1 font-bold">
                      <Phone size={12} /> {gu ? 'Turant 108 par phone karo' : 'Call 108 immediately'}
                    </a>
                  )}
                </div>
              )}
              <form onSubmit={handleReadingSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.safety.temperature}</label>
                    <input type="number" value={temp} onChange={e => setTemp(e.target.value)}
                      className="input-field" placeholder="44" required min="-10" max="60" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.safety.humidity}</label>
                    <input type="number" value={humidity} onChange={e => setHumidity(e.target.value)}
                      className="input-field" placeholder="30" required min="0" max="100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.safety.workingHours}</label>
                    <input type="number" value={workHours} onChange={e => setWorkHours(e.target.value)}
                      className="input-field" placeholder="6" min="0" max="24" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.safety.restBreaks}</label>
                    <input type="number" value={breaks} onChange={e => setBreaks(e.target.value)}
                      className="input-field" placeholder="2" min="0" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.safety.waterAvailability}</label>
                  <select value={water} onChange={e => setWater(e.target.value)} className="input-field">
                    <option value="SUFFICIENT">{t.safety.waterSufficient}</option>
                    <option value="LIMITED">{t.safety.waterLimited}</option>
                    <option value="NONE">{t.safety.waterNone}</option>
                  </select>
                </div>
                <button type="submit" disabled={submitting} className="btn-primary w-full">
                  {submitting ? (gu ? 'Ganai rahyu...' : 'Calculating...') : (gu ? 'Safety level ganvo' : 'Calculate Safety Level')}
                </button>
              </form>
            </div>
          ) : (
            // Incident form
            <div className="card max-w-lg">
              <h3 className="font-semibold text-gray-900 mb-1">{t.safety.reportIncident}</h3>
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-4">
                <AlertTriangle size={12} />
                {gu ? 'Emergency: 108' : 'Emergencies: call 108 immediately'}
                <a href="tel:108" className="ml-auto font-bold">108</a>
              </div>
              <form onSubmit={handleIncidentSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.safety.incidentType}</label>
                  <select value={incType} onChange={e => setIncType(e.target.value)} className="input-field">
                    {INCIDENT_TYPES_EN.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.safety.incidentDescription}</label>
                  <textarea value={incDesc} onChange={e => setIncDesc(e.target.value)}
                    className="input-field h-20 resize-none" placeholder={gu ? 'Shu thayuu...' : 'Describe what happened…'} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.safety.incidentLocation}</label>
                  <input value={incLocation} onChange={e => setIncLocation(e.target.value)}
                    className="input-field" placeholder="Salt Pan Area" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.safety.incidentSeverity}</label>
                  <select value={incSeverity} onChange={e => setIncSeverity(e.target.value)} className="input-field">
                    {SEVERITY_LEVELS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={submitting} className="btn-primary flex-1">
                    {submitting ? (gu ? 'Report thayi rahyu...' : 'Submitting...') : (gu ? 'Report karo' : 'Report Incident')}
                  </button>
                  <button type="button" onClick={() => setTab('status')} className="btn-secondary">
                    {gu ? 'Bandu' : 'Cancel'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
