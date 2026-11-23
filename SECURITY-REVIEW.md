# Security Review — Source Code & Dependencies

## Review #2 — 2026-11-23

**Starting point.** No commits since Review #1 (same tree as `5eeaa38`), clean working tree,
`npm audit` unchanged (71 findings, same 6 packages: elliptic, flatted, jszip, tmp, uuid,
zod — nothing new published in two days). So this pass did not repeat Review #1: it went
deeper into areas that were only skimmed — what the app trusts from relayers, the deploy
scripts, CI, Docker, git history, key handling, and every dynamic link/state key.

### Summary

| Area | Result |
|---|---|
| Relayer withdrawal claims | **Trusted blindly → now verified on-chain** (fixed, 18 tests) |
| `scripts/ipfsUpload.js` | Published a **stale build** by default and **printed Pinata keys on error** → fixed |
| Docker build context | No `.dockerignore` → `.env`/`.git` could be baked into a public web root → fixed |
| Relayer job id | Unvalidated, used as a state key → guarded (low) |
| CI workflow | Stale (yarn / Node 14) + insecure-flag and tag-pinned actions → **needs your decision** |
| Dynamic links, navigation, key generation, permit signing | Clean (new coverage) |
| Secrets in git history | None (measured, values never printed) |

### Fixed in this pass

**1. The UI took a relayer's word for a completed withdrawal (medium).**
`store/relayer.js → handleResponse` read `txHash`, `confirmations` and `status` straight
from the relayer's JSON. A relayer reporting `CONFIRMED` made the UI show "Withdrawn …"
and record the note as spent — nothing checked the chain. A relayer cannot redirect funds
(the proof binds the recipient), but a malicious or compromised one could report success
for a transaction that was never sent, convincing users to discard a note that is still
unspent. This logic is inherited from the original UI's polling flow.

Fix (`utils/relayerVerification.js` + wiring): before reporting success, the claimed
transaction is checked through the **user's own RPC** — receipt must exist, must have
succeeded, and must contain the Instance `Withdrawal` event for **that note's nullifier**.

- **Verified** → unchanged success behavior.
- **Disproven** (receipt exists but does not match / reverted / malformed hash) → job is
  failed, an explicit warning is shown ("…could not be verified on-chain. Your note has
  NOT been marked as spent…"), the note is never marked spent, and the relayer's tx hash
  is kept for inspection.
- **Inconclusive** (RPC error, receipt not visible yet) → retried 3×, then the historical
  behavior is kept so a legitimate withdrawal is never blocked by an RPC hiccup.

Tests (18): the helper against **real mainnet receipts** (genuine withdrawal accepted; a
real tx that withdrew a *different* note, a real deposit tx, and the right nullifier via
the wrong instance all rejected; missing receipt / RPC failure reported as inconclusive,
never as a lie), and the real store action + mutations for each outcome — including a
real mainnet transaction claimed for a freshly generated note through the real action.

**2. `scripts/ipfsUpload.js` (medium for anyone running `npm run deploy:ipfs`).**
- It defaulted to uploading `./dist` — the **stale pre-Nuxt-4 build folder**, which still
  exists on this machine. `deploy:ipfs` passes no argument, so it would have published
  an outdated build instead of the one just generated. Now defaults to `.output/public`
  and refuses any directory without an `index.html`.
- Its error handler was `console.log(e)`. An axios error carries the request config, so
  on failure it printed **both Pinata credentials** to the terminal / CI log. Verified
  with dummy values: the old handler exposed key and secret (`true` / `true`), the new
  one exposes neither. Now prints only the response body or message.
- New guard: refuses to run (before any network call) unless both Pinata keys are set —
  so it can never manage the real pin list by accident.

Verified with four runs using dummy credentials from a temp directory (the repo's real
`.env` is never loaded): all guards stop before any network call; the one case that
reaches Pinata prints only its `INVALID_API_KEYS` response.

**3. No `.dockerignore` (low–medium, conditional).** `Dockerfile` does `COPY .` into a
public nginx web root. CI passes `dist` as the context, but a `docker build .` from a
developer checkout would have published `.env` and the whole `.git` directory. Added
`.dockerignore` (secrets, VCS data, tooling state).

**4. Relayer-supplied job id (low).** `const { id } = await response.json()` was used
unvalidated as a state key (`state.jobs[…][id]`); an id of `__proto__` would reassign the
prototype of that job bucket. Impact is small (the relayer already controls its own job
data), but it is now rejected before anything is stored.

**5.** `.env.example` was missing the `PINATA_SECRET_API_KEY` placeholder that the upload
script requires — restored.

### Needs your decision (not changed)

**CI workflow — `.github/workflows/nodejs.yml`** (inherited from upstream):
- It is **stale**: still `yarn install` on Node 14, while the project is now npm with
  `engines.node >= 20` and no `yarn.lock` — it cannot pass as written, so the repo
  currently has no working CI (no lint/test/build gate).
- `ACTIONS_ALLOW_UNSECURE_COMMANDS: 'true'` re-enables the retired `set-env` command
  mechanism in the step that loads an SSH private key.
- All 15 action references are pinned to **tags, not commit SHAs** — 7 of them
  third-party actions that handle SSH, Docker, Pinata and Telegram secrets. A hijacked
  tag would run with those secrets.
- Mitigating facts: it only triggers on `push` to `master` (no `pull_request_target`, so
  no fork-PR secret exposure) and deploys to upstream repos this fork has no credentials
  for.
- Recommendation: replace it with a minimal modern pipeline (`npm ci`, lint, test, build
  on pull requests) with SHA-pinned actions — or delete it until needed. Say the word
  and I'll write it.

**Also carried over:** the ENS→IPFS proving-key fallback still has no contenthash pinning
(see Review #1, design note 3); a proper multi-stage `Dockerfile` would make the legacy
one deployable; 12 formatting-only lint errors remain in recent commits (untouched).

### Checked and clean in this pass (new coverage)

- **Every dynamic `href` (16 sites)** goes through `txExplorerUrl` / `addressExplorerUrl`
  (hardcoded per-network https bases — cannot become `javascript:`) or static config.
  The governance comment `contact` field renders as text, not a link.
- **Navigation**: all `router.push` targets are static internal paths — no
  query-parameter-driven redirect.
- **Key generation**: note secrets/nullifiers use `crypto.getRandomValues`; the
  note-account key comes from `web3.eth.accounts.create()` (CSPRNG). `Math.random` is
  used only for relayer selection and a tab id — never for secrets.
- **Note-account encryption** is the original NaCl box scheme
  (`x25519-xsalsa20-poly1305`); the TORN permit is bounded (exact amount, one-day
  deadline) and its domain includes the chain id.
- **State keys from external input**: no `__proto__` handling issues and no untrusted
  `for…in`/`Object.assign` merges beyond the job id fixed above.
- **Secrets in git history**: `.env` was never tracked; every value in `.env.example` was
  empty in every historical commit except the WalletConnect project id (public by
  design) and the ENS name. Measured by length only — no values were printed.
- Review #1 fixes are intact: axios override effective (gas-price-oracle not flagged),
  no `v-html` sinks remain, `X-Frame-Options: DENY` still configured.

### Verification

- vitest: **47/47** across 6 files (unit 9 · on-chain mainnet 20 · relayer helper 9 ·
  relayer store 9)
- `npm run build`: green, 0 warnings
- eslint: clean on every file added or modified here; `store/relayer.js` keeps exactly
  its 2 pre-existing errors (baseline), no new ones
- Not covered: no end-to-end run against a live relayer (the flow is validated at the
  action level and against real receipts)

---

## Review #1 — 2026-11-21

### Summary

| Area | Result |
|---|---|
| Dependency audit | 80 findings → **71** after fixes; the entire **axios HIGH cluster eliminated** |
| XSS sinks | 1 `v-html` found → **removed** (was static-only; hardened) |
| Clickjacking | No protection → **`X-Frame-Options: DENY` added** (verified live on all routes) |
| eval / postMessage / window.open | None in first-party code (eval only inside the pinned snarkjs fork) |
| Open redirects / `javascript:` URLs | None (explorer/relayer URLs built on hardcoded https bases) |
| Secrets | `.env` gitignored (not tracked); only `.env.example` committed |
| `target="_blank"` | All anchors carry `rel="noopener noreferrer"` (verified) |

### Fixed in Review #1

1. **axios 0.21.4 bundled in the browser via `gas-price-oracle`** (20 HIGH advisories:
   prototype-pollution gadgets, credential leaks, SSRF-class issues). `gas-price-oracle`
   only uses `axios.get/post(url, {timeout})` — fully axios-1.x compatible — so an npm
   override forces it onto the top-level axios 1.21.1. Smoke-tested live: the app's
   exact oracle configuration fetched gas prices over a public mainnet RPC after the swap.
2. **`v-html="hasErrorNote.msg"` in `components/withdraw/Withdraw.vue`** — the only HTML
   injection sink in the app. It rendered only static i18n strings, but the note field is
   attacker-controllable text, so a future interpolated message would become XSS.
   Replaced with text interpolation + `white-space: pre-line`; the `<br />` in the
   `turnOnWasm` translations (6 locales) became `\n`.
3. **Clickjacking**: no framing protection existed (a `<meta>` CSP cannot carry
   `frame-ancestors`). Added nitro `routeRules` → `X-Frame-Options: DENY` for the dev
   server and node-server build (verified via live request on `/` and `/compliance`).
   Static hosts should set the same header at the edge.
4. `npm audit fix` non-breaking round (7 findings resolved).

### Remaining advisories — reviewed, not fixable without breaking protocol-critical pins

| Package | Severity | Path | Disposition |
|---|---|---|---|
| flatted ≤3.4.1 | high (PP via `parse()`) | pinned snarkjs fork | Parses our same-origin circuit JSON only. No fix without touching the protocol-critical pin. |
| elliptic (all versions, "risky implementation") | advisory | circomlibjs → ethers 5 → signing-key | ECDSA signing path unreachable — circomlibjs uses ethers only for curve math (Pedersen/MiMC). Pinned via protocol-critical circomlibjs. |
| zod <4.6.6 | high (DoS) | web3-validator + WalletConnect appkit | Overriding to zod 4 breaks zod-3 consumers. Impact: a malicious RPC response exhausting memory — stick to reputable RPCs (defaults are verified public endpoints). |
| uuid <11.1.1 | moderate | @metamask/utils (eth-sig-util@9) | Advisory affects v3/v5/v6 with `buf`; only v4 (random) is used — not applicable. |
| jszip <3.8.0 | moderate (path traversal) | zip-local (build script only) | `scripts/updateZip.js` zips our own files at maintenance time; runtime jszip is 3.10.2 (patched). |
| tmp ≤0.2.5 | high (symlink) | pinned snarkjs fork → eslint@5 → inquirer → external-editor → tmp | Dev-dependency chain inside the git fork; never imported, never ships in the browser bundle. |
| ws 8.x | moderate | @ethersproject/providers (node context) | Node-side only; the browser uses native WebSocket. |

### Design-level notes (inherited architecture, documented)

1. **Note-account key in sessionStorage** (`account/store/actions/*`): the private key
   that decrypts encrypted notes lives in sessionStorage for the tab's lifetime, and
   encrypted notes persist in localStorage (vuex-persistedstate). Any XSS would be able
   to exfiltrate them. Mitigants: no HTML sinks remain; CSP limits script sources.
2. **CSP** requires `'unsafe-eval'` (websnark WASM + snarkjs witness eval) and
   `'unsafe-inline'` (styles) — as strict as the ZK stack allows. `connect-src *` is
   required for user-switchable RPCs.
3. **Proving-key/circuit supply chain** (`store/snark.js`): the primary source is
   same-origin (`static/`, shipped inside the build). The fallback resolves
   `tornadocash.eth` contenthash → public IPFS gateways **without pinning the expected
   hash**. If the same-origin assets were unavailable AND the ENS name were compromised,
   a malicious circuit could leak note secrets through public signals. Recommendation:
   pin the known contenthash at build time and refuse fallbacks that mismatch.
4. **Pre-existing lint errors** in recent commits — flagged, left untouched
   (`Withdraw.vue` was formatted because it was also modified).
