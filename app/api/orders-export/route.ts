import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { listRecentOrders } from "@/lib/orders";
import {
  PRODUCTS,
  PACKAGING_WEIGHT_OZ,
  SHIPPING_LABELS,
  BOX_DIMENSIONS_IN,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * GET /api/orders-export?key=<ORDERS_EXPORT_KEY>&days=14
 *
 * Downloads open orders as a CSV formatted for Pirate Ship's spreadsheet
 * import (Ship → Import a Spreadsheet). Pirate Ship remembers the column
 * mapping after the first upload.
 */

function keyMatches(provided: string | null): boolean {
  const expected = process.env.ORDERS_EXPORT_KEY;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function csvField(value: unknown): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  if (!keyMatches(req.nextUrl.searchParams.get("key"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const days = Math.min(
    365,
    Math.max(1, parseInt(req.nextUrl.searchParams.get("days") ?? "14") || 14)
  );

  try {
    const orders = (await listRecentOrders(days)).filter(
      (o) => o.status !== "shipped"
    );

    const header = [
      "Order ID",
      "Order Date",
      "Recipient Name",
      "Email",
      "Phone",
      "Address Line 1",
      "City",
      "State",
      "Zipcode",
      "Country",
      "Items",
      "Total Quantity",
      "Weight (oz)",
      "Length (in)",
      "Width (in)",
      "Height (in)",
      "Shipping Service",
      "Order Total (USD)",
      "Payment Status",
      "Notes",
    ];

    const rows = orders.map((o) => {
      const weightOz =
        PACKAGING_WEIGHT_OZ +
        o.items.reduce((sum, i) => {
          const product = PRODUCTS.find((p) => p.id === i.product);
          return sum + (product?.weightOz ?? 32) * i.qty;
        }, 0);
      const itemsDesc = o.items.map((i) => `${i.product} x${i.qty}`).join("; ");
      const qty = o.items.reduce((s, i) => s + i.qty, 0);
      return [
        o.id,
        o.created_at.slice(0, 10),
        o.customer_name,
        o.email,
        o.phone,
        o.address,
        o.city,
        o.state,
        o.zip,
        "US",
        itemsDesc,
        qty,
        weightOz,
        BOX_DIMENSIONS_IN.length,
        BOX_DIMENSIONS_IN.width,
        BOX_DIMENSIONS_IN.height,
        SHIPPING_LABELS[o.shipping_option] ?? o.shipping_option,
        o.total_usd.toFixed(2),
        o.verification === "verified" ? "paid" : `CHECK: ${o.verification}`,
        o.notes ?? "",
      ]
        .map(csvField)
        .join(",");
    });

    const csv = [header.join(","), ...rows].join("\r\n") + "\r\n";
    const today = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bread-orders-${today}.csv"`,
      },
    });
  } catch (err) {
    console.error("orders-export error:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
