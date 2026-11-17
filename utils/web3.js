import { Web3, FMT_BYTES, FMT_NUMBER } from 'web3'

const LEGACY_FORMAT = { number: FMT_NUMBER.STR, bytes: FMT_BYTES.HEX }

/**
 * Creates a Web3 v4 instance configured to behave like web3 v1 for numbers:
 * values come back as exact decimal strings instead of BigInt.
 *
 * BigInt (the v4 default) crashes JSON.stringify — this app persists balances,
 * fees and event data to localStorage and IndexedDB. Numbers would silently
 * lose precision on wei values (> 2^53). Strings keep values exact and
 * JSON-safe; block-number arithmetic sites are wrapped in Number() where needed.
 */
export function createWeb3(provider, options) {
  const web3 = new Web3(provider)
  web3.setConfig({ defaultReturnFormat: LEGACY_FORMAT })
  return web3
}
