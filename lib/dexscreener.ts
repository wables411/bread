import { BREAD_TOKEN_ADDRESS } from "./constants";
import { fetchPriceUsd } from "./prices";

/**
 * Fetch live $BREAD token price from DexScreener.
 * Returns price in USD or null if unavailable.
 */
export async function fetchBreadPrice(): Promise<number | null> {
  return fetchPriceUsd({ type: "dexscreener", address: BREAD_TOKEN_ADDRESS });
}
