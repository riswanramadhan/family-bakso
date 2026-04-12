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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toReceiptText(value: string | null | undefined, fallback = '-'): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export type ReceiptPaperWidthMm = 58 | 72 | 80;

/**
 * Generate receipt HTML for printing
 */
export function generateReceiptHTML(
  order: Order,
  paperWidthMm: ReceiptPaperWidthMm = 58,
  cashierName = 'Naeee',
  autoPrint = true
): string {
  const paperPaddingMm = paperWidthMm === 58 ? 1.6 : paperWidthMm === 72 ? 2.1 : 2.6;
  const baseFontPx = paperWidthMm === 58 ? 13 : paperWidthMm === 72 ? 13.5 : 14;
  const logoWidthMm = paperWidthMm === 58 ? 17 : paperWidthMm === 72 ? 21 : 24;
  const orderNumber = escapeHtml(formatOrderNumber(order.order_number));
  const createdAt = escapeHtml(formatDateTime(order.created_at));
  const customerName = escapeHtml(toReceiptText(order.customer_name));
  const cashier = escapeHtml(toReceiptText(cashierName));
  const paymentMethod = order.payment_method === 'tunai' ? 'Tunai' : 'QRIS';
  const orderNotes = toReceiptText(order.notes, '');

  const itemsHtml = order.items
    .map((item: OrderItem) => {
      const itemNotes = item.notes?.trim();
      const addOnText =
        item.add_ons.length > 0 ? escapeHtml(item.add_ons.map((a) => a.label).join(', ')) : '';

      return `
      <div class="item">
        <div class="row item-name-row">
          <span class="item-name">${escapeHtml(item.name)}</span>
          <span class="item-total">${escapeHtml(formatRupiah(item.subtotal))}</span>
        </div>
        <div class="row item-detail-row">
          <span>${item.quantity} x ${escapeHtml(formatRupiah(item.unit_price))}</span>
          <span></span>
        </div>
        ${addOnText ? `<div class="item-addon">+ ${addOnText}</div>` : ''}
        ${itemNotes ? `<div class="item-note">Catatan: ${escapeHtml(itemNotes)}</div>` : ''}
      </div>
    `;
    })
    .join('');

  const cashRowHtml =
    typeof order.cash_received === 'number'
      ? `<div class="row"><span>Tunai</span><span class="right">${escapeHtml(formatRupiah(order.cash_received))}</span></div>`
      : '';

  const changeRowHtml =
    typeof order.change_amount === 'number' && order.change_amount > 0
      ? `<div class="row"><span>Kembalian</span><span class="right">${escapeHtml(formatRupiah(order.change_amount))}</span></div>`
      : '';

  const noteRowHtml = orderNotes ? `<div class="item-note">Catatan: ${escapeHtml(orderNotes)}</div>` : '';

  const printScriptHtml = autoPrint
    ? `
      <script>
        (function () {
          var hasPrinted = false;

          function waitForReceiptAssets(onReady) {
            var isDone = false;
            function finish() {
              if (isDone) return;
              isDone = true;
              onReady();
            }

            var images = Array.prototype.slice.call(document.images || []);
            var pending = images.filter(function (img) {
              return !img.complete;
            });

            if (pending.length === 0) {
              finish();
              return;
            }

            var loaded = 0;
            function onAssetDone() {
              loaded += 1;
              if (loaded >= pending.length) {
                finish();
              }
            }

            pending.forEach(function (img) {
              img.addEventListener('load', onAssetDone, { once: true });
              img.addEventListener('error', onAssetDone, { once: true });
            });

            setTimeout(finish, 900);
          }

          function applyTightPageHeight() {
            var receipt = document.querySelector('.receipt');
            if (!receipt) return;

            var heightPx = Math.ceil(receipt.getBoundingClientRect().height);
            if (!heightPx) return;

            var quantizedHeightPx = Math.ceil(heightPx / 8) * 8;
            var pageHeightMm = Math.max(40, (quantizedHeightPx * 25.4) / 96 + 0.8);
            var dynamicPageStyle = document.createElement('style');
            dynamicPageStyle.setAttribute('data-dynamic-page-size', 'true');
            dynamicPageStyle.textContent = '@page { size: ${paperWidthMm}mm ' + pageHeightMm.toFixed(2) + 'mm; margin: 0; }';
            document.head.appendChild(dynamicPageStyle);
          }

          function triggerPrint() {
            if (hasPrinted) return;
            hasPrinted = true;
            window.focus();
            window.print();
          }

          function prepareAndPrint() {
            waitForReceiptAssets(function () {
              applyTightPageHeight();
              triggerPrint();
            });
          }

          if (document.readyState === 'complete') {
            setTimeout(prepareAndPrint, 120);
          } else {
            window.addEventListener(
              'load',
              function () {
                setTimeout(prepareAndPrint, 120);
              },
              { once: true }
            );
          }

          window.addEventListener('afterprint', function () {
            setTimeout(function () {
              window.close();
            }, 80);
          });
        })();
      </script>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="color-scheme" content="only light">
      <title>Struk ${orderNumber}</title>
      <style>
        :root {
          --paper-width: ${paperWidthMm}mm;
          --paper-padding: ${paperPaddingMm}mm;
        }

        @page {
          size: ${paperWidthMm}mm auto;
          margin: 0;
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          width: var(--paper-width);
          min-width: var(--paper-width);
          max-width: var(--paper-width);
          margin: 0;
          padding: 0;
          font-family: 'Courier New', Courier, monospace;
          font-size: ${baseFontPx}px;
          font-weight: 500;
          line-height: 1.35;
          color: #000;
          background: #fff;
          text-rendering: geometricPrecision;
          -webkit-text-size-adjust: 100%;
          -webkit-font-smoothing: antialiased;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
          overflow: hidden;
        }

        .receipt {
          width: 100%;
          margin: 0 auto;
          padding: 1.3mm var(--paper-padding) 1.2mm;
        }

        .section {
          border-bottom: 1px dashed #000;
          padding: 1.5mm 0;
        }

        .header {
          text-align: center;
          padding-bottom: 2mm;
        }

        .brand-logo {
          width: ${logoWidthMm}mm;
          height: auto;
          display: block;
          margin: 0 auto 1.2mm;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }

        .logo {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.2px;
        }

        .separator {
          margin-top: 1mm;
          color: #000;
          letter-spacing: 1px;
        }

        .row {
          display: flex;
          justify-content: space-between;
          gap: 6px;
          align-items: flex-start;
        }

        .row + .row {
          margin-top: 1mm;
        }

        .right {
          text-align: right;
          white-space: nowrap;
        }

        .item {
          margin-top: 2mm;
          page-break-inside: avoid;
        }

        .item:first-child {
          margin-top: 0;
        }

        .item-name {
          font-weight: 700;
        }

        .item-total {
          font-weight: 700;
        }

        .item-detail-row {
          color: #000;
        }

        .item-addon,
        .item-note {
          margin-top: 0.5mm;
          margin-left: 2mm;
          color: #000;
        }

        .total-row {
          margin-top: 1.5mm;
          font-size: 13px;
          font-weight: 700;
        }

        .footer {
          text-align: center;
          padding-top: 1.2mm;
          padding-bottom: 0.6mm;
          color: #000;
        }

        .footer-title {
          color: #111;
          font-weight: 700;
        }

        .footer-small {
          margin-top: 1mm;
          font-size: ${paperWidthMm === 58 ? 9.5 : 10}px;
        }

        @media screen {
          body {
            background: #ececec;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            padding: 12px 0;
          }

          .receipt {
            background: #fff;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
          }
        }

        @media print {
          @page {
            size: ${paperWidthMm}mm auto;
            margin: 0;
          }

          html,
          body {
            width: ${paperWidthMm}mm !important;
            min-width: ${paperWidthMm}mm !important;
            max-width: ${paperWidthMm}mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff;
          }

          .receipt {
            width: 100%;
            margin: 0;
            box-shadow: none;
          }
        }
      </style>
    </head>
    <body>
      <main class="receipt">
        <section class="section header">
          <img class="brand-logo" src="/images/logo-family-bakso.png" alt="Logo Family Bakso">
          <div class="logo">FAMILY BAKSO</div>
          <div class="separator">==============================</div>
          <div style="margin-top: 1mm;"><strong>Order ${orderNumber}</strong></div>
          <div>${createdAt}</div>
          <div>Pelanggan: ${customerName}</div>
          <div>Kasir: ${cashier}</div>
        </section>

        <section class="section">
          ${itemsHtml}
        </section>

        <section class="section">
          <div class="row">
            <span>Subtotal</span>
            <span class="right">${escapeHtml(formatRupiah(order.subtotal))}</span>
          </div>
          <div class="row total-row">
            <span>TOTAL</span>
            <span class="right">${escapeHtml(formatRupiah(order.total))}</span>
          </div>
        </section>

        <section class="section">
          <div class="row">
            <span>Metode</span>
            <span class="right">${paymentMethod}</span>
          </div>
          ${cashRowHtml}
          ${changeRowHtml}
          ${noteRowHtml}
        </section>

        <footer class="footer">
          <div class="footer-title">Terima kasih</div>
          <div>Selamat menikmati</div>
          <div class="footer-small">Powered by DekatLokal</div>
        </footer>
      </main>
      ${printScriptHtml}
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
