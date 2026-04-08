'use client';

import Image from 'next/image';
import { useMemo, useState, useEffect, useRef } from 'react';
import { Loader2, Banknote, QrCode, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { PaymentMethod } from '@/lib/types';
import { formatRupiah, getQuickAmounts } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface PaymentModalProps {
  open: boolean;
  total: number;
  loading: boolean;
  title?: string;
  confirmLabel?: string;
  initialMethod?: PaymentMethod;
  initialCashReceived?: number | null;
  onClose: () => void;
  onConfirm: (method: PaymentMethod, cashReceived?: number) => void;
}

// Format number with thousand separator
const formatNumber = (value: string): string => {
  if (!value) return '';
  const num = value.replace(/\D/g, '');
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Parse formatted number back to raw number
const parseNumber = (value: string): string => {
  return value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
};

export default function PaymentModal({
  open,
  total,
  loading,
  title = 'Pembayaran',
  confirmLabel,
  initialMethod,
  initialCashReceived,
  onClose,
  onConfirm,
}: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('tunai');
  const [cashInput, setCashInput] = useState<string>('');
  const [displayValue, setDisplayValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const nextMethod = initialMethod ?? 'tunai';
    setMethod(nextMethod);

    if (nextMethod === 'tunai') {
      const normalizedCash =
        typeof initialCashReceived === 'number' && Number.isFinite(initialCashReceived)
          ? Math.max(0, initialCashReceived)
          : 0;

      if (normalizedCash > 0) {
        const raw = `${normalizedCash}`;
        setCashInput(raw);
        setDisplayValue(formatNumber(raw));
      } else {
        setCashInput('');
        setDisplayValue('');
      }
      return;
    }

    setCashInput('');
    setDisplayValue('');
  }, [initialCashReceived, initialMethod, open]);

  useEffect(() => {
    if (open && method === 'tunai') {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [method, open]);

  const cashReceived = cashInput === '' ? 0 : Number.parseInt(cashInput, 10);
  const quickAmounts = useMemo(() => getQuickAmounts(total), [total]);
  const safeCashReceived = Number.isFinite(cashReceived) ? cashReceived : 0;
  const change = method === 'tunai' ? Math.max(0, safeCashReceived - total) : 0;
  const isInsufficientCash = method === 'tunai' && cashReceived < total && cashInput !== '';
  const isInvalidCash = method === 'tunai' && cashReceived < total;

  const handleCashInputChange = (value: string) => {
    const rawValue = parseNumber(value);
    setCashInput(rawValue);
    setDisplayValue(formatNumber(rawValue));
  };

  const handleQuickAmount = (amount: number) => {
    setCashInput(amount.toString());
    setDisplayValue(formatNumber(amount.toString()));
  };

  if (!open) return null;

  return (
    <>
      <div className="backdrop" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 md:p-6 lg:p-8">
        <div className="animate-scaleIn card relative flex h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-b-none sm:h-auto sm:max-h-[90vh] sm:rounded-b-[var(--radius-lg)] lg:max-w-3xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4 md:px-6">
            <h3 className="text-xl font-bold">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 transition-colors hover:bg-border"
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content - Grid layout untuk desktop */}
          <div className="flex-1 overflow-y-auto p-5 pb-4 md:p-6">
            <div className="grid gap-5 md:grid-cols-2 md:gap-6">
              {/* Left Column - Total & Method */}
              <div className="space-y-5">
                {/* Total */}
                <div className="card bg-gradient-to-br from-primary/5 to-primary/10 p-5 text-center">
                  <p className="text-sm font-medium text-text-secondary">Total Bayar</p>
                  <p className="tabular-nums mt-2 text-3xl font-extrabold tracking-tight text-primary md:text-4xl">
                    {formatRupiah(total)}
                  </p>
                </div>

                {/* Payment method selector */}
                <div>
                  <p className="mb-2 text-sm font-semibold text-text-secondary">Metode Pembayaran</p>
                  <div className="card p-1">
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setMethod('tunai')}
                        className={cn(
                          'flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 md:text-base',
                          method === 'tunai' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:bg-surface-2'
                        )}
                      >
                        <Banknote className="h-5 w-5" />
                        Tunai
                      </button>
                      <button
                        type="button"
                        onClick={() => setMethod('qris')}
                        className={cn(
                          'flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 md:text-base',
                          method === 'qris' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:bg-surface-2'
                        )}
                      >
                        <QrCode className="h-5 w-5" />
                        QRIS
                      </button>
                    </div>
                  </div>
                </div>

                {method === 'qris' && (
                  <div className="card flex min-h-[132px] items-center justify-center bg-surface-2 p-4">
                    <p className="text-center text-sm text-text-secondary">
                      Tekan tombol konfirmasi setelah pembayaran QRIS diterima.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column - Cash Input & Quick Amounts */}
              {method === 'tunai' && (
                <div className="space-y-4">
                  {/* Cash input - Clean design without Rp prefix */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-text-secondary" htmlFor="cash-input">
                      Uang Diterima
                    </label>
                    <div className="card overflow-hidden p-0">
                      <div className="flex items-center">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center border-r border-border bg-surface-2 text-base font-bold text-text-secondary md:h-16 md:w-16 md:text-lg">
                          Rp
                        </span>
                        <input
                          ref={inputRef}
                          id="cash-input"
                          type="text"
                          inputMode="numeric"
                          value={displayValue}
                          onChange={(e) => handleCashInputChange(e.target.value)}
                          placeholder="0"
                          className={cn(
                            'h-14 flex-1 border-0 bg-transparent px-4 text-2xl font-bold focus:shadow-none md:h-16 md:text-3xl',
                            isInsufficientCash && 'text-danger'
                          )}
                        />
                      </div>
                    </div>

                    {/* Insufficient warning */}
                    {isInsufficientCash && (
                      <div className="mt-2 flex items-center gap-2 text-danger animate-fadeIn">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium">Kurang {formatRupiah(total - cashReceived)}</span>
                      </div>
                    )}
                  </div>

                  {/* Quick amounts - Grid 2x2 for compact */}
                  <div>
                    <p className="mb-2 text-sm font-semibold text-text-secondary">Uang Pas</p>
                    <div className="grid grid-cols-2 gap-2">
                      {quickAmounts.slice(0, 4).map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          className={cn(
                            'rounded-xl px-3 py-3 text-sm font-semibold transition-all',
                            cashReceived === amount
                              ? 'bg-primary text-white shadow-md'
                              : 'bg-surface-2 text-text-secondary hover:bg-border active:scale-95'
                          )}
                          onClick={() => handleQuickAmount(amount)}
                        >
                          {formatRupiah(amount)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Change display */}
                  <div className={cn(
                    'card flex items-center justify-between p-4 transition-colors',
                    cashReceived >= total ? 'bg-success/10' : 'bg-surface-2'
                  )}>
                    <span className={cn(
                      'text-sm font-medium',
                      cashReceived >= total ? 'text-success' : 'text-text-secondary'
                    )}>
                      Kembalian
                    </span>
                    <span className={cn(
                      'tabular-nums min-w-0 whitespace-nowrap text-right text-xl font-bold md:text-2xl',
                      cashReceived >= total ? 'text-success' : 'text-text-tertiary'
                    )}>
                      {formatRupiah(change)}
                    </span>
                  </div>
                </div>
              )}

              {/* QRIS */}
              {method === 'qris' && (
                <div className="card overflow-hidden border border-primary/20 bg-primary/5 p-3">
                  <p className="mb-2 text-center text-sm font-semibold text-text-secondary">Scan QRIS Family Bakso</p>
                  <div className="mx-auto w-full max-w-[320px] rounded-xl bg-white p-2 shadow-sm">
                    <Image
                      src="/images/qris-family-bakso.jpg"
                      alt="QRIS Family Bakso"
                      width={320}
                      height={320}
                      unoptimized
                      sizes="(max-width: 768px) 80vw, 320px"
                      quality={88}
                      className="h-auto w-full rounded-lg object-contain"
                    />
                  </div>
                  <p className="mt-2 text-center text-xs text-text-secondary">
                    Pastikan QR terlihat penuh agar customer mudah scan.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="safe-bottom border-t border-border p-5 md:p-6">
            <button
              type="button"
              className="btn-primary flex w-full items-center justify-center gap-2 py-4 text-base md:text-lg"
              onClick={() => onConfirm(method, method === 'tunai' ? cashReceived : undefined)}
              disabled={loading || isInvalidCash}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              {confirmLabel ?? (method === 'qris' ? 'Konfirmasi Pembayaran' : 'Selesai & Cetak Struk')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
