"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { checkoutSchema, type CheckoutFormData } from "@/lib/validation";
import { useCartStore } from "@/lib/cart-store";
import { OrderSummary } from "./OrderSummary";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import { SHIPPING_RATES } from "@/lib/constants";
import type { PaymentMethod, ShippingOption } from "@/lib/types";
import { toast } from "sonner";

export function CheckoutForm() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCartStore();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("usdc-base");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const handlePaymentDetails = useCallback((amount: string) => setPaymentAmount(amount), []);

  const {
    register,
    trigger,
    getValues,
    formState: { errors },
    watch,
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shipping_option: "2day",
    },
  });

  const formData = watch();
  const shippingOption = (formData.shipping_option as ShippingOption) || "2day";
  const totalUsd = subtotal() + SHIPPING_RATES[shippingOption];

  const prepareOrder = useCallback(async (): Promise<CheckoutFormData | null> => {
    setError(null);
    const valid = await trigger();
    if (!valid) return null;
    return getValues();
  }, [trigger, getValues]);

  const createOrderOnPaySuccess = useCallback(
    async (txHash: string) => {
      setError(null);
      try {
        const data = getValues();
        const orderItems = items.map((i) => ({
          product: i.product,
          qty: i.qty,
          price: i.price,
        }));

        const res = await fetch("/api/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_name: data.customer_name,
            email: data.email,
            address: data.address,
            city: data.city,
            state: data.state.toUpperCase(),
            zip: data.zip,
            phone: data.phone,
            items: orderItems,
            shipping_option: shippingOption,
            payment_method: paymentMethod,
            payment_amount: paymentAmount || null,
            total_usd: totalUsd,
            tx_hash: txHash,
            notes: data.notes || null,
          }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Order failed");

        clearCart();
        toast.success("Order placed!");
        const params = new URLSearchParams({ orderId: json.orderId || "" });
        params.set("paymentMethod", paymentMethod);
        if (paymentAmount) params.set("paymentAmount", paymentAmount);
        params.set("paymentChain", paymentMethod.includes("base") ? "base" : "ethereum");
        params.set("txHash", txHash);
        router.push(`/success?${params.toString()}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Order failed";
        setError(msg);
        toast.error(msg);
      }
    },
    [getValues, items, shippingOption, paymentMethod, paymentAmount, totalUsd, clearCart, router]
  );

  if (items.length === 0) {
    return (
      <div>
        <p>Your cart is empty.</p>
        <a href="/shop" className="text-[#00c] hover:underline">
          shop →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
      <h1 className="text-xl font-bold">Checkout</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-bold mb-2">Shipping</h2>
          <div className="space-y-2">
            <div>
              <label htmlFor="customer_name">Name</label>
              <input
                id="customer_name"
                {...register("customer_name")}
                className="block w-full border border-black px-2 py-1 mt-1"
              />
              {errors.customer_name && (
                <p className="text-red-600 text-sm">{errors.customer_name.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                {...register("email")}
                className="block w-full border border-black px-2 py-1 mt-1"
              />
              {errors.email && (
                <p className="text-red-600 text-sm">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="address">Address</label>
              <input
                id="address"
                {...register("address")}
                className="block w-full border border-black px-2 py-1 mt-1"
              />
              {errors.address && (
                <p className="text-red-600 text-sm">{errors.address.message}</p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor="city">City</label>
                <input
                  id="city"
                  {...register("city")}
                  className="block w-full border border-black px-2 py-1 mt-1"
                />
                {errors.city && (
                  <p className="text-red-600 text-sm">{errors.city.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="state">State</label>
                <input
                  id="state"
                  {...register("state")}
                  placeholder="CA"
                  maxLength={2}
                  className="block w-full border border-black px-2 py-1 mt-1"
                />
                {errors.state && (
                  <p className="text-red-600 text-sm">{errors.state.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="zip">ZIP</label>
                <input
                  id="zip"
                  {...register("zip")}
                  placeholder="90210"
                  maxLength={5}
                  className="block w-full border border-black px-2 py-1 mt-1"
                />
                {errors.zip && (
                  <p className="text-red-600 text-sm">{errors.zip.message}</p>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                {...register("phone")}
                className="block w-full border border-black px-2 py-1 mt-1"
              />
              {errors.phone && (
                <p className="text-red-600 text-sm">{errors.phone.message}</p>
              )}
            </div>
            <div>
              <label>Shipping</label>
              <div className="mt-1">
                <label className="mr-4">
                  <input
                    type="radio"
                    {...register("shipping_option")}
                    value="2day"
                  />{" "}
                  2-Day $12.99
                </label>
                <label>
                  <input
                    type="radio"
                    {...register("shipping_option")}
                    value="overnight"
                  />{" "}
                  Overnight $24.99
                </label>
              </div>
            </div>
            <div>
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                {...register("notes")}
                className="block w-full border border-black px-2 py-1 mt-1"
                rows={2}
              />
            </div>
          </div>
        </div>

        <div>
          <OrderSummary items={items} shippingOption={shippingOption} paymentMethod={paymentMethod} />
          <div className="mt-4">
            <h2 className="font-bold mb-2">Payment</h2>
            <PaymentMethodSelector
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              totalUsd={totalUsd}
              onPaymentDetails={handlePaymentDetails}
              prepareOrder={prepareOrder}
              onPaySuccess={createOrderOnPaySuccess}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-red-600">{error}</p>
      )}

      <p className="text-sm text-gray-600">
        Fill shipping details, select payment, then click &quot;Send&quot; above. Order is created automatically when your payment confirms.
      </p>
    </form>
  );
}
