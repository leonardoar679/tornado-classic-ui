/**
 * web3 v4 removed `BN`/`toBN` from web3-utils in favor of native BigInt.
 * This codebase relies on bn.js-style arithmetic (`.gt`, `.gte`, `.mul`, ...)
 * in 15+ store/service files, so we provide the old API backed by bn.js
 * (the same library web3 v1 used internally).
 *
 * web3 v1's toBN (via numberToBN) also accepted 0x-prefixed hex strings —
 * preserved here because call sites pass hex values.
 */
import BN from 'bn.js'

export { BN }

export const toBN = (value) => {
  if (typeof value === 'string') {
    let hex = value.trim()
    let negative = false
    if (hex.startsWith('-')) {
      negative = true
      hex = hex.slice(1)
    }
    if (hex.startsWith('0x') || hex.startsWith('0X')) {
      const bn = new BN(hex.slice(2) || '0', 16)
      return negative ? bn.neg() : bn
    }
  }
  return new BN(value)
}

/** 10^n without Number precision loss (10**18 is > Number.MAX_SAFE_INTEGER). */
export const pow10 = (decimals) => toBN(10).pow(toBN(String(decimals)))

export default BN
