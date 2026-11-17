# Dependency Modernization — Migration & Verification Report

Branch: `chore/upgrade-latest` (from `master` @ a83fae0)
Scope: upgrade all npm packages to latest majors, migrate all affected code.
Toolchain: Node 24 / npm 11 / Nuxt 4.6.4 (Vite + Rolldown) / Vue 3.5 / ESLint 10 / Prettier 3 / vitest 5.

## 1. Baseline (before any change)

The old tree could not even install on any Node version: `@ticket721/e712@0.4.1` has been
unpublished from npm (404 on the tarball), and yarn 1 aborts the install. There was no
working baseline to compare against — `yarn lint` / `yarn build` could not run.

## 2. Package changes (old → new)

| Package | Old | New | Notes |
|---|---|---|---|
| nuxt | 2.14.7 | 4.6.4 | webpack 4 → Vite/Rolldown; new config, plugins, no app.html |
| vue | 2 (implicit) | 3.5.45 | Options API preserved |
| vuex | 3 (implicit) | 4.1.0 | store wired manually in `plugins/09.store.js` |
| vue-i18n | 8.15.4 | 11.4.18 | legacy mode; `<i18n>` → `<i18n-t>`, `path` → `keypath` |
| web3 | 1.5.2 | 4.16.0 | see §3 — the biggest code migration |
| @walletconnect/web3-provider | 1.7.8 | @walletconnect/ethereum-provider 2.26 | v1 protocol is dead; needs `WALLET_CONNECT_PROJECT_ID` env |
| buefy / nuxt-buefy | 0.4.x | @oruga-ui/oruga-next 0.14.6 + theme-bulma 0.10.1 | Oruga is Buefy's Vue 3 successor; emits native Bulma classes |
| moment / @nuxtjs/moment | — | dayjs 1.11.23 | relativeTime, localizedFormat, localeData, duration plugins |
| v-idle / vue-clipboard2 | — | replaced | `components/IdleTracker.vue`, navigator.clipboard |
| @ensdomains/ensjs | 2.1.0 | removed | replaced by direct ENS registry calls (contenthash) |
| eth-sig-util | 2.5.3 | @metamask/eth-sig-util 9.0.0 | same tweetnacl encryption → existing encrypted notes remain decryptable |
| @ticket721/e712 | 0.4.1 | removed (unpublished) | EIP-2612 Permit signer rewritten on eth-sig-util v4 typed data |
| @apollo/client / graphql | 3.3.20 / 15.5.1 | 4.3.8 / 17.1.0 | v4 requires explicit `HttpLink` (caught by tests) |
| ajv (transitive) | 6 | 8.20.0 | custom `BN` keyword rewritten for v8 definition form |
| bulma (transitive) | 0.9 | 1.0.4 | sass entries `…/_all` → `…/index` |
| jest/babel/eslint6/prettier1 | — | vitest 5 / (removed) / eslint 10 / prettier 3 | flat config, `.prettierrc` extended with `endOfLine: auto`, `trailingComma: none` |
| snarkjs / websnark | pinned git forks | unchanged | protocol-critical proving stack, intentionally kept |

Also added as explicit deps code already relied on: `bn.js` (was web3-internal),
`ethers` 6 (was transitive), `assert` + `buffer` (webpack-4 auto-polyfills, Vite needs
them explicitly for websnark's `assert` and the app's `Buffer` usage).

## 3. web3.js v1 → v4 migration (the deep part)

- **`new Web3()` → `createWeb3()`** (`utils/web3.js`): every instance is configured with
  `defaultReturnFormat = { number: 'NUMBER_STR', bytes: 'BYTES_HEX' }`. The v4 default
  (BigInt) crashes `JSON.stringify` — this app persists balances/fees/events to
  localStorage and IndexedDB; `NUMBER` would silently corrupt wei values (> 2^53).
  Exact strings keep values precise and JSON-safe.
- **`toBN`/`BN` removed from web3-utils** → compat module `utils/bn.js` (bn.js-backed,
  preserves v1's `0x`-hex string handling). 15+ files re-pointed.
- **`fromWei(x)`/`toWei(x)` without a unit throw in v4** → all ~40 call sites now pass
  `'ether'` explicitly.
- **`contract._address` → `contract.options.address`** (30 sites).
- **BatchRequest** callback-style `.call.request(cb)` → v4 raw JSON-RPC `batch.add({...})`
  deferred promises (`services/lookupAddress.js`, `store/governance/proposal.js`).
- **`web3.eth.ens` removed** → direct ENS registry contract calls + contenthash decoding
  with base58 (`store/snark.js`, `services/lookupAddress.js`).
- **Block-number arithmetic** wrapped in `Number()` where STR-format values are added
  (gas estimates, chunked event fetch windows, binary search).
- **WalletConnect v2**: `provider.wc.peerMeta` → `provider.session?.peer?.metadata`;
  `provider.wc.on('disconnect', (error, payload))` → `provider.on('disconnect', (error))`.

## 4. UI migration (Buefy → Oruga)

- All `b-*` components → `o-*` (60 files, ~275 usages) with prop translation:
  `type="is-primary is-fullwidth"` → `variant="primary" expanded`; `size="is-small"` →
  `size="small"`; `icon-pack` → `pack`; `multilined` → `multiline`.
- No Oruga equivalents: `b-navbar` → native Bulma navbar markup (`components/Navbar.vue`),
  `b-progress` → native `<progress class="progress is-*">`, `b-radio-button` → `o-radio`.
- Programmatic `$buefy.modal/dialog/snackbar/toast` → `services/ui/` (ModalHost/
  DialogHost/SnackbarHost/ToastHost mounted with the main app context so store/i18n
  keep working) + `plugins/11.buefy-compat.js` facade so existing call sites are unchanged.
- `<template v-for>` keys moved onto the `<template>` tag (Vue 3 compiler requirement).
- `slot="trigger"` → `<template #trigger>`; `slot="x"` → `#x`; `beforeDestroy` →
  `beforeUnmount`; `.native` modifier dropped; `emits` declared on all emitting components.
- Custom `trnd` icon pack preserved via global `iconComponent` (`components/ui/TrndIcon.vue`).
- App SCSS: kept whole; `~bulma/…` imports → package paths; Buefy-SCSS variables
  (`$speed-*`, `$tooltip-arrow-*`, …) redefined in `_base.scss`; programmatic-layer
  styles added in `_programmatic.scss`.

## 5. Framework wiring changes

- `modules/` renamed → `account/` (Nuxt 4 treats a top-level `modules/` dir as Nuxt modules).
- Plugins rewritten as numbered `plugins/NN.*.js` with `defineNuxtPlugin`; injected
  services are mirrored onto the Vuex store instance so `this.$provider` etc. inside
  store actions keep working; `store.app.i18n` = i18n global.
- `app.html` removed (unsupported in Nuxt 4); `app.baseURL` is `/` (a relative `./`
   makes Nuxt 4's built server 302-redirect every request and breaks `nuxt
   generate`); `router.options.js` still detects the IPFS path prefix at runtime.
   Note: serving the built bundle from an IPFS *sub-path* additionally needs a
   runtime asset-base (the old `__webpack_public_path__` trick) — not yet
   reimplemented; root-served static hosting (Cloudflare Workers, nginx at domain
   root) is fully supported.
- `layouts/error.vue` → root `error.vue`; layout `<nuxt/>` → `<slot/>`; layout-level
  `middleware: 'provider'` → `middleware/provider.global.js` with `defineNuxtRouteMiddleware`.
- `window.onNuxtReady` / `$nuxt.$loading` dropped (cosmetic fake progress removed).
- Env injection: webpack `DefinePlugin` → `vite.define` per-key `process.env.X` replacement
  in `nuxt.config.js` (destructuring `const {A} = process.env` rewrites in source files).

## 6. Verification — what was actually run

| Check | Command | Result |
|---|---|---|
| Lint | `npx eslint .` | **0 errors** (2 benign warnings: one `vue/order-in-components` in error.vue, one undeclared `get-key` emit in Withdraw.vue) |
| Unit tests | `npx vitest run` | **9/9 pass** — note round-trip parsing (LE format), bn compat incl. `0x` hex, relayer schema validation |
| Production build | `npm run build` | **succeeds** (client + server + nitro) |
| Static serve | `node .output/server/index.mjs` | HTTP 200, SPA shell served |
| Asset integrity | fetch all 33 referenced assets | **all 200** (no broken hashes / base paths) |
| Sass compile | direct `sass` compile of app.scss | clean |

Bugs the tests caught and fixed (not visible to lint/build):
`toBN('0x…')` rejection; Apollo v4 requiring `HttpLink` (instantiation crash);
note-format endian in the test itself.

## 7. Known limitations / needs manual testing

- **No interactive browser test was automated** (browser tooling cannot reach localhost).
  The client bundle was never executed against a real DOM in CI — first `npm run dev`
  session should watch the console for runtime errors.
- **Wallet flows** (MetaMask connect, WalletConnect v2 pairing, switching networks),
  **deposit/withdraw** end-to-end, and **relayer** flows need a manual pass with real
  wallets — they depend on live RPC keys (`INFURA_KEY` etc.), a WalletConnect project id,
  and external services that are outside this upgrade's scope.
- Subgraph endpoints (`api.thegraph.com/subgraphs/name/tornadocash/…`) and IPFS fallback
  gateways are used as-is; their availability is unchanged from before.
- `snarkjs` remains a pinned dependency but nothing imports it anymore (websnark covers
  proving); kept intentionally for future use.
- `scripts/update*.js` cache builders were migrated (ESM, web3 v4) but not executed
  against live RPCs.
- `tests/` covers the pure logic (notes, bn, schemas), not UI components.
