import React, { useEffect, useState } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { notificationsApi } from '../services/api';
import { Notification } from '../types';
import { EmptyState, Spinner } from '../components/UI';

export default function NotificationsPage() {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const gu = language === 'gu';

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) load();
  }, [currentUser]);

  async function load() {
    try {
      const res = await notificationsApi.getByUser(currentUser!.id);
      setNotifications(res.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id: string) {
    await notificationsApi.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }

  async function markAllRead() {
    await notificationsApi.markAllRead(currentUser!.id);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }

  const unread = notifications.filter(n => !n.isRead).length;

  const typeIcon: Record<string, string> = {
    NEW_OFFER: '💰', COUNTER_OFFER: '🔄', OFFER_ACCEPTED: '✅', OFFER_REJECTED: '❌',
    TRANSACTION_CONFIRMED: '✅', LISTING_UPDATE: '📋', BUYER_DEMAND_MATCH: '🎯',
    HEALTHCARE_UPDATE: '❤️', SAFETY_ALERT: '⚠️', WELFARE_MATCH: '📋',
    COMMUNITY_ANNOUNCEMENT: '📢', SYSTEM: 'ℹ️',
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900">{gu ? 'સ.' : 'Notifications'}</h1>
          {unread > 0 && (
            <p className="text-sm text-charcoal-500 mt-0.5">{unread} {gu ? 'અ.' : 'unread'}</p>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-sm flex items-center gap-1.5">
            <CheckCheck size={14} /> {gu ? 'બ. ?' : 'Mark All Read'}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState message={gu ? 'ĺ.' : 'No notifications yet.'} />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`card flex items-start gap-3 cursor-pointer transition-colors ${!n.isRead ? 'border-eucalyptus-200 bg-eucalyptus-50/20' : ''}`}
              onClick={() => !n.isRead && markRead(n.id)}
            >
              <span className="text-xl flex-shrink-0">{typeIcon[n.type] ?? 'ℹ️'}</span>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm ${!n.isRead ? 'font-semibold text-charcoal-900' : 'text-charcoal-700'}`}>{n.title}</p>
                  {!n.isRead && <span className="w-2 h-2 bg-eucalyptus-500 rounded-full flex-shrink-0 mt-1.5" />}
                </div>
                <p className="text-sm text-charcoal-500 mt-0.5">{n.message}</p>
                <p className="text-xs text-charcoal-400 mt-1">{new Date(n.createdAt).toLocaleString('en-IN')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
