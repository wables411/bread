-- Run this AFTER supabase-schema.sql
-- Enables Row Level Security so only your backend (service role) can access orders.
-- Anon/authenticated users get zero access — protects PII (name, email, address).

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- No policies = no access for anon/authenticated.
-- Service role (used by /api/create-order) bypasses RLS and works normally.
