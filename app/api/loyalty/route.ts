import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/loyalty?wallet=0x...
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet")?.toLowerCase();
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("loyalty_cards")
    .select("*")
    .eq("wallet_address", wallet)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Loyalty GET error:", error);
    return NextResponse.json({ error: "DB error", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ card: data || null });
}

// POST /api/loyalty — create or update card
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const wallet = body.wallet?.toLowerCase();
    if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });

    const { data: existing } = await supabaseAdmin
      .from("loyalty_cards")
      .select("id")
      .eq("wallet_address", wallet)
      .single();

    if (existing) {
      // Update display_name and pfp_url if provided
      const updates: Record<string, string> = {};
      if (body.display_name) updates.display_name = body.display_name.slice(0, 32);
      if (body.pfp_url) updates.pfp_url = body.pfp_url;

      if (Object.keys(updates).length > 0) {
        await supabaseAdmin
          .from("loyalty_cards")
          .update(updates)
          .eq("wallet_address", wallet);
      }

      const { data: card } = await supabaseAdmin
        .from("loyalty_cards")
        .select("*")
        .eq("wallet_address", wallet)
        .single();

      return NextResponse.json({ card });
    }

    // Create new card
    const { data: card, error } = await supabaseAdmin
      .from("loyalty_cards")
      .insert({
        wallet_address: wallet,
        display_name: body.display_name?.slice(0, 32) || "baker",
        pfp_url: body.pfp_url || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Failed to create card" }, { status: 500 });

    return NextResponse.json({ card });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
