import { NextResponse } from "next/server";
import { weeklyQuantitySold, WEEKLY_CAP } from "@/lib/orders";
import { isShopOpen, nextShipDate, CLOSED_MESSAGE } from "@/lib/shop-schedule";

export const dynamic = "force-dynamic";

/** Current batch quantity vs weekly cap, plus shop open/closed status. */
export async function GET() {
  try {
    const soldThisWeek = await weeklyQuantitySold();
    const available = Math.max(0, WEEKLY_CAP - soldThisWeek);
    const open = isShopOpen();

    return NextResponse.json({
      soldThisWeek,
      cap: WEEKLY_CAP,
      available,
      shopOpen: open,
      shipDate: nextShipDate(),
      ...(open ? {} : { closedMessage: CLOSED_MESSAGE }),
    });
  } catch (err) {
    console.error("weekly-inventory error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
