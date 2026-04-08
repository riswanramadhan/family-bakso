'use client';

import { ShoppingBag, CreditCard, StickyNote, User } from 'lucide-react';
import OrderItem from '@/components/kasir/OrderItem';
import { CartItem } from '@/lib/types';
import { formatRupiah } from '@/lib/utils';

interface OrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  customerName: string;
  orderNotes: string;
  onCustomerNameChange: (name: string) => void;
  onOrderNotesChange: (notes: string) => void;
  onIncrease: (id: string, quantity: number) => void;
  onDecrease: (id: string, quantity: number) => void;
  onDelete: (id: string) => void;
  onItemNotesChange: (id: string, notes: string) => void;
  onOpenPayment: () => void;
}

export default function OrderSummary({
  items,
  subtotal,
  customerName,
  orderNotes,
  onCustomerNameChange,
  onOrderNotesChange,
  onIncrease,
  onDecrease,
  onDelete,
  onItemNotesChange,
  onOpenPayment,
}: OrderSummaryProps) {
  const isEmpty = items.length === 0;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section className="card flex h-full flex-col p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Pesanan</h2>
        </div>
        {!isEmpty && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-white">
            {itemCount}
          </span>
        )}
      </div>

      {/* Items list */}
      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
        {isEmpty ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border">
            <ShoppingBag className="h-10 w-10 text-text-quaternary" />
            <p className="mt-2 text-sm font-medium text-text-tertiary">Keranjang kosong</p>
            <p className="text-xs text-text-quaternary">Pilih menu untuk memulai pesanan</p>
          </div>
        ) : (
          items.map((item) => (
            <OrderItem
              key={item.id}
              item={item}
              onIncrease={() => onIncrease(item.id, item.quantity + 1)}
              onDecrease={() => onDecrease(item.id, item.quantity - 1)}
              onDelete={() => onDelete(item.id)}
              onNotesChange={(notes) => onItemNotesChange(item.id, notes)}
            />
          ))
        )}
      </div>

      {/* Order notes and summary - sticky at bottom */}
      <div className="mt-4 space-y-4 border-t border-border pt-4">
        {/* Customer name */}
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
          <label className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-primary" htmlFor="customer-name-input">
            <User className="h-4 w-4" />
            Nama Customer
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
              disarankan
            </span>
          </label>
          <input
            id="customer-name-input"
            type="text"
            value={customerName}
            onChange={(event) => onCustomerNameChange(event.target.value)}
            placeholder="Contoh: Riswan Kece"
            aria-label="Nama customer"
            className="h-11 border-primary/25 bg-white text-sm font-medium"
          />
          <p className="mt-2 text-xs text-text-secondary">Isi nama customer agar tim dapur lebih mudah saat memanggil pesanan jadi.</p>
        </div>

        {/* Order notes */}
        <div className="relative">
          <StickyNote className="absolute left-3 top-3 h-4 w-4 text-text-tertiary" />
          <textarea
            rows={2}
            value={orderNotes}
            onChange={(event) => onOrderNotesChange(event.target.value)}
            placeholder="Catatan umum pesanan..."
            aria-label="Catatan pesanan"
            className="pl-10 text-sm"
          />
        </div>

        {/* Summary */}
        <div className="card space-y-2 bg-surface-2 p-4">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Subtotal</span>
            <span className="tabular-nums font-semibold">{formatRupiah(subtotal)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-lg font-bold">
            <span>Total</span>
            <span className="tabular-nums text-primary">{formatRupiah(subtotal)}</span>
          </div>
        </div>

        {/* Payment button */}
        <button
          type="button"
          className="btn-primary flex w-full items-center justify-center gap-2"
          disabled={isEmpty}
          onClick={onOpenPayment}
          aria-label="Proses pembayaran"
        >
          <CreditCard className="h-5 w-5" />
          Proses Pembayaran
        </button>
      </div>
    </section>
  );
}
