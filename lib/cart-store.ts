import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, ProductId } from "./types";
import { PRODUCT_PRICES } from "./constants";

/** Max 10 items total per week (supply cap) */
export const CART_MAX_ITEMS = 10;

interface CartState {
  items: CartItem[];
  /** When set, effective max = min(CART_MAX_ITEMS, weeklyAvailable) */
  weeklyAvailable: number | null;
  setWeeklyAvailable: (n: number | null) => void;
  addItem: (product: ProductId, qty?: number) => { success: boolean; error?: string };
  removeItem: (product: ProductId) => void;
  updateQty: (product: ProductId, qty: number) => { success: boolean; error?: string };
  clearCart: () => void;
  subtotal: () => number;
  itemCount: () => number;
  canAdd: (qty: number) => boolean;
  effectiveMax: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => {
      const getEffectiveMax = () => {
        const wa = get().weeklyAvailable;
        if (wa === null) return CART_MAX_ITEMS;
        return Math.min(CART_MAX_ITEMS, wa);
      };

      return {
        items: [],
        weeklyAvailable: null,
        setWeeklyAvailable: (n) => set({ weeklyAvailable: n }),

        addItem: (product, qty = 1) => {
          const state = get();
          const max = getEffectiveMax();
          const currentTotal = state.itemCount();
          if (currentTotal + qty > max) {
            return {
              success: false,
              error: max === 0
                ? "Sold out for this week. Check back next week."
                : `Max ${max} items this week. You have ${currentTotal}.`,
            };
          }
          set((s) => {
            const ex = s.items.find((i) => i.product === product);
            const price = PRODUCT_PRICES[product];
            if (ex) {
              return {
                items: s.items.map((i) =>
                  i.product === product ? { ...i, qty: i.qty + qty } : i
                ),
              };
            }
            return {
              items: [...s.items, { product, qty, price }],
            };
          });
          return { success: true };
        },

        removeItem: (product) => {
          set((state) => ({
            items: state.items.filter((i) => i.product !== product),
          }));
        },

        updateQty: (product, qty) => {
          if (qty <= 0) {
            get().removeItem(product);
            return { success: true };
          }
          const state = get();
          const max = getEffectiveMax();
          const existing = state.items.find((i) => i.product === product);
          const otherTotal = state.itemCount() - (existing?.qty ?? 0);
          if (otherTotal + qty > max) {
            return {
              success: false,
              error: max === 0
                ? "Sold out for this week."
                : `Max ${max} items this week.`,
            };
          }
          set((s) => ({
            items: s.items.map((i) =>
              i.product === product ? { ...i, qty } : i
            ),
          }));
          return { success: true };
        },

        clearCart: () => set({ items: [] }),
        subtotal: () =>
          get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
        itemCount: () =>
          get().items.reduce((sum, i) => sum + i.qty, 0),
        canAdd: (qty) => get().itemCount() + qty <= getEffectiveMax(),
        effectiveMax: getEffectiveMax,
      };
    },
    { name: "bread-cart", skipHydration: true, partialize: (s) => ({ items: s.items }) }
  )
);
