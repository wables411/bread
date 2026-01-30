// Chains
export const BASE_CHAIN_ID = 8453;
export const ETHEREUM_CHAIN_ID = 1;

// $BREAD token on Base
export const BREAD_TOKEN_ADDRESS =
  "0xfAF89d9b21740183DDF2E0110497dA1A32Bd52Ca" as const;

// $CULT (Milady Cult Coin) on Ethereum
export const CULT_TOKEN_ADDRESS =
  "0x0000000000c5dc95539589fbD24BE07c6C14eCa4" as const;

// USDC on Base
export const USDC_BASE_ADDRESS =
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;

// USDC on Ethereum
export const USDC_ETHEREUM_ADDRESS =
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as const;

// DexScreener API
export const DEXSCREENER_TOKEN_URL = (addr: string) =>
  `https://api.dexscreener.com/latest/dex/tokens/${addr}`;

// Shipping rates (flat MVP)
export const SHIPPING_RATES = {
  overnight: 24.99,
  "2day": 12.99,
} as const;

// Product prices
export const PRODUCT_PRICES = {
  loaf: 10,
  roll: 20,
} as const;
