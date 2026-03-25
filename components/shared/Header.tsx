'use client';

import { useEffect, useState } from 'react';
import { Soup, ShoppingBag, ChefHat, BarChart3 } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';

interface HeaderProps {
  title: string;
  subtitle?: string;
  todayOrderCount?: number;
  icon?: 'soup' | 'cart' | 'chef' | 'chart';
}

const icons = {
  soup: Soup,
  cart: ShoppingBag,
  chef: ChefHat,
  chart: BarChart3,
};

export default function Header({ title, subtitle, todayOrderCount, icon = 'soup' }: HeaderProps) {
  const [now, setNow] = useState(new Date());
  const Icon = icons[icon];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <header className="card mb-4 px-4 py-4 sm:mb-5 sm:px-5 sm:py-5 md:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 sm:h-12 sm:w-12">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight md:text-2xl">{title}</h1>
            {subtitle ? <p className="mt-0.5 break-words text-sm text-text-secondary">{subtitle}</p> : null}
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-sm font-medium text-text-secondary">{formatDate(now)}</p>
          <p className="tabular-nums text-lg font-semibold tracking-tight sm:text-xl">{formatTime(now)}</p>
          {typeof todayOrderCount === 'number' ? (
            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <ShoppingBag className="h-3.5 w-3.5" />
              {todayOrderCount} pesanan hari ini
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
