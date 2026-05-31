import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { POINTS } from "@/lib/constants";

// POST /api/loyalty/checkin — daily check-in, awards points for NFTs + LP + check-in
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const wallet = body.wallet?.toLowerCase();
    if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });

    // Get existing card
    const { data: card } = await supabaseAdmin
      .from("loyalty_cards")
      .select("*")
      .eq("wallet_address", wallet)
      .single();

    if (!card) return NextResponse.json({ error: "No loyalty card found" }, { status: 404 });

    // Check if already checked in today
    const today = new Date().toISOString().split("T")[0];
    if (card.last_check_in === today) {
      return NextResponse.json({ card, message: "Already checked in today" });
    }

    // Calculate points from on-chain data (passed from client)
    const nftCount = Math.max(0, parseInt(body.nft_count) || 0);
    const hasLp = Boolean(body.has_lp);

    let pointsEarned = POINTS.perCheckIn; // base check-in
    pointsEarned += nftCount * POINTS.perNftHeld; // per NFT held
    if (hasLp) pointsEarned += POINTS.perLpPosition; // LP bonus

    // Update card
    const newTotal = card.points + pointsEarned;
    await supabaseAdmin
      .from("loyalty_cards")
      .update({ points: newTotal, last_check_in: today })
      .eq("wallet_address", wallet);

    // Record in ledger
    await supabaseAdmin.from("points_ledger").insert({
      wallet_address: wallet,
      amount: pointsEarned,
      reason: "checkin",
      metadata: { nft_count: nftCount, has_lp: hasLp, breakdown: { checkin: POINTS.perCheckIn, nfts: nftCount * POINTS.perNftHeld, lp: hasLp ? POINTS.perLpPosition : 0 } },
    });

    return NextResponse.json({ card: { ...card, points: newTotal, last_check_in: today }, points_earned: pointsEarned });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
