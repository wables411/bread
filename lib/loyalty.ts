/**
 * Loyalty cards + points ledger on Netlify Blobs.
 */
import { randomUUID } from "node:crypto";
import { kv } from "./blob-store";

export interface LoyaltyCard {
  id: string;
  wallet_address: string;
  display_name: string;
  pfp_url: string | null;
  points: number;
  last_check_in: string | null;
  created_at: string;
}

export interface LedgerEntry {
  wallet_address: string;
  amount: number;
  reason: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

const store = () => kv("loyalty");

const cardKey = (wallet: string) => `card/${wallet.toLowerCase()}`;

export async function getCard(wallet: string): Promise<LoyaltyCard | null> {
  return store().getJSON<LoyaltyCard>(cardKey(wallet));
}

export async function saveCard(card: LoyaltyCard): Promise<void> {
  await store().setJSON(cardKey(card.wallet_address), card);
}

export async function createCard(
  wallet: string,
  displayName: string,
  pfpUrl: string | null
): Promise<LoyaltyCard> {
  const card: LoyaltyCard = {
    id: randomUUID().slice(0, 8),
    wallet_address: wallet.toLowerCase(),
    display_name: displayName,
    pfp_url: pfpUrl,
    points: 0,
    last_check_in: null,
    created_at: new Date().toISOString(),
  };
  await saveCard(card);
  return card;
}

export async function addLedgerEntry(
  entry: Omit<LedgerEntry, "created_at">
): Promise<void> {
  const created_at = new Date().toISOString();
  await store().setJSON(
    `ledger/${entry.wallet_address.toLowerCase()}/${created_at}_${randomUUID().slice(0, 8)}`,
    { ...entry, created_at }
  );
}
