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

// NFT Collections
export const NFT_COLLECTIONS = {
  // bread-delivery on Base (ERC-1155)
  breadDelivery: {
    address: "0xb704c29279664f873dc138e16389c8152a132269" as const,
    chainId: 8453,
    standard: "ERC1155" as const,
  },
  // cinnabunz on Ethereum (ERC-721)
  cinnabunz: {
    address: "0x48ba3ba473a8557496d62e349993b8b00c8041fb" as const,
    chainId: 1,
    standard: "ERC721" as const,
  },
  // bread-8 on Ethereum (ERC-1155)
  bread8: {
    address: "0x135c4e5e427ebed0f8bf7966cec4117b1cae2137" as const,
    chainId: 1,
    standard: "ERC1155" as const,
  },
} as const;

// Uniswap V3 Pool (BREAD/WETH on Base)
export const BREAD_POOL_ADDRESS =
  "0x6b7bda00044C4eeF7447f9363d2DEc70eE1fA7b7" as const;
export const UNISWAP_V3_POSITIONS_ADDRESS =
  "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1" as const; // NonfungiblePositionManager on Base

// Points system
export const POINTS = {
  perDollarSpent: 1,
  perNftHeld: 1, // per check-in (daily)
  perCheckIn: 1, // daily
  perLpPosition: 10, // daily
} as const;

// DexScreener API
export const DEXSCREENER_TOKEN_URL = (addr: string) =>
  `https://api.dexscreener.com/latest/dex/tokens/${addr}`;

// Zone-based shipping prices live in lib/shipping.ts (server-side only, so
// the client bundle carries nothing derived from the origin ZIP). The
// cheapest possible option, shown as a floor in the cart:
export const SHIPPING_FROM_USD = 11;

// Shipping box (inches) — included in the Pirate Ship CSV export
export const BOX_DIMENSIONS_IN = { length: 11.25, width: 8.75, height: 6 } as const;

// Box + padding weight: small box for 1-2 items, bigger box for 3+.
// Calibrated to real packed weights: 1 loaf = 3 lb, 2 = 5 lb, 3 = 8 lb.
export function packagingWeightOz(totalQty: number): number {
  return totalQty <= 2 ? 16 : 32;
}

/** Total shipping weight for an order: products + box/padding. */
export function orderWeightOz(
  items: { product: string; qty: number }[]
): number {
  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  return (
    packagingWeightOz(totalQty) +
    items.reduce((sum, i) => {
      const product = PRODUCTS.find((p) => p.id === i.product);
      return sum + (product?.weightOz ?? 32) * i.qty;
    }, 0)
  );
}

// Product catalog — add/remove/edit items here
// weightOz: ESTIMATED shipping weight per item — weigh your actual products and adjust
export const PRODUCTS: {
  id: string;
  name: string;
  price: number;
  thumbnail: string;
  modelPath?: string;
  desc: string;
  inStock: boolean;
  weightOz: number;
}[] = [
  {
    id: "loaf",
    name: "sourdough loaf",
    price: 10,
    thumbnail: "/models/media/bread.png",
    modelPath: "/models/media/$bread%20on%20base.glb",
    desc: "10 usdc",
    inStock: true,
    weightOz: 32,
  },
  {
    id: "roll",
    name: "cinnabunz (6) + icing",
    price: 20,
    thumbnail: "/models/media/cinnabunz.png",
    modelPath: "/models/media/cinnabunz.glb",
    desc: "20 usdc",
    inStock: false,
    weightOz: 36,
  },
];

export const PRODUCT_PRICES: Record<string, number> = Object.fromEntries(
  PRODUCTS.map((p) => [p.id, p.price])
);
