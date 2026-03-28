import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, ChefHat, BarChart3, RefreshCw } from 'lucide-react';
import BottomNav from '@/components/shared/BottomNav';
import OfflineBootstrap from '@/components/shared/OfflineBootstrap';
import ConnectionStatus from '@/components/shared/ConnectionStatus';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'POS Family Bakso',
  description: 'Real-time POS system untuk Family Bakso',
  icons: {
    icon: '/images/logo-family-bakso.png',
    apple: '/images/logo-family-bakso.png',
    shortcut: '/images/logo-family-bakso.png',
  },
  openGraph: {
    title: 'POS Family Bakso',
    description: 'Real-time POS system untuk Family Bakso',
    images: [
      {
        url: '/images/logo-family-bakso.png',
        width: 512,
        height: 512,
        alt: 'Logo Family Bakso',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'POS Family Bakso',
    description: 'Real-time POS system untuk Family Bakso',
    images: ['/images/logo-family-bakso.png'],
  },
};

const navItems = [
  { href: '/kasir', label: 'Kasir', Icon: ShoppingCart },
  { href: '/dapur', label: 'Dapur', Icon: ChefHat },
  { href: '/rekap', label: 'Rekap', Icon: BarChart3 },
  { href: '/sinkronisasi', label: 'Sinkronisasi', Icon: RefreshCw },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-bg text-text-primary antialiased">
        <OfflineBootstrap />
        <ConnectionStatus />
        <div className="mx-auto flex min-h-screen w-full max-w-[1600px] bg-[radial-gradient(circle_at_top_left,rgba(0,122,255,0.06),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(90,200,250,0.05),transparent_45%)]">
          <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border bg-surface/90 p-5 backdrop-blur-xl lg:block">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-border bg-white">
                <Image
                  src="/images/logo-family-bakso.png"
                  alt="Logo Family Bakso"
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                  priority
                />
              </div>
              <p className="text-lg font-bold tracking-tight">FAMILY BAKSO</p>
            </div>
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] font-medium text-text-secondary transition duration-200 ease-out hover:bg-surface-2 hover:text-primary"
                >
                  <item.Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </aside>

          <div className="flex min-h-screen flex-1 flex-col">
            <main className="flex-1 px-4 pb-28 pt-5 md:px-6 lg:px-8 lg:pb-8">{children}</main>
            <footer className="py-4 text-center text-xs text-text-tertiary">
              © 2026 POS Family Bakso. All Rights Reserved | Powered by DekatLokal
            </footer>
          </div>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
