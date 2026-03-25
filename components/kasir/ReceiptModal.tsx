'use client';

import { CheckCircle2, PlusCircle, Printer } from 'lucide-react';
import { Order } from '@/lib/types';
import { formatDateTime, formatOrderNumber, formatRupiah } from '@/lib/utils';

interface ReceiptModalProps {
  order: Order | null;
  open: boolean;
  onNewOrder: () => void;
}

export default function ReceiptModal({ order, open, onNewOrder }: ReceiptModalProps) {
  if (!open || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="backdrop" />

      {/* Full screen modal */}
      <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 md:p-8">
        <div className="animate-scaleIn card relative flex h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-b-none sm:h-full sm:max-h-[95vh] sm:rounded-b-[var(--radius-lg)] md:h-auto md:max-h-[90vh] md:rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Pembayaran Berhasil!</h3>
                <p className="text-sm text-text-secondary">Order {formatOrderNumber(order.order_number)}</p>
              </div>
            </div>
          </div>

          {/* Receipt content - scrollable */}
          <div className="flex-1 overflow-y-auto bg-surface-2 p-4 md:p-6">
            {/* Printable receipt area */}
            <div className="receipt-print mx-auto max-w-sm bg-white font-mono text-sm">
              {/* Receipt header */}
              <div className="border-b-2 border-dashed border-gray-300 pb-3 text-center">
                <p className="text-lg font-bold">FAMILY BAKSO</p>
                <p className="mt-1 text-xs text-gray-500">================================</p>
              </div>

              {/* Order info */}
              <div className="border-b border-dashed border-gray-300 py-3 text-xs">
                <div className="flex justify-between">
                  <span>No. Order</span>
                  <span className="font-bold">{formatOrderNumber(order.order_number)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal</span>
                  <span>{formatDateTime(order.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir</span>
                  <span>Naeee</span>
                </div>
              </div>

              {/* Items */}
              <div className="border-b border-dashed border-gray-300 py-3">
                <p className="mb-2 text-xs text-gray-500">--------------------------------</p>
                {order.items.map((item, index) => (
                  <div key={`${item.menu_id}-${index}`} className="mb-2">
                    <div className="flex justify-between text-xs">
                      <span className="flex-1">
                        {item.name}
                        {item.add_ons.length > 0 && (
                          <span className="text-gray-500"> +{item.add_ons.map(a => a.label).join(', ')}</span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">
                        {item.quantity} x {formatRupiah(item.unit_price)}
                      </span>
                      <span className="font-medium">{formatRupiah(item.subtotal)}</span>
                    </div>
                  </div>
                ))}
                <p className="mt-2 text-xs text-gray-500">--------------------------------</p>
              </div>

              {/* Totals */}
              <div className="border-b border-dashed border-gray-300 py-3 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatRupiah(order.subtotal)}</span>
                </div>
                <div className="mt-2 flex justify-between text-sm font-bold">
                  <span>TOTAL</span>
                  <span>{formatRupiah(order.total)}</span>
                </div>
              </div>

              {/* Payment info */}
              <div className="border-b border-dashed border-gray-300 py-3 text-xs">
                <div className="flex justify-between">
                  <span>Metode Bayar</span>
                  <span className="font-medium uppercase">{order.payment_method}</span>
                </div>
                {order.cash_received && (
                  <div className="flex justify-between">
                    <span>Tunai</span>
                    <span>{formatRupiah(order.cash_received)}</span>
                  </div>
                )}
                {order.change_amount && order.change_amount > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>Kembali</span>
                    <span>{formatRupiah(order.change_amount)}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="py-4 text-center text-xs">
                <p className="font-medium">Terima Kasih</p>
                <p className="text-gray-500">Selamat Menikmati!</p>
                <p className="mt-3 text-[10px] text-gray-400">================================</p>
                <p className="mt-1 text-[10px] text-gray-400">Powered by DekatLokal</p>
              </div>
            </div>
          </div>

          {/* Footer - sticky */}
          <div className="safe-bottom border-t border-border p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <button
                type="button"
                className="btn-secondary flex flex-1 items-center justify-center gap-2 py-4"
                onClick={handlePrint}
              >
                <Printer className="h-5 w-5" />
                Cetak
              </button>
              <button
                type="button"
                className="btn-primary flex flex-1 items-center justify-center gap-2 py-4"
                onClick={onNewOrder}
              >
                <PlusCircle className="h-5 w-5" />
                Pesanan Baru
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print-only styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-print,
          .receipt-print * {
            visibility: visible;
          }
          .receipt-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 10px;
          }
        }
      `}</style>
    </>
  );
}
