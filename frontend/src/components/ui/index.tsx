import React from 'react';

// ── Loading Spinner ───────────────────────────────────────────────────────────
export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' };
  return (
    <svg
      className={`animate-spin text-eucalyptus-600 ${sizes[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
};

// ── Full Page Loading ─────────────────────────────────────────────────────────
export const PageLoader: React.FC<{ message?: string }> = ({ message }) => (
  <div className="min-h-screen bg-ivory-100 flex flex-col items-center justify-center gap-4">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-eucalyptus-700 flex items-center justify-center">
        <span className="text-white text-sm font-bold">A</span>
      </div>
      <span className="text-lg font-semibold text-charcoal-800">AgariyaCare</span>
    </div>
    <Spinner size="md" />
    {message && <p className="text-sm text-charcoal-500">{message}</p>}
  </div>
);

// ── Skeleton ──────────────────────────────────────────────────────────────────
export const SkeletonLine: React.FC<{ width?: string; height?: string; className?: string }> = ({
  width = 'w-full',
  height = 'h-4',
  className = '',
}) => <div className={`skeleton ${width} ${height} ${className}`} />;

export const SkeletonCard: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="card card-body space-y-3">
    <SkeletonLine width="w-1/3" height="h-4" />
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonLine key={i} width={i === lines - 1 ? 'w-2/3' : 'w-full'} height="h-3" />
    ))}
  </div>
);

// ── Error State ───────────────────────────────────────────────────────────────
export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
}> = ({ title = 'Something went wrong', message, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
      <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h3 className="text-base font-semibold text-charcoal-800 mb-1">{title}</h3>
    {message && <p className="text-sm text-charcoal-500 mb-4 max-w-xs">{message}</p>}
    {onRetry && (
      <button onClick={onRetry} className="btn-secondary btn-sm">
        Try again
      </button>
    )}
  </div>
);

// ── Empty State ───────────────────────────────────────────────────────────────
export const EmptyState: React.FC<{
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  icon?: React.ReactNode;
}> = ({ title, description, action, icon }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    {icon ? (
      <div className="w-14 h-14 rounded-full bg-ivory-200 flex items-center justify-center mb-4">
        {icon}
      </div>
    ) : (
      <div className="w-14 h-14 rounded-full bg-ivory-200 flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
    )}
    <h3 className="text-base font-semibold text-charcoal-800 mb-1">{title}</h3>
    {description && <p className="text-sm text-charcoal-500 mb-4 max-w-xs">{description}</p>}
    {action && (
      <button onClick={action.onClick} className="btn-primary btn-sm">
        {action.label}
      </button>
    )}
  </div>
);

// ── Coming Soon Card ──────────────────────────────────────────────────────────
export const ComingSoonCard: React.FC<{ title: string; phase: number; description?: string }> = ({
  title,
  phase,
  description,
}) => (
  <div className="card card-body flex flex-col items-center text-center py-10">
    <span className="badge-sand mb-3">Phase {phase}</span>
    <h3 className="section-title mb-1">{title}</h3>
    <p className="text-sm text-charcoal-500 max-w-xs">
      {description || 'This feature is being built and will be available soon.'}
    </p>
  </div>
);

// ── Alert / Toast ─────────────────────────────────────────────────────────────
export const Alert: React.FC<{
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
  className?: string;
}> = ({ type, message, onClose, className = '' }) => {
  const styles = {
    success: 'bg-eucalyptus-50 border-eucalyptus-200 text-eucalyptus-800',
    error:   'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-sand-50 border-sand-200 text-sand-700',
    info:    'bg-ivory-100 border-ivory-300 text-charcoal-700',
  };
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${styles[type]} ${className}`}>
      <span className="flex-1">{message}</span>
      {onClose && (
        <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity ml-1">
          ×
        </button>
      )}
    </div>
  );
};

// ── Confirmation Dialog ───────────────────────────────────────────────────────
export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'default', onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="card card-body w-full max-w-sm mx-4 shadow-float animate-slide-up">
        <h2 className="text-base font-semibold text-charcoal-900 mb-2">{title}</h2>
        <p className="text-sm text-charcoal-600 mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn-secondary btn-sm">{cancelLabel}</button>
          <button
            onClick={onConfirm}
            className={variant === 'danger' ? 'btn-danger btn-sm' : 'btn-primary btn-sm'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
