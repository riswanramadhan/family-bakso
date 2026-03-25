'use client';

import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { Toast as ToastType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ToastProps {
  toasts: ToastType[];
  onClose: (id: string) => void;
}

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export default function Toast({ toasts, onClose }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-[70] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={cn(
              'card-elevated animate-slideIn flex items-center gap-3 px-4 py-3.5 shadow-lg',
              toast.type === 'error' && 'border-danger/20 bg-danger/5',
              toast.type === 'success' && 'border-success/20 bg-success/5',
              toast.type === 'info' && 'border-primary/20 bg-primary/5'
            )}
            role="status"
            aria-live="polite"
          >
            <Icon
              className={cn(
                'h-5 w-5 shrink-0',
                toast.type === 'error' && 'text-danger',
                toast.type === 'success' && 'text-success',
                toast.type === 'info' && 'text-primary'
              )}
            />
            <p className="flex-1 text-sm font-medium text-text-primary">{toast.message}</p>
            <button
              onClick={() => onClose(toast.id)}
              className="shrink-0 rounded-full p-1.5 text-text-tertiary transition-colors hover:bg-surface-2 hover:text-text-secondary"
              aria-label="Tutup notifikasi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
