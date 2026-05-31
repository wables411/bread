"use client";

import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { UNISWAP_V3_POSITIONS_ADDRESS, BREAD_TOKEN_ADDRESS, BASE_CHAIN_ID } from "./constants";

// WETH on Base
const WETH_BASE = "0x4200000000000000000000000000000000000006";

const POSITION_MANAGER_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "owner", type: "address" }, { name: "index", type: "uint256" }],
    name: "tokenOfOwnerByIndex",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "positions",
    outputs: [
      { name: "nonce", type: "uint96" },
      { name: "operator", type: "address" },
      { name: "token0", type: "address" },
      { name: "token1", type: "address" },
      { name: "fee", type: "uint24" },
      { name: "tickLower", type: "int24" },
      { name: "tickUpper", type: "int24" },
      { name: "liquidity", type: "uint128" },
      { name: "feeGrowthInside0LastX128", type: "uint256" },
      { name: "feeGrowthInside1LastX128", type: "uint256" },
      { name: "tokensOwed0", type: "uint128" },
      { name: "tokensOwed1", type: "uint128" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Checks if the connected wallet has an active LP position in the BREAD/WETH pool on Base.
 * Verifies on-chain by reading position token IDs and checking token0/token1 match.
 */
export function useBreadLp() {
  const { address } = useAccount();

  // Step 1: Get total LP NFT count for this wallet
  const { data: positionCount } = useReadContract({
    address: UNISWAP_V3_POSITIONS_ADDRESS,
    abi: POSITION_MANAGER_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: BASE_CHAIN_ID,
    query: { enabled: !!address },
  });

  const count = Number(positionCount || 0);
  // Cap to first 10 positions to avoid excessive RPC calls
  const indices = Array.from({ length: Math.min(count, 10) }, (_, i) => i);

  // Step 2: Get token IDs for each position
  const { data: tokenIds } = useReadContracts({
    contracts: indices.map((i) => ({
      address: UNISWAP_V3_POSITIONS_ADDRESS,
      abi: POSITION_MANAGER_ABI,
      functionName: "tokenOfOwnerByIndex" as const,
      args: [address!, BigInt(i)] as const,
      chainId: BASE_CHAIN_ID,
    })),
    query: { enabled: !!address && count > 0 },
  });

  // Step 3: Get position details for each token ID
  const validTokenIds = (tokenIds || [])
    .filter((r) => r.status === "success" && r.result !== undefined)
    .map((r) => r.result as bigint);

  const { data: positions } = useReadContracts({
    contracts: validTokenIds.map((tokenId) => ({
      address: UNISWAP_V3_POSITIONS_ADDRESS,
      abi: POSITION_MANAGER_ABI,
      functionName: "positions" as const,
      args: [tokenId] as const,
      chainId: BASE_CHAIN_ID,
    })),
    query: { enabled: validTokenIds.length > 0 },
  });

  // Step 4: Filter for BREAD/WETH positions with active liquidity
  const breadPositions = (positions || [])
    .filter((r) => r.status === "success" && r.result)
    .map((r) => r.result as readonly [bigint, string, string, string, number, number, number, bigint, bigint, bigint, bigint, bigint])
    .filter(([, , token0, token1, , , , liquidity]) => {
      const t0 = token0.toLowerCase();
      const t1 = token1.toLowerCase();
      const breadAddr = BREAD_TOKEN_ADDRESS.toLowerCase();
      const wethAddr = WETH_BASE.toLowerCase();
      const isBreadPool =
        (t0 === breadAddr && t1 === wethAddr) ||
        (t0 === wethAddr && t1 === breadAddr);
      const hasLiquidity = liquidity > BigInt(0);
      return isBreadPool && hasLiquidity;
    });

  return {
    hasBreadLp: breadPositions.length > 0,
    positionCount: breadPositions.length,
    totalPositions: count,
    loading: !address ? false : count > 0 && !positions,
  };
}
