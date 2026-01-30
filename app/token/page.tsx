"use client";

import { useState, useEffect } from "react";
import { BREAD_TOKEN_ADDRESS, CULT_TOKEN_ADDRESS } from "@/lib/constants";
import { fetchPriceUsd } from "@/lib/prices";

const BREAD_DEXSCREENER = `https://dexscreener.com/base/${BREAD_TOKEN_ADDRESS}`;
const BREAD_UNISWAP = `https://app.uniswap.org/swap?outputCurrency=${BREAD_TOKEN_ADDRESS}&chain=base`;
const BREAD_BASESCAN = `https://basescan.org/token/${BREAD_TOKEN_ADDRESS}`;

const CULT_DEXSCREENER = `https://dexscreener.com/ethereum/${CULT_TOKEN_ADDRESS}`;
const CULT_UNISWAP = `https://app.uniswap.org/swap?outputCurrency=${CULT_TOKEN_ADDRESS}&chain=ethereum`;
const CULT_ETHERSCAN = `https://etherscan.io/token/${CULT_TOKEN_ADDRESS}`;

function TokenCard({
  name,
  address,
  price,
  loading,
  dexLink,
  swapLink,
  explorerLink,
  chain,
  onCopy,
}: {
  name: string;
  address: string;
  price: number | null;
  loading: boolean;
  dexLink: string;
  swapLink: string;
  explorerLink: string;
  chain: string;
  onCopy: () => void;
}) {
  return (
    <div className="border border-black p-4 mb-4">
      <h2 className="font-bold mb-2">{name}</h2>
      <p className="text-xs text-gray-600 mb-2">Chain: {chain}</p>
      <p className="font-mono text-sm break-all mb-2">{address}</p>
      <button
        type="button"
        onClick={onCopy}
        className="text-[#00c] hover:underline text-sm mb-2"
      >
        copy contract
      </button>
      <div className="mb-2">
        {loading ? (
          <p className="text-sm">loading price...</p>
        ) : price ? (
          <p className="text-sm">${price.toFixed(6)} USD</p>
        ) : (
          <p className="text-sm text-gray-600">Price unavailable</p>
        )}
      </div>
      <ul className="space-y-1 text-sm">
        <li>
          <a href={dexLink} target="_blank" rel="noopener noreferrer" className="text-[#00c] hover:underline">
            DexScreener chart
          </a>
        </li>
        <li>
          <a href={swapLink} target="_blank" rel="noopener noreferrer" className="text-[#00c] hover:underline">
            Uniswap swap
          </a>
        </li>
        <li>
          <a href={explorerLink} target="_blank" rel="noopener noreferrer" className="text-[#00c] hover:underline">
            {chain === "Base" ? "Basescan" : "Etherscan"}
          </a>
        </li>
      </ul>
    </div>
  );
}

export default function TokenPage() {
  const [breadPrice, setBreadPrice] = useState<number | null>(null);
  const [cultPrice, setCultPrice] = useState<number | null>(null);
  const [breadLoading, setBreadLoading] = useState(true);
  const [cultLoading, setCultLoading] = useState(true);

  useEffect(() => {
    fetchPriceUsd({ type: "dexscreener", address: BREAD_TOKEN_ADDRESS })
      .then(setBreadPrice)
      .finally(() => setBreadLoading(false));
  }, []);

  useEffect(() => {
    fetchPriceUsd({ type: "dexscreener", address: CULT_TOKEN_ADDRESS })
      .then(setCultPrice)
      .finally(() => setCultLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Tokens</h1>
      <p className="mb-4">
        Pay for orders with $BREAD (Base), $CULT (Ethereum), USDC, or ETH on
        either chain.
      </p>

      <TokenCard
        name="$BREAD"
        address={BREAD_TOKEN_ADDRESS}
        price={breadPrice}
        loading={breadLoading}
        dexLink={BREAD_DEXSCREENER}
        swapLink={BREAD_UNISWAP}
        explorerLink={BREAD_BASESCAN}
        chain="Base"
        onCopy={() => navigator.clipboard.writeText(BREAD_TOKEN_ADDRESS)}
      />

      <TokenCard
        name="$CULT (Milady Cult Coin)"
        address={CULT_TOKEN_ADDRESS}
        price={cultPrice}
        loading={cultLoading}
        dexLink={CULT_DEXSCREENER}
        swapLink={CULT_UNISWAP}
        explorerLink={CULT_ETHERSCAN}
        chain="Ethereum"
        onCopy={() => navigator.clipboard.writeText(CULT_TOKEN_ADDRESS)}
      />
    </div>
  );
}
