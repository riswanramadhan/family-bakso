'use client';

import { useEffect } from 'react';

export default function OfflineBootstrap() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  return null;
}
