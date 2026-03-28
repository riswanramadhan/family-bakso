'use client';

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { CreateOrderPayload, Order, OrderStatus } from '@/lib/types';
import { sortByCreatedAtDesc } from '@/lib/utils';

const LOCAL_ORDERS_KEY = 'fb_pos_orders';
const SYNC_QUEUE_KEY = 'fb_pos_sync_queue';
const SYNC_CONFLICTS_KEY = 'fb_pos_sync_conflicts';
const AUTO_SYNC_ENABLED_KEY = 'fb_pos_auto_sync_enabled';
const PAYMENT_IN_PROGRESS_KEY = 'fb_pos_payment_in_progress';

interface QueueCreateItem {
  id: string;
  type: 'create';
  localOrderId: string;
  payload: CreateOrderPayload & { status: OrderStatus };
}

interface QueueStatusItem {
  id: string;
  type: 'status';
  orderId: string;
  status: OrderStatus;
  localUpdatedAt: string;
}

type QueueItem = QueueCreateItem | QueueStatusItem;

export interface SyncConflict {
  id: string;
  orderId: string;
  localStatus: OrderStatus;
  serverStatus: OrderStatus;
  localUpdatedAt: string;
  serverUpdatedAt: string;
  reason: 'server_newer' | 'update_race';
  createdAt: string;
}

export interface SyncQueueSummary {
  total: number;
  pendingCreates: number;
  pendingStatusUpdates: number;
}

export interface SyncResult {
  synced: number;
  failed: number;
  conflicts: number;
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveOrders(orders: Order[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(sortByCreatedAtDesc(orders)));
}

function getQueue(): QueueItem[] {
  if (!canUseStorage()) return [];
  return parseJson<QueueItem[]>(window.localStorage.getItem(SYNC_QUEUE_KEY), []);
}

function saveQueue(queue: QueueItem[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

function queueItem(item: QueueItem): void {
  const queue = getQueue();

  if (item.type === 'status') {
    const compacted = queue.filter((existing) => !(existing.type === 'status' && existing.orderId === item.orderId));
    saveQueue([...compacted, item]);
    return;
  }

  saveQueue([...queue, item]);
}

function getConflicts(): SyncConflict[] {
  if (!canUseStorage()) return [];
  return parseJson<SyncConflict[]>(window.localStorage.getItem(SYNC_CONFLICTS_KEY), []);
}

function saveConflicts(conflicts: SyncConflict[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(SYNC_CONFLICTS_KEY, JSON.stringify(conflicts));
}

function addConflict(next: Omit<SyncConflict, 'id' | 'createdAt'>): void {
  const item: SyncConflict = {
    id: `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
    ...next,
  };

  const current = getConflicts();
  saveConflicts([item, ...current].slice(0, 100));
}

function nextOrderNumber(orders: Order[]): number {
  return orders.reduce((max, order) => Math.max(max, order.order_number || 0), 0) + 1;
}

function makeQueueId(): string {
  return `queue-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isLikelyOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export function getLocalOrders(): Order[] {
  if (!canUseStorage()) return [];
  const rows = parseJson<Order[]>(window.localStorage.getItem(LOCAL_ORDERS_KEY), []);
  return sortByCreatedAtDesc(rows);
}

export function upsertLocalOrder(order: Order): void {
  const orders = getLocalOrders();
  const idx = orders.findIndex((item) => item.id === order.id);

  if (idx === -1) {
    saveOrders([order, ...orders]);
    return;
  }

  const next = [...orders];
  next[idx] = order;
  saveOrders(next);
}

export function removeLocalOrder(orderId: string): void {
  const orders = getLocalOrders().filter((order) => order.id !== orderId);
  saveOrders(orders);
}

export function createOfflineOrder(payload: CreateOrderPayload & { status: OrderStatus }): Order {
  const orders = getLocalOrders();
  const nowIso = new Date().toISOString();

  const offlineOrder: Order = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    order_number: nextOrderNumber(orders),
    items: payload.items,
    subtotal: payload.subtotal,
    total: payload.total,
    payment_method: payload.payment_method,
    cash_received: payload.cash_received ?? null,
    change_amount: payload.change_amount ?? null,
    status: payload.status,
    notes: payload.notes ?? null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  saveOrders([offlineOrder, ...orders]);
  queueItem({
    id: makeQueueId(),
    type: 'create',
    localOrderId: offlineOrder.id,
    payload,
  });

  return offlineOrder;
}

export function setLocalOrderStatus(orderId: string, status: OrderStatus): Order | null {
  const orders = getLocalOrders();
  const target = orders.find((order) => order.id === orderId);
  if (!target) return null;

  const updated: Order = {
    ...target,
    status,
    updated_at: new Date().toISOString(),
  };

  saveOrders(orders.map((order) => (order.id === orderId ? updated : order)));

  queueItem({
    id: makeQueueId(),
    type: 'status',
    orderId,
    status,
    localUpdatedAt: updated.updated_at,
  });

  return updated;
}

export function getTodayLocalOrderCount(): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  return getLocalOrders().filter((order) => new Date(order.created_at).getTime() >= start.getTime()).length;
}

export function mergeServerAndLocalOrders(serverOrders: Order[]): Order[] {
  const localOrders = getLocalOrders();
  const serverMap = new Map(serverOrders.map((order) => [order.id, order]));

  localOrders.forEach((order) => {
    if (order.id.startsWith('local-') || !serverMap.has(order.id)) {
      serverMap.set(order.id, order);
    }
  });

  return sortByCreatedAtDesc([...serverMap.values()]);
}

export async function syncQueuedOrders(): Promise<SyncResult> {
  if (!isSupabaseConfigured || !isLikelyOnline()) {
    return { synced: 0, failed: getQueue().length, conflicts: 0 };
  }

  const queue = getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0, conflicts: 0 };

  const nextQueue: QueueItem[] = [];
  const idMap = new Map<string, string>();
  let synced = 0;
  let conflicts = 0;

  for (const item of queue) {
    if (item.type === 'create') {
      const { data, error } = await supabase.from('orders').insert(item.payload).select('*').single();

      if (error || !data) {
        nextQueue.push(item);
        continue;
      }

      const serverOrder = data as Order;
      idMap.set(item.localOrderId, serverOrder.id);
      removeLocalOrder(item.localOrderId);
      upsertLocalOrder(serverOrder);
      synced += 1;
      continue;
    }

    const mappedId = idMap.get(item.orderId);
    const targetId = mappedId ?? item.orderId;
    const cameFromLocalCreate = Boolean(mappedId);
    const { data: serverOrder, error: readError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', targetId)
      .single();

    if (readError || !serverOrder) {
      nextQueue.push({ ...item, orderId: targetId });
      continue;
    }

    const localTime = new Date(item.localUpdatedAt).getTime();
    const serverTime = new Date(serverOrder.updated_at).getTime();

    if (
      !cameFromLocalCreate &&
      Number.isFinite(localTime) &&
      Number.isFinite(serverTime) &&
      serverTime > localTime &&
      serverOrder.status !== item.status
    ) {
      addConflict({
        orderId: targetId,
        localStatus: item.status,
        serverStatus: serverOrder.status,
        localUpdatedAt: item.localUpdatedAt,
        serverUpdatedAt: serverOrder.updated_at,
        reason: 'server_newer',
      });
      upsertLocalOrder(serverOrder as Order);
      conflicts += 1;
      continue;
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ status: item.status })
      .eq('id', targetId)
      .eq('updated_at', serverOrder.updated_at)
      .select('*')
      .single();

    if (error || !data) {
      const { data: latest } = await supabase
        .from('orders')
        .select('*')
        .eq('id', targetId)
        .single();

      if (latest && latest.status !== item.status) {
        addConflict({
          orderId: targetId,
          localStatus: item.status,
          serverStatus: latest.status,
          localUpdatedAt: item.localUpdatedAt,
          serverUpdatedAt: latest.updated_at,
          reason: 'update_race',
        });
        upsertLocalOrder(latest as Order);
        conflicts += 1;
        continue;
      }

      nextQueue.push({ ...item, orderId: targetId });
      continue;
    }

    upsertLocalOrder(data as Order);
    synced += 1;
  }

  saveQueue(nextQueue);
  return { synced, failed: nextQueue.length, conflicts };
}

export function getPendingSyncCount(): number {
  return getQueue().length;
}

export function getSyncQueueSummary(): SyncQueueSummary {
  const queue = getQueue();
  return {
    total: queue.length,
    pendingCreates: queue.filter((item) => item.type === 'create').length,
    pendingStatusUpdates: queue.filter((item) => item.type === 'status').length,
  };
}

export function getSyncConflicts(): SyncConflict[] {
  return getConflicts();
}

export function clearAllSyncConflicts(): void {
  saveConflicts([]);
}

export function isAutoSyncEnabled(): boolean {
  if (!canUseStorage()) return true;
  const raw = window.localStorage.getItem(AUTO_SYNC_ENABLED_KEY);
  if (raw == null) return true;
  return raw === '1';
}

export function setAutoSyncEnabled(enabled: boolean): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(AUTO_SYNC_ENABLED_KEY, enabled ? '1' : '0');
}

export function isPaymentInProgress(): boolean {
  if (!canUseStorage()) return false;
  return window.localStorage.getItem(PAYMENT_IN_PROGRESS_KEY) === '1';
}

export function setPaymentInProgress(active: boolean): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(PAYMENT_IN_PROGRESS_KEY, active ? '1' : '0');
}
