import React from 'react';
import { useTranslation } from 'react-i18next';
import { OfferHistoryEntry } from '../../services/offerService';

function fmt(n: number | string): string {
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}
function fmtTime(d: string): string {
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const EVENT_LABEL: Record<string, { en: string; gu: string }> = {
  OFFER:    { en: 'Made offer',       gu: 'ઑફર કરી' },
  COUNTER:  { en: 'Counter-offered',  gu: 'ઉત્તર ઑફર' },
  ACCEPT:   { en: 'Accepted',         gu: 'સ્વીકૃત' },
  REJECT:   { en: 'Rejected',         gu: 'અસ્વીકૃત' },
  WITHDRAW: { en: 'Withdrew offer',   gu: 'ઑફર પાછી' },
  EXPIRE:   { en: 'Expired',          gu: 'સમાપ્ત' },
};

const EVENT_COLOR: Record<string, string> = {
  OFFER:    'bg-eucalyptus-50 border-eucalyptus-200',
  COUNTER:  'bg-sand-50 border-sand-200',
  ACCEPT:   'bg-eucalyptus-100 border-eucalyptus-300',
  REJECT:   'bg-red-50 border-red-200',
  WITHDRAW: 'bg-ivory-100 border-ivory-300',
  EXPIRE:   'bg-ivory-100 border-ivory-300',
};

const EVENT_DOT: Record<string, string> = {
  OFFER:    'bg-eucalyptus-500',
  COUNTER:  'bg-sand-500',
  ACCEPT:   'bg-eucalyptus-700',
  REJECT:   'bg-red-400',
  WITHDRAW: 'bg-charcoal-300',
  EXPIRE:   'bg-charcoal-300',
};

interface NegotiationTimelineProps {
  history: OfferHistoryEntry[];
  buyerId: string;
  compact?: boolean;
}

export const NegotiationTimeline: React.FC<NegotiationTimelineProps> = ({
  history,
  buyerId,
  compact = false,
}) => {
  const { i18n } = useTranslation();
  const gu = i18n.language === 'gu';

  if (history.length === 0) return null;

  return (
    <div className="space-y-0">
      {history.map((entry, idx) => {
        const isBuyer   = entry.actor_id === buyerId || entry.actor_role === 'buyer';
        const label     = EVENT_LABEL[entry.event_type] ?? { en: entry.event_type, gu: entry.event_type };
        const dotColor  = EVENT_DOT[entry.event_type]  ?? 'bg-charcoal-400';
        const cardColor = EVENT_COLOR[entry.event_type] ?? 'bg-ivory-50 border-ivory-200';
        const isLast    = idx === history.length - 1;

        return (
          <div key={entry.id} className="flex gap-3">
            {/* Timeline spine */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-3 h-3 rounded-full border-2 border-white ring-2 ${dotColor} ring-offset-0 mt-1`} />
              {!isLast && <div className="w-px flex-1 bg-ivory-300 my-1" />}
            </div>

            {/* Card */}
            <div className={`flex-1 border rounded-xl p-3 mb-3 ${cardColor}`}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                      isBuyer
                        ? 'bg-charcoal-800 text-white'
                        : 'bg-eucalyptus-100 text-eucalyptus-800'
                    }`}>
                      {isBuyer
                        ? (gu ? 'ખ.' : 'Buyer')
                        : (gu ? 'ક.' : 'Worker')}
                    </span>
                    <span className="text-xs text-charcoal-600 font-medium">
                      {gu ? label.gu : label.en}
                    </span>
                    {entry.actor_name && !compact && (
                      <span className="text-xs text-charcoal-400">· {entry.actor_name}</span>
                    )}
                  </div>

                  {/* Core terms */}
                  {(entry.event_type === 'OFFER' || entry.event_type === 'COUNTER' || entry.event_type === 'ACCEPT') && (
                    <div className="mt-1.5 flex items-baseline gap-3 flex-wrap">
                      <span className="text-lg font-bold text-charcoal-900">
                        ₹{fmt(entry.price_per_kg)}/kg
                      </span>
                      <span className="text-sm text-charcoal-600">
                        {fmt(entry.quantity_kg)} kg
                      </span>
                      <span className="text-sm text-charcoal-400">
                        = ₹{fmt(Number(entry.price_per_kg) * Number(entry.quantity_kg))}
                      </span>
                    </div>
                  )}

                  {/* Message */}
                  {entry.message && (
                    <p className="mt-1 text-xs text-charcoal-500 italic">&ldquo;{entry.message}&rdquo;</p>
                  )}
                </div>

                <span className="text-xs text-charcoal-400 flex-shrink-0 whitespace-nowrap">
                  {fmtTime(entry.created_at)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
