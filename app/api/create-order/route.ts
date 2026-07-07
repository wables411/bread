import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import {
  saveOrder,
  weeklyQuantitySold,
  findOrderByTxHash,
  WEEKLY_CAP,
  type StoredOrder,
} from "@/lib/orders";
import { verifyPayment, senderHoldsDiscountNft } from "@/lib/verify-payment";
import { getPaymentOption } from "@/lib/payment-options";
import { PRODUCTS, SHIPPING_RATES } from "@/lib/constants";
import { isShopOpen, CLOSED_MESSAGE } from "@/lib/shop-schedule";
import type { OrderItem, ShippingOption } from "@/lib/types";

const NFT_DISCOUNT_PERCENT = 15;
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/;

function getMerchantAddress(chain: "base" | "ethereum"): string | null {
  const baseWallet = process.env.NEXT_PUBLIC_MERCHANT_BASE_WALLET || null;
  if (chain === "base") return baseWallet;
  return process.env.NEXT_PUBLIC_MERCHANT_ETHEREUM_WALLET || baseWallet;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Send customer receipt + merchant notification via Resend */
async function sendOrderEmails(order: StoredOrder) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const resend = new Resend(key);
  const merchantEmail = process.env.YOUR_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL || "orders@resend.dev";

  const itemsList = order.items
    .map((i) => `- ${i.product} x${i.qty} @ $${i.price}`)
    .join("\n");
  const explorer =
    order.payment_chain === "base"
      ? `https://basescan.org/tx/${order.tx_hash}`
      : `https://etherscan.io/tx/${order.tx_hash}`;

  const receiptHtml = `
    <h2>Thank you for your order!</h2>
    <p>Order ID: <strong>${order.id}</strong></p>
    <p><strong>Items:</strong></p>
    <pre>${itemsList}</pre>
    <p>Total: $${order.total_usd.toFixed(2)} USD</p>
    <p>Payment: ${order.payment_method} — ${order.payment_amount ?? "—"}</p>
    ${order.tx_hash ? `<p>Tx: <a href="${explorer}">${order.tx_hash}</a></p>` : ""}
    <p>All orders ship out on Monday — baked fresh, vacuum-sealed after cooling.</p>
  `;

  const flags: string[] = [];
  if (order.verification && order.verification !== "verified") {
    flags.push(`⚠ Payment verification: ${order.verification} — ${order.verification_detail ?? ""}`);
  }
  if (order.over_cap) flags.push("⚠ Order exceeds weekly cap (payment already received)");
  if (order.after_hours) flags.push("⚠ Order placed while shop was closed (weekend) — payment already received");

  const notifyHtml = `
    <h2>New order #${order.id}</h2>
    ${flags.map((f) => `<p><strong>${f}</strong></p>`).join("")}
    <p>${order.customer_name} &lt;${order.email}&gt;</p>
    <p>${order.address}, ${order.city}, ${order.state} ${order.zip}</p>
    <p>Phone: ${order.phone}</p>
    <p><strong>Items:</strong></p>
    <pre>${itemsList}</pre>
    <p>Total: $${order.total_usd.toFixed(2)} | ${order.payment_method} | ${order.payment_amount ?? ""}</p>
    ${order.tx_hash ? `<p>Tx: <a href="${explorer}">${order.tx_hash}</a></p>` : ""}
    ${order.payer_address ? `<p>Payer wallet: ${order.payer_address}</p>` : ""}
    ${order.notes ? `<p>Notes: ${order.notes}</p>` : ""}
  `;

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
      subject: `[New Order] #${order.id}${flags.length ? " ⚠ NEEDS REVIEW" : ""}`,
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
      items.length === 0 ||
      !shipping_option ||
      !payment_method
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Payment tx is mandatory — orders only exist for on-chain payments
    if (typeof tx_hash !== "string" || !TX_HASH_REGEX.test(tx_hash)) {
      return NextResponse.json(
        { error: "Valid transaction hash required" },
        { status: 400 }
      );
    }

    const option = getPaymentOption(payment_method);
    if (!option) {
      return NextResponse.json(
        { error: "Unknown payment method" },
        { status: 400 }
      );
    }

    if (!(shipping_option in SHIPPING_RATES)) {
      return NextResponse.json(
        { error: "Unknown shipping option" },
        { status: 400 }
      );
    }

    // Recompute the total server-side — client prices are never trusted
    const orderItems: OrderItem[] = [];
    for (const raw of items as { product?: string; qty?: number }[]) {
      const product = PRODUCTS.find((p) => p.id === raw.product);
      const qty = Number(raw.qty);
      if (!product || !product.inStock) {
        return NextResponse.json(
          { error: `Unknown or out-of-stock product: ${raw.product}` },
          { status: 400 }
        );
      }
      if (!Number.isInteger(qty) || qty < 1 || qty > WEEKLY_CAP) {
        return NextResponse.json(
          { error: `Invalid quantity for ${product.id}` },
          { status: 400 }
        );
      }
      orderItems.push({ product: product.id, qty, price: product.price });
    }

    const subtotal = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
    const shipping = SHIPPING_RATES[shipping_option as ShippingOption];
    const fullTotal = round2(subtotal + shipping);
    const discountedTotal = round2(fullTotal * (1 - NFT_DISCOUNT_PERCENT / 100));

    // One order per payment transaction
    const existing = await findOrderByTxHash(tx_hash);
    if (existing) {
      return NextResponse.json(
        { error: "An order already exists for this transaction" },
        { status: 409 }
      );
    }

    const merchantAddress = getMerchantAddress(option.chain);
    if (!merchantAddress) {
      return NextResponse.json(
        { error: "Merchant wallet not configured" },
        { status: 500 }
      );
    }

    // Verify the payment on-chain (accept if it covers at least the discounted total)
    const verify = await verifyPayment({
      option,
      txHash: tx_hash,
      merchantAddress,
      minUsd: discountedTotal,
    });

    if (verify.outcome === "rejected") {
      return NextResponse.json(
        { error: `Payment verification failed: ${verify.reason}` },
        { status: 402 }
      );
    }

    // Which total applies: full price, or discounted if the payer holds an NFT
    let totalUsd = fullTotal;
    let verification = verify.outcome as string;
    let verificationDetail: string | null = verify.reason;
    if (verify.outcome === "verified") {
      const paidUsd = verify.paidUsd ?? 0;
      if (paidUsd < fullTotal * 0.95) {
        // Paid the discounted amount — honor it only for actual NFT holders
        const holdsNft = verify.from
          ? await senderHoldsDiscountNft(verify.from)
          : false;
        if (holdsNft) {
          totalUsd = discountedTotal;
        } else {
          verification = "underpaid";
          verificationDetail = `Discounted amount paid without NFT (paid ~$${paidUsd.toFixed(2)}, full total $${fullTotal.toFixed(2)})`;
        }
      }
    }

    // Weekend closure + weekly supply cap. Payment already happened, so
    // verified payments are recorded and flagged rather than dropped.
    const afterHours = !isShopOpen();
    if (afterHours && verification !== "verified") {
      return NextResponse.json({ error: CLOSED_MESSAGE }, { status: 403 });
    }

    const orderQty = orderItems.reduce((s, i) => s + i.qty, 0);
    const soldThisWeek = await weeklyQuantitySold();
    const overCap = soldThisWeek + orderQty > WEEKLY_CAP;
    if (overCap && verification !== "verified") {
      return NextResponse.json(
        {
          error: `Weekly supply limit reached (${WEEKLY_CAP} baked goods/week). ${soldThisWeek} already sold — please try again next week.`,
        },
        { status: 429 }
      );
    }

    const order = await saveOrder({
      customer_name: String(customer_name).slice(0, 100),
      email: String(email).slice(0, 200),
      address: String(address).slice(0, 200),
      city: String(city).slice(0, 100),
      state: String(state).toUpperCase().slice(0, 2),
      zip: String(zip).slice(0, 10),
      phone: String(phone).slice(0, 20),
      items: orderItems,
      shipping_option,
      payment_method,
      payment_chain: option.chain,
      payment_amount: payment_amount ? String(payment_amount).slice(0, 50) : null,
      total_usd: totalUsd,
      status: verification === "verified" ? "paid" : "pending",
      tx_hash: tx_hash.toLowerCase(),
      notes: notes ? String(notes).slice(0, 500) : null,
      payer_address: verify.from ?? null,
      verification,
      verification_detail: verificationDetail,
      paid_usd_estimate: verify.paidUsd ?? null,
      over_cap: overCap || undefined,
      after_hours: afterHours || undefined,
    });

    try {
      await sendOrderEmails(order);
    } catch (emailErr) {
      console.error("Email send failed:", emailErr);
    }

    return NextResponse.json({
      orderId: order.id,
      totalUsd: order.total_usd,
      verification,
    });
  } catch (err) {
    console.error("create-order error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Order failed" },
      { status: 500 }
    );
  }
}
