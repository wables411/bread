/**
 * Server-side on-chain payment verification via free public RPCs.
 *
 * Outcomes:
 *  - verified:  tx succeeded, correct token, paid the merchant, amount covers total
 *  - underpaid: money reached the merchant but USD value is short of the total
 *  - unknown:   tx looks like a payment but RPC/price data unavailable — accept
 *               the order flagged for manual review (never lose a paying customer)
 *  - rejected:  tx missing/failed/paid someone else — no money received, no order
 */
import {
  createPublicClient,
  fallback,
  http,
  parseEventLogs,
  formatUnits,
  type PublicClient,
} from "viem";
import { base, mainnet } from "viem/chains";
import type { PaymentOption } from "./payment-options";
import { fetchPriceUsd } from "./prices";

const ERC20_TRANSFER_EVENT_ABI = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const;

const BASE_RPCS = [
  "https://mainnet.base.org",
  "https://base-rpc.publicnode.com",
  "https://base.llamarpc.com",
];
const ETH_RPCS = [
  "https://ethereum-rpc.publicnode.com",
  "https://eth.llamarpc.com",
  "https://cloudflare-eth.com",
];

function clientFor(chain: "base" | "ethereum"): PublicClient {
  const urls = chain === "base" ? BASE_RPCS : ETH_RPCS;
  return createPublicClient({
    chain: chain === "base" ? base : mainnet,
    transport: fallback(urls.map((u) => http(u, { timeout: 8_000 }))),
  }) as PublicClient;
}

/** How far below the quoted USD total we still accept (price drift between quote and confirm). */
const USD_TOLERANCE = 0.95;

export interface VerifyResult {
  outcome: "verified" | "underpaid" | "unknown" | "rejected";
  reason: string;
  /** Wallet that sent the tx */
  from?: string;
  /** Token amount that reached the merchant */
  paidTokenAmount?: number;
  /** Estimated USD value of the payment */
  paidUsd?: number | null;
}

export async function verifyPayment(params: {
  option: PaymentOption;
  txHash: string;
  merchantAddress: string;
  /** Smallest acceptable USD total (e.g. discounted total) */
  minUsd: number;
}): Promise<VerifyResult> {
  const { option, txHash, merchantAddress, minUsd } = params;
  const merchant = merchantAddress.toLowerCase();
  const client = clientFor(option.chain);

  // Fetch the receipt; retry briefly in case the public RPC lags the wallet's node
  let receipt;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      receipt = await client.getTransactionReceipt({
        hash: txHash as `0x${string}`,
      });
      break;
    } catch (err) {
      const notFound =
        err instanceof Error && /not.*found|could not be found/i.test(err.message);
      if (attempt === 2) {
        return notFound
          ? { outcome: "rejected", reason: "Transaction not found on chain" }
          : { outcome: "unknown", reason: "RPC unavailable, needs manual review" };
      }
      await new Promise((r) => setTimeout(r, 2_500));
    }
  }
  if (!receipt) {
    return { outcome: "unknown", reason: "RPC unavailable, needs manual review" };
  }

  if (receipt.status !== "success") {
    return { outcome: "rejected", reason: "Transaction reverted on chain" };
  }

  const from = receipt.from.toLowerCase();
  let paidTokenAmount: number;

  try {
    if (option.contractAddress) {
      // ERC20: sum Transfer events from the expected token contract to the merchant
      const transfers = parseEventLogs({
        abi: ERC20_TRANSFER_EVENT_ABI,
        logs: receipt.logs,
        eventName: "Transfer",
      }).filter(
        (log) =>
          log.address.toLowerCase() === option.contractAddress!.toLowerCase() &&
          log.args.to.toLowerCase() === merchant
      );
      if (transfers.length === 0) {
        return {
          outcome: "rejected",
          reason: `No ${option.token} transfer to merchant in this transaction`,
          from,
        };
      }
      const total = transfers.reduce((sum, t) => sum + t.args.value, BigInt(0));
      paidTokenAmount = Number(formatUnits(total, option.decimals));
    } else {
      // Native ETH: recipient and value are on the transaction itself
      const tx = await client.getTransaction({ hash: txHash as `0x${string}` });
      if ((tx.to ?? "").toLowerCase() !== merchant) {
        return {
          outcome: "rejected",
          reason: "Transaction recipient is not the merchant wallet",
          from,
        };
      }
      paidTokenAmount = Number(formatUnits(tx.value, 18));
    }
  } catch {
    return {
      outcome: "unknown",
      reason: "Could not decode transaction, needs manual review",
      from,
    };
  }

  // Convert to USD. USDC is treated as $1; other tokens use live price feeds.
  let priceUsd: number | null = option.token === "USDC" ? 1 : null;
  if (priceUsd === null) {
    priceUsd = await fetchPriceUsd(option.priceSource);
  }
  if (priceUsd === null) {
    return {
      outcome: "unknown",
      reason: "Payment reached merchant but token price unavailable — verify manually",
      from,
      paidTokenAmount,
      paidUsd: null,
    };
  }

  const paidUsd = paidTokenAmount * priceUsd;
  if (paidUsd >= minUsd * USD_TOLERANCE) {
    return { outcome: "verified", reason: "ok", from, paidTokenAmount, paidUsd };
  }
  return {
    outcome: "underpaid",
    reason: `Paid ~$${paidUsd.toFixed(2)} of $${minUsd.toFixed(2)} minimum`,
    from,
    paidTokenAmount,
    paidUsd,
  };
}

// --- NFT discount check (server-side mirror of use-nft-discount) ---

const ERC721_BALANCE_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const ERC1155_BALANCE_ABI = [
  {
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

import { NFT_COLLECTIONS } from "./constants";

export async function senderHoldsDiscountNft(address: string): Promise<boolean> {
  const baseClient = clientFor("base");
  const ethClient = clientFor("ethereum");
  const addr = address as `0x${string}`;
  const checks = await Promise.allSettled([
    baseClient.readContract({
      address: NFT_COLLECTIONS.breadDelivery.address,
      abi: ERC1155_BALANCE_ABI,
      functionName: "balanceOf",
      args: [addr, BigInt(1)],
    }),
    ethClient.readContract({
      address: NFT_COLLECTIONS.cinnabunz.address,
      abi: ERC721_BALANCE_ABI,
      functionName: "balanceOf",
      args: [addr],
    }),
    ethClient.readContract({
      address: NFT_COLLECTIONS.bread8.address,
      abi: ERC1155_BALANCE_ABI,
      functionName: "balanceOf",
      args: [addr, BigInt(1)],
    }),
  ]);
  return checks.some(
    (c) => c.status === "fulfilled" && (c.value as bigint) > BigInt(0)
  );
}
