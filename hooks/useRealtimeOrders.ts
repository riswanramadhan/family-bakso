'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Order } from '@/lib/types';
import { playNotificationSound, sortByCreatedAtDesc } from '@/lib/utils';

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

    const { data, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (fetchError) {
      setError('Koneksi bermasalah, coba lagi');
      setIsLoading(false);
      return;
    }

    setOrders((data ?? []) as Order[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchInitial();
    }, 0);

    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        const nextOrder = payload.new as Order;
        if (payload.eventType === 'INSERT') {
          setOrders((prev) => sortByCreatedAtDesc([nextOrder, ...prev]));
          if (hasMountedRef.current) {
            playNotificationSound();
          }
        }

        if (payload.eventType === 'UPDATE') {
          setOrders((prev) => prev.map((order) => (order.id === nextOrder.id ? nextOrder : order)));
        }

        if (payload.eventType === 'DELETE') {
          const deleted = payload.old as Order;
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
