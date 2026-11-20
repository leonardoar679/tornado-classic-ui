# Tornado Cash Classic UI

> UI for non-custodial Ethereum privacy solution

Modernized to current majors: Nuxt 2 → **Nuxt 4** (Vite/Rolldown), Vue 3, Vuex 4,
web3.js **v4**, WalletConnect **v2**, Oruga + Bulma 1, ESLint 10, vitest.
See [MIGRATION.md](MIGRATION.md) for the full upgrade notes and
[ONCHAIN-VERIFICATION.md](ONCHAIN-VERIFICATION.md) for the on-chain test report.

## Requirements

- [Node.js](https://nodejs.org) 20+ (24 recommended; `.nvmrc` pins 24 — `nvm use`)
- npm (no yarn needed)

## Quick start

```bash
npm install
cp .env.example .env   # optional — see below
npm run dev            # http://localhost:3000
```

**No API keys are required.** Every network ships several verified public RPCs
(see `networkConfig.js`); the app automatically fails over between them, and
users can switch RPC in Settings at runtime. Provider keys only add
higher-rate/private endpoints.

### Environment variables (all optional, build-time)

| Variable | Purpose |
|---|---|
| `WALLET_CONNECT_PROJECT_ID` | WalletConnect v2 pairing (create at https://cloud.walletconnect.com) — the only key that meaningfully changes behavior |
| `INFURA_KEY`, `ALCHEMY_*_KEY` | Adds the keyed Infura/Alchemy endpoints to the RPC lists |
| `PINATA_API_KEY`, `PINATA_SECRET_API_KEY` | Only for `npm run deploy:ipfs` |
| `STORE_NAME`, `OLD_STORE_NAME`, `APP_ENS_NAME` | Account/ENS naming overrides |
| `NUXT_APP_BASE_URL` | Serve from a sub-path (must be absolute, e.g. `/app/`) |

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server with HMR (single tab only — the app guards against multi-tab note corruption) |
| `npm run build` | Production build (Node server, `.output/server`) |
| `npm run generate` | Static SPA to `.output/public` (all page shells + proving keys + event caches) |
| `npm run lint` | ESLint 10 (flat config) + Prettier 3 |
| `npm test` | vitest — see Testing |
| `npm run deploy:cloudflare` | Build + deploy to Cloudflare Workers |
| `npm run preview:cloudflare` | Build + local Workers preview (`wrangler dev`) |
| `npm run deploy:ipfs` | `generate` + upload to Pinata |
| `npm run update:*` | Refresh cached events/trees — see below |

## Deployment

- **Cloudflare Workers** (recommended): `npx wrangler login` once, then
  `npm run deploy:cloudflare`. Static-assets Worker with SPA fallback — deep
  links work, no server code, free-tier friendly. Details:
  [DEPLOY-CLOUDFLARE.md](DEPLOY-CLOUDFLARE.md).
- **Any static host**: upload `.output/public` after `npm run generate`
  (nginx, Netlify, Vercel, …). `netlify.toml` keeps the original
  sanctioned-countries 451 redirect; the legacy `Dockerfile` expects a
  prebuilt folder copied in — point it at `.output/public` contents if you
  use it.
- **Node server**: `npm run build` then `node .output/server/index.mjs`.
- **IPFS**: `npm run deploy:ipfs` (needs Pinata keys). Note: serving from an
  IPFS *sub-path* needs a runtime asset base that is not yet reimplemented —
  root-served hosting is fully supported.

## Testing

`npm test` runs two kinds of suites:

- **Unit** — note parsing (little-endian format), BN compat layer, relayer schema.
- **On-chain integration** (`tests/onchain.spec.js`, needs internet) — runs the
  app's real modules against Ethereum mainnet via public RPCs: deposit note →
  Pedersen commitment, Merkle-tree SNARK withdraw proofs **verified by the real
  on-chain Verifier contracts** via `eth_call`, instance state reads and
  compliance lookups on real historical deposits/withdrawals — for the
  0.1 / 1 / 10 / 100 ETH instances.

## Supported networks

Ethereum, BNB Chain, Polygon, Optimism, Arbitrum, Gnosis, Avalanche
(+ legacy Goerli config). Contract addresses and RPC lists live in
`networkConfig.js`.

## Architecture

Nuxt 4 SPA (`ssr: false`, `srcDir: '.'`) · Vue 3 · Vuex 4 · vue-i18n 11
(legacy mode) · Oruga + Bulma 1 · web3.js v4 (v1-style string numbers via
`utils/web3.js`) · WalletConnect v2 · snarkjs/websnark pinned Tornado forks
(proof-format critical, intentionally not upgraded).

Store wiring lives in `plugins/09.store.js` (not the Nuxt `store/` dir
convention) so the legacy `this.$provider` / `this.app.i18n` context keeps
working inside store actions. A Buefy-compatibility layer
(`plugins/11.buefy-compat.js` + `services/ui/`) keeps the programmatic
modal/dialog/snackbar/toast call sites working on Oruga.

The zk proving keys, Merkle-tree slices and event caches ship from `static/`
(mapped via `dir.public`), so deposits/withdrawals need no extra hosting setup.

## Update cached files

- For update deposits and withdrawals events use `npm run update:events {chainId}`
- For update encrypted notes use `npm run update:encrypted {chainId}`
- For update merkle tree use `npm run update:tree {chainId}`

#### NOTE!

After update cached files do not forget to use `npm run update:zip`

### Example for Ethereum Mainnet:

```
npm run update:events 1
npm run update:encrypted 1
npm run update:tree 1

npm run update:zip
```

### Example for Binance Smart Chain:

```
npm run update:events 56
npm run update:encrypted 56

npm run update:zip
```

## Audit

[TornadoCash_Classic_dApp_audit_Decurity.pdf](https://tornado.cash/audits/TornadoCash_Classic_dApp_audit_Decurity.pdf)

## License

[MIT](LICENSE)
