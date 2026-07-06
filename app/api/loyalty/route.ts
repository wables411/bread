import { NextRequest, NextResponse } from "next/server";
import { getCard, createCard, saveCard } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

// GET /api/loyalty?wallet=0x...
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet")?.toLowerCase();
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });

  try {
    const card = await getCard(wallet);
    return NextResponse.json({ card });
  } catch (err) {
    console.error("Loyalty GET error:", err);
    return NextResponse.json({ error: "Storage error" }, { status: 500 });
  }
}

// POST /api/loyalty — create or update card
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const wallet = body.wallet?.toLowerCase();
    if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });

    const existing = await getCard(wallet);

    if (existing) {
      if (body.display_name) existing.display_name = String(body.display_name).slice(0, 32);
      if (body.pfp_url) existing.pfp_url = String(body.pfp_url).slice(0, 500);
      await saveCard(existing);
      return NextResponse.json({ card: existing });
    }

    const card = await createCard(
      wallet,
      body.display_name ? String(body.display_name).slice(0, 32) : "baker",
      body.pfp_url ? String(body.pfp_url).slice(0, 500) : null
    );
    return NextResponse.json({ card });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
