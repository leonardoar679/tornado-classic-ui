# Deploying to Cloudflare Workers

The app ships as a static SPA (`ssr: false`), so it deploys to Cloudflare as a
**static-assets Worker** — no server code, no cold starts, free-tier friendly.
Deep links (e.g. `/compliance`, `/governance/proposal`) are handled by the
Workers `single-page-application` fallback, which serves `index.html` for any
unknown path.

## Quick start

```bash
npx wrangler login          # one-time OAuth in the browser (or set CLOUDFLARE_API_TOKEN)
npm run deploy:cloudflare   # builds the SPA and deploys it to Workers
```

The deploy prints your `*.workers.dev` URL when it finishes. First deploy may
ask you to enable the workers.dev subdomain — follow the printed link.

## What the scripts do

| Script | Purpose |
|---|---|
| `npm run build:cloudflare` | Runs `nuxt generate` with an absolute asset base (`NUXT_APP_BASE_URL=/`) into `.output/public` |
| `npm run deploy:cloudflare` | `build:cloudflare` + `wrangler deploy` |
| `npm run preview:cloudflare` | `build:cloudflare` + `wrangler dev` (local preview on `http://localhost:8787`) |

The absolute base override matters: the default build uses a relative base
(`./`) so the bundle works from IPFS sub-paths, but the Workers SPA fallback
serves `index.html` from *any* URL, and a relative base would resolve asset
URLs against the current route (e.g. `/governance/_nuxt/...` → 404).

## Configuration

`wrangler.jsonc` controls the deployment:

- `name` — the Worker name (also your `*.workers.dev` subdomain)
- `assets.directory` — `.output/public` (produced by `build:cloudflare`)
- `assets.not_found_handling` — `single-page-application` (SPA fallback)
- `assets.html_handling` — `auto-trailing-slash`

To serve the Worker from a custom domain instead of `workers.dev`, add a route
in the Cloudflare dashboard (Workers → your worker → Settings → Domains & Routes).

## Environment / API keys

Build-time keys (`INFURA_KEY`, `ALCHEMY_*`, `WALLET_CONNECT_PROJECT_ID`, ...)
are read from your shell environment by `nuxt.config.js` and **baked into the
bundle** at build time — set them before running `npm run deploy:cloudflare`
if you want them included. They are *not* uploaded from `.env` by `wrangler
deploy`, and nothing sensitive is needed by the Worker at runtime (it only
serves static files).

The app is fully functional without any keys: every network now defaults to
verified public RPCs (see `networkConfig.js`), and users can switch RPCs in
Settings at runtime. `WALLET_CONNECT_PROJECT_ID` is the only key that
meaningfully changes behavior (WalletConnect pairing); get one at
https://cloud.walletconnect.com.

## Notes

- The built bundle includes the zk proving keys, Merkle tree slices and event
  caches from `static/` (mapped via `dir.public` in `nuxt.config.js`), so
  deposits/withdrawals work with no extra hosting setup.
- `wrangler deploy --dry-run` validates the config and asset listing without
  uploading and without login.
- If `wrangler dev` crashes with "access violation in the runtime" on Windows,
  update the Microsoft Visual C++ Redistributable (workerd runtime requirement)
  — this affects only local preview, not the deployed Worker.
