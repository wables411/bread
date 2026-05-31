-- Loyalty Cards
CREATE TABLE IF NOT EXISTS loyalty_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  display_name TEXT DEFAULT 'baker',
  pfp_url TEXT,
  points INTEGER DEFAULT 0,
  last_check_in DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Points Ledger (audit trail)
CREATE TABLE IF NOT EXISTS points_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL REFERENCES loyalty_cards(wallet_address),
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL, -- 'order', 'checkin', 'nft_hold', 'lp_position'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE loyalty_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;

-- Anyone can read loyalty cards (leaderboard)
CREATE POLICY "Public read loyalty_cards" ON loyalty_cards
  FOR SELECT USING (true);

-- Service role can do everything
CREATE POLICY "Service full access loyalty_cards" ON loyalty_cards
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service full access points_ledger" ON points_ledger
  FOR ALL USING (true) WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_loyalty_wallet ON loyalty_cards(wallet_address);
CREATE INDEX idx_points_ledger_wallet ON points_ledger(wallet_address);
