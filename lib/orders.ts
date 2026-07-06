/**
 * Order persistence on Netlify Blobs.
 * Keys embed the creation timestamp (`orders/<ISO>_<id>`) so recent orders
 * can be filtered by key without reading every blob.
 */
import { randomUUID } from "node:crypto";
import { kv } from "./blob-store";
import type { Order, OrderItem, PaymentMethod, ShippingOption } from "./types";

export const WEEKLY_CAP = 10;

export interface StoredOrder extends Order {
  id: string;
  created_at: string;
  /** Wallet that sent the payment (from on-chain verification) */
  payer_address?: string | null;
  /** verified | pending_verification | underpaid */
  verification?: string;
  verification_detail?: string | null;
  paid_usd_estimate?: number | null;
  over_cap?: boolean;
  loyalty_awarded?: boolean;
}

const orders = () => kv("orders");

function keyFor(createdAt: string, id: string) {
  return `orders/${createdAt}_${id}`;
}

export async function saveOrder(
  order: Omit<StoredOrder, "id" | "created_at">
): Promise<StoredOrder> {
  const id = randomUUID().slice(0, 8);
  const created_at = new Date().toISOString();
  const full: StoredOrder = { ...order, id, created_at };
  await orders().setJSON(keyFor(created_at, id), full);
  return full;
}

export async function updateOrder(order: StoredOrder): Promise<void> {
  await orders().setJSON(keyFor(order.created_at, order.id), order);
}

/** Orders created in the last `days` days, newest last. */
export async function listRecentOrders(days: number): Promise<StoredOrder[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffKey = `orders/${cutoff.toISOString()}`;
  const keys = (await orders().listKeys("orders/")).filter(
    (k) => k >= cutoffKey
  );
  const result: StoredOrder[] = [];
  for (const key of keys.sort()) {
    const o = await orders().getJSON<StoredOrder>(key);
    if (o) result.push(o);
  }
  return result;
}

export async function findOrderById(
  id: string,
  days = 60
): Promise<StoredOrder | null> {
  const recent = await listRecentOrders(days);
  return recent.find((o) => o.id === id) ?? null;
}

export async function findOrderByTxHash(
  txHash: string,
  days = 60
): Promise<StoredOrder | null> {
  const target = txHash.toLowerCase();
  const recent = await listRecentOrders(days);
  return recent.find((o) => o.tx_hash?.toLowerCase() === target) ?? null;
}

const COUNTED_STATUSES = new Set(["paid", "baked", "shipped", "pending"]);

/** Total baked goods sold in the last 7 days (statuses that consume supply). */
export async function weeklyQuantitySold(): Promise<number> {
  const recent = await listRecentOrders(7);
  let sold = 0;
  for (const o of recent) {
    if (!COUNTED_STATUSES.has(o.status ?? "paid")) continue;
    sold += (o.items ?? []).reduce((sum, i) => sum + i.qty, 0);
  }
  return sold;
}

export type { Order, OrderItem, PaymentMethod, ShippingOption };
