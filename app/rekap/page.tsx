'use client';

import { useCallback, useMemo, useState } from 'react';
import { Calendar, Search, TrendingUp, Clock, Flame, CheckCircle2, XCircle, LayoutGrid } from 'lucide-react';
import Header from '@/components/shared/Header';
import ExportBar from '@/components/rekap/ExportBar';
import OrderTable from '@/components/rekap/OrderTable';
import SummaryStats from '@/components/rekap/SummaryStats';
import Toast from '@/components/shared/Toast';
import PaymentModal from '@/components/kasir/PaymentModal';
import { useOrders } from '@/hooks/useOrders';
import { isLikelyOnline, setLocalOrderPayment, upsertLocalOrder } from '@/lib/offline-orders';
import { supabase } from '@/lib/supabase';
import { Order, Toast as ToastType } from '@/lib/types';
import { asPercentage, formatDateInput, cn, formatOrderNumber, generateId } from '@/lib/utils';

const dateRangeOptions = [
  { key: 'today', label: 'Hari Ini' },
  { key: '7days', label: '7 Hari' },
  { key: '30days', label: '30 Hari' },
  { key: 'custom', label: 'Custom' },
];

const statusOptions = [
  { id: 'all', label: 'Semua', Icon: LayoutGrid },
  { id: 'pending', label: 'Pending', Icon: Clock },
  { id: 'preparing', label: 'Diproses', Icon: Flame },
  { id: 'done', label: 'Selesai', Icon: CheckCircle2 },
  { id: 'rejected', label: 'Ditolak', Icon: XCircle },
  { id: 'cancelled', label: 'Dibatalkan', Icon: XCircle },
];

export default function RekapPage() {
  const { filteredOrders, stats, itemPerformance, isLoading, error, refetch, filters, setFilters } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const maxQty = useMemo(() => Math.max(1, ...itemPerformance.map((item) => item.quantitySold)), [itemPerformance]);

  const pushToast = useCallback((message: string, type: ToastType['type']) => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  const handleEditPayment = useCallback((order: Order) => {
    setEditingOrder(order);
  }, []);

  const handleConfirmEditPayment = useCallback(async (paymentMethod: 'tunai' | 'qris', cashReceived?: number) => {
    if (!editingOrder) return;

    if (paymentMethod === 'tunai' && (cashReceived ?? 0) < editingOrder.total) {
      pushToast('Uang tunai kurang dari total order', 'error');
      return;
    }

    setUpdatingPayment(true);

    const nextCash = paymentMethod === 'tunai' ? (cashReceived ?? 0) : null;
    const nextChange = paymentMethod === 'tunai' ? Math.max(0, (cashReceived ?? 0) - editingOrder.total) : null;

    const fallbackOffline = async () => {
      const localUpdated = setLocalOrderPayment(editingOrder.id, {
        payment_method: paymentMethod,
        cash_received: nextCash,
        change_amount: nextChange,
      });

      if (localUpdated) {
        if (selectedOrder?.id === localUpdated.id) {
          setSelectedOrder(localUpdated);
        }
        setEditingOrder(null);
        await refetch();
        pushToast('Pembayaran diperbarui offline dan akan tersinkron saat koneksi stabil.', 'info');
      } else {
        pushToast('Order tidak ditemukan saat update pembayaran.', 'error');
      }

      setUpdatingPayment(false);
    };

    if (!isLikelyOnline()) {
      await fallbackOffline();
      return;
    }

    const { data, error: updateError } = await supabase
      .from('orders')
      .update({
        payment_method: paymentMethod,
        cash_received: nextCash,
        change_amount: nextChange,
      })
      .eq('id', editingOrder.id)
      .select('*')
      .single();

    if (updateError || !data) {
      await fallbackOffline();
      return;
    }

    const updated = data as Order;
    upsertLocalOrder(updated);
    if (selectedOrder?.id === updated.id) {
      setSelectedOrder(updated);
    }
    setEditingOrder(null);
    await refetch();
    pushToast(`Pembayaran ${formatOrderNumber(updated.order_number)} berhasil diperbarui.`, 'success');
    setUpdatingPayment(false);
  }, [editingOrder, pushToast, refetch, selectedOrder?.id]);

  return (
    <div className="space-y-4 md:space-y-5">
      <Header title="Rekap" subtitle="Ringkasan performa dan export data" icon="chart" />

      {/* Filters */}
      <section className="card space-y-4 p-4 sm:p-5">
        {/* Date range filter */}
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-secondary">
            <Calendar className="h-4 w-4" />
            Rentang Waktu
          </p>
          <div className="card p-1">
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
              {dateRangeOptions.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilters({ dateRange: item.key as typeof filters.dateRange })}
                  className={cn(
                    'rounded-xl px-2 py-2 text-xs font-semibold transition-all duration-200 sm:px-4 sm:text-sm',
                    filters.dateRange === item.key
                      ? 'bg-primary text-white shadow-md'
                      : 'text-text-secondary hover:bg-surface-2'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom date range */}
        {filters.dateRange === 'custom' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">Dari</label>
              <input
                type="date"
                value={filters.startDate ? formatDateInput(filters.startDate) : ''}
                onChange={(event) =>
                  setFilters({ startDate: event.target.value ? new Date(event.target.value) : undefined })
                }
                aria-label="Tanggal mulai"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">Sampai</label>
              <input
                type="date"
                value={filters.endDate ? formatDateInput(filters.endDate) : ''}
                onChange={(event) =>
                  setFilters({ endDate: event.target.value ? new Date(event.target.value) : undefined })
                }
                aria-label="Tanggal akhir"
              />
            </div>
          </div>
        ) : null}

        {/* Search and status filter */}
        <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
          <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-white px-3">
            <Search className="h-4 w-4 shrink-0 text-text-tertiary" />
            <input
              type="text"
              value={filters.search}
              onChange={(event) => setFilters({ search: event.target.value })}
              placeholder="Cari nomor order, customer, menu, metode..."
              aria-label="Cari order"
              className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm focus:shadow-none"
            />
          </div>

          <div className="-mx-1 overflow-x-auto pb-1 lg:mx-0 lg:overflow-visible lg:pb-0">
            <div className="flex min-w-max gap-1.5 px-1 lg:min-w-0 lg:flex-wrap lg:px-0">
              {statusOptions.map((status) => (
                <button
                  key={status.id}
                  type="button"
                  className={cn(
                    'flex items-center gap-1 rounded-full px-2.5 py-2 text-xs font-semibold whitespace-nowrap transition-all',
                    filters.status === status.id
                      ? 'bg-primary text-white'
                      : 'bg-surface-2 text-text-secondary hover:bg-border'
                  )}
                  onClick={() => setFilters({ status: status.id as typeof filters.status })}
                >
                  <status.Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{status.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      {isLoading ? <div className="skeleton h-32 rounded-2xl" /> : <SummaryStats stats={stats} />}

      {/* Error */}
      {error ? (
        <div className="card flex items-center justify-between p-4">
          <p className="text-sm text-danger">{error}</p>
          <button type="button" className="btn-secondary" onClick={() => void refetch()}>
            Coba Lagi
          </button>
        </div>
      ) : null}

      {/* Export */}
      <ExportBar orders={filteredOrders} stats={stats} itemPerformance={itemPerformance} selectedOrder={selectedOrder} />

      {/* Orders table */}
      <OrderTable
        orders={filteredOrders}
        selectedOrder={selectedOrder}
        onSelectOrder={setSelectedOrder}
        onEditPayment={handleEditPayment}
      />

      <PaymentModal
        open={Boolean(editingOrder)}
        total={editingOrder?.total ?? 0}
        loading={updatingPayment}
        title={editingOrder ? `Edit Pembayaran ${formatOrderNumber(editingOrder.order_number)}` : 'Edit Pembayaran'}
        confirmLabel="Simpan Perubahan Pembayaran"
        initialMethod={editingOrder?.payment_method}
        initialCashReceived={editingOrder?.cash_received}
        onClose={() => setEditingOrder(null)}
        onConfirm={handleConfirmEditPayment}
      />

      {/* Item Performance */}
      <section className="card space-y-4 p-4 sm:p-5">
        <div className="flex items-center gap-2 min-w-0">
          <TrendingUp className="h-5 w-5 flex-shrink-0 text-primary" />
          <h2 className="text-base font-bold truncate">Item Performance</h2>
        </div>
        <div className="space-y-4">
          {itemPerformance.length === 0 ? (
            <div className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-border">
              <p className="text-xs sm:text-sm text-text-tertiary">Belum ada data item untuk rentang ini.</p>
            </div>
          ) : (
            itemPerformance.map((item, index) => (
              <div key={item.menuId} className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={cn(
                      'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      index === 0 ? 'bg-warning/10 text-warning' : 'bg-surface-2 text-text-tertiary'
                    )}>
                      {index + 1}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold truncate">{item.name}</span>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary flex-shrink-0 whitespace-nowrap">
                    {item.quantitySold} terjual
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-primary to-primary-light transition-all duration-500"
                    style={{ width: `${asPercentage(item.quantitySold, maxQty)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <Toast toasts={toasts} onClose={(id) => setToasts((prev) => prev.filter((toast) => toast.id !== id))} />
    </div>
  );
}
