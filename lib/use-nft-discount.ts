"use client";

import { useAccount, useReadContract } from "wagmi";
import { NFT_READ_CONFIG } from "./on-chain";

const DISCOUNT_PERCENT = 15; // 15% off for NFT holders

export function useNftDiscount() {
  const { address } = useAccount();

  // Check bread-delivery on Base (most likely to hold)
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

  const totalNfts =
    Number(breadDeliveryBalance || 0) +
    Number(cinnabunzBalance || 0) +
    Number(bread8Balance || 0);

  const hasDiscount = totalNfts > 0;
  const discountPercent = hasDiscount ? DISCOUNT_PERCENT : 0;

  return {
    hasDiscount,
    discountPercent,
    totalNfts,
    applyDiscount: (amount: number) =>
      hasDiscount ? amount * (1 - DISCOUNT_PERCENT / 100) : amount,
  };
}
