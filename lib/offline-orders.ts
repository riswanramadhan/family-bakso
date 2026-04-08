'use client';

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { CreateOrderPayload, Order, OrderStatus, PaymentMethod } from '@/lib/types';
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

interface QueuePaymentItem {
  id: string;
  type: 'payment';
  orderId: string;
  payment_method: PaymentMethod;
  cash_received: number | null;
  change_amount: number | null;
  localUpdatedAt: string;
}

type QueueItem = QueueCreateItem | QueueStatusItem | QueuePaymentItem;

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
  pendingPaymentUpdates: number;
}

export interface SyncResult {
  synced: number;
  failed: number;
  conflicts: number;
}

export interface CloudPullResult {
  ok: boolean;
  pulled: number;
  queueKept: number;
}

const TRANSIENT_MISSING_GRACE_MS = 90_000;

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

  if (item.type === 'payment') {
    const compacted = queue.filter((existing) => !(existing.type === 'payment' && existing.orderId === item.orderId));
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
    customer_name: payload.customer_name ?? null,
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

export function setLocalOrderPayment(
  orderId: string,
  payment: {
    payment_method: PaymentMethod;
    cash_received: number | null;
    change_amount: number | null;
  }
): Order | null {
  const orders = getLocalOrders();
  const target = orders.find((order) => order.id === orderId);
  if (!target) return null;

  const updated: Order = {
    ...target,
    payment_method: payment.payment_method,
    cash_received: payment.cash_received,
    change_amount: payment.change_amount,
    updated_at: new Date().toISOString(),
  };

  saveOrders(orders.map((order) => (order.id === orderId ? updated : order)));

  queueItem({
    id: makeQueueId(),
    type: 'payment',
    orderId,
    payment_method: updated.payment_method,
    cash_received: updated.cash_received,
    change_amount: updated.change_amount,
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
  const now = Date.now();
  const queue = getQueue();
  const pendingLocalCreateIds = new Set(
    queue
      .filter((item): item is QueueCreateItem => item.type === 'create')
      .map((item) => item.localOrderId)
  );
  const pendingStatusIds = new Set(
    queue
      .filter((item): item is QueueStatusItem => item.type === 'status')
      .map((item) => item.orderId)
  );
  const pendingPaymentIds = new Set(
    queue
      .filter((item): item is QueuePaymentItem => item.type === 'payment')
      .map((item) => item.orderId)
  );
  const serverMap = new Map(serverOrders.map((order) => [order.id, order]));

  localOrders.forEach((order) => {
    const isPendingLocalCreate = order.id.startsWith('local-') && pendingLocalCreateIds.has(order.id);
    const isPendingStatusOnly = !order.id.startsWith('local-') && pendingStatusIds.has(order.id);
    const isPendingPaymentOnly = !order.id.startsWith('local-') && pendingPaymentIds.has(order.id);
    const isMissingInServer = !serverMap.has(order.id);
    const createdAtMs = new Date(order.created_at).getTime();
    const updatedAtMs = new Date(order.updated_at).getTime();
    const hasRecentTimestamp =
      (Number.isFinite(createdAtMs) && now - createdAtMs <= TRANSIENT_MISSING_GRACE_MS) ||
      (Number.isFinite(updatedAtMs) && now - updatedAtMs <= TRANSIENT_MISSING_GRACE_MS);

    // Keep very recent pending/preparing local rows temporarily if they are not in server snapshot yet.
    const isTransientRecentMissing =
      isMissingInServer &&
      hasRecentTimestamp &&
      (order.status === 'pending' || order.status === 'preparing');

    if (isPendingLocalCreate || (isMissingInServer && (isPendingStatusOnly || isPendingPaymentOnly)) || isTransientRecentMissing) {
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

    if (item.type === 'payment') {
      const mappedId = idMap.get(item.orderId);
      const targetId = mappedId ?? item.orderId;

      const { data, error } = await supabase
        .from('orders')
        .update({
          payment_method: item.payment_method,
          cash_received: item.cash_received,
          change_amount: item.change_amount,
        })
        .eq('id', targetId)
        .select('*')
        .single();

      if (error || !data) {
        nextQueue.push({ ...item, orderId: targetId });
        continue;
      }

      upsertLocalOrder(data as Order);
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
    pendingPaymentUpdates: queue.filter((item) => item.type === 'payment').length,
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

export function clearLocalOrdersState(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(LOCAL_ORDERS_KEY);
  window.localStorage.removeItem(SYNC_QUEUE_KEY);
  window.localStorage.removeItem(SYNC_CONFLICTS_KEY);
  window.localStorage.removeItem(PAYMENT_IN_PROGRESS_KEY);
}

export async function pullLatestFromCloudToLocal(): Promise<CloudPullResult> {
  if (!isSupabaseConfigured || !isLikelyOnline()) {
    return { ok: false, pulled: 0, queueKept: getQueue().length };
  }

  const queue = getQueue();
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error || !data) {
    return { ok: false, pulled: 0, queueKept: queue.length };
  }

  saveOrders((data ?? []) as Order[]);

  // Keep only unsynced queue and conflict markers; local rows are now cloud snapshot.
  saveQueue(queue);
  return { ok: true, pulled: data.length, queueKept: queue.length };
}
