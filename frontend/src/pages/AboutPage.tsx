import React from 'react';
import { Brain, Server, Database, Shield, Globe, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/UI';

export default function AboutPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="About AgariyaCare AI" subtitle="AI-powered Social Governance Platform for Salt Pan Workers" />

      <div className="space-y-6">
        {/* Problem */}
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-2">The Problem</h2>
          <p className="text-sm text-gray-600">
            Agariya salt pan workers in the Little Rann of Kutch, Gujarat work in extreme heat and isolated conditions.
            They face limited access to healthcare, emergency assistance, safety information, fair salt pricing,
            government welfare schemes, and community support. This platform uses AI to bridge those gaps.
          </p>
        </div>

        {/* Solution */}
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-2">Our Solution</h2>
          <p className="text-sm text-gray-600 mb-3">
            AgariyaCare AI is an intelligent platform connecting Agariya communities with five specialized AI agents,
            each addressing a core need — all orchestrated by a central AI routing system built on IBM Granite.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              ['🏥', 'Remote Healthcare Outreach', 'Healthcare camps, medical requests, symptom guidance'],
              ['💰', 'Salt Price Discovery', 'Market prices, buyer comparison, fair-value calculator'],
              ['📋', 'Welfare Scheme Matching', 'Government scheme eligibility matching and guidance'],
              ['⚠️', 'Worker Safety Monitoring', 'Heat risk calculation, incident reporting, alerts'],
              ['🤝', 'Community Support', 'Notices, announcements, support requests'],
            ].map(([icon, name, desc]) => (
              <div key={name as string} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-xl">{icon}</span>
                <div>
                  <div className="text-sm font-semibold text-gray-800">{name as string}</div>
                  <div className="text-xs text-gray-500">{desc as string}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Architecture */}
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Brain size={16} /> Architecture</h2>
          <div className="flex flex-col items-center gap-2 text-sm">
            {[
              'Worker',
              'AgariyaCare AI (React Frontend)',
              'REST API (Node.js Backend)',
              'AI Orchestrator',
              'Five Specialized Agents',
              'IBM Granite / AI Provider',
              'Services · Repositories · External APIs',
              'Database / IBM Cloud',
            ].map((step, i, arr) => (
              <React.Fragment key={step}>
                <div className={`px-4 py-2 rounded-lg border text-center w-full max-w-xs ${
                  i === 0 ? 'bg-ocean-50 border-ocean-200 text-ocean-800 font-medium'
                  : i === arr.length - 1 ? 'bg-gray-50 border-gray-200 text-gray-600'
                  : 'bg-white border-gray-200 text-gray-700'
                }`}>{step}</div>
                {i < arr.length - 1 && <div className="text-gray-300 text-xs">↓</div>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Technology */}
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Server size={16} /> Technology Stack</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ['AI', 'IBM Granite (ibm/granite-13b-chat-v2) via watsonx'],
              ['Cloud', 'IBM Cloud (deployment ready)'],
              ['Frontend', 'React 18, TypeScript, Vite, Tailwind CSS'],
              ['Backend', 'Node.js, TypeScript, Express'],
              ['Data', 'Repository pattern — dev in-memory, production DB ready'],
              ['Languages', 'English + Gujarati (extensible)'],
              ['Built with', 'IBM Bob'],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <span className="text-xs font-medium text-gray-500 w-20 flex-shrink-0 mt-0.5">{label}</span>
                <span className="text-xs text-gray-700">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><Shield size={16} /> Privacy & Data</h2>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• All worker data in development is entirely fictional</li>
            <li>• IBM Granite credentials are environment-variable only — never in frontend code</li>
            <li>• CORS, input validation, and structured error handling implemented</li>
            <li>• No real personal information is collected or stored</li>
            <li>• Production authentication architecture ready for implementation</li>
          </ul>
        </div>

        {/* Future */}
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><Globe size={16} /> Future Roadmap</h2>
          <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
            {[
              'PostgreSQL / IBM Cloud Database integration',
              'Real government welfare API connection',
              'IoT temperature/humidity sensor integration',
              'GPS-based worker location tracking',
              'SMS / WhatsApp notifications',
              'Mobile app (React Native)',
              'Official salt market price API',
              'Real weather API integration',
              'Production authentication (OAuth/JWT)',
              'Additional regional languages',
              'Additional AI agents',
              'IBM Cloud deployment',
            ].map(item => (
              <div key={item} className="flex items-start gap-1">
                <ChevronRight size={10} className="text-gray-400 mt-0.5 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimers */}
        <div className="disclaimer">
          <div className="font-semibold mb-1">Important Disclaimers</div>
          <div className="space-y-1 text-xs">
            <div>🏥 <strong>Healthcare:</strong> AI-generated health information is for general informational purposes and does not replace qualified medical care.</div>
            <div>📋 <strong>Welfare:</strong> Eligibility information is illustrative development data. Verify with official government portals before applying.</div>
            <div>💰 <strong>Market:</strong> Salt prices shown are development reference data and may not represent official market prices.</div>
            <div>⚠️ All data in this build is fictional development data for demonstration purposes only.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
