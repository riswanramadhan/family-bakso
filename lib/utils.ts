import { Order, OrderItem } from './types';

/**
 * Format number as Indonesian Rupiah
 * @param amount - Amount in IDR (full rupiah, not cents)
 * @returns Formatted string like "Rp 35.000"
 */
export function formatRupiah(amount: number | string | null | undefined): string {
  const numericAmount =
    typeof amount === 'string'
      ? Number(amount.replace(/[^\d.-]/g, ''))
      : Number(amount);

  const safeAmount = Number.isFinite(numericAmount) ? Math.round(numericAmount) : 0;
  return `Rp ${safeAmount.toLocaleString('id-ID')}`;
}

/**
 * Format date in Indonesian format
 * @param date - Date string or Date object
 * @returns Formatted date like "25 Mar 2026"
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format time in HH:mm format
 * @param date - Date string or Date object
 * @returns Formatted time like "14:23"
 */
export function formatTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format date and time together
 * @param date - Date string or Date object
 * @returns Formatted datetime like "25 Mar 2026, 14:23"
 */
export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)}, ${formatTime(date)}`;
}

/**
 * Get relative time string
 * @param date - Date string or Date object
 * @returns Relative time like "5 menit lalu"
 */
export function getRelativeTime(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return formatDate(date);
}

/**
 * Format order number with padding
 * @param num - Order number
 * @returns Formatted order number like "#001"
 */
export function formatOrderNumber(num: number): string {
  return `#${num.toString().padStart(3, '0')}`;
}

/**
 * Generate unique ID
 * @returns Unique string ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Get smart quick amount suggestions for cash payment
 * @param total - Total amount
 * @returns Array of suggested amounts
 */
export function getQuickAmounts(total: number): number[] {
  const amounts: number[] = [total];
  const roundingTargets = [5000, 10000, 20000, 50000, 100000];

  roundingTargets.forEach((target) => {
    const rounded = Math.ceil(total / target) * target;
    if (rounded > total && !amounts.includes(rounded)) {
      amounts.push(rounded);
    }
  });

  return amounts.sort((a, b) => a - b).slice(0, 5);
}

/**
 * Calculate order totals
 * @param items - Array of order items
 * @returns Object with subtotal and total
 */
export function calculateOrderTotals(items: { subtotal: number }[]): { subtotal: number; total: number } {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  return { subtotal, total: subtotal }; // No tax for now
}

/**
 * Get start of day in local timezone
 * @param date - Date to get start of
 * @returns Date at start of day
 */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day in local timezone
 * @param date - Date to get end of
 * @returns Date at end of day
 */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get date range based on filter
 * @param range - Date range type
 * @returns Start and end dates
 */
export function getDateRange(range: 'today' | '7days' | '30days'): { start: Date; end: Date } {
  const now = new Date();
  const end = endOfDay(now);
  let start: Date;

  switch (range) {
    case 'today':
      start = startOfDay(now);
      break;
    case '7days':
      start = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
      break;
    case '30days':
      start = startOfDay(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));
      break;
    default:
      start = startOfDay(now);
  }

  return { start, end };
}

export function sortByCreatedAtDesc<T extends { created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function orderMatchesSearch(order: Order, search?: string): boolean {
  if (!search) return true;
  const keyword = search.toLowerCase().trim();
  if (!keyword) return true;

  const inNumber = `${order.order_number}`.includes(keyword);
  const inItems = order.items.some((item) => item.name.toLowerCase().includes(keyword));
  const inCustomer = (order.customer_name ?? '').toLowerCase().includes(keyword);
  const inMethod = order.payment_method.toLowerCase().includes(keyword);
  const inStatus = order.status.toLowerCase().includes(keyword);
  return inNumber || inItems || inCustomer || inMethod || inStatus;
}

export function asPercentage(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Generate receipt HTML for printing
 */
export function generateReceiptHTML(order: Order): string {
  const itemsHtml = order.items
    .map(
      (item: OrderItem) => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span>${item.quantity}x ${item.name}</span>
        <span>${formatRupiah(item.subtotal)}</span>
      </div>
      ${
        item.add_ons.length > 0
          ? `<div style="font-size: 12px; color: #666; margin-left: 16px;">${item.add_ons.map((a) => `+ ${a.label}`).join(', ')}</div>`
          : ''
      }
      ${item.notes ? `<div style="font-size: 12px; color: #666; margin-left: 16px; font-style: italic;">Catatan: ${item.notes}</div>` : ''}
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Struk ${formatOrderNumber(order.order_number)}</title>
      <style>
        body {
          font-family: -apple-system, 'SF Pro Display', Inter, sans-serif;
          max-width: 300px;
          margin: 0 auto;
          padding: 20px;
          font-size: 14px;
        }
        .header {
          text-align: center;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px dashed #ccc;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
        }
        .items {
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px dashed #ccc;
        }
        .total {
          font-weight: bold;
          font-size: 18px;
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .payment-info {
          margin-top: 8px;
          font-size: 13px;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 12px;
          color: #666;
        }
        .copyright {
          margin-top: 16px;
          font-size: 10px;
          color: #999;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">🍜 FAMILY BAKSO</div>
        <div style="margin-top: 4px; font-size: 12px; color: #666;">Jl. Makanan Enak No. 123</div>
        <div style="margin-top: 8px;">
          <strong>Order ${formatOrderNumber(order.order_number)}</strong>
        </div>
        <div style="font-size: 12px; color: #666;">${formatDateTime(order.created_at)}</div>
        <div style="font-size: 12px; color: #666; margin-top: 2px;">Pelanggan: ${order.customer_name?.trim() || '-'}</div>
      </div>

      <div class="items">
        ${itemsHtml}
      </div>

      <div class="total">
        <span>Total</span>
        <span>${formatRupiah(order.total)}</span>
      </div>

      <div class="payment-info">
        <div>Metode: ${order.payment_method === 'tunai' ? 'Tunai' : 'QRIS'}</div>
        ${order.cash_received ? `<div>Tunai: ${formatRupiah(order.cash_received)}</div>` : ''}
        ${order.change_amount ? `<div>Kembalian: ${formatRupiah(order.change_amount)}</div>` : ''}
      </div>

      ${order.notes ? `<div style="margin-top: 12px; font-size: 12px; font-style: italic;">Catatan: ${order.notes}</div>` : ''}

      <div class="footer">
        Terima kasih! Selamat menikmati 🍜
      </div>

      <div class="copyright">
        © 2026 POS Family Bakso. All Rights Reserved | Powered by DekatLokal
      </div>
    </body>
    </html>
  `;
}

/**
 * Reusable AudioContext for iOS-friendly notification playback.
 */
let cachedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (cachedAudioContext) return cachedAudioContext;

  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!Ctor) return null;
    cachedAudioContext = new Ctor();
    return cachedAudioContext;
  } catch {
    return null;
  }
}

/**
 * Unlock audio on first user interaction (needed by iOS Safari/PWA).
 */
export async function initializeNotificationSound(): Promise<void> {
  const audioContext = getAudioContext();
  if (!audioContext) return;

  try {
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
  } catch {
    // Ignore unlock failures; notification playback will retry later.
  }
}

/**
 * Play compact iOS-style chime for incoming kitchen orders.
 */
export function playNotificationSound(): void {
  const audioContext = getAudioContext();
  if (!audioContext) return;

  try {
    const now = audioContext.currentTime;
    const notes = [880, 1175];

    notes.forEach((frequency, idx) => {
      const startAt = now + idx * 0.09;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, startAt);

      gainNode.gain.setValueAtTime(0.0001, startAt);
      gainNode.gain.exponentialRampToValueAtTime(0.12, startAt + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.12);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(startAt);
      oscillator.stop(startAt + 0.125);
    });
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Class names utility
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
