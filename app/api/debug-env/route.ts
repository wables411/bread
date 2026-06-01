import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + "/rest/v1/loyalty_cards?select=count&limit=0";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  let result = "untested";
  try {
    const res = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    result = `status=${res.status}`;
  } catch (e: unknown) {
    const err = e as Error & { cause?: Error };
    result = JSON.stringify({
      message: err.message,
      name: err.name,
      cause: err.cause ? {
        message: err.cause.message,
        name: err.cause.name,
        code: (err.cause as unknown as Record<string, unknown>).code,
      } : null,
    });
  }

  // Also try a known public endpoint to rule out all outbound fetch being broken
  let publicFetch = "untested";
  try {
    const res = await fetch("https://httpbin.org/get");
    publicFetch = `status=${res.status}`;
  } catch (e: unknown) {
    const err = e as Error & { cause?: Error };
    publicFetch = JSON.stringify({
      message: err.message,
      cause: err.cause?.message,
    });
  }

  return NextResponse.json({ supabaseFetch: result, publicFetch, testedUrl: url });
}
