'use client';

import { Loader2, Flame, CheckCircle2, XCircle } from 'lucide-react';
import { Order } from '@/lib/types';
import { formatOrderNumber, formatTime, getRelativeTime } from '@/lib/utils';
import StatusBadge from '@/components/dapur/StatusBadge';

interface OrderCardProps {
  order: Order;
  isUpdating: boolean;
  onStart: (order: Order) => void;
  onFinish: (order: Order) => void;
  onCancel?: (order: Order) => void;
}

export default function OrderCard({ order, isUpdating, onStart, onFinish, onCancel }: OrderCardProps) {
  return (
    <article className="card animate-slideIn space-y-3 p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold sm:text-base">Order {formatOrderNumber(order.order_number)}</p>
          <p className="text-xs text-text-secondary">
            {formatTime(order.created_at)} · {getRelativeTime(order.created_at)}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <ul className="space-y-1.5 text-sm">
        {order.items.map((item, index) => (
          <li key={`${item.menu_id}-${index}`} className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {item.quantity}
            </span>
            <div className="min-w-0">
              <span className="font-semibold">{item.name}</span>
              {item.add_ons.length > 0 ? (
                <span className="text-text-secondary"> + {item.add_ons.map((a) => a.label).join(', ')}</span>
              ) : null}
              {item.notes ? (
                <p className="mt-0.5 text-xs italic text-text-secondary">Catatan: {item.notes}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {order.notes ? (
        <div className="rounded-xl bg-warning/10 p-2.5 text-xs text-warning">
          <span className="font-semibold">Catatan:</span> {order.notes}
        </div>
      ) : null}

      <div className="grid grid-cols-[1fr_auto] gap-2">
        {order.status === 'pending' ? (
          <>
            <button
              type="button"
              className="btn-primary flex min-w-0 items-center justify-center gap-2 px-3 py-3 text-sm"
              onClick={() => onStart(order)}
              disabled={isUpdating}
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
              Mulai Masak
            </button>
            {onCancel ? (
              <button
                type="button"
                className="btn-danger flex w-11 items-center justify-center gap-2 px-0"
                onClick={() => onCancel(order)}
                disabled={isUpdating}
              >
                <XCircle className="h-4 w-4" />
              </button>
            ) : null}
          </>
        ) : null}

        {order.status === 'preparing' ? (
          <>
            <button
              type="button"
              className="btn-primary flex min-w-0 items-center justify-center gap-2 px-3 py-3 text-sm"
              onClick={() => onFinish(order)}
              disabled={isUpdating}
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Selesai
            </button>
            {onCancel ? (
              <button
                type="button"
                className="btn-danger flex w-11 items-center justify-center gap-2 px-0"
                onClick={() => onCancel(order)}
                disabled={isUpdating}
              >
                <XCircle className="h-4 w-4" />
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </article>
  );
}
