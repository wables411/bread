"use client";

import { useState, useEffect, useCallback } from "react";
import type { PaymentMethod } from "@/lib/types";
import { PAYMENT_OPTIONS, getPaymentOption } from "@/lib/payment-options";
import { fetchPriceUsd } from "@/lib/prices";
import { calcTokenAmount } from "@/lib/prices";
import { PayButton } from "./PayButton";

function getMerchantAddress(chain: "base" | "ethereum"): string {
  if (chain === "base") {
    return process.env.NEXT_PUBLIC_MERCHANT_BASE_WALLET || "0x... (set NEXT_PUBLIC_MERCHANT_BASE_WALLET)";
  }
  return process.env.NEXT_PUBLIC_MERCHANT_ETHEREUM_WALLET || process.env.NEXT_PUBLIC_MERCHANT_BASE_WALLET || "0x... (set NEXT_PUBLIC_MERCHANT_ETHEREUM_WALLET)";
}

function formatAmount(amount: number, decimals: number): string {
  if (decimals <= 6) return amount.toFixed(6);
  return amount.toLocaleString("en-US", { maximumFractionDigits: 6, minimumFractionDigits: 2 });
}

interface PaymentMethodSelectorProps {
  paymentMethod: PaymentMethod;
  setPaymentMethod: (m: PaymentMethod) => void;
  totalUsd: number;
  onPaymentDetails?: (amount: string, chain: string) => void;
  /** Called before pay - return form data if valid, null to abort */
  prepareOrder?: () => Promise<unknown>;
  /** Called when tx is confirmed */
  onPaySuccess?: (txHash: string) => void | Promise<void>;
}

export function PaymentMethodSelector({
  paymentMethod,
  setPaymentMethod,
  totalUsd,
  onPaymentDetails,
  prepareOrder,
  onPaySuccess,
}: PaymentMethodSelectorProps) {
  const [priceUsd, setPriceUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(30);

  const option = getPaymentOption(paymentMethod);

  const fetchPrice = useCallback(async () => {
    if (!option) return;
    setLoading(true);
    const price = await fetchPriceUsd(option.priceSource);
    setPriceUsd(price);
    setLoading(false);
    setCountdown(30);
  }, [option?.id]);

  useEffect(() => {
    fetchPrice();
  }, [fetchPrice]);

  // Refresh every 30s with countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          fetchPrice();
          return 30;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [fetchPrice]);

  const amount =
    option && priceUsd && priceUsd > 0
      ? calcTokenAmount(totalUsd, priceUsd)
      : null;
  const merchantAddr = option ? getMerchantAddress(option.chain) : "";

  // Notify parent of payment details for order record
  useEffect(() => {
    if (option && amount !== null && onPaymentDetails) {
      onPaymentDetails(formatAmount(amount, option.decimals), option.chain);
    }
  }, [option?.id, amount, onPaymentDetails]);

  return (
    <div>
      <h2 className="font-bold mb-2">Payment</h2>
      <p className="text-sm text-gray-600 mb-2">
        Select token + chain. Amount is priced to exact USD at checkout (5%
        buffer).
      </p>

      <div className="space-y-1 mb-4">
        {PAYMENT_OPTIONS.map((opt) => (
          <label
            key={opt.id}
            className="flex items-center gap-2 cursor-pointer border border-gray-300 px-2 py-1 hover:bg-gray-50"
          >
            <input
              type="radio"
              name="payment_method"
              value={opt.id}
              checked={paymentMethod === opt.id}
              onChange={() => setPaymentMethod(opt.id)}
            />
            <span className="font-medium">{opt.label}</span>
            <span
              className="text-xs px-1 border border-gray-400"
              title={opt.chain === "base" ? "Base" : "Ethereum"}
            >
              {opt.chain === "base" ? "Base" : "ETH"}
            </span>
          </label>
        ))}
      </div>

      {option && (
        <div className="border border-black p-4 mb-4">
          <p className="text-sm text-gray-600 mb-1">
            Price refreshes in {countdown}s
          </p>
          {loading ? (
            <p className="text-sm">loading price...</p>
          ) : amount !== null ? (
            <>
              <p className="font-bold mb-2">
                Send exactly {formatAmount(amount, option.decimals)}{" "}
                {option.token} on {option.chain === "base" ? "Base" : "Ethereum"}{" "}
                to:
              </p>
              <p className="font-mono text-sm break-all mb-2">{merchantAddr}</p>
              <p className="text-sm text-gray-600 mb-2">
                ${priceUsd?.toFixed(6) || "?"}/token · Total ≈ ${totalUsd.toFixed(2)} USD
              </p>
              <PayButton
                option={option}
                amount={amount}
                totalUsd={totalUsd}
                merchantAddress={merchantAddr}
                onBeforePay={prepareOrder}
                onPaySuccess={onPaySuccess}
              />
            </>
          ) : (
            <p className="text-sm text-amber-600">Price unavailable</p>
          )}
        </div>
      )}
    </div>
  );
}
