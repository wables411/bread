/**
 * Dynamic price fetcher for checkout.
 * DexScreener (primary), GeckoTerminal (fallback for Base tokens), CoinGecko (ETH/USDC).
 */

export type PriceSource =
  | { type: "dexscreener"; address: string; chain?: "base" | "ethereum" }
  | { type: "coingecko"; id: string };

// DexScreener response shape
interface DexScreenerPair {
  priceUsd?: string;
  baseToken?: { symbol: string };
}
interface DexScreenerResponse {
  pairs?: DexScreenerPair[] | null;
}

// CoinGecko response shape
interface CoinGeckoResponse {
  [id: string]: { usd?: number } | undefined;
}

/**
 * Fetch token price from DexScreener by contract address.
 */
async function fetchFromDexScreener(address: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${address}`
    );
    const data: DexScreenerResponse = await res.json();
    const pairs = data?.pairs;
    if (!pairs || pairs.length === 0) return null;
    const pair = pairs.find((p) => p.priceUsd && parseFloat(p.priceUsd) > 0);
    const priceUsd = pair?.priceUsd ?? pairs[0]?.priceUsd;
    if (!priceUsd) return null;
    const price = parseFloat(priceUsd);
    return price > 0 ? price : null;
  } catch {
    return null;
  }
}

/**
 * Fetch token price from GeckoTerminal (works for Base tokens DexScreener misses).
 * Network: base, ethereum, etc. Rate limit ~10/min.
 */
async function fetchFromGeckoTerminal(
  network: string,
  address: string
): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.geckoterminal.com/api/v2/simple/networks/${network}/token_price/${address}`,
      { headers: { Accept: "application/json;version=20230203" } }
    );
    const data = await res.json();
    const prices = data?.data?.attributes?.token_prices;
    if (!prices || typeof prices !== "object") return null;
    const addr = Object.keys(prices).find(
      (k) => k.toLowerCase() === address.toLowerCase()
    );
    const priceStr = addr ? prices[addr] : null;
    if (!priceStr) return null;
    const price = parseFloat(priceStr);
    return price > 0 ? price : null;
  } catch {
    return null;
  }
}

// Uniswap V3 pools on Base, read directly when indexers/CoinGecko are down.
// The pool's exchange rate is always live on-chain — this matches what the
// Uniswap site shows. slot0() selector = 0x3850c7bd; its first 32-byte word
// is sqrtPriceX96, and token1-per-token0 = (sqrtPriceX96 / 2^96)^2.
const SLOT0_SELECTOR = "0x3850c7bd";
const BASE_RPCS = ["https://mainnet.base.org", "https://base.llamarpc.com"];
// BREAD/WETH 0.3%: token0 = WETH, token1 = BREAD (both 18 decimals)
const BREAD_V3_POOL = "0x6b7bda00044C4eeF7447f9363d2DEc70eE1fA7b7";
// WETH/USDC 0.05%: token0 = WETH (18), token1 = USDC (6) — deepest ETH pool
// on Base, used as the ETH/USD fallback when CoinGecko rate-limits (429).
const ETH_USDC_V3_POOL = "0xd0b53D9277642d899DF5C87A3966A349A798F224";

/** Read slot0's sqrtPriceX96 from a V3 pool, trying each RPC in turn. */
async function readSqrtPriceX96(pool: string): Promise<number | null> {
  for (const rpc of BASE_RPCS) {
    try {
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [{ to: pool, data: SLOT0_SELECTOR }, "latest"],
        }),
      });
      const json = await res.json();
      const hex: string | undefined = json?.result;
      if (!hex || hex.length < 66) continue;
      const sqrtPriceX96 = Number(BigInt(hex.slice(0, 66)));
      if (Number.isFinite(sqrtPriceX96) && sqrtPriceX96 > 0) return sqrtPriceX96;
    } catch {
      // try next RPC
    }
  }
  return null;
}

/** Live ETH/USD from the Base WETH/USDC pool (USDC has 6 decimals → *1e12). */
async function fetchEthUsdOnchain(): Promise<number | null> {
  const sqrt = await readSqrtPriceX96(ETH_USDC_V3_POOL);
  if (sqrt === null) return null;
  const ethUsd = (sqrt / 2 ** 96) ** 2 * 1e12;
  return Number.isFinite(ethUsd) && ethUsd > 0 ? ethUsd : null;
}

/**
 * ETH/USD with fallback: CoinGecko (aggregated, primary) → on-chain pool.
 * A single source of truth so ETH pricing degrades gracefully everywhere.
 */
export async function getEthUsd(): Promise<number | null> {
  const cg = (await fetchFromCoinGecko(["ethereum"]))["ethereum"];
  if (cg) return cg;
  return fetchEthUsdOnchain();
}

/** $BREAD/USD from the Uniswap pool ratio × ETH/USD. */
async function fetchBreadPriceOnchain(): Promise<number | null> {
  const sqrt = await readSqrtPriceX96(BREAD_V3_POOL);
  if (sqrt === null) return null;
  // (sqrtPriceX96 / 2^96)^2 → BREAD per WETH (token1 per token0)
  const breadPerWeth = (sqrt / 2 ** 96) ** 2;
  if (!Number.isFinite(breadPerWeth) || breadPerWeth <= 0) return null;
  const ethUsd = await getEthUsd();
  if (!ethUsd) return null;
  const price = ethUsd / breadPerWeth;
  return Number.isFinite(price) && price > 0 ? price : null;
}

/**
 * Fetch price from CoinGecko (ETH, USDC).
 * ids: ethereum, usd-coin
 */
async function fetchFromCoinGecko(ids: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  try {
    const idParam = ids.join(",");
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${idParam}&vs_currencies=usd`
    );
    const data: CoinGeckoResponse = await res.json();
    for (const id of ids) {
      const val = data[id]?.usd;
      if (typeof val === "number" && val > 0) result[id] = val;
    }
  } catch {
    // ignore
  }
  return result;
}

/**
 * Fetch USD price for a given source.
 * For Base tokens: DexScreener often returns null → GeckoTerminal fallback.
 */
export async function fetchPriceUsd(source: PriceSource): Promise<number | null> {
  if (source.type === "dexscreener") {
    const price = await fetchFromDexScreener(source.address);
    if (price != null) return price;
    // GeckoTerminal fallback for Base tokens (DexScreener often has no pairs)
    if (source.chain === "base") {
      const gtPrice = await fetchFromGeckoTerminal("base", source.address);
      if (gtPrice != null) return gtPrice;
    }
    // Last resort for $BREAD: live pool ratio straight from Uniswap V3
    if (
      source.address.toLowerCase() ===
      "0xfaf89d9b21740183ddf2e0110497da1a32bd52ca"
    ) {
      return fetchBreadPriceOnchain();
    }
    return null;
  }
  // CoinGecko sources. USDC is a dollar — never spend a request or risk a
  // 429 on it. ETH goes through getEthUsd() so it falls back to the on-chain
  // pool when CoinGecko rate-limits.
  if (source.id === "usd-coin") return 1;
  if (source.id === "ethereum") return getEthUsd();
  const prices = await fetchFromCoinGecko([source.id]);
  return prices[source.id] ?? null;
}

/**
 * Calculate exact token amount to send (0.5% buffer, 6 decimals).
 * Formula: Math.ceil((total_usd * 1.005) / priceUsd * 1e6) / 1e6
 */
export function calcTokenAmount(totalUsd: number, priceUsd: number): number {
  if (priceUsd <= 0) return 0;
  const amount = Math.ceil((totalUsd * 1.005) / priceUsd * 1e6) / 1e6;
  return amount;
}

/** Payment method IDs for price map */
export type PaymentMethodId =
  | "usdc-base"
  | "usdc-ethereum"
  | "eth-base"
  | "eth-ethereum"
  | "bread-base"
  | "cult-ethereum";

/** Fetch all 6 payment option prices in one call (deduped). */
export async function fetchAllPrices(): Promise<
  Record<PaymentMethodId, number | null>
> {
  const [eth, breadPrice, cultPrice] = await Promise.all([
    getEthUsd(), // CoinGecko → on-chain pool fallback
    fetchPriceUsd({ type: "dexscreener", address: "0xfAF89d9b21740183DDF2E0110497dA1A32Bd52Ca", chain: "base" }),
    fetchFromDexScreener(
      "0x0000000000c5dc95539589fbD24BE07c6C14eCa4" /* CULT */
    ),
  ]);

  // USDC is a dollar — no API call, never null
  return {
    "usdc-base": 1,
    "usdc-ethereum": 1,
    "eth-base": eth,
    "eth-ethereum": eth,
    "bread-base": breadPrice,
    "cult-ethereum": cultPrice,
  };
}
