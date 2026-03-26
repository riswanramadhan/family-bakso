'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { UtensilsCrossed, Coffee, Plus, Minus, X, ShoppingBag } from 'lucide-react';
import { MENU_CATEGORIES, MENU_ITEMS } from '@/lib/menu';
import { MenuItem, SelectedAddOn } from '@/lib/types';
import { cn, formatRupiah } from '@/lib/utils';

interface MenuGridProps {
  selectedCategory: 'all' | 'main' | 'drinks';
  onSelectCategory: (value: 'all' | 'main' | 'drinks') => void;
  getMenuCount: (menuId: string) => number;
  onAdd: (item: MenuItem, addOns: SelectedAddOn[], quantity: number) => void;
  isLoading?: boolean;
}

export default function MenuGrid({ selectedCategory, onSelectCategory, getMenuCount, onAdd, isLoading }: MenuGridProps) {
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [qty, setQty] = useState(1);

  const visibleItems = useMemo(() => {
    if (selectedCategory === 'all') return MENU_ITEMS;
    return MENU_ITEMS.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  const closeSheet = () => {
    setSelectedMenu(null);
    setSelectedAddOnIds([]);
    setQty(1);
  };

  const handleAdd = (item: MenuItem) => {
    if (item.addOns.length > 0) {
      setSelectedMenu(item);
      return;
    }
    onAdd(item, [], 1);
  };

  const handleSubmitSheet = () => {
    if (!selectedMenu) return;
    const addOns: SelectedAddOn[] = selectedMenu.addOns
      .filter((addOn) => selectedAddOnIds.includes(addOn.id))
      .map((addOn) => ({ id: addOn.id, label: addOn.label, price: addOn.price }));

    onAdd(selectedMenu, addOns, qty);
    closeSheet();
  };

  // Calculate total price
  const totalPrice = selectedMenu
    ? (selectedMenu.basePrice + selectedAddOnIds.reduce((sum, id) => {
        const addOn = selectedMenu.addOns.find((a) => a.id === id);
        return sum + (addOn?.price || 0);
      }, 0)) * qty
    : 0;

  return (
    <section className="space-y-4">
      {/* iOS Segmented Control style category filter */}
      <div className="card p-1.5">
        <div className="flex gap-1">
          {MENU_CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(category.id)}
              className={cn(
                'flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200',
                selectedCategory === category.id
                  ? 'bg-primary text-white shadow-md'
                  : 'text-text-secondary hover:bg-surface-2'
              )}
              aria-label={`Filter ${category.label}`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid - optimized for tablet */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, index) => <div key={index} className="skeleton h-44 rounded-2xl" />)
          : visibleItems.map((item) => {
              const inCart = getMenuCount(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleAdd(item)}
                  className="card group relative overflow-hidden p-0 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
                  aria-label={`Tambah ${item.name}`}
                >
                  {/* Menu Image */}
                  <div className="menu-image aspect-square">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 240px"
                        quality={72}
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                        {item.category === 'main' ? (
                          <UtensilsCrossed className="h-10 w-10 text-primary/40" />
                        ) : (
                          <Coffee className="h-10 w-10 text-primary/40" />
                        )}
                        <span className="mt-2 text-xs text-text-tertiary">Foto Menu</span>
                      </div>
                    )}
                  </div>

                  {/* Item count badge */}
                  {inCart > 0 ? (
                    <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-lg">
                      {inCart}
                    </span>
                  ) : null}

                  {/* Menu Info */}
                  <div className="p-3">
                    <p className="text-sm font-semibold text-text-primary line-clamp-2">{item.name}</p>
                    <p className="tabular-nums mt-1 text-base font-bold text-primary">{formatRupiah(item.basePrice)}</p>
                  </div>

                  {/* Quick add indicator */}
                  <div className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 opacity-0 transition-opacity group-hover:opacity-100">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                </button>
              );
            })}
      </div>

      {/* Add-on Bottom Sheet - menempel kiri, kanan, dan bawah */}
      {selectedMenu ? (
        <>
          <div className="backdrop" onClick={closeSheet} />
          <div className="fixed inset-x-0 bottom-0 z-50">
            <div className="animate-slideUp card relative flex h-[62vh] min-h-[440px] w-full flex-col overflow-hidden rounded-b-none rounded-t-3xl border-b-0">
              <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-border" />

              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <h3 className="text-base font-bold">Tambah ke Pesanan</h3>
                <button
                  type="button"
                  onClick={closeSheet}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 transition-colors hover:bg-border"
                  aria-label="Tutup"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              <div className="grid flex-1 grid-rows-[auto,1fr,auto] gap-3 px-5 py-3">
                {/* Menu info */}
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                    {selectedMenu.image ? (
                      <Image
                        src={selectedMenu.image}
                        alt={selectedMenu.name}
                        width={56}
                        height={56}
                        sizes="56px"
                        quality={70}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        {selectedMenu.category === 'main' ? (
                          <UtensilsCrossed className="h-6 w-6 text-primary/40" />
                        ) : (
                          <Coffee className="h-6 w-6 text-primary/40" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="line-clamp-1 text-base font-bold">{selectedMenu.name}</h4>
                    <p className="mt-0.5 text-sm font-bold text-primary">{formatRupiah(selectedMenu.basePrice)}</p>
                  </div>
                </div>

                {/* Add-ons */}
                <div className="grid auto-rows-min gap-2 content-start">
                  {selectedMenu.addOns.length > 0 ? (
                    <>
                      <p className="text-xs font-semibold text-text-secondary">Pilih Add-on</p>
                      {selectedMenu.addOns.map((addOn) => {
                        const checked = selectedAddOnIds.includes(addOn.id);
                        return (
                          <label
                            key={addOn.id}
                            className={cn(
                              'card flex cursor-pointer items-center justify-between px-3 py-2 transition-all',
                              checked ? 'border-primary bg-primary/5' : 'hover:bg-surface-2'
                            )}
                          >
                            <div>
                              <p className="text-sm font-semibold">{addOn.label}</p>
                              <p className="text-xs text-primary">+{formatRupiah(addOn.price)}</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              aria-label={`Pilih ${addOn.label}`}
                              onChange={() =>
                                setSelectedAddOnIds((prev) =>
                                  checked ? prev.filter((id) => id !== addOn.id) : [...prev, addOn.id]
                                )
                              }
                            />
                          </label>
                        );
                      })}
                    </>
                  ) : (
                    <div className="card flex h-full items-center justify-center border-dashed px-3 py-4 text-sm text-text-tertiary">
                      Tidak ada add-on untuk menu ini.
                    </div>
                  )}
                </div>

                {/* Quantity */}
                <div>
                  <p className="mb-2 text-xs font-semibold text-text-secondary">Jumlah</p>
                  <div className="flex items-center justify-center gap-4">
                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-xl font-bold transition-all hover:bg-border active:scale-95"
                      onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                      aria-label="Kurangi jumlah"
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                    <span className="tabular-nums w-12 text-center text-2xl font-bold">{qty}</span>
                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-xl font-bold text-white transition-all active:scale-95"
                      onClick={() => setQty((prev) => prev + 1)}
                      aria-label="Tambah jumlah"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer - Total & Button */}
              <div className="border-t border-border px-5 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-text-secondary">Total</span>
                  <span className="tabular-nums text-lg font-bold text-primary">{formatRupiah(totalPrice)}</span>
                </div>
                <button
                  type="button"
                  className="btn-primary flex w-full items-center justify-center gap-2 py-3 text-base"
                  onClick={handleSubmitSheet}
                >
                  <ShoppingBag className="h-4 w-4" />
                  Tambah ke Pesanan
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
