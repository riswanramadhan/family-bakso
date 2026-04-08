'use client';

import { Download, FileText, FileSpreadsheet, FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { MenuItemSales, Order, OrderStats } from '@/lib/types';
import { formatDateTime, formatOrderNumber, formatRupiah } from '@/lib/utils';

interface ExportBarProps {
  orders: Order[];
  stats: OrderStats;
  itemPerformance: MenuItemSales[];
  selectedOrder: Order | null;
}

const escapeCsvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

const formatCsvDate = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleDateString('id-ID');
};

const formatCsvTime = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const formatPaymentMethod = (method: Order['payment_method']) => (method === 'tunai' ? 'Tunai' : 'QRIS');

const toOrderStatusLabel = (status: Order['status']) => {
  if (status === 'pending') return 'Pending';
  if (status === 'preparing') return 'Diproses';
  if (status === 'done') return 'Selesai';
  if (status === 'rejected') return 'Ditolak';
  return 'Dibatalkan';
};

export default function ExportBar({ orders, stats, itemPerformance, selectedOrder }: ExportBarProps) {
  const exportCsv = () => {
    const headers = [
      'No Order',
      'Tanggal',
      'Jam',
      'Nama Customer',
      'Status',
      'Metode Bayar',
      'Daftar Menu',
      'Jumlah Item',
      'Total',
    ];

    const rows = orders.map((order) => {
      const orderMenus = order.items.map((item) => `${item.quantity}x ${item.name}`).join(' | ');
      const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

      return [
        formatOrderNumber(order.order_number),
        formatCsvDate(order.created_at),
        formatCsvTime(order.created_at),
        order.customer_name?.trim() || '-',
        toOrderStatusLabel(order.status),
        formatPaymentMethod(order.payment_method),
        orderMenus,
        totalItems,
        formatRupiah(order.total),
      ];
    });

    const csvBody = [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
      .join('\n');

    const blob = new Blob([`\uFEFF${csvBody}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rekap-family-bakso-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const summaryRows = [
      ['Total Pesanan', stats.totalOrders],
      ['Total Pendapatan', stats.totalRevenue],
      ['Rata-rata per Order', stats.averageOrderValue],
      ['Item Terlaris', stats.topSellingItem?.name ?? '-'],
    ];

    const detailRows = orders.map((order) => ({
      order_number: formatOrderNumber(order.order_number),
      waktu: formatDateTime(order.created_at),
      customer: order.customer_name?.trim() || '-',
      items: order.items.map((item) => `${item.quantity}x ${item.name}`).join('; '),
      metode_bayar: order.payment_method,
      total: order.total,
      status: order.status,
    }));

    const menuRows = itemPerformance.map((item) => ({
      menu: item.name,
      qty_terjual: item.quantitySold,
      pendapatan: item.revenue,
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet([['Metrik', 'Nilai'], ...summaryRows]);
    const ws2 = XLSX.utils.json_to_sheet(detailRows);
    const ws3 = XLSX.utils.json_to_sheet(menuRows);

    XLSX.utils.book_append_sheet(wb, ws1, 'Rekap Harian');
    XLSX.utils.book_append_sheet(wb, ws2, 'Detail Pesanan');
    XLSX.utils.book_append_sheet(wb, ws3, 'Rekap Per Menu');
    XLSX.writeFile(wb, `rekap-family-bakso-${Date.now()}.xlsx`);
  };

  const exportPdf = () => {
    if (!selectedOrder) return;

    const doc = new jsPDF({ unit: 'pt', format: [226.77, 600] });
    const left = 16;
    const right = 210;
    let y = 20;

    const pair = (label: string, value: string, bold = false) => {
      doc.setFont('courier', bold ? 'bold' : 'normal');
      doc.text(label, left, y);
      doc.text(value, right, y, { align: 'right' });
      y += 14;
    };

    doc.setFont('courier', 'bold');
    doc.setFontSize(12);
    doc.text('FAMILY BAKSO', (left + right) / 2, y, { align: 'center' });
    y += 14;

    doc.setFont('courier', 'normal');
    doc.setFontSize(9);
    doc.text('================================', (left + right) / 2, y, { align: 'center' });
    y += 14;

    pair('No. Order', formatOrderNumber(selectedOrder.order_number), true);
    pair('Tanggal', formatDateTime(selectedOrder.created_at));
    pair('Pelanggan', selectedOrder.customer_name?.trim() || '-');
    pair('Kasir', 'Naeee');

    y += 2;
    doc.text('--------------------------------', (left + right) / 2, y, { align: 'center' });
    y += 12;

    selectedOrder.items.forEach((item) => {
      doc.setFont('courier', 'normal');
      doc.text(item.name, left, y);
      y += 12;

      const detail = `${item.quantity} x ${formatRupiah(item.unit_price)}`;
      pair(detail, formatRupiah(item.subtotal));

      if (item.add_ons.length > 0) {
        const addOnText = `+ ${item.add_ons.map((a) => a.label).join(', ')}`;
        doc.setFont('courier', 'normal');
        doc.text(addOnText, left + 6, y);
        y += 12;
      }
    });

    doc.text('--------------------------------', (left + right) / 2, y, { align: 'center' });
    y += 14;

    pair('Subtotal', formatRupiah(selectedOrder.subtotal));
    pair('TOTAL', formatRupiah(selectedOrder.total), true);
    pair('Metode Bayar', selectedOrder.payment_method.toUpperCase());

    if (selectedOrder.cash_received) {
      pair('Tunai', formatRupiah(selectedOrder.cash_received));
    }

    if (selectedOrder.change_amount && selectedOrder.change_amount > 0) {
      pair('Kembali', formatRupiah(selectedOrder.change_amount), true);
    }

    y += 6;
    doc.setFont('courier', 'normal');
    doc.text('Terima Kasih', (left + right) / 2, y, { align: 'center' });
    y += 12;
    doc.text('Selamat Menikmati!', (left + right) / 2, y, { align: 'center' });
    y += 12;
    doc.text('================================', (left + right) / 2, y, { align: 'center' });
    y += 12;
    doc.text('Powered by DekatLokal', (left + right) / 2, y, { align: 'center' });

    doc.save(`struk-${formatOrderNumber(selectedOrder.order_number)}.pdf`);
  };

  return (
    <section className="card space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Download className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold">Export Data</span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          className="btn-secondary flex items-center justify-center gap-2 px-3 py-2.5 text-xs sm:text-sm"
          onClick={exportCsv}
        >
          <FileDown className="h-4 w-4" />
          <span>CSV</span>
        </button>
        <button
          type="button"
          className="btn-secondary flex items-center justify-center gap-2 px-3 py-2.5 text-xs sm:text-sm"
          onClick={exportExcel}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Excel</span>
        </button>
        <button
          type="button"
          className="btn-primary flex items-center justify-center gap-2 px-3 py-2.5 text-xs sm:text-sm"
          onClick={exportPdf}
          disabled={!selectedOrder}
        >
          <FileText className="h-4 w-4" />
          <span>PDF</span>
        </button>
      </div>

      {!selectedOrder ? (
        <p className="text-xs text-text-tertiary">Pilih satu order dari tabel untuk export PDF struk.</p>
      ) : null}
    </section>
  );
}
