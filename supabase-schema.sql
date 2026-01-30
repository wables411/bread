-- Supabase schema for bread store MVP (multi-chain)
-- Run this in Supabase SQL Editor after creating a project

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  customer_name text NOT NULL,
  email text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip text NOT NULL,
  phone text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  shipping_option text NOT NULL CHECK (shipping_option IN ('overnight', '2day')),
  payment_method text NOT NULL CHECK (payment_method IN (
    'usdc-base', 'usdc-ethereum', 'eth-base', 'eth-ethereum',
    'bread-base', 'cult-ethereum'
  )),
  payment_chain text,
  payment_amount text,
  total_usd numeric NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'baked', 'shipped')),
  tx_hash text,
  notes text
);

-- If upgrading from old schema, add new columns:
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_chain text;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_amount text;
-- ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
-- ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN (
--   'usdc-base', 'usdc-ethereum', 'eth-base', 'eth-ethereum', 'bread-base', 'cult-ethereum'
-- ));

-- Index for dashboard lookups
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
