import React from 'react';
import { LucideIcon } from 'lucide-react';
import { SafetyLevel } from '../types';

// ─── Safety badge ─────────────────────────────────────────────────────────────

export function SafetyBadge({ level }: { level: SafetyLevel }) {
  const map: Record<SafetyLevel, string> = {
    NORMAL: 'badge-normal',
    CAUTION: 'badge-caution',
    HIGH_RISK: 'badge-high',
    EMERGENCY: 'badge-emergency',
  };
  const labels: Record<SafetyLevel, string> = {
    NORMAL: 'Normal',
    CAUTION: 'Caution',
    HIGH_RISK: 'High Risk',
    EMERGENCY: 'Emergency',
  };
  return <span className={map[level]}>{labels[level]}</span>;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'badge-pending',
    ASSIGNED: 'badge-assigned',
    SCHEDULED: 'badge bg-indigo-100 text-indigo-800',
    COMPLETED: 'badge-completed',
    CANCELLED: 'badge-cancelled',
    OPEN: 'badge-pending',
    IN_PROGRESS: 'badge-assigned',
    RESOLVED: 'badge-completed',
    REPORTED: 'badge-pending',
    ACKNOWLEDGED: 'badge-assigned',
  };
  return <span className={map[status] ?? 'badge bg-gray-100 text-gray-700'}>{status.replace('_', ' ')}</span>;
}

// ─── Loading spinner ──────────────────────────────────────────────────────────

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg className="animate-spin text-eucalyptus-500" style={{ width: size, height: size }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Page header ──────────────────────────────────────────────────────────────

export function PageHeader({ title, subtitle, actions }: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 ml-4 flex-shrink-0">{actions}</div>}
    </div>
  );
}

// ─── Alert banner ─────────────────────────────────────────────────────────────

export function AlertBanner({ type, message }: { type: 'error' | 'warning' | 'success' | 'info'; message: string }) {
  const styles = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };
  return (
    <div className={`border rounded-lg px-4 py-3 text-sm ${styles[type]}`}>
      {message}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState({ message, action, children }: { message: string; action?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="text-center py-12 text-charcoal-400">
      <p className="mb-3 text-charcoal-500">{message}</p>
      {action ?? children}
    </div>
  );
}

// ─── Disclaimer box ───────────────────────────────────────────────────────────

export function Disclaimer({ text }: { text: string }) {
  return (
    <div className="disclaimer">
      <span className="font-semibold">⚠️ Note: </span>{text}
    </div>
  );
}

// ─── Metric card ─────────────────────────────────────────────────────────────

export function MetricCard({
  title, value, subtitle, icon: Icon, color = 'eucalyptus'
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    eucalyptus: 'text-eucalyptus-600 bg-eucalyptus-50',
    ocean: 'text-eucalyptus-600 bg-eucalyptus-50',
    green: 'text-green-600 bg-green-50',
    amber: 'text-amber-600 bg-amber-50',
    red: 'text-red-600 bg-red-50',
    teal: 'text-teal-600 bg-teal-50',
  };
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color] ?? colorMap.ocean}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
