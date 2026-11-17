# On-Chain Verification Report — Deposit / Withdraw / Compliance (all ETH amounts)

Date: 2026-11-17 · Branch: `chore/upgrade-latest` · Suite: `tests/onchain.spec.js` (20 tests, all passing)

## What was tested, and how

The suite imports the app's **real modules** (`utils/crypto.js`, `services/pedersen.js`,
`services/mimc.js`, `utils/web3.js`, `abis/Instance.abi.json`, `networkConfig.js`) — not
reimplementations — and runs them against **real mainnet**:

- RPC: `https://eth.drpc.org` (serves archive-era data without a token; publicnode refuses
  archive requests and prunes old txs)
- Real circuit + proving key: the exact `static/tornado.json.zip` /
  `static/tornadoProvingKey.bin.zip` the browser app downloads
- Real historical events: the repo's cached mainnet event files (`static/events/*.json.zip`)

### Results (all passing)

| Area | 0.1 ETH | 1 ETH | 10 ETH | 100 ETH |
|---|---|---|---|---|
| Deposit computation (note → pedersen commitment → parseNote round-trip) | ✓ | ✓ | ✓ | ✓ |
| Withdraw proof (merkle tree → path → websnark groth16 proof, exact `createSnarkProof` path) | ✓ | ✓ | ✓ | ✓ |
| **Proof ACCEPTED by the real mainnet Verifier contract (`eth_call`)** | ✓ | ✓ | ✓ | ✓ |
| Instance state (denomination, nextIndex, roots, isKnownRoot) | ✓ | ✓ | ✓ | ✓ |
| Compliance: real deposit found by commitment (event data + tx receipt) | ✓ | ✓ | ✓ | ✓ |
| Compliance: real withdrawal found by nullifier, `isSpent() == true`, fee/recipient decoded | ✓ | ✓ | ✓ | ✓ |

The proof verification uses the verifier's real signature `verifyProof(bytes, uint256[6])`
(confirmed from the on-chain contract ABI via Blockscout) and submits the exact proof bytes
`toSolidityInput` produces — i.e., byte-for-byte what the app's `withdraw` action sends on-chain.
Sanity anchor: a known-good historical mainnet withdraw proof extracted from a real 2022
transaction also verifies `true` through the same path.

## Real bugs found by this verification (and fixed)

1. **web3 v4 contract calls always return BigInt** — ABI-decoded values ignore
   `defaultReturnFormat` entirely (`decodeFunctionReturn` takes no format). `web3.eth.*`
   responses were strings (STR config), but every `contract.methods.x().call()` result and
   event `returnValues` integer came back as BigInt. This would have crashed the app at
   runtime (JSON.stringify of BigInt throws when persisting balances/fees/events).
   Fix: `utils/web3.js` now installs a `LegacyContract` subclass on every `createWeb3()`
   instance that normalizes BigInt → decimal strings on `.call()` results and event
   `returnValues`, restoring web3-v1 behavior app-wide.
2. **`window.graph = graph` in `services/index.js` crashed Node contexts** (tests/scripts)
   — now guarded with `typeof window !== 'undefined'`.

## Environment notes

- `.env` has **no `INFURA_KEY`** and empty Alchemy keys — the configured RPC URLs are
  unusable (`.../v3/undefined`). Reads in this test used the free public drpc endpoint.
  For the browser app, set real keys or pick a custom RPC in Settings.
- Tornado's subgraph endpoints (`api.thegraph.com/subgraphs/name/tornadocash/…`) are dead
  (hosted service sunset) — the app's event fetchers fall back to RPC `getPastEvents`,
  which is the path exercised here. This is pre-existing, not migration-caused.

## Not covered — requires a funded wallet

Actually **broadcasting** deposit/withdraw transactions (real ETH) was not done: there is
no funded account in the environment, and depositing 0.1+1+10+100 = 111.1 ETH plus gas is
real money. Everything up to the signature/broadcast step is verified: the deposit calldata
construction, the proof the verifier accepts, gas estimation sites, and the post-tx event
lookups (verified against real historical transactions instead).

To complete the live cycle, either provide a funded private key (mainnet or an anvil fork
RPC at a recent block) or run the flows from the UI with a wallet you control.
