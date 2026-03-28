'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getLocalOrders, isLikelyOnline, mergeServerAndLocalOrders, removeLocalOrder, upsertLocalOrder } from '@/lib/offline-orders';
import { MenuItemSales, Order, OrderFilters, OrderStats } from '@/lib/types';
import { getDateRange, orderMatchesSearch, sortByCreatedAtDesc } from '@/lib/utils';

interface UseOrdersResult {
  orders: Order[];
  filteredOrders: Order[];
  stats: OrderStats;
  itemPerformance: MenuItemSales[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setFilters: (next: Partial<OrderFilters>) => void;
  filters: OrderFilters;
}

const defaultFilters: OrderFilters = {
  dateRange: 'today',
  status: 'all',
  search: '',
};

const NON_PERFORMANCE_STATUSES = new Set(['cancelled', 'rejected']);

export function useOrders(): UseOrdersResult {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(isLikelyOnline);
  const [filters, setFiltersState] = useState<OrderFilters>(defaultFilters);
  const hasLoadedOnceRef = useRef(false);

  const upsertListOrder = useCallback((rows: Order[], nextOrder: Order): Order[] => {
    const exists = rows.some((item) => item.id === nextOrder.id);
    if (!exists) {
      return sortByCreatedAtDesc([nextOrder, ...rows]);
    }
    return sortByCreatedAtDesc(rows.map((item) => (item.id === nextOrder.id ? nextOrder : item)));
  }, []);

  const fetchOrders = useCallback(async (options?: { silent?: boolean }) => {
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

    let start: Date;
    let end: Date;

    if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
      start = filters.startDate;
      end = filters.endDate;
    } else {
      const range = getDateRange(filters.dateRange === 'custom' ? 'today' : filters.dateRange);
      start = range.start;
      end = range.end;
    }

    const { data, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });

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
  }, [filters.dateRange, filters.endDate, filters.startDate, isOnline]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    const bootstrap = window.setTimeout(() => {
      void fetchOrders();
    }, 0);

    const handleWake = () => {
      if (document.visibilityState === 'visible') {
        void fetchOrders({ silent: true });
      }
    };

    window.addEventListener('focus', handleWake);
    window.addEventListener('pageshow', handleWake);
    document.addEventListener('visibilitychange', handleWake);

    const poller = window.setInterval(() => {
      if (document.visibilityState === 'visible' && isLikelyOnline()) {
        void fetchOrders({ silent: true });
      }
    }, 5000);

    return () => {
      window.clearTimeout(bootstrap);
      window.clearInterval(poller);
      window.removeEventListener('focus', handleWake);
      window.removeEventListener('pageshow', handleWake);
      document.removeEventListener('visibilitychange', handleWake);
    };
  }, [fetchOrders]);

  useEffect(() => {
    if (!isOnline) return;

    const channel = supabase
      .channel('orders-rekap-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        const nextOrder = payload.new as Order;

        if (payload.eventType === 'INSERT') {
          upsertLocalOrder(nextOrder);
          setOrders((prev) => upsertListOrder(prev, nextOrder));
          return;
        }

        if (payload.eventType === 'UPDATE') {
          upsertLocalOrder(nextOrder);
          setOrders((prev) => upsertListOrder(prev, nextOrder));
          return;
        }

        if (payload.eventType === 'DELETE') {
          const deleted = payload.old as Order;
          removeLocalOrder(deleted.id);
          setOrders((prev) => prev.filter((order) => order.id !== deleted.id));
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isOnline, upsertListOrder]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const statusMatch =
        filters.status === 'all'
          ? true
          : filters.status === 'rejected'
            ? order.status === 'rejected' || order.status === 'cancelled'
            : order.status === filters.status;

      return statusMatch && orderMatchesSearch(order, filters.search);
    });
  }, [filters.search, filters.status, orders]);

  const stats = useMemo<OrderStats>(() => {
    const totalOrders = filteredOrders.length;
    const performanceOrders = filteredOrders.filter((order) => !NON_PERFORMANCE_STATUSES.has(order.status));
    const totalRevenue = performanceOrders.reduce((sum, order) => sum + order.total, 0);
    const averageOrderValue = performanceOrders.length > 0 ? Math.round(totalRevenue / performanceOrders.length) : 0;

    const itemMap = new Map<string, { name: string; quantity: number }>();
    performanceOrders.forEach((order) => {
      order.items.forEach((item) => {
        const current = itemMap.get(item.menu_id);
        if (!current) {
          itemMap.set(item.menu_id, { name: item.name, quantity: item.quantity });
        } else {
          current.quantity += item.quantity;
        }
      });
    });

    let topSellingItem: { name: string; quantity: number } | null = null;
    itemMap.forEach((value) => {
      if (!topSellingItem || value.quantity > topSellingItem.quantity) {
        topSellingItem = value;
      }
    });

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      topSellingItem,
    };
  }, [filteredOrders]);

  const itemPerformance = useMemo<MenuItemSales[]>(() => {
    const map = new Map<string, MenuItemSales>();
    const performanceOrders = filteredOrders.filter((order) => !NON_PERFORMANCE_STATUSES.has(order.status));

    performanceOrders.forEach((order) => {
      order.items.forEach((item) => {
        const current = map.get(item.menu_id);
        if (!current) {
          map.set(item.menu_id, {
            menuId: item.menu_id,
            name: item.name,
            quantitySold: item.quantity,
            revenue: item.subtotal,
          });
        } else {
          current.quantitySold += item.quantity;
          current.revenue += item.subtotal;
        }
      });
    });

    return [...map.values()].sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 8);
  }, [filteredOrders]);

  const setFilters = useCallback((next: Partial<OrderFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...next }));
  }, []);

  return {
    orders,
    filteredOrders,
    stats,
    itemPerformance,
    isLoading,
    error,
    refetch: fetchOrders,
    filters,
    setFilters,
  };
}
