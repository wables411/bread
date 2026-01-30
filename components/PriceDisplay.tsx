"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAllPrices } from "@/lib/prices";
import type { PaymentMethodId } from "@/lib/prices";

type CurrencyView = "usdc" | "bread" | "cult" | "eth";

const CYCLE: CurrencyView[] = ["usdc", "bread", "cult", "eth"];

const PRICE_KEYS: Record<CurrencyView, PaymentMethodId> = {
  usdc: "usdc-base",
  bread: "bread-base",
  cult: "cult-ethereum",
  eth: "eth-base",
};

const LABELS: Record<CurrencyView, string> = {
  usdc: "usdc",
  bread: "$bread",
  cult: "$cult",
  eth: "eth",
};

function formatAmount(amount: number): string {
  if (amount >= 1000) {
    return amount.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
  }
  if (amount >= 1) {
    return amount.toFixed(2);
  }
  const s = amount.toFixed(6);
  return s.replace(/\.?0+$/, "") || "0";
}

interface PriceDisplayProps {
  usdAmount: number;
  className?: string;
}

export function PriceDisplay({ usdAmount, className = "" }: PriceDisplayProps) {
  const [view, setView] = useState<CurrencyView>("usdc");
  const [prices, setPrices] = useState<Record<PaymentMethodId, number | null> | null>(null);

  const fetchPrices = useCallback(async () => {
    const p = await fetchAllPrices();
    setPrices(p);
  }, []);

  useEffect(() => {
    fetchPrices();
    const timer = setInterval(fetchPrices, 30000);
    return () => clearInterval(timer);
  }, [fetchPrices]);

  const handleClick = () => {
    const idx = CYCLE.indexOf(view);
    setView(CYCLE[(idx + 1) % CYCLE.length]);
  };

  if (!prices) {
    return (
      <span className={`cursor-pointer ${className}`} onClick={handleClick}>
        {usdAmount} usdc
      </span>
    );
  }

  const priceKey = PRICE_KEYS[view];
  const priceUsd = prices[priceKey];
  const label = LABELS[view];

  let display: string;
  if (view === "usdc") {
    display = `${usdAmount} ${label}`;
  } else if (priceUsd && priceUsd > 0) {
    const amount = usdAmount / priceUsd;
    display = `${formatAmount(amount)} ${label}`;
  } else {
    display = `— ${label}`;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`cursor-pointer hover:underline text-left ${className}`}
      title="Click to toggle currency"
    >
      {display}
    </button>
  );
}
