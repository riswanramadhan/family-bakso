'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, ChefHat, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/kasir', label: 'Kasir', Icon: ShoppingCart },
  { href: '/dapur', label: 'Dapur', Icon: ChefHat },
  { href: '/rekap', label: 'Rekap', Icon: BarChart3 },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-surface/90 px-4 py-2 backdrop-blur-xl lg:hidden">
      <ul className="mx-auto flex max-w-md justify-around gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-label={`Buka ${item.label}`}
                className={cn(
                  'flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition duration-200 ease-out',
                  isActive ? 'text-primary' : 'text-text-tertiary hover:text-text-secondary'
                )}
              >
                <item.Icon className={cn('h-6 w-6', isActive && 'text-primary')} strokeWidth={isActive ? 2.5 : 2} />
                <span className={cn(isActive && 'font-semibold')}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
