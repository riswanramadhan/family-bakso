'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CloudOff, RefreshCw, Server } from 'lucide-react';
import Header from '@/components/shared/Header';
import Toast from '@/components/shared/Toast';
import {
  SyncConflict,
  clearAllSyncConflicts,
  getSyncConflicts,
  getSyncQueueSummary,
  isLikelyOnline,
  syncQueuedOrders,
} from '@/lib/offline-orders';
import { Toast as ToastType } from '@/lib/types';
import { formatDateTime, generateId } from '@/lib/utils';

export default function SinkronisasiPage() {
  const [isOnline, setIsOnline] = useState(isLikelyOnline);
  const [syncing, setSyncing] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [applyingUpdate, setApplyingUpdate] = useState(false);
  const [hasAppUpdate, setHasAppUpdate] = useState(false);
  const [queueSummary, setQueueSummary] = useState(getSyncQueueSummary());
  const [conflicts, setConflicts] = useState<SyncConflict[]>(getSyncConflicts());
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const pushToast = useCallback((message: string, type: ToastType['type']) => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  const refreshState = useCallback(() => {
    setIsOnline(isLikelyOnline());
    setQueueSummary(getSyncQueueSummary());
    setConflicts(getSyncConflicts());
  }, []);

  useEffect(() => {
    const onConnectivity = () => refreshState();
    window.addEventListener('online', onConnectivity);
    window.addEventListener('offline', onConnectivity);

    const timer = window.setInterval(refreshState, 4000);

    return () => {
      window.removeEventListener('online', onConnectivity);
      window.removeEventListener('offline', onConnectivity);
      window.clearInterval(timer);
    };
  }, [refreshState]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onControllerChange = () => {
      pushToast('Update aplikasi aktif. Halaman dimuat ulang.', 'success');
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, [pushToast]);

  const summary = useMemo(() => {
    return [
      {
        label: 'Total antrean',
        value: queueSummary.total,
        icon: Server,
      },
      {
        label: 'Order baru',
        value: queueSummary.pendingCreates,
        icon: CheckCircle2,
      },
      {
        label: 'Update status',
        value: queueSummary.pendingStatusUpdates,
        icon: RefreshCw,
      },
      {
        label: 'Conflict',
        value: conflicts.length,
        icon: AlertTriangle,
      },
    ];
  }, [conflicts.length, queueSummary.pendingCreates, queueSummary.pendingStatusUpdates, queueSummary.total]);

  const handleManualSync = async () => {
    if (!isLikelyOnline()) {
      pushToast('Masih offline. Sambungkan internet dulu.', 'error');
      return;
    }

    setSyncing(true);
    const result = await syncQueuedOrders();
    setSyncing(false);
    refreshState();

    if (result.failed > 0) {
      pushToast(`Sinkron parsial: ${result.synced} berhasil, ${result.failed} masih antre.`, 'info');
      return;
    }

    if (result.conflicts > 0) {
      pushToast(`Sinkron selesai, ada ${result.conflicts} conflict yang perlu ditinjau.`, 'info');
      return;
    }

    pushToast(`Sinkronisasi selesai. ${result.synced} item berhasil.`, 'success');
  };

  const handleClearConflicts = () => {
    clearAllSyncConflicts();
    refreshState();
    pushToast('Daftar conflict dibersihkan.', 'success');
  };

  const handleCheckAppUpdate = async () => {
    if (!('serviceWorker' in navigator)) {
      pushToast('Browser ini tidak mendukung service worker.', 'error');
      return;
    }

    setCheckingUpdate(true);
    const registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      setCheckingUpdate(false);
      pushToast('Service worker belum terdaftar.', 'error');
      return;
    }

    await registration.update();
    await new Promise((resolve) => window.setTimeout(resolve, 800));

    if (registration.waiting) {
      setHasAppUpdate(true);
      pushToast('Update aplikasi tersedia. Tekan Terapkan Update.', 'info');
    } else {
      setHasAppUpdate(false);
      pushToast('Aplikasi sudah versi terbaru.', 'success');
    }

    setCheckingUpdate(false);
  };

  const handleApplyAppUpdate = async () => {
    if (!('serviceWorker' in navigator)) return;

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.waiting) {
      setHasAppUpdate(false);
      pushToast('Belum ada update yang siap diterapkan.', 'info');
      return;
    }

    setApplyingUpdate(true);
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    window.setTimeout(() => {
      setApplyingUpdate(false);
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <Header title="Sinkronisasi" subtitle="Manual sync dan kontrol update aplikasi" icon="chart" />

      <section className="card space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-text-secondary">Status Koneksi</p>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isOnline ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
            }`}
          >
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {summary.map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-surface-2 p-3">
              <div className="mb-2 flex items-center gap-2 text-text-secondary">
                <item.icon className="h-4 w-4" />
                <span className="text-xs font-semibold">{item.label}</span>
              </div>
              <p className="text-2xl font-bold tracking-tight">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => void handleManualSync()} disabled={syncing}>
            {syncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
          </button>
          <button type="button" className="btn-secondary" onClick={refreshState}>
            Muat Ulang Status
          </button>
        </div>
        <p className="text-xs text-text-tertiary">Sinkronisasi tidak otomatis. Data hanya dikirim saat tombol Sinkronkan ditekan.</p>
      </section>

      <section className="card space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-text-secondary">Conflict Resolution</p>
          <button type="button" className="btn-secondary" onClick={handleClearConflicts} disabled={conflicts.length === 0}>
            Bersihkan Conflict
          </button>
        </div>

        {conflicts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm text-text-tertiary">
            Belum ada conflict sinkronisasi.
          </div>
        ) : (
          <div className="space-y-2">
            {conflicts.slice(0, 10).map((conflict) => (
              <div key={conflict.id} className="rounded-xl border border-warning/30 bg-warning/5 p-3">
                <p className="text-sm font-semibold">Order {conflict.orderId}</p>
                <p className="text-xs text-text-secondary">
                  Lokal: {conflict.localStatus} ({formatDateTime(conflict.localUpdatedAt)})
                </p>
                <p className="text-xs text-text-secondary">
                  Server: {conflict.serverStatus} ({formatDateTime(conflict.serverUpdatedAt)})
                </p>
                <p className="mt-1 text-xs text-warning">
                  {conflict.reason === 'server_newer'
                    ? 'Server memiliki perubahan lebih baru. Status lokal tidak diterapkan.'
                    : 'Terjadi race update. Server dipertahankan untuk mencegah overwrite.'}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card space-y-3 p-4 sm:p-5">
        <p className="text-sm font-semibold text-text-secondary">Update Aplikasi (Service Worker)</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => void handleCheckAppUpdate()} disabled={checkingUpdate}>
            {checkingUpdate ? 'Mengecek...' : 'Cek Update Aplikasi'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void handleApplyAppUpdate()}
            disabled={!hasAppUpdate || applyingUpdate}
          >
            {applyingUpdate ? 'Menerapkan...' : 'Terapkan Update'}
          </button>
        </div>
        <div className="rounded-xl border border-border bg-surface-2 p-3 text-xs text-text-secondary">
          {hasAppUpdate
            ? 'Versi baru tersedia. Tekan Terapkan Update untuk memuat versi terbaru.'
            : 'Belum ada update siap terpasang. Gunakan tombol cek update secara manual.'}
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-border bg-bg p-3 text-xs text-text-tertiary">
          <CloudOff className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>
            Strategi cache menggunakan versi service worker. Update tidak dipaksa otomatis agar kasir tidak terganggu saat jam operasional.
          </p>
        </div>
      </section>

      <Toast toasts={toasts} onClose={(id) => setToasts((prev) => prev.filter((toast) => toast.id !== id))} />
    </div>
  );
}
