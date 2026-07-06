import { NextRequest, NextResponse } from "next/server";
import { getCard, saveCard, addLedgerEntry } from "@/lib/loyalty";
import { POINTS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const MAX_NFT_COUNT = 50;

// POST /api/loyalty/checkin — daily check-in, awards points for NFTs + LP + check-in
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const wallet = body.wallet?.toLowerCase();
    if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });

    const card = await getCard(wallet);
    if (!card) return NextResponse.json({ error: "No loyalty card found" }, { status: 404 });

    const today = new Date().toISOString().split("T")[0];
    if (card.last_check_in === today) {
      return NextResponse.json({ card, message: "Already checked in today" });
    }

    const nftCount = Math.min(MAX_NFT_COUNT, Math.max(0, parseInt(body.nft_count) || 0));
    const hasLp = Boolean(body.has_lp);

    let pointsEarned = POINTS.perCheckIn;
    pointsEarned += nftCount * POINTS.perNftHeld;
    if (hasLp) pointsEarned += POINTS.perLpPosition;

    card.points += pointsEarned;
    card.last_check_in = today;
    await saveCard(card);

    await addLedgerEntry({
      wallet_address: wallet,
      amount: pointsEarned,
      reason: "checkin",
      metadata: {
        nft_count: nftCount,
        has_lp: hasLp,
        breakdown: {
          checkin: POINTS.perCheckIn,
          nfts: nftCount * POINTS.perNftHeld,
          lp: hasLp ? POINTS.perLpPosition : 0,
        },
      },
    });

    return NextResponse.json({ card, points_earned: pointsEarned });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
