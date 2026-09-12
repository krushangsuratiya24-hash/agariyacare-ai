// @ts-nocheck

import React, { useEffect, useState } from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { welfareApi } from '../services/api';
import { WelfareMatch, WelfareScheme } from '../types';
import { PageHeader, Spinner, AlertBanner, Disclaimer } from '../components/UI';

const RESULT_CONFIG = {
  HIGHLY_RELEVANT: { label: 'Highly Relevant', cls: 'bg-green-100 text-green-800' },
  POTENTIALLY_ELIGIBLE: { label: 'Potentially Eligible', cls: 'bg-blue-100 text-blue-800' },
  MORE_INFO_REQUIRED: { label: 'More Info Required', cls: 'bg-yellow-100 text-yellow-800' },
  NOT_MATCHING: { label: 'Not Currently Matching', cls: 'bg-gray-100 text-gray-600' },
};

export default function WelfarePage() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState<'matches' | 'all'>('matches');
  const [matches, setMatches] = useState<WelfareMatch[]>([]);
  const [schemes, setSchemes] = useState<WelfareScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [currentUser?.id]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [matchRes, schemeRes] = await Promise.all([
        currentUser ? welfareApi.matchSchemes(currentUser.id) : Promise.resolve({ data: [] }),
        welfareApi.getSchemes(),
      ]);
      setMatches(matchRes.data ?? []);
      setSchemes(schemeRes.data ?? []);
    } catch {
      setError('Unable to load welfare data.');
    } finally {
      setLoading(false);
    }
  }

  const eligibleCount = matches.filter(m =>
    m.result === 'HIGHLY_RELEVANT' || m.result === 'POTENTIALLY_ELIGIBLE'
  ).length;

  return (
    <div>
      <PageHeader title={t.welfare.title} subtitle={t.welfare.subtitle} />
      <Disclaimer text={t.welfare.disclaimer} />

      {/* Summary */}
      {matches.length > 0 && (
        <div className="grid grid-cols-4 gap-3 my-4">
          {Object.entries(RESULT_CONFIG).map(([key, cfg]) => (
            <div key={key} className="card text-center">
              <div className={`badge mx-auto mb-1 ${cfg.cls}`}>{cfg.label}</div>
              <div className="text-xl font-bold text-gray-900">
                {matches.filter(m => m.result === key).length}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: 'matches', label: `My Matches (${eligibleCount})` },
          { key: 'all', label: `All Schemes (${schemes.length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === key ? 'bg-white text-ocean-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >{label}</button>
        ))}
      </div>

      {error && <AlertBanner type="error" message={error} />}

      {loading ? (
        <div className="flex items-center justify-center h-40"><Spinner size={28} /></div>
      ) : tab === 'matches' ? (
        <div className="space-y-3">
          {matches.length === 0 ? (
            <div className="card text-center py-10 text-gray-400">Sign in as a worker to see personalised matches.</div>
          ) : matches.map(match => (
            <div key={match.scheme.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 pr-4">{match.scheme.name}</h3>
                <span className={`badge flex-shrink-0 ${RESULT_CONFIG[match.result].cls}`}>
                  {RESULT_CONFIG[match.result].label}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{match.scheme.description}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs">
                {match.matchedCriteria.length > 0 && (
                  <div>
                    <div className="font-medium text-green-700 mb-1">✓ You Match</div>
                    <ul className="space-y-0.5 text-gray-600">
                      {match.matchedCriteria.map(c => <li key={c}>• {c}</li>)}
                    </ul>
                  </div>
                )}
                {match.missingInfo.length > 0 && (
                  <div>
                    <div className="font-medium text-amber-700 mb-1">⚠ Missing</div>
                    <ul className="space-y-0.5 text-gray-600">
                      {match.missingInfo.map(c => <li key={c}>• {c}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {match.result !== 'NOT_MATCHING' && (
                <div className="mt-3 pt-3 border-t border-gray-50 text-xs">
                  <div className="font-medium text-ocean-700 mb-1">Next Step</div>
                  <div className="text-gray-600">{match.nextStep}</div>
                </div>
              )}

              <div className="mt-3 flex items-center gap-3">
                <a href={match.scheme.officialSourceUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-ocean-600 hover:underline">
                  <ExternalLink size={10} /> Official Source
                </a>
                <span className="text-xs text-gray-400">Verified: {match.scheme.lastVerified}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {schemes.map(scheme => (
            <div key={scheme.id} className="card">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-semibold text-gray-900">{scheme.name}</h3>
                <span className="badge bg-purple-50 text-purple-700 border border-purple-100 flex-shrink-0 ml-3">{scheme.category}</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{scheme.description}</p>
              <div className="text-xs text-gray-500 space-y-1">
                <div><span className="font-medium">Eligibility: </span>{scheme.eligibilityCriteria.join(' · ')}</div>
                <div><span className="font-medium">Documents: </span>{scheme.requiredDocuments.join(', ')}</div>
                <div><span className="font-medium">Apply: </span>{scheme.applicationMethod}</div>
              </div>
              <div className="mt-2">
                <a href={scheme.officialSourceUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-ocean-600 hover:underline">
                  <ExternalLink size={10} /> Official Portal
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
