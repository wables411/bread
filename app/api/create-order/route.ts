import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const WEEKLY_CAP = 10;

/** Sum total quantity of baked goods from orders in last 7 days (paid/baked/shipped) */
async function getWeeklyQuantitySold(): Promise<number> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: orders, error } = await supabase
    .from("orders")
    .select("items")
    .in("status", ["paid", "baked", "shipped"])
    .gte("created_at", sevenDaysAgo.toISOString());

  if (error) throw error;

  let sold = 0;
  for (const o of orders ?? []) {
    const items = (o.items as { product: string; qty: number }[]) ?? [];
    sold += items.reduce((sum, i) => sum + i.qty, 0);
  }
  return sold;
}

/** Send customer receipt + merchant notification via Resend */
async function sendOrderEmails(order: {
  id: string;
  customer_name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  items: { product: string; qty: number; price: number }[];
  total_usd: number;
  payment_method: string;
  payment_amount: string | null;
  payment_chain: string;
  tx_hash: string | null;
}) {
  const merchantEmail = process.env.YOUR_EMAIL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bread.store";
  const itemsList = order.items
    .map((i) => `- ${i.product} x${i.qty} @ $${i.price}`)
    .join("\n");

  const receiptHtml = `
    <h2>Thank you for your order!</h2>
    <p>Order ID: <strong>${order.id}</strong></p>
    <p><strong>Items:</strong></p>
    <pre>${itemsList}</pre>
    <p>Total: $${order.total_usd.toFixed(2)} USD</p>
    <p>Payment: ${order.payment_method} — ${order.payment_amount ?? "—"}</p>
    ${order.tx_hash ? `<p>Tx: <a href="${order.payment_chain === "base" ? `https://basescan.org/tx/${order.tx_hash}` : `https://etherscan.io/tx/${order.tx_hash}`}">${order.tx_hash}</a></p>` : ""}
    <p>Order prep starts in next 24hrs, ships within 24hrs after cooling.</p>
  `;

  const notifyHtml = `
    <h2>New order #${order.id}</h2>
    <p>${order.customer_name} &lt;${order.email}&gt;</p>
    <p>${order.address}, ${order.city}, ${order.state} ${order.zip}</p>
    <p><strong>Items:</strong></p>
    <pre>${itemsList}</pre>
    <p>Total: $${order.total_usd.toFixed(2)} | ${order.payment_method} | ${order.payment_amount ?? ""}</p>
    ${order.tx_hash ? `<p>Tx: ${order.tx_hash}</p>` : ""}
  `;

  const resend = getResend();
  if (!resend) return;

  const from = process.env.RESEND_FROM_EMAIL || "orders@resend.dev";

  await resend.emails.send({
    from,
    to: order.email,
    subject: `Order #${order.id} — $BREAD Store`,
    html: receiptHtml,
  });

  if (merchantEmail) {
    await resend.emails.send({
      from,
      to: merchantEmail,
      subject: `[New Order] #${order.id}`,
      html: notifyHtml,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customer_name,
      email,
      address,
      city,
      state,
      zip,
      phone,
      items,
      shipping_option,
      payment_method,
      payment_amount,
      total_usd,
      tx_hash,
      notes,
    } = body;

    if (
      !customer_name ||
      !email ||
      !address ||
      !city ||
      !state ||
      !zip ||
      !phone ||
      !Array.isArray(items) ||
      !shipping_option ||
      !payment_method ||
      typeof total_usd !== "number"
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const orderTotalQty = (items as { qty: number }[]).reduce((s, i) => s + i.qty, 0);
    const soldThisWeek = await getWeeklyQuantitySold();
    if (soldThisWeek + orderTotalQty > WEEKLY_CAP) {
      return NextResponse.json(
        {
          error: `Weekly supply limit reached (${WEEKLY_CAP} baked goods/week). ${soldThisWeek} already sold — please try again next week.`,
        },
        { status: 429 }
      );
    }

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        customer_name: String(customer_name).slice(0, 100),
        email: String(email).slice(0, 200),
        address: String(address).slice(0, 200),
        city: String(city).slice(0, 100),
        state: String(state).toUpperCase().slice(0, 2),
        zip: String(zip).slice(0, 10),
        phone: String(phone).slice(0, 20),
        items,
        shipping_option,
        payment_method,
        payment_chain: payment_method.includes("base") ? "base" : "ethereum",
        payment_amount: payment_amount ? String(payment_amount).slice(0, 50) : null,
        total_usd,
        status: "paid",
        tx_hash: tx_hash ? String(tx_hash).slice(0, 100) : null,
        notes: notes ? String(notes).slice(0, 500) : null,
      })
      .select("id")
      .single();

    if (error) throw error;

    const resend = getResend();
    if (resend) {
      try {
        const paymentChain = payment_method.includes("base") ? "base" : "ethereum";
        await sendOrderEmails({
          id: order.id,
          customer_name: String(customer_name),
          email: String(email),
          address: String(address),
          city: String(city),
          state: String(state),
          zip: String(zip),
          items,
          total_usd,
          payment_method,
          payment_amount: payment_amount ?? null,
          payment_chain: paymentChain,
          tx_hash: tx_hash ?? null,
        });
      } catch (emailErr) {
        console.error("Email send failed:", emailErr);
      }
    }

    return NextResponse.json({ orderId: order.id });
  } catch (err) {
    console.error("create-order error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Order failed" },
      { status: 500 }
    );
  }
}
