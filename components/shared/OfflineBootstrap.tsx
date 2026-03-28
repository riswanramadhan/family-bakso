'use client';

import { useEffect } from 'react';
import { getPendingSyncCount, isAutoSyncEnabled, isLikelyOnline, isPaymentInProgress, syncQueuedOrders } from '@/lib/offline-orders';

export default function OfflineBootstrap() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').then((registration) => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        void registration.update();
      }).catch(() => undefined);
    }

    const BASE_RETRY_MS = 5000;
    const MAX_RETRY_MS = 120000;
    const STABLE_ONLINE_MS = 10000;

    let onlineSince = isLikelyOnline() ? Date.now() : 0;
    let retryDelay = BASE_RETRY_MS;
    let nextAttemptAt = 0;
    let syncing = false;

    const syncIfEligible = async () => {
      if (syncing) return;
      if (!isAutoSyncEnabled()) return;
      if (!isLikelyOnline()) return;
      if (isPaymentInProgress()) return;
      if (getPendingSyncCount() === 0) return;

      const now = Date.now();
      if (onlineSince <= 0 || now - onlineSince < STABLE_ONLINE_MS) return;
      if (now < nextAttemptAt) return;

      syncing = true;
      const result = await syncQueuedOrders();
      syncing = false;

      if (result.failed > 0) {
        nextAttemptAt = Date.now() + retryDelay;
        retryDelay = Math.min(retryDelay * 2, MAX_RETRY_MS);
        return;
      }

      retryDelay = BASE_RETRY_MS;
      nextAttemptAt = 0;
    };

    const onOnline = () => {
      onlineSince = Date.now();
      void syncIfEligible();
    };

    const onOffline = () => {
      onlineSince = 0;
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const timer = window.setInterval(() => {
      void syncIfEligible();
    }, 3000);

    void syncIfEligible();

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
