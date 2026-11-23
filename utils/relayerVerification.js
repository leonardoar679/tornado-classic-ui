import InstanceABI from '@/abis/Instance.abi.json'
import { createWeb3 } from '@/utils/web3.js'

/**
 * Relayer responses are untrusted input: a relayer decides what `txHash`,
 * `confirmations` and `status` the UI sees. These helpers keep the UI from
 * taking a relayer's word for a withdrawal that moves a user's note.
 */

const WITHDRAWAL_EVENT = InstanceABI.find((entry) => entry.type === 'event' && entry.name === 'Withdrawal')
const NON_INDEXED_INPUTS = WITHDRAWAL_EVENT.inputs.filter((input) => !input.indexed)
const TX_HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/
// a relayer-supplied job id is used as a state key; these would not behave like keys
const UNSAFE_JOB_IDS = new Set(['__proto__', 'constructor', 'prototype'])

// whitespace, control characters and URL-structural characters break the job status URL
const isUnsafeChar = (character) => {
  const code = character.charCodeAt(0)
  return code <= 0x20 || code === 0x7f || '/?#'.includes(character)
}

/**
 * True when `id` is usable both as an object key and inside the job status URL.
 */
export function isSafeJobId(id) {
  return (
    typeof id === 'string' &&
    id.length > 0 &&
    id.length <= 256 &&
    ![...id].some(isUnsafeChar) &&
    !UNSAFE_JOB_IDS.has(id)
  )
}

/**
 * Checks on-chain — through the user's own RPC, never the relayer's — that a
 * transaction really spent `nullifierHex` on `instanceAddress`.
 *
 * Returns one of:
 *   { verified: true }        receipt found, tx succeeded, matching Withdrawal event
 *   { verified: false, ... }  definitive: malformed hash, reverted tx, or no such event
 *   { verified: null, ... }   inconclusive (RPC error / receipt not visible yet)
 */
export async function verifyWithdrawalOnChain({ rpcUrl, txHash, instanceAddress, nullifierHex, web3 }) {
  if (typeof txHash !== 'string' || !TX_HASH_PATTERN.test(txHash)) {
    return { verified: false, reason: 'malformed transaction hash' }
  }

  const instance = String(instanceAddress || '').toLowerCase()
  if (!instance) {
    return { verified: null, reason: 'instance address unknown' }
  }

  const w3 = web3 || createWeb3(rpcUrl)
  const expectedNullifier = String(nullifierHex).toLowerCase()

  let receipt
  try {
    receipt = await w3.eth.getTransactionReceipt(txHash)
  } catch (e) {
    return { verified: null, reason: e?.message || 'RPC error' }
  }
  if (!receipt) {
    return { verified: null, reason: 'receipt not available yet' }
  }
  if (!(receipt.status === true || Number(receipt.status) === 1)) {
    return { verified: false, reason: 'transaction reverted' }
  }

  const topic0 = String(w3.eth.abi.encodeEventSignature(WITHDRAWAL_EVENT)).toLowerCase()
  const isWithdrawalOfNote = (entry) => {
    if (!entry || String(entry.address).toLowerCase() !== instance) {
      return false
    }
    const topics = entry.topics || []
    if (String(topics[0]).toLowerCase() !== topic0) {
      return false
    }
    try {
      const decoded = w3.eth.abi.decodeParameters(NON_INDEXED_INPUTS, entry.data)
      return String(decoded.nullifierHash).toLowerCase() === expectedNullifier
    } catch {
      return false
    }
  }

  if ((receipt.logs || []).some(isWithdrawalOfNote)) {
    return { verified: true, blockNumber: receipt.blockNumber }
  }
  return { verified: false, reason: 'no matching Withdrawal event' }
}
