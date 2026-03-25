'use client';

import { create } from 'zustand';
import { CartItem, MenuItem, SelectedAddOn } from '@/lib/types';
import { calculateOrderTotals, generateId } from '@/lib/utils';

interface OrderStore {
  cartItems: CartItem[];
  orderNotes: string;
  addItem: (menuItem: MenuItem, addOns?: SelectedAddOn[], quantity?: number) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  updateItemNotes: (cartItemId: string, notes: string) => void;
  setOrderNotes: (notes: string) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;
  getMenuCount: (menuId: string) => number;
}

const calcUnitPrice = (basePrice: number, addOns: SelectedAddOn[]) => {
  return basePrice + addOns.reduce((sum, addOn) => sum + addOn.price, 0);
};

export const useOrderStore = create<OrderStore>((set, get) => ({
  cartItems: [],
  orderNotes: '',
  addItem: (menuItem, addOns = [], quantity = 1) => {
    const unitPrice = calcUnitPrice(menuItem.basePrice, addOns);

    set((state) => {
      const existing = state.cartItems.find(
        (item) =>
          item.menuId === menuItem.id &&
          JSON.stringify(item.addOns.map((a) => a.id).sort()) === JSON.stringify(addOns.map((a) => a.id).sort())
      );

      if (existing) {
        return {
          cartItems: state.cartItems.map((item) =>
            item.id === existing.id
              ? {
                  ...item,
                  quantity: item.quantity + quantity,
                  subtotal: (item.quantity + quantity) * item.unitPrice,
                }
              : item
          ),
        };
      }

      const newItem: CartItem = {
        id: generateId(),
        menuId: menuItem.id,
        name: menuItem.name,
        image: menuItem.image,
        basePrice: menuItem.basePrice,
        quantity,
        addOns,
        notes: '',
        unitPrice,
        subtotal: unitPrice * quantity,
      };

      return { cartItems: [...state.cartItems, newItem] };
    });
  },
  removeItem: (cartItemId) => {
    set((state) => ({
      cartItems: state.cartItems.filter((item) => item.id !== cartItemId),
    }));
  },
  updateQuantity: (cartItemId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(cartItemId);
      return;
    }

    set((state) => ({
      cartItems: state.cartItems.map((item) =>
        item.id === cartItemId
          ? {
              ...item,
              quantity,
              subtotal: quantity * item.unitPrice,
            }
          : item
      ),
    }));
  },
  updateItemNotes: (cartItemId, notes) => {
    set((state) => ({
      cartItems: state.cartItems.map((item) => (item.id === cartItemId ? { ...item, notes } : item)),
    }));
  },
  setOrderNotes: (notes) => set({ orderNotes: notes }),
  clearCart: () => set({ cartItems: [], orderNotes: '' }),
  getSubtotal: () => calculateOrderTotals(get().cartItems).subtotal,
  getTotal: () => calculateOrderTotals(get().cartItems).total,
  getItemCount: () => get().cartItems.reduce((sum, item) => sum + item.quantity, 0),
  getMenuCount: (menuId) => get().cartItems.filter((item) => item.menuId === menuId).reduce((sum, item) => sum + item.quantity, 0),
}));
