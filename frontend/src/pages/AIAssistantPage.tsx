/**
 * AgariyaCare AI Assistant Page — Phase 4
 *
 * Real IBM Granite-powered AI chat interface.
 * Role-aware: workers, buyers, coordinators, and admins each get
 * tailored welcome messages and suggested prompts.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../context/authStore';
import { aiApi, AIConversation, AIMessage, AIChatMessage } from '../services/api';
import { UserRole } from '../types';

// ─── Icons ───────────────────────────────────────────────────────────────────

const BotIcon = ({ color = 'currentColor' }: { color?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: Array<{ label: string; link?: string; url?: string; type?: string }>;
  agentsUsed?: string[];
  toolsUsed?: string[];
  timestamp: Date;
}

// ─── Suggested prompts by role ─────────────────────────────────────────────────

const SUGGESTIONS: Record<UserRole, { en: string[]; gu: string[] }> = {
  AGARIYA_WORKER: {
    en: [
      'How much salt do I have available right now?',
      'Show me my pending offers',
      'Should I accept my latest offer?',
      'Who is currently looking to buy salt?',
      'What are my total earnings this season?',
      "Help me understand today's salt market",
    ],
    gu: [
      'હાલ મારી પાસે કેટલું મીઠું ઉપલ્બ્ધ છે?',
      'મારી પ્રતીક્ષિત ઑફર બતાવો',
      'શું મારે મારી છેલ્લી ઑફર સ્વીકારવી જોઈએ?',
      'હાલ કોણ મીઠું ખરીદવા માંગે છે?',
      'આ સિઝનમાં મારી કુલ કમાણી કેટલી છે?',
      'આજના મીઠા બજારની સ્થિતિ સમજાવો',
    ],
  },
  BUYER: {
    en: [
      'Find salt listings matching my requirements',
      'Show my pending offers',
      'What are current market prices for industrial salt?',
      'Help me compare available sellers',
      'Show my active buyer requests',
      'What is my total purchase history?',
    ],
    gu: [
      'મારી જરૂરિયાત મુજબ મીઠાની યાદી શોધો',
      'મારી પ્રતીક્ષિત ઑફર બતાવો',
      'ઔદ્યોગિક મીઠા માટે હાલના બજાર ભાવ શું છે?',
      'ઉપલ્બ્ધ વેચાણકારોની સરખામણી કરવામાં મદદ કરો',
      'મારી સક્રિય ખરીદ વિનંતીઓ બતાવો',
      'મારો કુલ ખરીદ ઇતિહાસ શું છે?',
    ],
  },
  COORDINATOR: {
    en: [
      'Show worker activity in my region',
      'What health camps are scheduled this month?',
      'Which workers have pending support requests?',
      'Summarize current safety alerts',
      'Show recent community notices',
      'What welfare schemes are currently active?',
    ],
    gu: [
      'મારા ક્ષેત્રમાં કામદારોની પ્રવૃત્તિ બતાવો',
      'આ મહિને કયા આરોગ્ય શિબિર આયોજિત છે?',
      'કયા કામદારોની સહાય વિનંતીઓ પ્રતીક્ષામાં છે?',
      'વર્તમાન સલામતી ચેતવણીઓ સારાંશ આપો',
      'તાજેતરની સામુદાયિક સૂચનાઓ બતાવો',
      'હાલ કઈ કલ્યાણ યોજનાઓ સક્રિય છે?',
    ],
  },
  ADMIN: {
    en: [
      'Give me a platform activity overview',
      'How many active workers are on the platform?',
      "Summarize this week's marketplace activity",
      'Show recent transaction volume',
      'Are there any open support issues?',
      'What is the current AI provider status?',
    ],
    gu: [
      'પ્લેટફૉર્મ પ્રવૃત્તિ સારાંશ આપો',
      'પ્લેટફૉર્મ પર કેટલા સક્રિય કામદારો છે?',
      'આ અઠવાડિયાની બજાર પ્રવૃત્તિ સારાંશ આપો',
      'તાજેતરના વ્યવહાર વૉલ્યૂમ બતાવો',
      'કોઈ ખુલ્લી સહાય સમસ્યા છે?',
      'વર્તમાન AI પ્રદાતા સ્થિતિ શું છે?',
    ],
  },
};

// ─── Welcome messages ─────────────────────────────────────────────────────────

function getWelcomeMessage(name: string, role: UserRole, lang: 'en' | 'gu'): string {
  const firstName = name.split(' ')[0];
  const hour = new Date().getHours();

  if (lang === 'gu') {
    const greet = hour < 12 ? 'શુભ પ્રભાત' : hour < 17 ? 'નમસ્તે' : 'શુભ સાંજ';
    const roleDesc: Record<UserRole, string> = {
      AGARIYA_WORKER: 'હું AgariyaCare AI છું. તમારા મીઠા વ્યવસાય, ઑફર, ઇન્વેન્ટરી, બજાર અને કલ્યાણ માટે હું મદદ કરી શકું છું.',
      BUYER: 'હું AgariyaCare AI છું. મીઠો શોધવા, ઑફર, બજારની કિંમત અને ખરીદ ઇતિહાસ માટે હું મદદ કરી શકું છું.',
      COORDINATOR: 'હું AgariyaCare AI છું. કામદાર સહાય, આરોગ્ય, સલામતી અને સામુદાયિક માહિતી માટે હું અહીં છું.',
      ADMIN: 'હું AgariyaCare AI છું. પ્લેટફૉર્મ વ્યવસ્થાપન, બજાર વિશ્લેષણ અને સહાય માટે અહીં છું.',
    };
    return `${greet}, ${firstName}.\n${roleDesc[role]}`;
  }

  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const roleDesc: Record<UserRole, string> = {
    AGARIYA_WORKER: "I can help you sell your salt, understand offers, check marketplace activity, track earnings, and find welfare support.",
    BUYER: "I can help you find salt listings, analyze offers, track purchases, and navigate the marketplace.",
    COORDINATOR: "I can help you support workers, monitor safety, track healthcare outreach, and manage community communications.",
    ADMIN: "I can help you oversee platform activity, monitor marketplace health, and manage users and analytics.",
  };
  return `${greet}, ${firstName}.\nI'm AgariyaCare AI, powered by IBM Granite. ${roleDesc[role]}`;
}

// ─── Markdown-lite response renderer ─────────────────────────────────────────

function renderContent(text: string): React.ReactNode {
  if (!text) return null;
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }

    if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="text-sm font-semibold text-charcoal-900 mt-3 mb-1.5 first:mt-0">{line.slice(3)}</h3>);
      i++; continue;
    }
    if (line.startsWith('# ')) {
      elements.push(<h2 key={i} className="text-base font-bold text-charcoal-900 mt-3 mb-2 first:mt-0">{line.slice(2)}</h2>);
      i++; continue;
    }

    // Bullet list
    if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('• ') || lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1 my-2 ml-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-2 text-sm text-charcoal-700 leading-relaxed">
              <span className="text-eucalyptus-600 mt-0.5 flex-shrink-0">•</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="space-y-1 my-2 ml-1 list-none">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-2 text-sm text-charcoal-700 leading-relaxed">
              <span className="text-eucalyptus-600 font-medium w-4 flex-shrink-0">{idx + 1}.</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    elements.push(
      <p key={i} className="text-sm text-charcoal-700 leading-relaxed my-1.5">{renderInline(line)}</p>
    );
    i++;
  }

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-charcoal-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-charcoal-100 text-charcoal-800 px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AIAssistantPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const location = useLocation();
  const lang = (i18n.language === 'gu' ? 'gu' : 'en') as 'en' | 'gu';
  const gu = lang === 'gu';

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [providerMode, setProviderMode] = useState<'development' | 'production' | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const userName = user?.full_name ?? '';
  const userRole = (user?.role ?? 'AGARIYA_WORKER') as UserRole;
  const suggestions = SUGGESTIONS[userRole][lang];
  const welcomeMessage = userName ? getWelcomeMessage(userName, userRole, lang) : '';

  // Handle pre-populated prompt from navigation state
  useEffect(() => {
    const state = location.state as { prompt?: string } | null;
    if (state?.prompt) {
      setInput(state.prompt);
      inputRef.current?.focus();
    }
  }, [location.state]);

  useEffect(() => {
    loadConversations();
    aiApi.getStatus().then((res) => {
      if (res.success && res.data) setProviderMode(res.data.mode);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-grow textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await aiApi.getConversations();
      if (res.success && res.data) {
        setConversations(res.data.filter((c) => !c.isArchived));
      }
    } catch {}
  }, [user]);

  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await aiApi.getConversationMessages(id);
      if (!res.success || !res.data) return;
      const msgs: ChatMsg[] = res.data.map((m: AIMessage) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        actions: m.actions,
        agentsUsed: m.agentUsed,
        timestamp: new Date(m.timestamp || m.createdAt || Date.now()),
      }));
      setMessages(msgs);
      setConversationId(id);
      setShowSidebar(false);
      setErrorMsg('');
    } catch {
      setErrorMsg(gu ? 'વાર્તાલાપ લોડ થઈ શક્યો નહીં.' : 'Failed to load conversation.');
    }
  }, [gu]);

  const deleteConversation = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await aiApi.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) {
        setMessages([]);
        setConversationId(undefined);
      }
    } catch {}
  }, [conversationId]);

  const newConversation = useCallback(() => {
    setMessages([]);
    setConversationId(undefined);
    setErrorMsg('');
    setShowSidebar(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setInput('');
    setErrorMsg('');

    const userMsg: ChatMsg = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: msg,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history: AIChatMessage[] = messages
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await aiApi.chat(msg, history, lang, conversationId);

      if (!res.success || !res.data) {
        throw new Error('Empty response from AI service');
      }

      const aiData = res.data;
      if (aiData.conversationId) setConversationId(aiData.conversationId);

      const aiMsg: ChatMsg = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: aiData.message ?? '',
        actions: aiData.actions ?? [],
        agentsUsed: aiData.agentsUsed ?? [],
        toolsUsed: aiData.toolsUsed ?? [],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      if (!conversationId && aiData.conversationId) {
        loadConversations();
      }
    } catch (err: any) {
      const status = err?.response?.status;
      let errText: string;
      if (status === 429 || err?.message?.toLowerCase().includes('too many')) {
        errText = gu
          ? 'ઘણી AI વિનંતીઓ. થોડી ક્ષણ પ્રતીક્ષા કરો.'
          : 'Too many AI requests. Please wait a moment and try again.';
      } else if (status === 503 || err?.message?.toLowerCase().includes('unavailable')) {
        errText = gu
          ? 'AgariyaCare AI હ. AI ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​'
          : 'AgariyaCare AI is temporarily unavailable. Please check your AI configuration or try again.';
      } else {
        errText = gu
          ? 'ક. ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​'
          : 'Something went wrong. Please try again.';
      }
      setErrorMsg(errText);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, lang, conversationId, loadConversations, gu]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>

      {/* ── Conversation history sidebar ──────────────────────────────────── */}
      {showSidebar && (
        <aside className="w-60 flex-shrink-0 flex flex-col border-r border-charcoal-100 bg-ivory-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-charcoal-100">
            <span className="text-xs font-semibold text-charcoal-600 uppercase tracking-wide">
              {gu ? 'વ. ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​' : t('ai.recentConversations')}
            </span>
            <button onClick={() => setShowSidebar(false)} className="text-charcoal-400 hover:text-charcoal-700 p-0.5 rounded" aria-label="Close sidebar">
              <XIcon />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {conversations.length === 0 ? (
              <p className="text-xs text-charcoal-400 px-4 py-3">
                {gu ? 'હજી કોઈ વ. ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​' : t('ai.noConversationsYet')}
              </p>
            ) : conversations.slice(0, 30).map((conv) => (
              <div
                key={conv.id}
                role="button"
                tabIndex={0}
                onClick={() => loadConversation(conv.id)}
                onKeyDown={(e) => e.key === 'Enter' && loadConversation(conv.id)}
                className={`group flex items-start gap-2 px-3 py-2.5 mx-1 rounded-lg cursor-pointer transition-colors ${
                  conversationId === conv.id
                    ? 'bg-eucalyptus-100 text-eucalyptus-800'
                    : 'text-charcoal-600 hover:bg-charcoal-50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate leading-snug">{conv.title}</p>
                  <p className="text-xs text-charcoal-400 mt-0.5">
                    {new Date(conv.updatedAt || conv.createdAt).toLocaleDateString(gu ? 'gu-IN' : 'en-IN', {
                      day: 'numeric', month: 'short',
                    })}
                  </p>
                </div>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-charcoal-400 hover:text-red-500 p-0.5 rounded flex-shrink-0 mt-0.5 transition-opacity"
                  aria-label="Delete conversation"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* ── Main chat area ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-charcoal-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-charcoal-800 rounded-xl flex items-center justify-center flex-shrink-0 p-1.5 text-eucalyptus-300">
              <BotIcon color="#6ee7b7" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-charcoal-900 leading-tight">AgariyaCare AI</h1>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-charcoal-400">
                  {gu ? 'IBM Granite દ્વારા' : t('ai.poweredBy')}
                </span>
                {providerMode && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    providerMode === 'production'
                      ? 'bg-eucalyptus-100 text-eucalyptus-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}>
                    {providerMode === 'production' ? 'IBM Granite' : gu ? 'Dev' : 'Dev Mode'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <button
                onClick={() => setShowSidebar((s) => !s)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  showSidebar
                    ? 'bg-eucalyptus-50 border-eucalyptus-200 text-eucalyptus-700'
                    : 'border-charcoal-200 text-charcoal-600 hover:bg-charcoal-50'
                }`}
                aria-label="Toggle conversation history"
                aria-pressed={showSidebar}
              >
                <ClockIcon />
                <span className="hidden sm:inline">{gu ? 'ઇ.' : t('ai.history')}</span>
              </button>
            )}
            <button
              onClick={newConversation}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-eucalyptus-700 hover:bg-eucalyptus-800 text-white transition-colors"
              aria-label="New conversation"
            >
              <PlusIcon />
              <span className="hidden sm:inline">{gu ? 'નવો' : t('ai.newChat')}</span>
            </button>
          </div>
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">

            {/* Welcome / empty state */}
            {messages.length === 0 && (
              <div>
                {/* Welcome card */}
                <div className="bg-white border border-charcoal-100 rounded-2xl p-6 mb-6 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-charcoal-800 rounded-xl flex items-center justify-center flex-shrink-0 p-2">
                      <BotIcon color="#6ee7b7" />
                    </div>
                    <div className="flex-1">
                      {welcomeMessage ? (
                        welcomeMessage.split('\n').map((line, i) => (
                          <p key={i} className={i === 0
                            ? 'text-base font-semibold text-charcoal-900 mb-1'
                            : 'text-sm text-charcoal-600 leading-relaxed'
                          }>
                            {line}
                          </p>
                        ))
                      ) : (
                        <>
                          <p className="text-base font-semibold text-charcoal-900 mb-1">AgariyaCare AI</p>
                          <p className="text-sm text-charcoal-600">
                            {gu
                              ? 'IBM Granite AI દ્વારા સંચાલિત. મીઠા, ઑફર, બજાર, આરોગ્ય અને કલ્યાણ વિશે પૂછો.'
                              : t('ai.welcomeGuest')}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Suggested prompts */}
                <div>
                  <p className="text-xs font-semibold text-charcoal-400 uppercase tracking-wider mb-3">
                    {gu ? 'સૂચિત પ્રશ્નો' : t('ai.suggestedQuestions')}
                  </p>
                  <div className="grid gap-2">
                    {suggestions.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        disabled={loading}
                        className="text-left text-sm text-charcoal-700 bg-white border border-charcoal-100 hover:border-eucalyptus-200 hover:bg-eucalyptus-50/40 rounded-xl px-4 py-3 transition-colors flex items-center gap-2 group disabled:opacity-50"
                      >
                        <span className="flex-1 leading-snug">{q}</span>
                        <span className="text-charcoal-300 group-hover:text-eucalyptus-500 flex-shrink-0">
                          <ChevronRightIcon />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dev mode notice */}
                {providerMode === 'development' && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <p className="text-xs text-amber-700 font-medium">
                      {gu
                        ? 'ડેવ. ​​ IBM_WATSONX_API_KEY સેટ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​'
                        : 'Development mode: Set IBM_WATSONX_API_KEY and IBM_WATSONX_PROJECT_ID in .env for real IBM Granite AI.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Messages */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 bg-charcoal-800 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 p-1.5">
                    <BotIcon color="#6ee7b7" />
                  </div>
                )}

                <div className="max-w-[80%] sm:max-w-[72%]">
                  {/* Bubble */}
                  <div className={`rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-charcoal-800 text-white rounded-br-sm'
                      : 'bg-white border border-charcoal-100 rounded-bl-sm shadow-sm'
                  }`}>
                    {msg.role === 'user' ? (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div>{renderContent(msg.content)}</div>
                    )}
                  </div>

                  {/* Action buttons */}
                  {msg.role === 'assistant' && msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {msg.actions.map((action, i) => (
                        <Link
                          key={i}
                          to={action.link || action.url || '/dashboard'}
                          className="inline-flex items-center gap-1 text-xs text-eucalyptus-700 bg-eucalyptus-50 border border-eucalyptus-200 hover:bg-eucalyptus-100 rounded-lg px-3 py-1.5 transition-colors font-medium"
                        >
                          {action.label}
                          <ChevronRightIcon />
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Tool/agent transparency */}
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {msg.agentsUsed && msg.agentsUsed.length > 0 && (
                        <span className="text-xs text-charcoal-400">
                          {gu ? 'ઉ.' : 'via'} {msg.agentsUsed.join(', ')}
                        </span>
                      )}
                      {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                        <span className="text-xs text-charcoal-400 bg-charcoal-50 border border-charcoal-100 rounded-full px-2 py-0.5">
                          {gu ? 'ઉ. ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​' : 'Used'}: {msg.toolsUsed.join(', ')}
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-charcoal-400 mt-1">
                    {msg.timestamp.toLocaleTimeString(gu ? 'gu-IN' : 'en-IN', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 bg-eucalyptus-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs font-bold text-eucalyptus-700">
                      {userName?.[0]?.toUpperCase() ?? 'U'}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 bg-charcoal-800 rounded-lg flex items-center justify-center flex-shrink-0 p-1.5">
                  <BotIcon color="#6ee7b7" />
                </div>
                <div className="bg-white border border-charcoal-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="flex gap-1">
                      {[0, 150, 300].map((delay) => (
                        <span
                          key={delay}
                          className="w-1.5 h-1.5 bg-eucalyptus-500 rounded-full animate-bounce"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-charcoal-500">
                      {gu ? 'AgariyaCare AI વ. ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​' : t('ai.thinking')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-red-700">{errorMsg}</p>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* ── Input composer ────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-t border-charcoal-100 bg-white px-4 sm:px-6 py-3">
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={gu
                    ? 'મીઠું, ઑફર, બજાર, આ. ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​'
                    : t('ai.inputPlaceholder')}
                  className="w-full border border-charcoal-200 rounded-xl px-4 py-3 text-sm text-charcoal-800 placeholder-charcoal-400 resize-none focus:outline-none focus:ring-2 focus:ring-eucalyptus-500 focus:border-transparent bg-ivory-50"
                  style={{ minHeight: 44, maxHeight: 120 }}
                  disabled={loading}
                  aria-label={gu ? 'AI ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​' : 'Message input'}
                />
              </div>
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="flex-shrink-0 w-11 h-11 bg-eucalyptus-700 hover:bg-eucalyptus-800 disabled:bg-charcoal-200 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-eucalyptus-500 focus:ring-offset-1"
                aria-label={gu ? 'સં.' : 'Send message'}
              >
                <SendIcon />
              </button>
            </div>
            <p className="text-xs text-charcoal-400 mt-2 text-center">
              {gu
                ? 'IBM Granite AI · ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​ ​​'
                : t('ai.disclaimer')}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
