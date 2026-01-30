"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const PAYMENT_LABELS: Record<string, string> = {
  "usdc-base": "USDC on Base",
  "usdc-ethereum": "USDC on Ethereum",
  "eth-base": "ETH on Base",
  "eth-ethereum": "ETH on Ethereum",
  "bread-base": "$BREAD on Base",
  "cult-ethereum": "$CULT on Ethereum",
};

function getExplorerUrl(txHash: string, chain: string): string {
  if (chain === "base") return `https://basescan.org/tx/${txHash}`;
  return `https://etherscan.io/tx/${txHash}`;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const paymentMethod = searchParams.get("paymentMethod");
  const paymentAmount = searchParams.get("paymentAmount");
  const paymentChain = searchParams.get("paymentChain");
  const txHash = searchParams.get("txHash");

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Order Received</h1>
      {orderId ? (
        <>
          <p className="mb-2">Thank you for your order.</p>
          <p className="mb-4">
            Order ID: <strong>{orderId}</strong>
          </p>
          {paymentMethod && (
            <p className="text-sm mb-2">
              Payment: {PAYMENT_LABELS[paymentMethod] || paymentMethod}
              {paymentAmount && ` · Amount: ${paymentAmount}`}
              {paymentChain && ` · Chain: ${paymentChain}`}
            </p>
          )}
          {txHash && paymentChain && (
            <p className="text-sm mb-2">
              <a
                href={getExplorerUrl(txHash, paymentChain)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00c] hover:underline"
              >
                View transaction on {paymentChain === "base" ? "BaseScan" : "Etherscan"}
              </a>
            </p>
          )}
          <p className="text-sm text-gray-600 mb-4">
            We&apos;ll bake next day, vacuum seal, and ship the day after
            cooling. Check your email for updates.
          </p>
        </>
      ) : (
        <p className="mb-4">Order submitted. Check your email for confirmation.</p>
      )}
      <Link href="/shop" className="text-[#00c] hover:underline">
        continue shopping →
      </Link>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<p>loading...</p>}>
      <SuccessContent />
    </Suspense>
  );
}
