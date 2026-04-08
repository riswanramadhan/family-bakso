'use client';

import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Eye, FileCheck, Clock, Flame, CheckCircle2, XCircle, Banknote, Pencil, QrCode } from 'lucide-react';
import { Order } from '@/lib/types';
import { formatDateTime, formatOrderNumber, formatRupiah, cn } from '@/lib/utils';

type SortKey = 'order_number' | 'created_at' | 'total' | 'status';

interface OrderTableProps {
  orders: Order[];
  selectedOrder: Order | null;
  onSelectOrder: (order: Order) => void;
  onEditPayment: (order: Order) => void;
}

const PAGE_SIZE = 15;

const statusConfig = {
  pending: { label: 'Pending', Icon: Clock, color: 'text-warning bg-warning/10' },
  preparing: { label: 'Diproses', Icon: Flame, color: 'text-primary bg-primary/10' },
  done: { label: 'Selesai', Icon: CheckCircle2, color: 'text-success bg-success/10' },
  rejected: { label: 'Ditolak', Icon: XCircle, color: 'text-danger bg-danger/10' },
  cancelled: { label: 'Dibatalkan', Icon: XCircle, color: 'text-danger bg-danger/10' },
};

function SortIcon({ active, asc }: { active: boolean; asc: boolean }) {
  if (!active) return null;
  return asc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
}

export default function OrderTable({ orders, selectedOrder, onSelectOrder, onEditPayment }: OrderTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const list = [...orders];
    list.sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortKey === 'created_at') {
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      }
      if (sortKey === 'order_number') return (a.order_number - b.order_number) * dir;
      if (sortKey === 'total') return (a.total - b.total) * dir;
      return a.status.localeCompare(b.status) * dir;
    });
    return list;
  }, [orders, sortAsc, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortAsc((prev) => !prev);
      return;
    }
    setSortKey(nextKey);
    setSortAsc(false);
  };

  if (orders.length === 0) {
    return (
      <section className="card flex h-40 items-center justify-center">
        <p className="text-sm text-text-tertiary">Tidak ada pesanan dalam rentang waktu ini.</p>
      </section>
    );
  }

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-border px-4 py-3 text-xs text-text-tertiary">
        Pilih order untuk export PDF, atau gunakan tombol edit bayar jika customer ganti metode pembayaran.
      </div>

      <div className="grid gap-3 p-3 md:hidden">
        {pageRows.map((order) => {
          const status = statusConfig[order.status];
          const isExpanded = expandedId === order.id;
          return (
            <article key={order.id} className={cn('rounded-xl border border-border p-3', selectedOrder?.id === order.id && 'bg-primary/5')}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-primary">{formatOrderNumber(order.order_number)}</p>
                  <p className="text-xs text-text-secondary">{formatDateTime(order.created_at)}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Pelanggan: <span className="font-semibold text-text-primary">{order.customer_name?.trim() || '-'}</span>
                  </p>
                </div>
                <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium', status.color)}>
                  <status.Icon className="h-3 w-3" />
                  <span>{status.label}</span>
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-xs">
                <p className="line-clamp-2 text-text-secondary">{order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')}</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 font-medium uppercase text-text-secondary">
                    {order.payment_method === 'tunai' ? <Banknote className="h-3.5 w-3.5" /> : <QrCode className="h-3.5 w-3.5" />}
                    {order.payment_method}
                  </span>
                  <span className="tabular-nums text-sm font-semibold">{formatRupiah(order.total)}</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  className="flex items-center justify-center gap-1 rounded-lg bg-surface-2 px-3 py-2 text-xs font-semibold transition-colors hover:bg-border"
                  onClick={() => setExpandedId((prev) => (prev === order.id ? null : order.id))}
                >
                  <Eye className="h-3.5 w-3.5" />
                  {isExpanded ? 'Tutup' : 'Detail'}
                </button>
                <button
                  type="button"
                  className={cn(
                    'flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all',
                    selectedOrder?.id === order.id ? 'bg-primary text-white' : 'bg-primary/10 text-primary hover:bg-primary/20'
                  )}
                  onClick={() => onSelectOrder(order)}
                >
                  <FileCheck className="h-3.5 w-3.5" />
                  {selectedOrder?.id === order.id ? 'Terpilih' : 'Pilih'}
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-1 rounded-lg bg-warning/10 px-3 py-2 text-xs font-semibold text-warning transition-colors hover:bg-warning/20"
                  onClick={() => onEditPayment(order)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Bayar
                </button>
              </div>

              {isExpanded ? (
                <div className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs">
                  {order.items.map((item, index) => (
                    <div key={`${order.id}-mobile-item-${index}`} className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                        {item.quantity}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block font-medium break-words">{item.name}</span>
                        {item.add_ons.length > 0 ? (
                          <span className="block break-words text-text-secondary">+ {item.add_ons.map((a) => a.label).join(', ')}</span>
                        ) : null}
                        {item.notes ? <p className="break-words text-text-tertiary italic">Catatan: {item.notes}</p> : null}
                      </div>
                    </div>
                  ))}
                  {order.notes ? (
                    <div className="rounded-lg bg-warning/10 p-2 text-xs text-warning">
                      <span className="font-semibold">Catatan Pesanan:</span> {order.notes}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto overscroll-x-contain md:block">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="sticky top-0 bg-surface-2">
            <tr className="text-left text-xs uppercase tracking-wider text-text-secondary">
              <th className="whitespace-nowrap px-3 py-3 sm:px-4">
                <button type="button" className="flex items-center gap-1 font-semibold" onClick={() => toggleSort('order_number')}>
                  No. Order <SortIcon active={sortKey === 'order_number'} asc={sortAsc} />
                </button>
              </th>
              <th className="whitespace-nowrap px-3 py-3 sm:px-4">
                <button type="button" className="flex items-center gap-1 font-semibold" onClick={() => toggleSort('created_at')}>
                  Waktu <SortIcon active={sortKey === 'created_at'} asc={sortAsc} />
                </button>
              </th>
              <th className="px-3 py-3 font-semibold sm:px-4">Pelanggan</th>
              <th className="px-3 py-3 font-semibold sm:px-4">Items</th>
              <th className="px-3 py-3 font-semibold sm:px-4">Metode</th>
              <th className="whitespace-nowrap px-3 py-3 sm:px-4">
                <button type="button" className="flex items-center gap-1 font-semibold" onClick={() => toggleSort('total')}>
                  Total <SortIcon active={sortKey === 'total'} asc={sortAsc} />
                </button>
              </th>
              <th className="whitespace-nowrap px-3 py-3 sm:px-4">
                <button type="button" className="flex items-center gap-1 font-semibold" onClick={() => toggleSort('status')}>
                  Status <SortIcon active={sortKey === 'status'} asc={sortAsc} />
                </button>
              </th>
              <th className="px-3 py-3 font-semibold sm:px-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((order) => {
              const status = statusConfig[order.status];
              return (
                <Fragment key={order.id}>
                  <tr className={cn('border-t border-border transition-colors', selectedOrder?.id === order.id && 'bg-primary/5')}>
                    <td className="whitespace-nowrap px-3 py-3 text-xs font-bold text-primary sm:px-4 sm:text-sm">{formatOrderNumber(order.order_number)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-text-secondary sm:px-4 sm:text-sm">{formatDateTime(order.created_at)}</td>
                    <td className="px-3 py-3 text-xs sm:px-4 sm:text-sm">
                      <span className="line-clamp-1">{order.customer_name?.trim() || '-'}</span>
                    </td>
                    <td className="px-3 py-3 text-xs sm:px-4 sm:text-sm">
                      <div className="line-clamp-2">{order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')}</div>
                    </td>
                    <td className="px-3 py-3 text-xs sm:px-4 sm:text-sm">
                      <span className="inline-flex items-center gap-1 font-medium uppercase">
                        {order.payment_method === 'tunai' ? <Banknote className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <QrCode className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                        <span>{order.payment_method}</span>
                      </span>
                    </td>
                    <td className="tabular-nums whitespace-nowrap px-3 py-3 text-xs font-semibold sm:px-4 sm:text-sm">{formatRupiah(order.total)}</td>
                    <td className="px-3 py-3 text-xs sm:px-4 sm:text-sm">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium', status.color)}>
                        <status.Icon className="h-3 w-3" />
                        <span>{status.label}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          className="flex h-8 items-center justify-center gap-1 rounded-lg bg-surface-2 px-3 text-xs font-semibold transition-colors hover:bg-border"
                          onClick={() => setExpandedId((prev) => (prev === order.id ? null : order.id))}
                        >
                          <Eye className="h-3 w-3" />
                          Detail
                        </button>
                        <button
                          type="button"
                          className={cn(
                            'flex h-8 items-center justify-center gap-1 rounded-lg px-3 text-xs font-semibold transition-all',
                            selectedOrder?.id === order.id ? 'bg-primary text-white' : 'bg-primary/10 text-primary hover:bg-primary/20'
                          )}
                          onClick={() => onSelectOrder(order)}
                        >
                          <FileCheck className="h-3 w-3" />
                          Pilih
                        </button>
                        <button
                          type="button"
                          className="flex h-8 items-center justify-center gap-1 rounded-lg bg-warning/10 px-3 text-xs font-semibold text-warning transition-colors hover:bg-warning/20"
                          onClick={() => onEditPayment(order)}
                        >
                          <Pencil className="h-3 w-3" />
                          Edit Bayar
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === order.id ? (
                    <tr className="border-t border-border bg-surface-2/50">
                      <td className="px-3 py-3 sm:px-4" colSpan={8}>
                        <div className="space-y-1.5 text-xs sm:text-sm">
                          {order.items.map((item, index) => (
                            <div key={`${order.id}-desktop-item-${index}`} className="flex items-start gap-2">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                                {item.quantity}
                              </span>
                              <div className="min-w-0 flex-1">
                                <span className="block break-words font-medium">{item.name}</span>
                                {item.add_ons.length > 0 ? (
                                  <span className="block break-words text-text-secondary">+ {item.add_ons.map((a) => a.label).join(', ')}</span>
                                ) : null}
                                {item.notes ? <p className="break-words text-xs text-text-tertiary italic">Catatan: {item.notes}</p> : null}
                              </div>
                            </div>
                          ))}
                          {order.notes ? (
                            <div className="mt-2 rounded-lg bg-warning/10 p-2 text-xs text-warning break-words">
                              <span className="font-semibold">Catatan Pesanan:</span> {order.notes}
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-3 border-t border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <p className="text-xs sm:text-sm text-text-secondary">
          Halaman <span className="font-semibold text-text-primary">{currentPage}</span> dari{' '}
          <span className="font-semibold text-text-primary">{totalPages}</span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 sm:flex-initial flex h-8 sm:h-9 items-center justify-center gap-1 rounded-lg bg-surface-2 px-2 sm:px-3 text-xs sm:text-sm font-medium transition-colors hover:bg-border disabled:opacity-50"
            onClick={() => setPage((prev) => Math.max(1, Math.min(prev, totalPages) - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4 hidden sm:block" />
            <span className="sm:hidden">←</span>
            <span className="hidden sm:inline">Sebelumnya</span>
          </button>
          <button
            type="button"
            className="flex-1 sm:flex-initial flex h-8 sm:h-9 items-center justify-center gap-1 rounded-lg bg-surface-2 px-2 sm:px-3 text-xs sm:text-sm font-medium transition-colors hover:bg-border disabled:opacity-50"
            onClick={() => setPage((prev) => Math.min(totalPages, Math.min(prev, totalPages) + 1))}
            disabled={currentPage >= totalPages}
          >
            <span className="hidden sm:inline">Berikutnya</span>
            <span className="sm:hidden">→</span>
            <ChevronRight className="h-4 w-4 hidden sm:block" />
          </button>
        </div>
      </div>
    </section>
  );
}
