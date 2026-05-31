"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useReadContract } from "wagmi";
import { NFT_READ_CONFIG } from "@/lib/on-chain";
import { useBreadLp } from "@/lib/use-bread-lp";
import { BREAD_TOKEN_ADDRESS, BASE_CHAIN_ID } from "@/lib/constants";

const ERC20_BALANCE_ABI = [
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

interface LoyaltyCard {
  wallet_address: string;
  display_name: string;
  pfp_url: string | null;
  points: number;
  last_check_in: string | null;
}

export default function CardPage() {
  const { address, isConnected } = useAccount();
  const [card, setCard] = useState<LoyaltyCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkinMsg, setCheckinMsg] = useState("");

  // Read NFT balances
  const { data: breadDeliveryBalance } = useReadContract({
    address: NFT_READ_CONFIG.breadDelivery.address,
    abi: NFT_READ_CONFIG.breadDelivery.abi,
    functionName: "balanceOf",
    args: address ? [address, BigInt(1)] : undefined,
    chainId: NFT_READ_CONFIG.breadDelivery.chainId,
    query: { enabled: !!address },
  });

  const { data: cinnabunzBalance } = useReadContract({
    address: NFT_READ_CONFIG.cinnabunz.address,
    abi: NFT_READ_CONFIG.cinnabunz.abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: NFT_READ_CONFIG.cinnabunz.chainId,
    query: { enabled: !!address },
  });

  const { data: bread8Balance } = useReadContract({
    address: NFT_READ_CONFIG.bread8.address,
    abi: NFT_READ_CONFIG.bread8.abi,
    functionName: "balanceOf",
    args: address ? [address, BigInt(1)] : undefined,
    chainId: NFT_READ_CONFIG.bread8.chainId,
    query: { enabled: !!address },
  });

  // Read $BREAD token balance
  const { data: breadTokenBalance } = useReadContract({
    address: BREAD_TOKEN_ADDRESS,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: BASE_CHAIN_ID,
    query: { enabled: !!address },
  });

  // Read BREAD/WETH LP positions (verifies pool token pair on-chain)
  const { hasBreadLp, positionCount: lpPositionCount } = useBreadLp();

  const nftCount = (
    Number(breadDeliveryBalance || 0) +
    Number(cinnabunzBalance || 0) +
    Number(bread8Balance || 0)
  );

  const hasLp = hasBreadLp;

  // Fetch loyalty card
  const fetchCard = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/loyalty?wallet=${address.toLowerCase()}`);
      const json = await res.json();
      setCard(json.card);
      if (json.card) setNameInput(json.card.display_name);
    } catch { /* ignore */ }
    setLoading(false);
  }, [address]);

  useEffect(() => { fetchCard(); }, [fetchCard]);

  // Create card
  const createCard = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetch("/api/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address }),
      });
      const json = await res.json();
      setCard(json.card);
      if (json.card) setNameInput(json.card.display_name);
    } catch { /* ignore */ }
    setLoading(false);
  };

  // Update name
  const saveName = async () => {
    if (!address || !nameInput.trim()) return;
    await fetch("/api/loyalty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet: address, display_name: nameInput.trim() }),
    });
    setCard((c) => c ? { ...c, display_name: nameInput.trim() } : c);
    setEditingName(false);
  };

  // Check in
  const checkIn = async () => {
    if (!address) return;
    setCheckingIn(true);
    setCheckinMsg("");
    try {
      const res = await fetch("/api/loyalty/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, nft_count: nftCount, has_lp: hasLp }),
      });
      const json = await res.json();
      if (json.points_earned) {
        setCheckinMsg(`+${json.points_earned} points!`);
        setCard(json.card);
      } else {
        setCheckinMsg(json.message || "Check-in complete");
      }
    } catch {
      setCheckinMsg("Error checking in");
    }
    setCheckingIn(false);
  };

  if (!isConnected) {
    return (
      <div>
        <h1 className="text-xl font-bold mb-4">Loyalty Card</h1>
        <p className="mb-4">Connect your wallet to register or view your loyalty card.</p>
        <p className="text-sm text-gray-600">Use the wallet button in the navbar to connect.</p>
      </div>
    );
  }

  if (loading && !card) {
    return (
      <div>
        <h1 className="text-xl font-bold mb-4">Loyalty Card</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!card) {
    return (
      <div>
        <h1 className="text-xl font-bold mb-4">Loyalty Card</h1>
        <p className="mb-4">No loyalty card found for this wallet.</p>
        <button
          type="button"
          onClick={createCard}
          className="border border-black px-4 py-2 hover:bg-gray-100"
        >
          Register Card
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Loyalty Card</h1>

      {/* The Card */}
      <div className="border-2 border-black p-4 max-w-md relative">
        {/* Points ticker - top right corner */}
        <div className="absolute top-2 right-3 font-mono text-lg font-bold">
          {card.points} pts
        </div>

        {/* PFP + Name */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-16 h-16 border border-black flex items-center justify-center overflow-hidden bg-gray-100">
            {card.pfp_url ? (
              <img src={card.pfp_url} alt="pfp" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">🍞</span>
            )}
          </div>
          <div>
            {editingName ? (
              <div className="flex gap-2">
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  maxLength={32}
                  className="border border-black px-2 py-1 text-sm w-32"
                />
                <button onClick={saveName} className="text-[#00c] hover:underline text-sm">save</button>
                <button onClick={() => setEditingName(false)} className="text-gray-500 hover:underline text-sm">cancel</button>
              </div>
            ) : (
              <div>
                <span className="font-bold">{card.display_name}</span>
                <button onClick={() => setEditingName(true)} className="ml-2 text-[#00c] hover:underline text-xs">edit</button>
              </div>
            )}
            <p className="text-xs text-gray-500 font-mono mt-1">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
        </div>

        {/* Balances */}
        <div className="border-t border-black pt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>$BREAD balance</span>
            <span className="font-mono">{breadTokenBalance ? (Number(breadTokenBalance) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0"}</span>
          </div>
          <div className="flex justify-between">
            <span>NFTs held</span>
            <span className="font-mono">{nftCount}</span>
          </div>
          <div className="flex justify-between">
            <span>BREAD/WETH LP</span>
            <span className="font-mono">{lpPositionCount > 0 ? `${lpPositionCount} active` : "none"}</span>
          </div>
        </div>

        {/* Check-in button */}
        <div className="border-t border-black pt-3 mt-3">
          <button
            type="button"
            onClick={checkIn}
            disabled={checkingIn}
            className="border border-black px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-50"
          >
            {checkingIn ? "..." : "Daily Check-in"}
          </button>
          {checkinMsg && (
            <span className="ml-3 text-sm font-bold">{checkinMsg}</span>
          )}
        </div>
      </div>

      {/* NFT Details */}
      <div className="mt-6 text-sm">
        <h2 className="font-bold mb-2">Your NFTs</h2>
        <div className="space-y-1">
          <p>bread-delivery (Base): {Number(breadDeliveryBalance || 0)}</p>
          <p>cinnabunz (ETH): {Number(cinnabunzBalance || 0)}</p>
          <p>bread-8 (ETH): {Number(bread8Balance || 0)}</p>
        </div>
      </div>
    </div>
  );
}
