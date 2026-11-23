// @vitest-environment node
/**
 * Relayer-claim verification against REAL mainnet data.
 *
 * A relayer controls the `txHash` / `confirmations` / `status` it reports. These
 * tests pin the helper that checks such a claim through the user's own RPC:
 * a claimed withdrawal only counts when the receipt succeeded and contains the
 * Instance `Withdrawal` event for the note's nullifier.
 */
import fs from 'node:fs'
import Jszip from 'jszip'
import { beforeAll, describe, expect, it } from 'vitest'

import networkConfig from '@/networkConfig.js'
import { isSafeJobId, verifyWithdrawalOnChain } from '@/utils/relayerVerification.js'

// archive-capable public RPC (serves 2022-era receipts used below)
const RPC = 'https://eth.drpc.org'
const INSTANCE_01 = networkConfig.netId1.tokens.eth.instanceAddress[0.1]
const INSTANCE_1 = networkConfig.netId1.tokens.eth.instanceAddress[1]

const load = async (file, name) => {
  const zip = await Jszip.loadAsync(fs.readFileSync(`static/events/${file}`))
  return JSON.parse(await zip.file(name).async('string'))
}

// populated in beforeAll; read lazily because describe bodies run before hooks
const data = {}

beforeAll(async () => {
  data.withdrawals = await load('withdrawals_eth_0.1.json.zip', 'withdrawals_eth_0.1.json')
  data.deposits = await load('deposits_eth_0.1.json.zip', 'deposits_eth_0.1.json')
}, 60000)

/** a genuine withdrawal: { transactionHash, nullifierHash, blockNumber, ... } */
const realWithdrawal = () => data.withdrawals[0]

const lastDepositTx = () => data.deposits[data.deposits.length - 1].transactionHash

describe('isSafeJobId', () => {
  it('accepts ordinary relayer job ids', () => {
    expect(isSafeJobId('e3b0c442-98fc-1c14-9afb-4c8996fb9242')).toBe(true)
    expect(isSafeJobId('6a4a8b2c1d0e3f445160718293a4b5c6')).toBe(true)
    expect(isSafeJobId('job.1_2')).toBe(true)
  })

  it('rejects values that would not behave as object keys or break the status URL', () => {
    expect(isSafeJobId('__proto__')).toBe(false)
    expect(isSafeJobId('constructor')).toBe(false)
    expect(isSafeJobId('prototype')).toBe(false)
    expect(isSafeJobId('../other')).toBe(false)
    expect(isSafeJobId('a b')).toBe(false)
    expect(isSafeJobId('')).toBe(false)
    expect(isSafeJobId(undefined)).toBe(false)
    expect(isSafeJobId(42)).toBe(false)
    expect(isSafeJobId({})).toBe(false)
    expect(isSafeJobId('x'.repeat(257))).toBe(false)
  })
})

describe('verifyWithdrawalOnChain (real mainnet receipts)', () => {
  it('accepts a genuine withdrawal of the note', async () => {
    const real = realWithdrawal()
    const result = await verifyWithdrawalOnChain({
      rpcUrl: RPC,
      txHash: real.transactionHash,
      instanceAddress: INSTANCE_01,
      nullifierHex: real.nullifierHash
    })
    expect(result.verified).toBe(true)
    expect(Number(result.blockNumber)).toBe(Number(real.blockNumber))
  }, 60000)

  it('rejects a real tx that withdrew a DIFFERENT note', async () => {
    const real = realWithdrawal()
    const otherNote = data.withdrawals.find((w) => w.nullifierHash !== real.nullifierHash)
    const result = await verifyWithdrawalOnChain({
      rpcUrl: RPC,
      txHash: real.transactionHash,
      instanceAddress: INSTANCE_01,
      nullifierHex: otherNote.nullifierHash
    })
    expect(result.verified).toBe(false)
    expect(result.reason).toBe('no matching Withdrawal event')
  }, 60000)

  it('rejects a real tx that is not a withdrawal at all (a deposit)', async () => {
    const real = realWithdrawal()
    const result = await verifyWithdrawalOnChain({
      rpcUrl: RPC,
      txHash: lastDepositTx(),
      instanceAddress: INSTANCE_01,
      nullifierHex: real.nullifierHash
    })
    expect(result.verified).toBe(false)
  }, 60000)

  it('rejects the right nullifier withdrawn through a different instance', async () => {
    const real = realWithdrawal()
    const result = await verifyWithdrawalOnChain({
      rpcUrl: RPC,
      txHash: real.transactionHash,
      instanceAddress: INSTANCE_1,
      nullifierHex: real.nullifierHash
    })
    expect(result.verified).toBe(false)
  }, 60000)

  it('rejects a malformed transaction hash without calling the RPC', async () => {
    let called = false
    const result = await verifyWithdrawalOnChain({
      rpcUrl: RPC,
      txHash: 'not-a-tx-hash',
      instanceAddress: INSTANCE_01,
      nullifierHex: realWithdrawal().nullifierHash,
      web3: {
        eth: {
          getTransactionReceipt: async () => {
            called = true
            return null
          },
          abi: {}
        }
      }
    })
    expect(result.verified).toBe(false)
    expect(called).toBe(false)
  })

  it('reports inconclusive (not false) when the receipt is not available', async () => {
    const unknown = '0x' + Array.from({ length: 64 }, (_, i) => ((i * 7 + 3) % 16).toString(16)).join('')
    const result = await verifyWithdrawalOnChain({
      rpcUrl: RPC,
      txHash: unknown,
      instanceAddress: INSTANCE_01,
      nullifierHex: realWithdrawal().nullifierHash
    })
    expect(result.verified).toBeNull()
  }, 60000)

  it('reports inconclusive when the RPC itself fails (must not be treated as a lie)', async () => {
    const result = await verifyWithdrawalOnChain({
      rpcUrl: RPC,
      txHash: realWithdrawal().transactionHash,
      instanceAddress: INSTANCE_01,
      nullifierHex: realWithdrawal().nullifierHash,
      web3: {
        eth: {
          getTransactionReceipt: async () => {
            throw new Error('connection dropped')
          },
          abi: {}
        }
      }
    })
    expect(result.verified).toBeNull()
    expect(result.reason).toBe('connection dropped')
  })
})
