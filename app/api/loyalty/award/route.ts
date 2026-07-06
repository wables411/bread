import { NextRequest, NextResponse } from "next/server";
import { getCard, saveCard, addLedgerEntry } from "@/lib/loyalty";
import { findOrderById, updateOrder } from "@/lib/orders";
import { POINTS } from "@/lib/constants";

export const dynamic = "force-dynamic";

// POST /api/loyalty/award — award points for a real, un-awarded order.
// Points come from the stored order total, never from the request body.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const wallet = body.wallet?.toLowerCase();
    const orderId = body.order_id;

    if (!wallet || !orderId) {
      return NextResponse.json({ error: "wallet, order_id required" }, { status: 400 });
    }

    const card = await getCard(wallet);
    if (!card) {
      return NextResponse.json({ error: "No loyalty card" }, { status: 404 });
    }

    const order = await findOrderById(String(orderId));
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.loyalty_awarded) {
      return NextResponse.json({ card, message: "Points already awarded for this order" });
    }
    // Only the wallet that paid can claim the points
    if (order.payer_address && order.payer_address.toLowerCase() !== wallet) {
      return NextResponse.json({ error: "Wallet did not pay for this order" }, { status: 403 });
    }

    const pointsEarned = Math.floor(order.total_usd) * POINTS.perDollarSpent;

    order.loyalty_awarded = true;
    await updateOrder(order);

    card.points += pointsEarned;
    await saveCard(card);
    await addLedgerEntry({
      wallet_address: wallet,
      amount: pointsEarned,
      reason: "order",
      metadata: { order_id: order.id, total_usd: order.total_usd },
    });

    return NextResponse.json({ card, points_earned: pointsEarned });
  } catch (err) {
    console.error("loyalty award error:", err);
    return NextResponse.json({ error: "Failed to award points" }, { status: 500 });
  }
}
