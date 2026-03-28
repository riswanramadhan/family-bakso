'use client';

import { useEffect, useState } from 'react';
import { getPendingSyncCount } from '@/lib/offline-orders';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const update = () => {
      setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
      setPendingCount(getPendingSyncCount());
    };

    update();

    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    const timer = window.setInterval(update, 5000);

    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      window.clearInterval(timer);
    };
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <div className="fixed right-4 top-4 z-50 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning backdrop-blur">
        Offline lokal aktif (DB cloud belum diatur)
      </div>
    );
  }

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-50 rounded-full border border-border bg-surface/95 px-3 py-1 text-xs font-semibold text-text-secondary shadow-sm backdrop-blur">
      {isOnline ? `Online | Menunggu sinkron: ${pendingCount}` : `Offline | Menunggu sinkron: ${pendingCount}`}
    </div>
  );
}
