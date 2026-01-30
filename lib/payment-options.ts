/**
 * Payment option config: token + chain mapping.
 */
import type { PaymentMethod } from "./types";
import {
  USDC_BASE_ADDRESS,
  USDC_ETHEREUM_ADDRESS,
  BREAD_TOKEN_ADDRESS,
  CULT_TOKEN_ADDRESS,
  BASE_CHAIN_ID,
  ETHEREUM_CHAIN_ID,
} from "./constants";
import type { PriceSource } from "./prices";

export interface PaymentOption {
  id: PaymentMethod;
  label: string;
  token: "USDC" | "ETH" | "BREAD" | "CULT";
  chain: "base" | "ethereum";
  chainId: number;
  /** ERC20 contract address, or null for native ETH */
  contractAddress: string | null;
  /** Price source for dynamic USD pricing */
  priceSource: PriceSource;
  /** Decimals for display (ETH=18, USDC=6, tokens vary) */
  decimals: number;
}

export const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: "usdc-base",
    label: "USDC on Base",
    token: "USDC",
    chain: "base",
    chainId: BASE_CHAIN_ID,
    contractAddress: USDC_BASE_ADDRESS,
    priceSource: { type: "coingecko", id: "usd-coin" },
    decimals: 6,
  },
  {
    id: "usdc-ethereum",
    label: "USDC on Ethereum",
    token: "USDC",
    chain: "ethereum",
    chainId: ETHEREUM_CHAIN_ID,
    contractAddress: USDC_ETHEREUM_ADDRESS,
    priceSource: { type: "coingecko", id: "usd-coin" },
    decimals: 6,
  },
  {
    id: "eth-base",
    label: "ETH on Base",
    token: "ETH",
    chain: "base",
    chainId: BASE_CHAIN_ID,
    contractAddress: null,
    priceSource: { type: "coingecko", id: "ethereum" },
    decimals: 18,
  },
  {
    id: "eth-ethereum",
    label: "ETH on Ethereum",
    token: "ETH",
    chain: "ethereum",
    chainId: ETHEREUM_CHAIN_ID,
    contractAddress: null,
    priceSource: { type: "coingecko", id: "ethereum" },
    decimals: 18,
  },
  {
    id: "bread-base",
    label: "$BREAD on Base",
    token: "BREAD",
    chain: "base",
    chainId: BASE_CHAIN_ID,
    contractAddress: BREAD_TOKEN_ADDRESS,
    priceSource: { type: "dexscreener", address: BREAD_TOKEN_ADDRESS },
    decimals: 18,
  },
  {
    id: "cult-ethereum",
    label: "$CULT on Ethereum",
    token: "CULT",
    chain: "ethereum",
    chainId: ETHEREUM_CHAIN_ID,
    contractAddress: CULT_TOKEN_ADDRESS,
    priceSource: { type: "dexscreener", address: CULT_TOKEN_ADDRESS },
    decimals: 18,
  },
];

export function getPaymentOption(id: PaymentMethod): PaymentOption | undefined {
  return PAYMENT_OPTIONS.find((o) => o.id === id);
}
