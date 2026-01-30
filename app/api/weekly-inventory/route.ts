import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const WEEKLY_CAP = 10;

/** Sum total quantity of baked goods from orders in last 7 days (paid/baked/shipped) */
export async function GET() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: orders, error } = await supabase
      .from("orders")
      .select("items")
      .in("status", ["paid", "baked", "shipped"])
      .gte("created_at", sevenDaysAgo.toISOString());

    if (error) throw error;

    let soldThisWeek = 0;
    for (const o of orders ?? []) {
      const items = (o.items as { product: string; qty: number }[]) ?? [];
      soldThisWeek += items.reduce((sum, i) => sum + i.qty, 0);
    }

    const available = Math.max(0, WEEKLY_CAP - soldThisWeek);

    return NextResponse.json({
      soldThisWeek,
      cap: WEEKLY_CAP,
      available,
    });
  } catch (err) {
    console.error("weekly-inventory error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
