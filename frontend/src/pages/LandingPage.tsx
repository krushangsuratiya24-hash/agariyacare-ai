import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Bot, Shield, Heart, ArrowRight, ChevronRight, TrendingUp, Users, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const features = [
    { icon: Package, title: 'Salt Marketplace', desc: 'List your salt, receive buyer offers, negotiate prices and complete sales — all in one place.', color: 'text-eucalyptus-600 bg-eucalyptus-50' },
    { icon: Bot, title: 'IBM Granite AI', desc: 'Ask AgariyaCare AI anything about your inventory, offers, market prices, and welfare schemes.', color: 'text-charcoal-600 bg-charcoal-50' },
    { icon: TrendingUp, title: 'Market Insights', desc: 'Reference price information to help you negotiate fair deals with buyers.', color: 'text-sage-600 bg-sage-50' },
    { icon: Heart, title: 'Healthcare', desc: 'Submit health concerns and access healthcare outreach information.', color: 'text-red-600 bg-red-50' },
    { icon: Shield, title: 'Safety', desc: 'Heat risk assessment and safety recommendations for salt-pan workers.', color: 'text-amber-600 bg-amber-50' },
    { icon: FileText, title: 'Welfare Schemes', desc: 'Match your profile against government welfare schemes and understand eligibility.', color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-20">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-eucalyptus-700 rounded-lg flex items-center justify-center">
              <span className="text-sm">🧂</span>
            </div>
            <span className="text-base font-bold text-charcoal-900">AgariyaCare AI</span>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn-primary text-sm">Go to Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="text-sm text-charcoal-600 hover:text-charcoal-900 px-3 py-1.5 rounded-lg hover:bg-charcoal-50">Log In</Link>
                <Link to="/signup" className="btn-primary text-sm">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-charcoal-900 text-white">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 text-white/70 text-xs px-3 py-1.5 rounded-full mb-6 border border-white/20">
              <Bot size={11} /> Powered by IBM Granite AI
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-5 text-white">
              Sell Better.<br />Work Safer.<br />Live Better.
            </h1>
            <p className="text-lg text-charcoal-300 mb-8 leading-relaxed max-w-2xl">
              A digital livelihood platform for Agariya salt-pan workers of the Little Rann of Kutch — connecting them with buyers, AI assistance, healthcare, and welfare support.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to={isAuthenticated ? '/market' : '/signup'} className="flex items-center gap-2 bg-eucalyptus-600 hover:bg-eucalyptus-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors">
                <Package size={16} /> Sell Your Salt <ArrowRight size={14} />
              </Link>
              <Link to={isAuthenticated ? '/dashboard' : '/login'} className="flex items-center gap-2 border border-white/20 text-white/80 hover:bg-white/10 px-6 py-3 rounded-xl font-medium transition-colors">
                Explore Platform
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Challenge */}
      <section className="py-16 bg-ivory-50 border-y border-charcoal-100">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-charcoal-900 mb-2">The Challenge</h2>
          <p className="text-charcoal-500 mb-8 max-w-2xl">
            Agariya salt workers in Gujarat's Little Rann of Kutch face extreme isolation, limited market access, and inadequate support systems.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              ['💰', 'Unfair Pricing', 'Without market information, workers are vulnerable to below-market offers from buyers.'],
              ['🌡️', 'Extreme Heat', 'Working in 45°C+ temperatures with limited safety monitoring or support.'],
              ['🏥', 'Healthcare Access', 'Isolated locations far from medical facilities with limited regular healthcare access.'],
              ['📋', 'Welfare Gaps', 'Low awareness of government schemes they may be eligible for.'],
              ['🤝', 'Buyer Discovery', 'Difficulty finding and connecting with legitimate buyers at fair prices.'],
              ['📡', 'Digital Divide', 'Limited access to digital tools designed for their specific context and language.'],
            ].map(([icon, title, desc]) => (
              <div key={title as string} className="bg-white rounded-xl border border-charcoal-100 p-5">
                <div className="text-2xl mb-2">{icon}</div>
                <h3 className="font-semibold text-charcoal-900 mb-1">{title as string}</h3>
                <p className="text-sm text-charcoal-500">{desc as string}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-charcoal-900 mb-2 text-center">How AgariyaCare Works</h2>
          <p className="text-charcoal-500 text-center mb-10 max-w-xl mx-auto">
            A complete digital salt marketplace with AI intelligence at every step.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm">
            {['Add Salt Inventory', 'Create Listing', 'Buyer Discovers', 'Make Offer', 'AI Advice', 'Accept & Sell'].map((step, i, arr) => (
              <React.Fragment key={step}>
                <div className="bg-charcoal-800 text-white rounded-lg px-4 py-2.5 font-medium whitespace-nowrap shadow-sm">{step}</div>
                {i < arr.length - 1 && <ChevronRight className="text-charcoal-300 rotate-90 sm:rotate-0 flex-shrink-0" size={16} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-ivory-50 border-y border-charcoal-100">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <h2 className="text-2xl font-bold text-charcoal-900 mb-2 text-center">Platform Features</h2>
          <p className="text-charcoal-500 text-center mb-10">Everything a salt worker needs in one place.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(f => (
              <div key={f.title} className="bg-white rounded-xl border border-charcoal-100 p-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${f.color}`}>
                  <f.icon size={20} />
                </div>
                <h3 className="font-semibold text-charcoal-900 mb-1">{f.title}</h3>
                <p className="text-sm text-charcoal-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-eucalyptus-800 text-white py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-3">Join AgariyaCare AI</h2>
          <p className="text-eucalyptus-200 mb-6">
            Register as a salt worker, buyer, or coordinator and start using the platform today.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/signup" className="bg-white text-eucalyptus-800 px-6 py-2.5 rounded-xl font-semibold hover:bg-eucalyptus-50 transition-colors">
              Create Account
            </Link>
            <Link to="/login" className="border border-white/30 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-white/10 transition-colors">
              Log In
            </Link>
          </div>
          <p className="text-xs text-eucalyptus-400 mt-4">
            Demo accounts available: worker@test.local / buyer@test.local
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-charcoal-100 py-6">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-charcoal-400 gap-2">
          <span>AgariyaCare AI — A digital livelihood platform for Agariya salt workers</span>
          <span>Powered by IBM Granite AI · IBM Cloud</span>
        </div>
      </footer>
    </div>
  );
}
