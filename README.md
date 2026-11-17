# Tornado Cash Classic UI

> UI for non-custodial Ethereum Privacy solution

## Building locally

- Install [Node.js](https://nodejs.org) version 20+ (24 recommended)
  - If you are using [nvm](https://github.com/creationix/nvm#installation) (recommended) running `nvm use` will automatically choose the right node version for you.
- Install dependencies: `npm install`
- Copy the `.env.example` file to `.env`
  - Replace environment variables with your own personal.
  - `WALLET_CONNECT_PROJECT_ID` is required for WalletConnect login — create one at https://cloud.walletconnect.com
- Build the project to the `./dist/` folder with `npm run generate`.

## Development builds

To start a development build (e.g. with logging and file watching) run `npm run dev`.

## Lint & test

- `npm run lint` — ESLint 10 (flat config) + Prettier 3
- `npm test` — vitest (note parsing, bn compat, relayer schema)

## Deploy on IPFS

- Make sure you set `PINATA_API_KEY` and `PINATA_SECRET_API_KEY` environment variables in `.env`
- To deploy a production build run `npm run deploy:ipfs`.

## Architecture

Nuxt 4 (SPA, Vite/Rolldown) · Vue 3 · Vuex 4 · vue-i18n 11 (legacy mode) · Oruga + Bulma 1
web3.js v4 · WalletConnect v2 · snarkjs/websnark (pinned Tornado forks)

Store wiring lives in `plugins/09.store.js` (not the Nuxt `store/` dir convention) so the
legacy `this.$provider` / `this.app.i18n` context keeps working inside store actions.
A Buefy-compatibility layer (`plugins/11.buefy-compat.js` + `services/ui/`) keeps the
programmatic modal/dialog/snackbar/toast call sites working on Oruga.

## Audit

[TornadoCash_Classic_dApp_audit_Decurity.pdf](https://tornado.cash/audits/TornadoCash_Classic_dApp_audit_Decurity.pdf)

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
