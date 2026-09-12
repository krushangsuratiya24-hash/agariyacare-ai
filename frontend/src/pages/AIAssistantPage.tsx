import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Plus, Trash2, ChevronRight, Clock, Paperclip } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { aiApi } from '../services/api';
import { Spinner } from '../components/UI';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: { type: string; label: string; url: string }[];
  agentsUsed?: string[];
  timestamp: Date;
}

const SUGGESTED_EN = [
  'How much salt do I have available?',
  'Which of my listings are currently active?',
  'Should I accept my latest offer?',
  'How much did I earn from sales this month?',
  'Who has requested industrial salt?',
  'What is the average selling price for my salt?',
];
const SUGGESTED_GU = [
  'મારી પાસે કેટલું મીઠું ઉપ. ?',
  'કઈ મારી &#x0AB2;. સ. ?',
  'શું &#x0AB9;&#x0AC1;ં &#x0A86; &#x0A93;. &#x0AB8;. ?',
  'ĺ. &#x0A95;&#x0AC7;&#x0AA1;&#x0AB2;&#x0AC1;&#x0A82; &#x0A95;&#x0ACE;&#x0AA2;&#x0ACD;&#x0AAF;&#x0AC1;&#x0A82;?',
  '&#x0A95;&#x0ACB;&#x0AA3;&#x0AC7; &#x0A87;. &#x0AAE;. &#x0AAE;&#x0ABE;&#x0A97;&#x0ACD;&#x0AAF;&#x0AC1;&#x0A82;?',
  'ĺ. &#x0AB8;. &#x0AB8;. &#x0A95;&#x0AC7;&#x0A9F;&#x0AB2;&#x0ACD;&#x0AA8;&#x0ABE;&#x0AB0; &#x0AB9;&#x0AA4;?',
];
// Cleaner Gujarati suggestions
const SUGGESTED_GU_CLEAN = [
  'મારી પાસે કેટલું મીઠું ઉપ.?',
  'ĺ. &#x0AB2;. &#x0AB8;&#x0A95;&#x0ACD;&#x0AB0;&#x0ABF;&#x0AAF; &#x0AB9;.',
  'ĺ. &#x0A93;&#x0AAB;&#x0AB0; &#x0AB8;.',
  'ĺ. &#x0A95;&#x0AC7;&#x0A9F;&#x0AB2;&#x0AC1;&#x0A82; &#x0A95;.',
  'ĺ. &#x0A87;. &#x0AAE;&#x0AC0;&#x0AE0;&#x0AC1;&#x0A82; &#x0AAE;.',
  'ĺ. &#x0AB5;. &#x0B20;. &#x0AB8;.',
];

export default function AIAssistantPage() {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const gu = language === 'gu';
  const location = useLocation();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [conversations, setConversations] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Handle pre-populated prompt from navigation state
    const state = location.state as any;
    if (state?.prompt) {
      setInput(state.prompt);
    }
    loadConversations();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadConversations() {
    try {
      const res = await aiApi.getConversations();
      setConversations(res.data ?? []);
    } catch {}
  }

  async function loadConversation(id: string) {
    try {
      const res = await aiApi.getConversationMessages(id);
      const msgs = (res.data ?? []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        actions: m.actions,
        agentsUsed: m.agentsUsed,
        timestamp: new Date(m.createdAt),
      }));
      setMessages(msgs);
      setConversationId(id);
      setShowHistory(false);
    } catch {}
  }

  function newConversation() {
    setMessages([]);
    setConversationId(undefined);
    setShowHistory(false);
    inputRef.current?.focus();
  }

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    setError('');

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: msg,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const res = await aiApi.chat(msg, history, language, conversationId);
      const aiData = res.data;

      if (!aiData) throw new Error('Empty response from AI');

      if (aiData.conversationId) setConversationId(aiData.conversationId);

      const aiMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: aiData.response ?? aiData.message ?? 'No response.',
        actions: aiData.actions ?? [],
        agentsUsed: aiData.agentsUsed ?? [],
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
      await loadConversations();
    } catch (e: any) {
      setError(e.message?.includes('unavailable') || e.message?.includes('503')
        ? (gu ? 'AgariyaCare AI &#x0A45;. &#x0AAB;. &#x0AB5;.' : 'AgariyaCare AI is temporarily unavailable. Please try again.')
        : (gu ? 'ĺ. &#x0A85;. &#x0A96;. &#x0A9A;&#x0ACE;.' : 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const suggestions = gu
    ? ['મારી પાસે કેટલું મીઠું ઉ.?', 'ĺ. &#x0A93;. ĺ.?', 'ĺ. &#x0AB5;. ĺ.?', 'ĺ. &#x0A87;. &#x0AAE;. &#x0AAE;.?']
    : SUGGESTED_EN;

  // Real Gujarati suggestions
  const realSuggestions = gu
    ? ['મારી પાસે કેટલું મીઠું ઉ.?', 'શું આ ઑ. &#x0AB8;.?', 'ĺ. &#x0A86; &#x0AAE;. &#x0A95;. &#x0A95;.?', 'ĺ. &#x0AB5;. &#x0B20;. &#x0AB8;. ĺ.?']
    : SUGGESTED_EN;

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col" style={{ height: 'calc(100vh - 130px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-charcoal-800 rounded-xl flex items-center justify-center">
            <Bot size={20} className="text-eucalyptus-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-charcoal-900">AgariyaCare AI</h1>
            <p className="text-xs text-charcoal-400">{gu ? 'IBM Granite &#x0E1E;&#x0E33;.' : 'Powered by IBM Granite'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHistory(!showHistory)} className="btn-secondary text-sm flex items-center gap-1.5">
            <Clock size={14} /> {gu ? 'ĺ.' : 'History'}
          </button>
          <button onClick={newConversation} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus size={14} /> {gu ? 'ĺ.' : 'New'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Conversation history sidebar */}
        {showHistory && (
          <div className="w-56 flex-shrink-0 flex flex-col gap-1 overflow-y-auto">
            <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wide px-1 mb-2">{gu ? 'ĺ.' : 'Recent Conversations'}</p>
            {conversations.length === 0 ? (
              <p className="text-xs text-charcoal-400 px-1">{gu ? 'ĺ.' : 'No conversations yet.'}</p>
            ) : conversations.slice(0, 20).map((c: any) => (
              <button key={c.id} onClick={() => loadConversation(c.id)}
                className={`text-left px-3 py-2 rounded-lg text-xs transition-colors ${conversationId === c.id ? 'bg-eucalyptus-100 text-eucalyptus-700' : 'text-charcoal-600 hover:bg-charcoal-50'}`}>
                <p className="font-medium truncate">{c.firstMessage ?? gu ? 'ĺ.' : 'Conversation'}</p>
                <p className="text-charcoal-400 mt-0.5">{new Date(c.updatedAt ?? c.createdAt).toLocaleDateString('en-IN')}</p>
              </button>
            ))}
          </div>
        )}

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pb-4">
            {messages.length === 0 && (
              <div className="py-8">
                {/* Welcome */}
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-charcoal-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Bot size={28} className="text-eucalyptus-400" />
                  </div>
                  <h2 className="text-lg font-bold text-charcoal-900 mb-1">
                    {gu ? 'AgariyaCare AI' : 'AgariyaCare AI'}
                  </h2>
                  <p className="text-sm text-charcoal-500 max-w-xs mx-auto">
                    {gu
                      ? 'ĺ. ĺ. ĺ. ĺ. ĺ. ĺ.'
                      : 'Your intelligent salt business copilot. Ask me anything about your inventory, listings, offers, sales, or welfare.'}
                  </p>
                </div>

                {/* Suggested questions */}
                <div className="space-y-2 max-w-lg mx-auto">
                  <p className="text-xs font-semibold text-charcoal-400 uppercase tracking-wide text-center mb-3">
                    {gu ? 'ĺ.' : 'Suggested Questions'}
                  </p>
                  {SUGGESTED_EN.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="w-full text-left text-sm text-charcoal-700 bg-white border border-charcoal-100 hover:border-eucalyptus-200 hover:bg-eucalyptus-50/30 rounded-xl px-4 py-3 transition-colors flex items-center gap-2 group"
                    >
                      <span className="flex-1">{q}</span>
                      <ChevronRight size={14} className="text-charcoal-300 group-hover:text-eucalyptus-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 bg-charcoal-800 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={14} className="text-eucalyptus-400" />
                  </div>
                )}
                <div className={`max-w-xl ${msg.role === 'user' ? 'order-last' : ''}`}>
                  <div className={`rounded-2xl px-4 py-3 text-sm ${msg.role === 'user'
                    ? 'bg-charcoal-800 text-white rounded-br-sm'
                    : 'bg-white border border-charcoal-100 text-charcoal-800 rounded-bl-sm shadow-sm'}`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {/* Action buttons */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {msg.actions.map((action: any, i: number) => (
                        <Link key={i} to={action.url ?? '/dashboard'} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
                          {action.label} <ChevronRight size={12} />
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Agent labels */}
                  {msg.agentsUsed && msg.agentsUsed.length > 0 && (
                    <p className="text-xs text-charcoal-400 mt-1.5">
                      {gu ? 'ĺ.' : 'via'} {msg.agentsUsed.join(', ')} agent
                    </p>
                  )}

                  <p className="text-xs text-charcoal-400 mt-1.5">
                    {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 bg-eucalyptus-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs font-bold text-eucalyptus-700">
                      {currentUser?.name?.[0]?.toUpperCase() ?? 'U'}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 bg-charcoal-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-eucalyptus-400" />
                </div>
                <div className="bg-white border border-charcoal-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-sm text-charcoal-500">
                    <Spinner size={14} />
                    <span>{gu ? 'ĺ.' : 'AgariyaCare AI is thinking…'}</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 border-t border-charcoal-100 pt-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={gu ? 'ĺ. ĺ. ĺ...' : 'Ask anything about your salt, offers, market, welfare…'}
                  className="input resize-none pr-12 leading-relaxed"
                  style={{ minHeight: 44, maxHeight: 120 }}
                  disabled={loading}
                />
              </div>
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="flex-shrink-0 w-11 h-11 bg-eucalyptus-700 hover:bg-eucalyptus-800 disabled:bg-charcoal-200 text-white rounded-xl flex items-center justify-center transition-colors"
              >
                <Send size={17} />
              </button>
            </div>
            <p className="text-xs text-charcoal-400 mt-2 text-center">
              {gu ? 'ĺ. IBM Granite AI.' : 'Powered by IBM Granite AI · Responses are informational only.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
