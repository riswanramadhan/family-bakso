'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getLocalOrders, isLikelyOnline, mergeServerAndLocalOrders, removeLocalOrder, upsertLocalOrder } from '@/lib/offline-orders';
import { Order } from '@/lib/types';
import { initializeNotificationSound, playNotificationSound, sortByCreatedAtDesc } from '@/lib/utils';

interface UseRealtimeOrdersResult {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  retry: () => Promise<void>;
  updateLocalOrder: (order: Order) => void;
}

export function useRealtimeOrders(): UseRealtimeOrdersResult {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(isLikelyOnline);
  const hasMountedRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);

  const upsertListOrder = useCallback((rows: Order[], nextOrder: Order): Order[] => {
    const exists = rows.some((item) => item.id === nextOrder.id);
    if (!exists) {
      return sortByCreatedAtDesc([nextOrder, ...rows]);
    }
    return sortByCreatedAtDesc(rows.map((item) => (item.id === nextOrder.id ? nextOrder : item)));
  }, []);

  const fetchInitial = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? hasLoadedOnceRef.current;

    if (!silent) {
      setIsLoading(true);
      setError(null);
    }

    if (!isOnline) {
      setOrders(getLocalOrders());
      hasLoadedOnceRef.current = true;
      if (!silent) {
        setIsLoading(false);
      }
      return;
    }

    const { data, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (fetchError) {
      setOrders(getLocalOrders());
      setError('Koneksi cloud bermasalah, menampilkan data offline');
      hasLoadedOnceRef.current = true;
      if (!silent) {
        setIsLoading(false);
      }
      return;
    }

    const merged = mergeServerAndLocalOrders((data ?? []) as Order[]);
    setOrders(merged);
    merged.forEach((order) => upsertLocalOrder(order));
    hasLoadedOnceRef.current = true;
    if (!silent) {
      setIsLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
    };

    const onOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      void initializeNotificationSound();
    };

    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('pointerdown', unlockAudio, { passive: true });

    return () => {
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('pointerdown', unlockAudio);
    };
  }, []);

  useEffect(() => {
    const bootstrap = window.setTimeout(() => {
      void fetchInitial();
    }, 0);

    const handleWake = () => {
      if (document.visibilityState === 'visible') {
        void fetchInitial({ silent: true });
      }
    };

    window.addEventListener('focus', handleWake);
    window.addEventListener('pageshow', handleWake);
    document.addEventListener('visibilitychange', handleWake);

    const poller = window.setInterval(() => {
      if (document.visibilityState === 'visible' && isLikelyOnline()) {
        void fetchInitial({ silent: true });
      }
    }, 4000);

    return () => {
      window.clearTimeout(bootstrap);
      window.clearInterval(poller);
      window.removeEventListener('focus', handleWake);
      window.removeEventListener('pageshow', handleWake);
      document.removeEventListener('visibilitychange', handleWake);
    };
  }, [fetchInitial]);

  useEffect(() => {
    if (!isOnline) {
      hasMountedRef.current = true;
      return;
    }

    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        const nextOrder = payload.new as Order;
        if (payload.eventType === 'INSERT') {
          upsertLocalOrder(nextOrder);
          setOrders((prev) => upsertListOrder(prev, nextOrder));
          if (hasMountedRef.current) {
            playNotificationSound();
          }
        }

        if (payload.eventType === 'UPDATE') {
          upsertLocalOrder(nextOrder);
          setOrders((prev) => upsertListOrder(prev, nextOrder));
        }

        if (payload.eventType === 'DELETE') {
          const deleted = payload.old as Order;
          removeLocalOrder(deleted.id);
          setOrders((prev) => prev.filter((order) => order.id !== deleted.id));
        }
      })
      .subscribe();

    hasMountedRef.current = true;

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isOnline, upsertListOrder]);

  const updateLocalOrder = useCallback((updatedOrder: Order) => {
    upsertLocalOrder(updatedOrder);
    setOrders((prev) => prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
  }, []);

  return {
    orders,
    isLoading,
    error,
    retry: fetchInitial,
    updateLocalOrder,
  };
}
