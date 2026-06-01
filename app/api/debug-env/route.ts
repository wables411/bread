import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  // Test 1: raw fetch to supabase
  let rawFetchResult = "untested";
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL + "/rest/v1/loyalty_cards?select=count&limit=0";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const res = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    rawFetchResult = `status=${res.status}`;
  } catch (e) {
    rawFetchResult = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Test 2: supabase client
  let clientResult = "untested";
  try {
    const { data, error } = await supabaseAdmin
      .from("loyalty_cards")
      .select("wallet_address")
      .limit(1);
    if (error) clientResult = `supabase error: ${error.message}`;
    else clientResult = `ok, rows=${(data || []).length}`;
  } catch (e) {
    clientResult = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json({ rawFetchResult, clientResult });
}
