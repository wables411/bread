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
    return null;
  }
  const prices = await fetchFromCoinGecko([source.id]);
  return prices[source.id] ?? null;
}

/**
 * Calculate exact token amount to send (5% buffer, 6 decimals).
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
  const [cgPrices, breadPrice, cultPrice] = await Promise.all([
    fetchFromCoinGecko(["ethereum", "usd-coin"]),
    fetchPriceUsd({ type: "dexscreener", address: "0xfAF89d9b21740183DDF2E0110497dA1A32Bd52Ca", chain: "base" }),
    fetchFromDexScreener(
      "0x0000000000c5dc95539589fbD24BE07c6C14eCa4" /* CULT */
    ),
  ]);

  const usdc = cgPrices["usd-coin"] ?? null;
  const eth = cgPrices["ethereum"] ?? null;

  return {
    "usdc-base": usdc,
    "usdc-ethereum": usdc,
    "eth-base": eth,
    "eth-ethereum": eth,
    "bread-base": breadPrice,
    "cult-ethereum": cultPrice,
  };
}
