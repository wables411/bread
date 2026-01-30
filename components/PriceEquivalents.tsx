"use client";

import { useState, useEffect, useCallback } from "react";
import { PAYMENT_OPTIONS } from "@/lib/payment-options";
import { fetchAllPrices, calcTokenAmount } from "@/lib/prices";
import type { PaymentMethodId } from "@/lib/prices";

const LABELS: Record<PaymentMethodId, string> = {
  "usdc-base": "USDC-Base",
  "usdc-ethereum": "USDC-Eth",
  "eth-base": "ETH-Base",
  "eth-ethereum": "ETH-Eth",
  "bread-base": "$BREAD-Base",
  "cult-ethereum": "$CULT-Eth",
};

function formatAmount(amount: number, decimals: number): string {
  if (decimals <= 6) return amount.toFixed(6);
  return amount.toLocaleString("en-US", {
    maximumFractionDigits: 6,
    minimumFractionDigits: 2,
  });
}

interface PriceEquivalentsProps {
  totalUsd: number;
  compact?: boolean;
}

export function PriceEquivalents({ totalUsd, compact }: PriceEquivalentsProps) {
  const [prices, setPrices] = useState<Record<PaymentMethodId, number | null> | null>(null);
  const [countdown, setCountdown] = useState(30);

  const fetchPrices = useCallback(async () => {
    const p = await fetchAllPrices();
    setPrices(p);
    setCountdown(30);
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          fetchPrices();
          return 30;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [fetchPrices]);

  if (!prices) {
    return <p className="text-sm text-gray-500">loading prices...</p>;
  }

  return (
    <div className={compact ? "text-sm" : ""}>
      <p className="text-xs text-gray-500 mb-1">
        Live equivalents (refresh in {countdown}s)
      </p>
      <div className={compact ? "space-y-0.5" : "space-y-1"}>
        {(Object.keys(prices) as PaymentMethodId[]).map((id) => {
          const price = prices[id];
          const opt = PAYMENT_OPTIONS.find((o) => o.id === id);
          const amount = price && price > 0 ? calcTokenAmount(totalUsd, price) : null;
          return (
            <div key={id} className="flex justify-between text-sm">
              <span>{LABELS[id]}</span>
              <span className="font-mono">
                {amount !== null
                  ? `${formatAmount(amount, opt?.decimals ?? 18)} ${opt?.token ?? id}`
                  : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
