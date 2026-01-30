import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, ProductId } from "./types";
import { PRODUCT_PRICES } from "./constants";

/** Max 4 items total across all products */
export const CART_MAX_ITEMS = 4;

interface CartState {
  items: CartItem[];
  addItem: (product: ProductId, qty?: number) => { success: boolean; error?: string };
  removeItem: (product: ProductId) => void;
  updateQty: (product: ProductId, qty: number) => { success: boolean; error?: string };
  clearCart: () => void;
  subtotal: () => number;
  itemCount: () => number;
  canAdd: (qty: number) => boolean;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, qty = 1) => {
        const state = get();
        const currentTotal = state.itemCount();
        if (currentTotal + qty > CART_MAX_ITEMS) {
          return {
            success: false,
            error: `Max ${CART_MAX_ITEMS} items total. You have ${currentTotal}.`,
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
        const currentTotal = state.itemCount();
        const existing = state.items.find((i) => i.product === product);
        const otherTotal = currentTotal - (existing?.qty ?? 0);
        if (otherTotal + qty > CART_MAX_ITEMS) {
          return {
            success: false,
            error: `Max ${CART_MAX_ITEMS} items total.`,
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
      canAdd: (qty) => get().itemCount() + qty <= CART_MAX_ITEMS,
    }),
    { name: "bread-cart", skipHydration: true }
  )
);
