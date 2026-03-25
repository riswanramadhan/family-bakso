import { ShoppingBag, DollarSign, TrendingUp, Trophy } from 'lucide-react';
import { OrderStats } from '@/lib/types';
import { formatRupiah } from '@/lib/utils';

interface SummaryStatsProps {
  stats: OrderStats;
}

const statsConfig = [
  { key: 'totalOrders', label: 'Total Pesanan', Icon: ShoppingBag, color: 'text-primary' },
  { key: 'totalRevenue', label: 'Total Pendapatan', Icon: DollarSign, color: 'text-success' },
  { key: 'averageOrderValue', label: 'Rata-rata', Icon: TrendingUp, color: 'text-warning' },
  { key: 'topSellingItem', label: 'Item Terlaris', Icon: Trophy, color: 'text-danger' },
];

export default function SummaryStats({ stats }: SummaryStatsProps) {
  const getValue = (key: string) => {
    switch (key) {
      case 'totalOrders':
        return `${stats.totalOrders}`;
      case 'totalRevenue':
        return formatRupiah(stats.totalRevenue);
      case 'averageOrderValue':
        return formatRupiah(stats.averageOrderValue);
      case 'topSellingItem':
        return stats.topSellingItem ? `${stats.topSellingItem.name} (${stats.topSellingItem.quantity})` : '-';
      default:
        return '-';
    }
  };

  return (
    <section className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {statsConfig.map((item) => (
        <article key={item.key} className="card p-4 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary truncate">{item.label}</p>
              <p className="tabular-nums mt-2 text-base sm:text-lg lg:text-xl font-bold tracking-tight break-words">{getValue(item.key)}</p>
            </div>
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-surface-2 ${item.color}`}>
              <item.Icon className="h-5 w-5" />
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
