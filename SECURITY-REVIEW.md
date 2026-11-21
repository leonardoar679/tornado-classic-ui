# Security Review — Source Code & Dependencies

Date: 2026-11-21 · Scope: first-party source (`components/ pages/ plugins/ store/ account/
services/ utils/ lib/ scripts/`), configuration, and the dependency tree.

## Summary

| Area | Result |
|---|---|
| Dependency audit | 80 findings → **71** after fixes; the entire **axios HIGH cluster eliminated** |
| XSS sinks | 1 `v-html` found → **removed** (was static-only; hardened) |
| Clickjacking | No protection → **`X-Frame-Options: DENY` added** (verified live on all routes) |
| eval / postMessage / window.open | None in first-party code (eval only inside the pinned snarkjs fork) |
| Open redirects / `javascript:` URLs | None (explorer/relayer URLs built on hardcoded https bases) |
| Secrets | `.env` gitignored (not tracked); only `.env.example` committed |
| `target="_blank"` | All anchors carry `rel="noopener noreferrer"` (verified) |

## Fixed in this pass

1. **axios 0.21.4 bundled in the browser via `gas-price-oracle`** (20 HIGH advisories:
   prototype-pollution gadgets, credential leaks, SSRF-class issues). `gas-price-oracle`
   only uses `axios.get/post(url, {timeout})` — fully axios-1.x compatible — so an npm
   override forces it onto the top-level axios 1.21.1. **Smoke-tested live**: the app's
   exact oracle configuration fetched gas prices over a public mainnet RPC after the swap.
2. **`v-html="hasErrorNote.msg"` in `components/withdraw/Withdraw.vue`** — the only HTML
   injection sink in the app. Today it renders only static i18n strings (no user input
   reaches it), but the note field is attacker-controllable text, so a future interpolated
   message would become XSS. Replaced with text interpolation + `white-space: pre-line`;
   the `<br />` in the `turnOnWasm` translations (6 locales) became `\n`.
3. **Clickjacking**: no framing protection existed (a `<meta>` CSP cannot carry
   `frame-ancestors`). Added nitro `routeRules` → `X-Frame-Options: DENY` for the dev
   server and node-server build (verified via live request on `/` and `/compliance`).
   Static hosts should set the same header at the edge (nginx `add_header`, Cloudflare
   Pages `_headers`; Workers static assets currently have no per-file headers).
4. `npm audit fix` non-breaking round (7 findings resolved; e.g. glob/minimatch).

## Remaining advisories — reviewed, not fixable without breaking protocol-critical pins

| Package | Severity | Path | Disposition |
|---|---|---|---|
| flatted ≤3.4.1 | high (PP via `parse()`) | pinned snarkjs fork | Parses our same-origin circuit JSON only. No fix without touching the protocol-critical pin. |
| elliptic (all versions, "risky implementation") | advisory | circomlibjs → ethers 5 → signing-key | ECDSA signing path unreachable — circomlibjs uses ethers only for curve math (Pedersen/MiMC). Pinned via protocol-critical circomlibjs. |
| zod <4.6.6 | high (DoS) | web3-validator + WalletConnect appkit | Overriding to zod 4 breaks zod-3 consumers. Impact: a malicious RPC response exhausting memory — stick to reputable RPCs (defaults are verified public endpoints). |
| uuid <11.1.1 | moderate | @metamask/utils (eth-sig-util@9) | Advisory affects v3/v5/v6 with `buf`; only v4 (random) is used — not applicable. eth-sig-util@10 would be a breaking change to the note-encryption stack. |
| jszip <3.8.0 | moderate (path traversal) | zip-local (build script only) | `scripts/updateZip.js` zips our own files at maintenance time; runtime jszip is 3.10.2 (patched). |
| tmp ≤0.2.5 | high (symlink) | pinned snarkjs fork → eslint@5 → inquirer → external-editor → tmp | Dev-dependency chain inside the git fork; never imported, never ships in the browser bundle. |
| ws 8.x | moderate | @ethersproject/providers (node context) | Node-side only; the browser uses native WebSocket. |

## Source review — clean

- **No** `eval` / `new Function` / `window.open` / `message` event listeners in
  first-party code. (Direct `eval` exists only inside the pinned snarkjs fork's witness
  generation — protocol-critical, accepted.)
- **No dynamic redirect targets**: the only `window.location` assignments are the
  hardcoded sanctioned-address compliance redirect (intentional, original feature) and
  the static multitab lockout notice.
- **Explorer/relayer URLs**: `txExplorerUrl` builds on hardcoded per-network https
  bases; relayer hostnames are forced to `https:` (`.onion` exempted) and relayer
  responses are ajv-schema-validated before use.
- **Relayer list** comes from ENS records + hardcoded defaults, schema-validated
  (`store/relayer.js`).
- **Storage**: `.env` is gitignored; the committed `.env.example` contains no secrets
  (the WalletConnect project id is public-by-design — it ships in every frontend bundle).

## Design-level notes (inherited architecture, documented)

1. **Note-account key in sessionStorage** (`account/store/actions/*`): the private key
   that decrypts encrypted notes lives in sessionStorage for the tab's lifetime, and
   encrypted notes persist in localStorage (vuex-persistedstate). Any XSS would be able
   to exfiltrate them. Mitigants: no HTML sinks remain; CSP limits script sources.
   This is the original Tornado design — changing it is a product decision, not a patch.
2. **CSP** requires `'unsafe-eval'` (websnark WASM + snarkjs witness eval) and
   `'unsafe-inline'` (styles) — as strict as the ZK stack allows. `connect-src *` is
   required for user-switchable RPCs.
3. **Proving-key/circuit supply chain** (`store/snark.js`): the primary source is
   same-origin (`static/`, shipped inside the build — verified present in output). The
   fallback resolves `tornadocash.eth` contenthash → public IPFS gateways **without
   pinning the expected hash**. If the same-origin assets were unavailable AND the ENS
   name were compromised, a malicious circuit could leak note secrets through public
   signals. Recommendation: pin the known contenthash at build time and refuse
   fallbacks that mismatch. Not changed here (protocol-sensitive path, primary path
   already safe) — say the word and I'll implement the pin.
4. **Pre-existing lint errors (16, formatting-only)** in recent commits
   (`account/modals/*`, `Actions.vue`, `RelayerTab.vue`, `ProposalCommentFormModal.vue`,
   `DepositModalBox.vue`, `updateZip.js`, `relayer.js`, `txHashKeeper.js`, `error.vue`)
   — flagged, left untouched to keep this change reviewable. `Withdraw.vue` was
   formatted because it is also modified here.

## Verification

- `npm audit`: axios cluster eliminated (0 flags for gas-price-oracle/axios)
- gas-price-oracle smoke test against live mainnet RPC (gas prices fetched)
- `npm run build` + `npm run generate`: green, 0 warnings
- unit tests 9/9; eslint clean on all files touched here
- `X-Frame-Options: DENY` verified via live HTTP request on `/` and `/compliance`
