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
  const hasMountedRef = useRef(false);

  const fetchInitial = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (!isLikelyOnline()) {
      setOrders(getLocalOrders());
      setIsLoading(false);
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
      setIsLoading(false);
      return;
    }

    const merged = mergeServerAndLocalOrders((data ?? []) as Order[]);
    setOrders(merged);
    merged.forEach((order) => upsertLocalOrder(order));
    setIsLoading(false);
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
    const timer = window.setTimeout(() => {
      void fetchInitial();
    }, 0);

    if (!isLikelyOnline()) {
      hasMountedRef.current = true;
      return () => {
        window.clearTimeout(timer);
      };
    }

    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        const nextOrder = payload.new as Order;
        if (payload.eventType === 'INSERT') {
          upsertLocalOrder(nextOrder);
          setOrders((prev) => sortByCreatedAtDesc([nextOrder, ...prev]));
          if (hasMountedRef.current) {
            playNotificationSound();
          }
        }

        if (payload.eventType === 'UPDATE') {
          upsertLocalOrder(nextOrder);
          setOrders((prev) => prev.map((order) => (order.id === nextOrder.id ? nextOrder : order)));
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
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [fetchInitial]);

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
