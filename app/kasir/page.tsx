'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/shared/Header';
import Toast from '@/components/shared/Toast';
import MenuGrid from '@/components/kasir/MenuGrid';
import OrderSummary from '@/components/kasir/OrderSummary';
import PaymentModal from '@/components/kasir/PaymentModal';
import ReceiptModal from '@/components/kasir/ReceiptModal';
import MotivationalPopup from '@/components/kasir/MotivationalPopup';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  createOfflineOrder,
  getTodayLocalOrderCount,
  isLikelyOnline,
  setLocalOrderPayment,
  setPaymentInProgress,
  upsertLocalOrder,
} from '@/lib/offline-orders';
import { Order, Toast as ToastType } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { useOrderStore } from '@/store/orderStore';

const MOTIVATION_MESSAGES = [
  'Kamu hebat! Setiap pesanan yang kamu layani membawa kebahagiaan bagi pelanggan kita.',
  'Senyummu adalah hadiah terbaik untuk pelanggan hari ini. Terus semangat!',
  'Kamu adalah bintang di warung kita! Terima kasih sudah bekerja dengan sangat baik.',
  'Setiap transaksi yang berhasil adalah bukti kerja kerasmu. Kamu luar biasa!',
  'Terima kasih sudah menjadi bagian penting dari tim Family Bakso hari ini.',
  'Energi positifmu bikin suasana kasir makin nyaman. Lanjutkan!'
];

export default function KasirPage() {
  const {
    cartItems,
    customerName,
    orderNotes,
    addItem,
    removeItem,
    updateQuantity,
    updateItemNotes,
    setCustomerName,
    setOrderNotes,
    clearCart,
    getSubtotal,
    getMenuCount,
  } = useOrderStore();

  const [selectedCategory, setSelectedCategory] = useState<'all' | 'main' | 'drinks'>('all');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'create' | 'edit'>('create');
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [todayOrderCount, setTodayOrderCount] = useState(0);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [showMotivation, setShowMotivation] = useState(false);
  const [motivationMessage, setMotivationMessage] = useState(MOTIVATION_MESSAGES[0]);
  const [isOnline, setIsOnline] = useState(isLikelyOnline);

  const subtotal = getSubtotal();
  const paymentTotal = paymentMode === 'edit' && currentOrder ? currentOrder.total : subtotal;

  const pushToast = (message: string, type: ToastType['type']) => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);
  };

  const fetchTodayCount = async () => {
    if (!isSupabaseConfigured || !isLikelyOnline()) {
      setTodayOrderCount(getTodayLocalOrderCount());
      return;
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', start.toISOString());

    if (!error) {
      setTodayOrderCount(count ?? 0);
      return;
    }

    setTodayOrderCount(getTodayLocalOrderCount());
  };

  useEffect(() => {
    setPaymentInProgress(loadingPayment);
    return () => {
      setPaymentInProgress(false);
    };
  }, [loadingPayment]);

  useEffect(() => {
    const onConnectivityChange = async () => {
      const nextOnline = isLikelyOnline();
      setIsOnline(nextOnline);
      await fetchTodayCount();
    };

    window.addEventListener('online', onConnectivityChange);
    window.addEventListener('offline', onConnectivityChange);

    const timer = window.setTimeout(() => {
      void fetchTodayCount();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('online', onConnectivityChange);
      window.removeEventListener('offline', onConnectivityChange);
    };
  }, []);

  const openCreatePayment = () => {
    setPaymentMode('create');
    setPaymentOpen(true);
  };

  const openEditPayment = () => {
    if (!currentOrder) return;
    setPaymentMode('edit');
    setReceiptOpen(false);
    setPaymentOpen(true);
  };

  const handleClosePayment = () => {
    setPaymentOpen(false);
    if (paymentMode === 'edit' && currentOrder) {
      setReceiptOpen(true);
    }
    setPaymentMode('create');
  };

  const handleCreatePayment = async (paymentMethod: 'tunai' | 'qris', cashReceived?: number) => {
    if (cartItems.length === 0) {
      pushToast('Pesanan masih kosong', 'error');
      return;
    }

    if (paymentMethod === 'tunai' && (cashReceived ?? 0) < subtotal) {
      pushToast('Uang diterima kurang dari total', 'error');
      return;
    }

    setLoadingPayment(true);

    const payload = {
      items: cartItems.map((item) => ({
        menu_id: item.menuId,
        name: item.name,
        image: item.image,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.subtotal,
        notes: item.notes || '',
        add_ons: item.addOns || [],
      })),
      subtotal,
      total: subtotal,
      payment_method: paymentMethod,
      cash_received: paymentMethod === 'tunai' ? (cashReceived ?? 0) : undefined,
      change_amount: paymentMethod === 'tunai' ? Math.max(0, (cashReceived ?? 0) - subtotal) : undefined,
      customer_name: customerName.trim() || undefined,
      notes: orderNotes || undefined,
      status: 'pending' as const,
    };

    const fallbackOffline = () => {
      const offlineOrder = createOfflineOrder(payload);
      setCurrentOrder(offlineOrder);
      setPaymentOpen(false);
      setPaymentMode('create');
      setReceiptOpen(true);
      setTodayOrderCount((prev) => prev + 1);
      pushToast('Tersimpan offline. Akan auto-sync saat koneksi stabil (jika Auto Sync aktif).', 'info');
      setLoadingPayment(false);
    };

    if (!isSupabaseConfigured || !isOnline) {
      fallbackOffline();
      return;
    }

    try {
      const { data, error } = await supabase.from('orders').insert(payload).select('*').single();

      if (error) {
        console.error('Supabase error, fallback to offline queue:', error);
        fallbackOffline();
        return;
      }

      if (!data) {
        fallbackOffline();
        return;
      }

      upsertLocalOrder(data as Order);
      setCurrentOrder(data as Order);
      setPaymentOpen(false);
      setPaymentMode('create');
      setReceiptOpen(true);
      setTodayOrderCount((prev) => prev + 1);
      pushToast('Pembayaran berhasil!', 'success');
      setLoadingPayment(false);
    } catch (err) {
      console.error('Unexpected error, fallback to offline queue:', err);
      fallbackOffline();
    }
  };

  const handleEditPayment = async (paymentMethod: 'tunai' | 'qris', cashReceived?: number) => {
    if (!currentOrder) {
      pushToast('Order tidak ditemukan untuk diedit', 'error');
      return;
    }

    if (paymentMethod === 'tunai' && (cashReceived ?? 0) < currentOrder.total) {
      pushToast('Uang diterima kurang dari total order', 'error');
      return;
    }

    setLoadingPayment(true);

    const nextCash = paymentMethod === 'tunai' ? (cashReceived ?? 0) : null;
    const nextChange = paymentMethod === 'tunai' ? Math.max(0, (cashReceived ?? 0) - currentOrder.total) : null;

    const fallbackOffline = () => {
      const localUpdated = setLocalOrderPayment(currentOrder.id, {
        payment_method: paymentMethod,
        cash_received: nextCash,
        change_amount: nextChange,
      });

      if (localUpdated) {
        setCurrentOrder(localUpdated);
      } else {
        const forcedUpdated: Order = {
          ...currentOrder,
          payment_method: paymentMethod,
          cash_received: nextCash,
          change_amount: nextChange,
          updated_at: new Date().toISOString(),
        };
        upsertLocalOrder(forcedUpdated);
        const queuedUpdate = setLocalOrderPayment(forcedUpdated.id, {
          payment_method: paymentMethod,
          cash_received: nextCash,
          change_amount: nextChange,
        });
        setCurrentOrder(queuedUpdate ?? forcedUpdated);
      }

      setPaymentOpen(false);
      setPaymentMode('create');
      setReceiptOpen(true);
      pushToast('Perubahan pembayaran disimpan lokal. Akan auto-sync saat koneksi stabil (jika Auto Sync aktif).', 'info');
      setLoadingPayment(false);
    };

    if (!isSupabaseConfigured || !isOnline) {
      fallbackOffline();
      return;
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          payment_method: paymentMethod,
          cash_received: nextCash,
          change_amount: nextChange,
        })
        .eq('id', currentOrder.id)
        .select('*')
        .single();

      if (error || !data) {
        fallbackOffline();
        return;
      }

      const updated = data as Order;
      upsertLocalOrder(updated);
      setCurrentOrder(updated);
      setPaymentOpen(false);
      setPaymentMode('create');
      setReceiptOpen(true);
      pushToast('Pembayaran berhasil diperbarui', 'success');
      setLoadingPayment(false);
    } catch {
      fallbackOffline();
    }
  };

  const handleConfirmPayment = async (paymentMethod: 'tunai' | 'qris', cashReceived?: number) => {
    if (paymentMode === 'edit') {
      await handleEditPayment(paymentMethod, cashReceived);
      return;
    }

    await handleCreatePayment(paymentMethod, cashReceived);
  };

  const handleNewOrder = () => {
    clearCart();
    setCurrentOrder(null);
    setReceiptOpen(false);
    const nextIndex = Math.floor(Math.random() * MOTIVATION_MESSAGES.length);
    setMotivationMessage(MOTIVATION_MESSAGES[nextIndex]);
    // Show motivational popup after closing receipt
    setShowMotivation(true);
  };

  return (
    <div className="space-y-4">
      <Header title="Kasir" subtitle="Sistem Point of Sale" todayOrderCount={todayOrderCount} icon="cart" />

      {/* Offline/sync warning */}
      {(!isSupabaseConfigured || !isOnline) && (
        <div className="card border-warning/20 bg-warning/5 p-4">
          <p className="text-sm font-medium text-warning">
            {!isSupabaseConfigured
              ? 'Database cloud belum dikonfigurasi. Semua transaksi disimpan lokal di perangkat.'
              : 'Mode offline aktif. Transaksi disimpan lokal dan akan sinkron saat koneksi stabil (atau manual dari halaman Sinkronisasi).'}
          </p>
        </div>
      )}

      {/* Tablet-optimized grid layout */}
      <div className="grid gap-4 lg:grid-cols-5 xl:grid-cols-3">
        <div className="lg:col-span-3 xl:col-span-2">
          <MenuGrid
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onAdd={addItem}
            getMenuCount={getMenuCount}
            isLoading={false}
          />
        </div>

        <div className="lg:col-span-2 xl:col-span-1">
          <OrderSummary
            items={cartItems}
            subtotal={subtotal}
            customerName={customerName}
            orderNotes={orderNotes}
            onCustomerNameChange={setCustomerName}
            onOrderNotesChange={setOrderNotes}
            onIncrease={updateQuantity}
            onDecrease={updateQuantity}
            onDelete={removeItem}
            onItemNotesChange={updateItemNotes}
            onOpenPayment={openCreatePayment}
          />
        </div>
      </div>

      <PaymentModal
        open={paymentOpen}
        total={paymentTotal}
        loading={loadingPayment}
        title={paymentMode === 'edit' ? 'Edit Pembayaran' : 'Pembayaran'}
        confirmLabel={paymentMode === 'edit' ? 'Simpan Perubahan Pembayaran' : undefined}
        initialMethod={paymentMode === 'edit' ? currentOrder?.payment_method : undefined}
        initialCashReceived={paymentMode === 'edit' ? currentOrder?.cash_received : undefined}
        onClose={handleClosePayment}
        onConfirm={handleConfirmPayment}
      />

      <ReceiptModal
        order={currentOrder}
        open={receiptOpen}
        onEditPayment={openEditPayment}
        onNewOrder={handleNewOrder}
      />

      {/* Motivational popup for cashier */}
      <MotivationalPopup
        open={showMotivation}
        message={motivationMessage}
        onClose={() => setShowMotivation(false)}
      />

      <Toast toasts={toasts} onClose={(id) => setToasts((prev) => prev.filter((toast) => toast.id !== id))} />
    </div>
  );
}
