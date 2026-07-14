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

All payments are dynamically priced to exact USD at checkout (0.5% buffer). Prices refresh every 30s via DexScreener and CoinGecko APIs. Every order is verified on-chain server-side (tx succeeded, paid the merchant wallet, correct token, amount covers the total) before it is recorded.

## Setup

1. `npm install`
2. Copy `env.example` to `.env.local` and fill in all vars
3. **3D models** (see below)
4. `npm run dev`

## 3D Models

Place `.glb` files in `/public/models/media/`:
- Sourdough: `$bread on base.glb` (or `bread-loaf.glb`)
- Cinnabunz: `cinnabunz.glb` (or `cinnamon-roll.glb`)

Static fallback thumbnails (`bread.png`, `cinnabunz.png`) are in `/public/models/media/`.

**Optional:** For best performance, compress `.glb` files with [gltf.report](https://gltf.report) or [glTF-Transform](https://github.com/donmccurdy/glTF-Transform). Models >2MB may load slowly on mobile.

## Storage (Netlify Blobs)

Orders, weekly inventory, and loyalty cards are stored in **Netlify Blobs** — included with the Netlify site, $0/month, no separate database to maintain or keep alive. Data is only accessible server-side (API routes); nothing is exposed to browsers.

Inspect orders from the CLI:

```sh
netlify blobs:list orders          # list order keys
netlify blobs:get orders <key>     # read one order (JSON)
```

During `next dev` (without Netlify), storage falls back to local files in `.netlify/dev-blobs/`.

## Env vars

| Var | Description |
|-----|-------------|
| `NEXT_PUBLIC_MERCHANT_BASE_WALLET` | Base address for USDC/$BREAD/ETH |
| `NEXT_PUBLIC_MERCHANT_ETHEREUM_WALLET` | Ethereum address for USDC/$CULT/ETH |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID |
| `RESEND_API_KEY` | For order emails (optional) |

## Deploy (Netlify)

The site is NOT linked to GitHub — pushing does not deploy. Deploy manually with the CLI, logged in to the Netlify account that owns `breadbreadbread`:

```sh
netlify deploy --build --prod
```

`NEXT_PUBLIC_*` values are baked in at build time from `.env.local`; server secrets (`RESEND_API_KEY`, etc.) are bundled with the server function on deploy.

## Shipping labels (Pirate Ship)

Pirate Ship has no API — integration is via their spreadsheet import:

1. Download open orders as CSV:
   `https://orderbread.online/api/orders-export?key=<ORDERS_EXPORT_KEY>` (add `&days=30` to widen the window; default 14, shipped orders excluded)
2. In Pirate Ship: **Ship → Import a Spreadsheet** → upload the CSV. First time, map the columns (Recipient Name, Address Line 1, City, State, Zipcode, Weight oz, Order ID) — Pirate Ship remembers the mapping afterwards.
3. Buy labels. The "Shipping Service" column says what the customer paid for (UPS 3 Day Select $24 / UPS 2nd Day Air $28); box dimensions are included per row.
4. Rows where "Payment Status" is not `paid` say `CHECK: ...` — verify that payment on the explorer before shipping.

Item weights are estimates set in `PRODUCTS` (`weightOz`) plus `PACKAGING_WEIGHT_OZ` in `lib/constants.ts` — weigh a real packed box and adjust.

## Workflow

Orders are accepted **Monday–Friday** (shop closed weekends, enforced in checkout + API, timezone in `lib/shop-schedule.ts`). All orders **ship out Monday**: bake fresh, vacuum seal, drop off with the Pirate Ship labels. The weekly 10-item cap applies per batch (Saturday→Friday). New orders arrive by email (Resend) and can be inspected with `netlify blobs:list orders`.
