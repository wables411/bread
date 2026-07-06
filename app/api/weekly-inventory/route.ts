import { NextResponse } from "next/server";
import { weeklyQuantitySold, WEEKLY_CAP } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** Baked goods sold in the last 7 days vs the weekly cap. */
export async function GET() {
  try {
    const soldThisWeek = await weeklyQuantitySold();
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
