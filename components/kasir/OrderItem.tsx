'use client';

import Image from 'next/image';
import { Trash2, Minus, Plus, UtensilsCrossed } from 'lucide-react';
import { CartItem } from '@/lib/types';
import { formatRupiah } from '@/lib/utils';

interface OrderItemProps {
  item: CartItem;
  onIncrease: () => void;
  onDecrease: () => void;
  onDelete: () => void;
  onNotesChange: (value: string) => void;
}

export default function OrderItem({ item, onIncrease, onDecrease, onDelete, onNotesChange }: OrderItemProps) {
  return (
    <article className="card space-y-3 p-3.5">
      <div className="flex items-start gap-3">
        {/* Menu thumbnail */}
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-2">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.name}
              width={48}
              height={48}
              sizes="48px"
              quality={68}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <UtensilsCrossed className="h-5 w-5 text-primary/30" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">{item.name}</p>
              {item.addOns.length > 0 ? (
                <p className="truncate text-xs text-text-secondary">{item.addOns.map((addOn) => `+ ${addOn.label}`).join(', ')}</p>
              ) : null}
            </div>
            <p className="tabular-nums shrink-0 text-[15px] font-bold text-primary">{formatRupiah(item.subtotal)}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 transition-all hover:bg-border active:scale-95"
            onClick={onDecrease}
            aria-label="Kurangi item"
          >
            <Minus className="h-4 w-4 text-text-primary" />
          </button>
          <span className="tabular-nums w-8 text-center text-base font-bold">{item.quantity}</span>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white transition-all active:scale-95"
            onClick={onIncrease}
            aria-label="Tambah item"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-danger/10 text-danger transition-all hover:bg-danger/20 active:scale-95"
          onClick={onDelete}
          aria-label="Hapus item"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <input
        type="text"
        value={item.notes}
        onChange={(event) => onNotesChange(event.target.value)}
        placeholder="Catatan untuk koki..."
        aria-label="Catatan item"
        className="text-sm"
      />
    </article>
  );
}
