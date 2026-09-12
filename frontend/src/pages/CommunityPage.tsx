import React, { useEffect, useState } from 'react';
import { Plus, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { communityApi } from '../services/api';
import { CommunityNotice, SupportRequest } from '../types';
import { PageHeader, StatusBadge, Spinner, AlertBanner } from '../components/UI';

const CATEGORY_COLORS: Record<string, string> = {
  SAFETY: 'bg-orange-100 text-orange-700',
  HEALTH: 'bg-red-100 text-red-700',
  WELFARE: 'bg-purple-100 text-purple-700',
  MARKET: 'bg-blue-100 text-blue-700',
  COMMUNITY: 'bg-teal-100 text-teal-700',
  EMERGENCY: 'bg-red-200 text-red-900 font-bold',
  SYSTEM: 'bg-gray-100 text-gray-700',
};

export default function CommunityPage() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState<'notices' | 'support'>('notices');
  const [notices, setNotices] = useState<CommunityNotice[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Support form
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('COMMUNITY');
  const [showSupportForm, setShowSupportForm] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentUser?.id]);

  async function loadData() {
    setLoading(true);
    try {
      const [noticesRes, supportRes] = await Promise.all([
        communityApi.getNotices(),
        communityApi.getSupportRequests(currentUser?.id),
      ]);
      setNotices(noticesRes.data ?? []);
      setSupportRequests(supportRes.data ?? []);
    } catch {
      setError('Unable to load community data.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSupportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;
    setSubmitting(true);
    setError('');
    try {
      await communityApi.submitSupportRequest({
        workerId: currentUser.id,
        workerName: currentUser.name,
        category,
        subject,
        description,
      });
      setSuccess('Support request submitted successfully.');
      setSubject('');
      setDescription('');
      setShowSupportForm(false);
      loadData();
    } catch (e: any) {
      setError(e.message || 'Failed to submit.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title={t.community.title} subtitle={t.community.subtitle}
        actions={
          <button onClick={() => { setTab('support'); setShowSupportForm(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={12} /> Support Request
          </button>
        }
      />

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: 'notices', label: `Notices (${notices.length})` },
          { key: 'support', label: `My Requests (${supportRequests.length})` },
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
      ) : tab === 'notices' ? (
        <div className="space-y-3">
          {notices.length === 0 ? (
            <div className="card text-center py-10 text-gray-400">No notices available.</div>
          ) : notices.map(notice => (
            <div key={notice.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <span className={`badge ${CATEGORY_COLORS[notice.category] ?? 'bg-gray-100 text-gray-700'}`}>
                  {notice.category}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(notice.createdAt).toLocaleDateString('en-IN')}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{notice.title}</h3>
              <p className="text-sm text-gray-600">{notice.content}</p>
              <div className="text-xs text-gray-400 mt-2">— {notice.author}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Support form */}
          {showSupportForm ? (
            <div className="card max-w-lg">
              <h3 className="font-semibold text-gray-900 mb-4">Submit Support Request</h3>
              <form onSubmit={handleSupportSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="input-field">
                    {['HEALTH', 'SAFETY', 'WELFARE', 'MARKET', 'COMMUNITY', 'SYSTEM'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input value={subject} onChange={e => setSubject(e.target.value)}
                    className="input-field" placeholder="Brief summary of your request" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)}
                    className="input-field h-24 resize-none"
                    placeholder="Describe what you need help with..." required />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={submitting} className="btn-primary">
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                  <button type="button" onClick={() => setShowSupportForm(false)} className="btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          ) : (
            <button onClick={() => setShowSupportForm(true)} className="btn-primary flex items-center gap-2">
              <Plus size={14} /> New Support Request
            </button>
          )}

          {/* Existing requests */}
          {supportRequests.length === 0 ? (
            <div className="card text-center py-8 text-gray-400">No support requests yet.</div>
          ) : supportRequests.map(req => (
            <div key={req.id} className="card">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-semibold text-gray-900">{req.subject}</h3>
                <StatusBadge status={req.status} />
              </div>
              <p className="text-sm text-gray-600 mb-2">{req.description}</p>
              {req.response && (
                <div className="mt-2 p-3 bg-ocean-50 rounded-lg">
                  <div className="text-xs font-medium text-ocean-700 mb-1">Response</div>
                  <p className="text-sm text-gray-700">{req.response}</p>
                </div>
              )}
              <div className="text-xs text-gray-400 mt-1">
                {new Date(req.createdAt).toLocaleDateString('en-IN')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
