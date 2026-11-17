import { Web3, FMT_BYTES, FMT_NUMBER } from 'web3'

const LEGACY_FORMAT = { number: FMT_NUMBER.STR, bytes: FMT_BYTES.HEX }

/**
 * web3 v4 ABI-decodes integers as BigInt, ignoring defaultReturnFormat
 * (decodeFunctionReturn does not take a format). web3 v1 returned numbers for
 * small uints and decimal strings for uint256, and this app persists contract
 * values to localStorage/IndexedDB (BigInt crashes JSON.stringify) and feeds
 * them to bn.js arithmetic. This normalizer restores the v1 behavior.
 */
function normalizeBigInts(value) {
  if (typeof value === 'bigint') {
    return value.toString()
  }
  if (Array.isArray(value)) {
    return value.map(normalizeBigInts)
  }
  if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      value[key] = normalizeBigInts(value[key])
    }
    return value
  }
  return value
}

/**
 * Creates a Web3 v4 instance configured to behave like web3 v1 for numbers:
 * - web3.eth.* responses come back as exact decimal strings instead of BigInt
 *   (setConfig defaultReturnFormat).
 * - contract `.call()` results and event `returnValues` are normalized to
 *   decimal strings via LegacyContract (see normalizeBigInts).
 *
 * BigInt (the v4 default) crashes JSON.stringify — this app persists balances,
 * fees and event data to localStorage and IndexedDB. Numbers would silently
 * lose precision on wei values (> 2^53). Strings keep values exact and
 * JSON-safe; block-number arithmetic sites are wrapped in Number() where needed.
 */
export function createWeb3(provider, options) {
  const web3 = new Web3(provider)
  web3.setConfig({ defaultReturnFormat: LEGACY_FORMAT })

  const OriginalContract = web3.eth.Contract

  class LegacyContract extends OriginalContract {
    async _contractMethodCall(...args) {
      return normalizeBigInts(await super._contractMethodCall(...args))
    }

    async getPastEvents(...args) {
      const events = await super.getPastEvents(...args)
      for (const event of events) {
        if (event && event.returnValues) {
          normalizeBigInts(event.returnValues)
        }
      }
      return events
    }
  }

  web3.eth.Contract = LegacyContract
  return web3
}
