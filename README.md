# $BREAD Store

Physical bread loaves + cinnamon rolls. Pay with USDC, ETH, $BREAD, or $CULT on Base or Ethereum.

## Multi-chain support

- **Chains:** Base (chainId 8453), Ethereum mainnet (chainId 1)
- **Payment options:**
  - USDC on Base
  - USDC on Ethereum
  - ETH on Base
  - ETH on Ethereum
  - $BREAD on Base
  - $CULT (Milady Cult Coin) on Ethereum

All payments are dynamically priced to exact USD at checkout (5% buffer). Prices refresh every 30s via DexScreener and CoinGecko APIs.

## Setup

1. `npm install`
2. Copy `env.example` to `.env.local` and fill in all vars
3. **Supabase** (see below)
4. Add 3D models to `/public/models/`: `bread-loaf.glb`, `cinnamon-roll.glb` (optional)
5. `npm run dev`

## Supabase setup (privacy + free tier)

1. Create a project at [supabase.com](https://supabase.com) (free tier: 500MB DB, 50K MAU)
2. **SQL Editor** → run `supabase-schema.sql` (creates `orders` table)
3. **SQL Editor** → run `supabase-rls.sql` (enables RLS — only your backend can access orders; anon gets zero access)
4. **Settings → API** → copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret; used by `/api/create-order`)
5. **Optional:** Settings → General → disable "Realtime" if you don't need it (saves bandwidth)

## Env vars

| Var | Description |
|-----|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only; never expose) |
| `NEXT_PUBLIC_MERCHANT_BASE_WALLET` | Base address for USDC/$BREAD/ETH |
| `NEXT_PUBLIC_MERCHANT_ETHEREUM_WALLET` | Ethereum address for USDC/$CULT/ETH |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID |
| `RESEND_API_KEY` | For order emails (optional) |

## Deploy (Netlify)

1. Push to GitHub
2. Connect repo in Netlify
3. Add env vars
4. Deploy (uses @netlify/plugin-nextjs)

## Workflow

Order → Bake next day → Vacuum seal → Ship day after cooling. Manual fulfillment via Supabase dashboard.
