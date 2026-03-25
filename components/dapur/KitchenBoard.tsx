'use client';

import { useEffect, useState } from 'react';
import { Clock, Flame, CheckCircle2, LayoutGrid } from 'lucide-react';
import { Order } from '@/lib/types';
import OrderCard from '@/components/dapur/OrderCard';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'pending' | 'preparing' | 'done';

interface KitchenBoardProps {
  orders: Order[];
  filter: Filter;
  setFilter: (value: Filter) => void;
  updatingId: string | null;
  onStart: (order: Order) => void;
  onFinish: (order: Order) => void;
  onCancel: (order: Order) => void;
}

const filterConfig: { id: Filter; label: string; Icon: typeof Clock }[] = [
  { id: 'all', label: 'Semua', Icon: LayoutGrid },
  { id: 'pending', label: 'Antrian', Icon: Clock },
  { id: 'preparing', label: 'Diproses', Icon: Flame },
  { id: 'done', label: 'Selesai', Icon: CheckCircle2 },
];

export default function KitchenBoard({ orders, filter, setFilter, updatingId, onStart, onFinish, onCancel }: KitchenBoardProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const pending = orders.filter((order) => order.status === 'pending');
  const preparing = orders.filter((order) => order.status === 'preparing');
  const done = orders
    .filter((order) => order.status === 'done')
    .filter((order) => now - new Date(order.updated_at).getTime() <= 30 * 60 * 1000)
    .slice(0, 10);

  const visibleOrders =
    filter === 'all' ? orders : filter === 'pending' ? pending : filter === 'preparing' ? preparing : done;

  return (
    <section className="space-y-4">
      {/* iOS Segmented Control */}
      <div className="card p-1.5">
        <div className="-mx-1 overflow-x-auto px-1 md:mx-0 md:overflow-visible md:px-0">
          <div className="flex min-w-max gap-1 md:min-w-0">
            {filterConfig.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-all duration-200 md:flex-1',
                  filter === item.id
                    ? 'bg-primary text-white shadow-md'
                    : 'text-text-secondary hover:bg-surface-2'
                )}
              >
                <item.Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.id === 'pending' && pending.length > 0 && (
                  <span className={cn(
                    'ml-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold',
                    filter === 'pending' ? 'bg-white/20 text-white' : 'bg-warning/20 text-warning'
                  )}>
                    {pending.length}
                  </span>
                )}
                {item.id === 'preparing' && preparing.length > 0 && (
                  <span className={cn(
                    'ml-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold',
                    filter === 'preparing' ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'
                  )}>
                    {preparing.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop 3-column layout */}
      <div className="hidden gap-4 md:grid md:grid-cols-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-text-secondary">
            <Clock className="h-4 w-4 text-warning" />
            <span>Antrian</span>
            <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-warning/10 text-xs font-bold text-warning">
              {pending.length}
            </span>
          </div>
          {pending.length === 0 ? (
            <div className="card flex h-32 items-center justify-center border-dashed text-sm text-text-tertiary">
              Tidak ada antrian
            </div>
          ) : (
            pending.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isUpdating={updatingId === order.id}
                onStart={onStart}
                onFinish={onFinish}
                onCancel={onCancel}
              />
            ))
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-text-secondary">
            <Flame className="h-4 w-4 text-primary" />
            <span>Diproses</span>
            <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {preparing.length}
            </span>
          </div>
          {preparing.length === 0 ? (
            <div className="card flex h-32 items-center justify-center border-dashed text-sm text-text-tertiary">
              Tidak ada yang diproses
            </div>
          ) : (
            preparing.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isUpdating={updatingId === order.id}
                onStart={onStart}
                onFinish={onFinish}
                onCancel={onCancel}
              />
            ))
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-text-secondary">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span>Selesai</span>
            <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-success/10 text-xs font-bold text-success">
              {done.length}
            </span>
          </div>
          {done.length === 0 ? (
            <div className="card flex h-32 items-center justify-center border-dashed text-sm text-text-tertiary">
              Belum ada yang selesai
            </div>
          ) : (
            done.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isUpdating={updatingId === order.id}
                onStart={onStart}
                onFinish={onFinish}
              />
            ))
          )}
        </div>
      </div>

      {/* Mobile list view */}
      <div className="grid gap-3 md:hidden">
        {visibleOrders.length === 0 ? (
          <div className="card flex h-32 items-center justify-center border-dashed text-sm text-text-tertiary">
            Tidak ada pesanan
          </div>
        ) : (
          visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isUpdating={updatingId === order.id}
              onStart={onStart}
              onFinish={onFinish}
              onCancel={order.status !== 'done' ? onCancel : undefined}
            />
          ))
        )}
      </div>
    </section>
  );
}
