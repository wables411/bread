import { NextRequest, NextResponse } from "next/server";
import { quoteShipping } from "@/lib/shipping";

export const dynamic = "force-dynamic";

/**
 * GET /api/shipping-quote?zip=90210&weightOz=40
 *
 * Returns { supported, twoday?, oneday?, reason? }. Zone lookup stays
 * server-side so the client bundle carries no origin-derived data.
 */
export async function GET(req: NextRequest) {
  const zip = req.nextUrl.searchParams.get("zip") ?? "";
  const weightOz = Math.min(
    2000,
    Math.max(1, parseInt(req.nextUrl.searchParams.get("weightOz") ?? "48") || 48)
  );

  const quote = quoteShipping(zip, weightOz);
  if (!quote.supported || !quote.prices) {
    return NextResponse.json({ supported: false, reason: quote.reason });
  }
  return NextResponse.json({
    supported: true,
    twoday: quote.prices.twoday,
    oneday: quote.prices.oneday,
  });
}
