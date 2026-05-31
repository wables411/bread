import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { POINTS } from "@/lib/constants";

// POST /api/loyalty/award — award points for an order
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const wallet = body.wallet?.toLowerCase();
    const totalUsd = parseFloat(body.total_usd);
    const orderId = body.order_id;

    if (!wallet || !totalUsd || !orderId) {
      return NextResponse.json({ error: "wallet, total_usd, order_id required" }, { status: 400 });
    }

    // Check if card exists
    const { data: card } = await supabaseAdmin
      .from("loyalty_cards")
      .select("*")
      .eq("wallet_address", wallet)
      .single();

    if (!card) {
      return NextResponse.json({ error: "No loyalty card" }, { status: 404 });
    }

    // Check if points already awarded for this order (idempotency)
    const { data: existing } = await supabaseAdmin
      .from("points_ledger")
      .select("id")
      .eq("wallet_address", wallet)
      .eq("reason", "order")
      .filter("metadata->>order_id", "eq", orderId)
      .single();

    if (existing) {
      return NextResponse.json({ card, message: "Points already awarded for this order" });
    }

    // Award points: 1 per $1
    const pointsEarned = Math.floor(totalUsd) * POINTS.perDollarSpent;

    const newTotal = card.points + pointsEarned;
    await supabaseAdmin
      .from("loyalty_cards")
      .update({ points: newTotal })
      .eq("wallet_address", wallet);

    await supabaseAdmin.from("points_ledger").insert({
      wallet_address: wallet,
      amount: pointsEarned,
      reason: "order",
      metadata: { order_id: orderId, total_usd: totalUsd },
    });

    return NextResponse.json({ card: { ...card, points: newTotal }, points_earned: pointsEarned });
  } catch {
    return NextResponse.json({ error: "Failed to award points" }, { status: 500 });
  }
}
