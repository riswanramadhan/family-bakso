'use client';

import { useMemo, useState } from 'react';
import Header from '@/components/shared/Header';
import KitchenBoard from '@/components/dapur/KitchenBoard';
import Toast from '@/components/shared/Toast';
import IOSAlert from '@/components/shared/IOSAlert';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { supabase } from '@/lib/supabase';
import { Order, Toast as ToastType } from '@/lib/types';
import { generateId, formatOrderNumber } from '@/lib/utils';

export default function DapurPage() {
  const { orders, isLoading, error, retry, updateLocalOrder } = useRealtimeOrders();
  const [filter, setFilter] = useState<'all' | 'pending' | 'preparing' | 'done'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [cancelAlert, setCancelAlert] = useState<{ open: boolean; order: Order | null }>({
    open: false,
    order: null,
  });

  const pendingCount = useMemo(() => orders.filter((order) => order.status === 'pending').length, [orders]);
  const preparingCount = useMemo(() => orders.filter((order) => order.status === 'preparing').length, [orders]);

  const pushToast = (message: string, type: ToastType['type']) => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 2800);
  };

  const updateStatus = async (order: Order, nextStatus: 'preparing' | 'done' | 'cancelled') => {
    setUpdatingId(order.id);

    const optimistic = { ...order, status: nextStatus } as Order;
    updateLocalOrder(optimistic);

    const { data, error: updateError } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', order.id)
      .select('*')
      .single();

    setUpdatingId(null);

    if (updateError || !data) {
      pushToast('Koneksi bermasalah, coba lagi', 'error');
      updateLocalOrder(order);
      return;
    }

    updateLocalOrder(data as Order);

    if (nextStatus === 'cancelled') {
      pushToast(`Order ${formatOrderNumber(order.order_number)} dibatalkan`, 'info');
    }
  };

  const handleCancelRequest = (order: Order) => {
    setCancelAlert({ open: true, order });
  };

  const handleConfirmCancel = () => {
    if (cancelAlert.order) {
      void updateStatus(cancelAlert.order, 'cancelled');
    }
    setCancelAlert({ open: false, order: null });
  };

  const handleDismissCancel = () => {
    setCancelAlert({ open: false, order: null });
  };

  return (
    <div className="space-y-4">
      <Header
        title="Dapur"
        subtitle={`Antri: ${pendingCount} | Diproses: ${preparingCount}`}
        icon="chef"
      />

      {isLoading ? <div className="skeleton h-48 rounded-2xl" /> : null}

      {error ? (
        <div className="card flex items-center justify-between gap-3 p-4">
          <p className="text-sm text-danger">{error}</p>
          <button type="button" className="btn-secondary" onClick={() => void retry()}>
            Coba Lagi
          </button>
        </div>
      ) : null}

      {!isLoading && !error ? (
        <KitchenBoard
          orders={orders}
          filter={filter}
          setFilter={setFilter}
          updatingId={updatingId}
          onStart={(order) => void updateStatus(order, 'preparing')}
          onFinish={(order) => void updateStatus(order, 'done')}
          onCancel={handleCancelRequest}
        />
      ) : null}

      {/* iOS-style Cancel Confirmation Alert */}
      <IOSAlert
        open={cancelAlert.open}
        title="Batalkan Pesanan?"
        message={
          cancelAlert.order
            ? `Apakah Anda yakin ingin membatalkan Order ${formatOrderNumber(cancelAlert.order.order_number)}? Tindakan ini tidak dapat dibatalkan.`
            : ''
        }
        cancelText="Tidak"
        confirmText="Ya, Batalkan"
        confirmDanger
        onCancel={handleDismissCancel}
        onConfirm={handleConfirmCancel}
      />

      <Toast toasts={toasts} onClose={(id) => setToasts((prev) => prev.filter((toast) => toast.id !== id))} />
    </div>
  );
}
