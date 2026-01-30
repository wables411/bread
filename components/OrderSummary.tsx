"use client";

import type { CartItem } from "@/lib/types";
import { SHIPPING_RATES } from "@/lib/constants";
import type { ShippingOption } from "@/lib/types";

const PRODUCT_NAMES: Record<string, string> = {
  loaf: "Bread Loaf",
  roll: "Cinnamon Roll Pack",
};

interface OrderSummaryProps {
  items: CartItem[];
  shippingOption: ShippingOption;
  paymentMethod?: string | null;
}

const PAYMENT_LABELS: Record<string, string> = {
  "usdc-base": "USDC (Base)",
  "usdc-ethereum": "USDC (Ethereum)",
  "eth-base": "ETH (Base)",
  "eth-ethereum": "ETH (Ethereum)",
  "bread-base": "$BREAD (Base)",
  "cult-ethereum": "$CULT (Ethereum)",
};

export function OrderSummary({ items, shippingOption, paymentMethod }: OrderSummaryProps) {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shipping = SHIPPING_RATES[shippingOption];
  const total = subtotal + shipping;

  return (
    <div className="border border-black p-4">
      <h3 className="font-bold mb-2">Order Summary</h3>
      <table className="w-full text-sm" cellPadding={0} cellSpacing={0}>
        <tbody>
          {items.map((item) => (
            <tr key={item.product}>
              <td>{PRODUCT_NAMES[item.product] || item.product}</td>
              <td className="text-right">x{item.qty}</td>
              <td className="text-right">${(item.price * item.qty).toFixed(2)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={2}>Subtotal</td>
            <td className="text-right">${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={2}>
              Shipping ({shippingOption === "overnight" ? "Overnight" : "2-Day"})
            </td>
            <td className="text-right">${shipping.toFixed(2)}</td>
          </tr>
          <tr className="font-bold">
            <td colSpan={2}>Total</td>
            <td className="text-right">${total.toFixed(2)}</td>
          </tr>
          {paymentMethod && (
            <tr>
              <td colSpan={3} className="text-xs text-gray-600 pt-2">
                Payment: {PAYMENT_LABELS[paymentMethod] || paymentMethod}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
