"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { checkoutSchema, type CheckoutFormData } from "@/lib/validation";
import { useCartStore } from "@/lib/cart-store";
import { OrderSummary } from "./OrderSummary";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import { orderWeightOz } from "@/lib/constants";
import { useNftDiscount } from "@/lib/use-nft-discount";
import type { PaymentMethod } from "@/lib/types";
import { toast } from "sonner";

/** Quote from /api/shipping-quote — prices only, computed server-side */
type ShippingQuoteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "unsupported"; reason: string }
  | { status: "ready"; twoday: number; oneday: number | null };

const SPEED_LABELS = {
  oneday: "1-day (arrives Tuesday)",
  twoday: "2-day (arrives Wednesday)",
} as const;

export function CheckoutForm() {
  const router = useRouter();
  const { items, subtotal, clearCart, itemCount } = useCartStore();
  const { hasDiscount, discountPercent, applyDiscount } = useNftDiscount();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("usdc-base");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  /** Set when payment confirmed on-chain but order submission failed — allows retry */
  const [failedTxHash, setFailedTxHash] = useState<string | null>(null);
  /** null = loading; { open, shipDate, message } once /api/weekly-inventory answers */
  const [shopStatus, setShopStatus] = useState<{
    open: boolean;
    shipDate?: string;
    message?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/weekly-inventory")
      .then((r) => r.json())
      .then((inv) =>
        setShopStatus({
          open: inv.shopOpen !== false,
          shipDate: inv.shipDate,
          message: inv.closedMessage,
        })
      )
      .catch(() => setShopStatus({ open: true })); // fail open; server re-checks
  }, []);
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
      shipping_option: "twoday",
    },
  });

  const formData = watch();
  const zip = formData.zip || "";
  const [quote, setQuote] = useState<ShippingQuoteState>({ status: "idle" });

  // Order shipping weight — same function the server uses
  const weightOz = orderWeightOz(items);

  // Fetch shipping prices once a full ZIP is entered (and when weight changes)
  useEffect(() => {
    if (!/^\d{5}$/.test(zip)) {
      setQuote({ status: "idle" });
      return;
    }
    let cancelled = false;
    setQuote({ status: "loading" });
    const timer = setTimeout(() => {
      fetch(`/api/shipping-quote?zip=${zip}&weightOz=${weightOz}`)
        .then((r) => r.json())
        .then((q) => {
          if (cancelled) return;
          if (q.supported) {
            setQuote({ status: "ready", twoday: q.twoday, oneday: q.oneday });
          } else {
            setQuote({
              status: "unsupported",
              reason: q.reason || "We can't ship to this ZIP code.",
            });
          }
        })
        .catch(() => {
          if (!cancelled)
            setQuote({
              status: "unsupported",
              reason: "Couldn't look up shipping — try again.",
            });
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [zip, weightOz]);

  const requestedOption = formData.shipping_option || "twoday";
  // 1-day isn't offered everywhere (e.g. AK/HI) — fall back to 2-day
  const shippingOption: "oneday" | "twoday" =
    requestedOption === "oneday" &&
    quote.status === "ready" &&
    quote.oneday === null
      ? "twoday"
      : (requestedOption as "oneday" | "twoday");
  const shippingPrice =
    quote.status === "ready"
      ? shippingOption === "oneday"
        ? (quote.oneday ?? quote.twoday)
        : quote.twoday
      : null;
  const rawTotal = subtotal() + (shippingPrice ?? 0);
  const totalUsd = hasDiscount ? Math.round(applyDiscount(rawTotal) * 100) / 100 : rawTotal;

  const prepareOrder = useCallback(async (): Promise<CheckoutFormData | null> => {
    setError(null);
    const valid = await trigger();
    if (!valid) return null;

    // Shipping price must be resolved from the ZIP before payment
    if (quote.status !== "ready") {
      const msg =
        quote.status === "unsupported"
          ? quote.reason
          : "Enter your ZIP code so we can price shipping first.";
      setError(msg);
      toast.error(msg);
      return null;
    }

    // Confirm the shop is open and supply exists BEFORE taking payment
    try {
      const res = await fetch("/api/weekly-inventory");
      const inv = await res.json();
      if (res.ok && inv.shopOpen === false) {
        const msg = inv.closedMessage || "Shop is closed on weekends.";
        setShopStatus({ open: false, shipDate: inv.shipDate, message: msg });
        setError(msg);
        toast.error(msg);
        return null;
      }
      if (res.ok && typeof inv.available === "number" && itemCount() > inv.available) {
        const msg =
          inv.available === 0
            ? "Sold out for this week — check back next week."
            : `Only ${inv.available} left this week. Please reduce your cart.`;
        setError(msg);
        toast.error(msg);
        return null;
      }
    } catch {
      // Inventory check unavailable — the server re-checks at order creation
    }

    return getValues();
  }, [trigger, getValues, itemCount, quote]);

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

        setFailedTxHash(null);
        clearCart();
        toast.success("Order placed!");
        const params = new URLSearchParams({ orderId: json.orderId || "" });
        params.set("paymentMethod", paymentMethod);
        if (paymentAmount) params.set("paymentAmount", paymentAmount);
        params.set("paymentChain", paymentMethod.includes("base") ? "base" : "ethereum");
        params.set("txHash", txHash);
        params.set("totalUsd", totalUsd.toString());
        router.push(`/success?${params.toString()}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Order failed";
        setFailedTxHash(txHash);
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
              {quote.status === "ready" ? (
                <div className="mt-1 space-y-1">
                  <label className="block">
                    <input
                      type="radio"
                      {...register("shipping_option")}
                      value="twoday"
                    />{" "}
                    {SPEED_LABELS.twoday} ${quote.twoday}
                  </label>
                  {quote.oneday !== null ? (
                    <label className="block">
                      <input
                        type="radio"
                        {...register("shipping_option")}
                        value="oneday"
                      />{" "}
                      {SPEED_LABELS.oneday} ${quote.oneday}
                    </label>
                  ) : (
                    <p className="text-sm text-gray-600">
                      1-day delivery isn&apos;t available for this address.
                    </p>
                  )}
                </div>
              ) : quote.status === "unsupported" ? (
                <p className="text-sm text-red-600 mt-1">{quote.reason}</p>
              ) : quote.status === "loading" ? (
                <p className="text-sm text-gray-600 mt-1">
                  Getting shipping prices…
                </p>
              ) : (
                <p className="text-sm text-gray-600 mt-1">
                  Enter your ZIP code above to see shipping prices.
                </p>
              )}
              <p className="text-sm text-gray-600 mt-1">
                All orders ship out on Monday
                {shopStatus?.shipDate ? ` (${shopStatus.shipDate})` : ""}.
              </p>
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
          <OrderSummary
            items={items}
            shipping={
              shippingPrice !== null
                ? { label: SPEED_LABELS[shippingOption], price: shippingPrice }
                : null
            }
            paymentMethod={paymentMethod}
            discountPercent={discountPercent}
          />
          <div className="mt-4">
            {shopStatus && !shopStatus.open ? (
              <div className="border border-amber-400 bg-amber-50 p-4">
                <p className="font-bold mb-1">Shop closed for the weekend</p>
                <p className="text-sm">
                  {shopStatus.message ||
                    "Order Monday through Friday — all orders ship out on Monday."}
                </p>
              </div>
            ) : quote.status !== "ready" ? (
              <p className="text-sm text-gray-600">
                Enter your shipping details (including ZIP code) to continue to
                payment.
              </p>
            ) : (
              <>
                <h2 className="font-bold mb-2">Payment</h2>
                <PaymentMethodSelector
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  totalUsd={totalUsd}
                  onPaymentDetails={handlePaymentDetails}
                  prepareOrder={prepareOrder}
                  onPaySuccess={createOrderOnPaySuccess}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-red-600">{error}</p>
      )}

      {failedTxHash && (
        <div className="border border-red-600 p-4 bg-red-50">
          <p className="font-bold text-red-700 mb-1">
            Your payment went through, but we couldn&apos;t record your order.
          </p>
          <p className="text-sm mb-2 break-all">
            Transaction: <span className="font-mono">{failedTxHash}</span>
          </p>
          <button
            type="button"
            onClick={() => createOrderOnPaySuccess(failedTxHash)}
            className="border border-black px-4 py-2 text-[#00c] hover:underline"
          >
            Retry order submission
          </button>
          <p className="text-sm text-gray-600 mt-2">
            If retrying keeps failing, email us with the transaction hash above —
            your payment is safe and we&apos;ll handle your order manually.
          </p>
        </div>
      )}

      <p className="text-sm text-gray-600">
        Fill shipping details, select payment, then click &quot;Send&quot; above. Order is created automatically when your payment confirms.
      </p>
    </form>
  );
}
