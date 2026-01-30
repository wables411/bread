"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCartStore } from "@/lib/cart-store";
import { useWeeklyInventory } from "@/lib/use-weekly-inventory";
import { SHIPPING_RATES } from "@/lib/constants";
import { PriceEquivalents } from "@/components/PriceEquivalents";
import { toast } from "sonner";

const PRODUCT_NAMES: Record<string, string> = {
  loaf: "Bread Loaf",
  roll: "Cinnabunz (6) + icing",
};

export default function CartPage() {
  const { items, updateQty, removeItem, subtotal, setWeeklyAvailable } = useCartStore();
  const { data: inventory } = useWeeklyInventory();
  const [qtyErrors, setQtyErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (inventory) setWeeklyAvailable(inventory.available);
  }, [inventory, setWeeklyAvailable]);

  const effectiveMax = inventory ? Math.min(10, inventory.available) : 10;

  const handleQtyChange = (product: string, newQty: number) => {
    const result = updateQty(product as "loaf" | "roll", Math.max(1, newQty));
    if (result.success) {
      setQtyErrors((e) => ({ ...e, [product]: "" }));
    } else {
      setQtyErrors((e) => ({ ...e, [product]: result.error ?? "" }));
      toast.error(result.error);
    }
  };

  if (items.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-bold mb-4">Cart</h1>
        <p className="mb-4">Your cart is empty.</p>
        <Link href="/shop" className="text-[#00c] hover:underline">
          shop →
        </Link>
      </div>
    );
  }

  const shippingEstimate = Math.min(
    SHIPPING_RATES.overnight,
    SHIPPING_RATES["2day"]
  );
  const totalEstimate = subtotal() + shippingEstimate;

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Cart</h1>
      <p className="text-sm text-gray-600 mb-2">
        {inventory?.available === 0
          ? "Sold out for this week — check back next week."
          : `Max ${effectiveMax} items this week (${inventory?.available ?? 10} left).`}
      </p>
      <table className="w-full border border-black" cellPadding={8} cellSpacing={0}>
        <thead>
          <tr className="border-b border-black">
            <th className="text-left">Item</th>
            <th className="text-right">Qty</th>
            <th className="text-right">Price</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.product} className="border-b border-gray-300">
              <td>{PRODUCT_NAMES[item.product] || item.product}</td>
              <td className="text-right">
                <input
                  type="number"
                  min={1}
                  max={effectiveMax}
                  value={item.qty}
                  onChange={(e) =>
                    handleQtyChange(
                      item.product,
                      parseInt(e.target.value, 10) || 1
                    )
                  }
                  className="border border-black w-16 px-2 py-1 text-right"
                />
                {qtyErrors[item.product] && (
                  <p className="text-xs text-red-600">{qtyErrors[item.product]}</p>
                )}
              </td>
              <td className="text-right">${(item.price * item.qty).toFixed(2)}</td>
              <td>
                <button
                  type="button"
                  onClick={() => removeItem(item.product)}
                  className="text-[#00c] hover:underline text-sm"
                >
                  remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4">
        <p>Subtotal: ${subtotal().toFixed(2)}</p>
        <p className="text-sm text-gray-600">
          Shipping (estimate): ${shippingEstimate.toFixed(2)} – select at checkout
        </p>
        <p className="font-bold mt-2">Est. total: ${totalEstimate.toFixed(2)}</p>
        <div className="mt-4 p-4 border border-gray-300">
          <PriceEquivalents totalUsd={totalEstimate} />
        </div>
      </div>
      <div className="mt-6">
        <Link
          href="/checkout"
          className="inline-block border border-black px-4 py-2 text-[#00c] hover:underline"
        >
          checkout →
        </Link>
      </div>
    </div>
  );
}
