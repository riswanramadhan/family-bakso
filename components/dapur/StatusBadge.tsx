import { Clock, Flame, CheckCircle2, XCircle } from 'lucide-react';
import { OrderStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: OrderStatus;
}

const statusConfig: Record<OrderStatus, { label: string; Icon: typeof Clock }> = {
  pending: { label: 'Menunggu', Icon: Clock },
  preparing: { label: 'Diproses', Icon: Flame },
  done: { label: 'Selesai', Icon: CheckCircle2 },
  rejected: { label: 'Ditolak', Icon: XCircle },
  cancelled: { label: 'Dibatalkan', Icon: XCircle },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, Icon } = statusConfig[status];

  return (
    <span
      className={cn(
        'badge max-w-full shrink-0 whitespace-nowrap text-xs sm:text-[13px]',
        status === 'pending' && 'badge-pending',
        status === 'preparing' && 'badge-preparing',
        status === 'done' && 'badge-done',
        status === 'rejected' && 'badge-cancelled',
        status === 'cancelled' && 'badge-cancelled'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
