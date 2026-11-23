// @vitest-environment node
/**
 * Store wiring for relayer-claim verification (real actions + mutations).
 *
 * `handleResponse` consumes whatever a relayer says about a withdrawal. These
 * tests pin how the UI reacts to each verification outcome:
 *   verified      -> success notice + resolves (note gets marked spent downstream)
 *   disproven     -> job FAILED, explicit warning, never resolves
 *   inconclusive  -> historical behavior kept (relayer trusted), nothing persisted
 *   relayer FAILED-> unchanged legacy failure path
 */
import fs from 'node:fs'
import Jszip from 'jszip'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { actions, mutations } from '@/store/relayer.js'
import { pedersen } from '@/services/index.js'
import { randomBN } from '@/utils/crypto.js'

const RPC = 'https://eth.drpc.org'
const TX = '0x1111111111111111111111111111111111111111111111111111111111111111' // 32 bytes, shape-valid

let realWithdrawalTx

beforeAll(async () => {
  const zip = await Jszip.loadAsync(fs.readFileSync('static/events/withdrawals_eth_0.1.json.zip'))
  const withdrawals = JSON.parse(await zip.file('withdrawals_eth_0.1.json').async('string'))
  realWithdrawalTx = withdrawals[0].transactionHash

  // pedersen (note -> nullifierHash) initialises asynchronously
  for (let i = 0; i < 200 && !pedersen.pedersenHash; i++) {
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}, 60000)

/** a freshly generated, never-deposited 0.1 ETH note */
const makeNote = () => {
  const secret = randomBN(31)
  const nullifier = randomBN(31)
  const preimage = Buffer.concat([nullifier.toBuffer('le', 31), secret.toBuffer('le', 31)])
  return `tornado-eth-0.1-1-0x${preimage.toString('hex')}`
}

const self = { app: { i18n: { t: (key) => key } } }

const buildHarness = (verification) => {
  const note = makeNote()
  const state = {
    jobs: {
      netId1: {
        tornado: {
          'job-1': {
            action: 'Withdraw',
            relayerUrl: 'https://relayer.example/',
            amount: '0.1',
            currency: 'eth',
            note
          }
        }
      }
    },
    jobWatchers: { 'job-1': { timerId: null } }
  }
  const dispatched = []
  const commit = (type, payload) => mutations[type](state, payload)
  const dispatch = vi.fn(async (type, payload) => {
    dispatched.push([type, payload])
    if (type === 'verifyRelayerWithdrawal') {
      return verification
    }
    return undefined
  })
  const run = (relayerSays, { noticeCalls = 0 } = {}) =>
    actions.handleResponse
      .call(
        self,
        { state, rootGetters: {}, commit, dispatch, getters: {}, rootState: {} },
        {
          response: { json: async () => relayerSays },
          id: 'job-1',
          job: state.jobs.netId1.tornado['job-1'],
          type: 'tornado',
          netId: 1,
          retryAttempt: 0,
          resolve: resolveFn,
          getConfirmations: vi.fn(),
          noticeId: 5,
          noticeCalls
        }
      )
      .then(
        () => ({ resolved: resolveFn.mock.calls, error: undefined }),
        (e) => ({ resolved: resolveFn.mock.calls, error: e.message })
      )
  const resolveFn = vi.fn()
  const noticesOf = (title) =>
    dispatched
      .filter(([type, payload]) => type === 'notice/updateNotice' && payload?.notice?.title === title)
      .map(([, payload]) => payload.notice)
  const successNotices = () =>
    dispatched
      .filter(
        ([type, payload]) =>
          type === 'notice/updateNotice' && payload?.notice?.title?.path === 'withdrawnValue'
      )
      .map(([, payload]) => payload.notice)
  return { state, dispatched, dispatch, run, noticesOf, successNotices }
}

describe('verifyRelayerWithdrawal (real action, real mainnet receipt)', () => {
  it('disproves a relayer claiming a real but unrelated withdrawal tx for a note', async () => {
    const job = { note: makeNote(), currency: 'eth', amount: '0.1' }
    const result = await actions.verifyRelayerWithdrawal.call(
      self,
      { rootGetters: { 'settings/currentRpc': { url: RPC } } },
      { txHash: realWithdrawalTx, job, netId: 1 }
    )
    expect(result.verified).toBe(false)
    expect(result.reason).toBe('no matching Withdrawal event')
  }, 60000)

  it('is inconclusive (not false) when the note or instance is unknown', async () => {
    const result = await actions.verifyRelayerWithdrawal.call(
      self,
      { rootGetters: {} },
      { txHash: TX, job: { currency: 'eth', amount: '0.1' }, netId: 1 }
    )
    expect(result.verified).toBeNull()
  })
})

describe('handleResponse', () => {
  it('verified: shows success and resolves so the note is marked spent', async () => {
    const h = buildHarness({ verified: true, blockNumber: 14954148 })
    const outcome = await h.run({ txHash: TX, confirmations: 3, status: 'CONFIRMED', failedReason: null })

    expect(outcome.error).toBeUndefined()
    expect(outcome.resolved).toEqual([[TX]])
    expect(h.state.jobs.netId1.tornado['job-1'].verification).toEqual({
      verified: true,
      blockNumber: 14954148
    })
    expect(h.successNotices()).toHaveLength(1)
    expect(h.successNotices()[0].type).toBe('success')
    expect(h.dispatch).toHaveBeenCalledWith('verifyRelayerWithdrawal', {
      txHash: TX,
      job: expect.objectContaining({ note: expect.stringMatching(/^tornado-eth-0\.1-1-0x[0-9a-f]{124}$/) }),
      netId: 1
    })
  })

  it('disproven: fails the job with an explicit warning and never resolves', async () => {
    const h = buildHarness({ verified: false, reason: 'no matching Withdrawal event' })
    const outcome = await h.run({ txHash: TX, confirmations: 5, status: 'CONFIRMED', failedReason: null })

    expect(outcome.error).toBe('relayerWithdrawalUnverified')
    expect(outcome.resolved).toEqual([]) // deleteJob -> txHashKeeper/updateDeposit never runs
    expect(h.successNotices()).toHaveLength(0)

    const job = h.state.jobs.netId1.tornado['job-1']
    expect(job.status).toBe('FAILED')
    expect(job.failedReason).toBe('relayerWithdrawalUnverified')
    expect(job.verification.verified).toBe(false)
    expect(job.txHash).toBe(TX) // kept so the user can inspect the relayer's claim

    const [warning] = h.noticesOf('relayerWithdrawalUnverified')
    expect(warning.type).toBe('danger')
    expect(h.dispatched.map(([type]) => type)).toContain('stopFinishJobWatcher')
  })

  it('inconclusive: keeps the historical behavior (relayer trusted) and persists nothing', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const h = buildHarness({ verified: null, reason: 'receipt not available yet' })
    const outcome = await h.run({ txHash: TX, confirmations: 2, status: 'CONFIRMED', failedReason: null })
    console.warn.mockRestore()

    expect(outcome.error).toBeUndefined()
    expect(outcome.resolved).toEqual([[TX]])
    expect(h.state.jobs.netId1.tornado['job-1'].verification).toBeUndefined()
    expect(h.successNotices()).toHaveLength(1)
  })

  it('does not verify before the relayer claims a mined transaction', async () => {
    vi.useFakeTimers()
    try {
      const h = buildHarness({ verified: true })
      await h.run({ txHash: TX, confirmations: 0, status: 'ACCEPTED', failedReason: null })
      expect(h.dispatch).not.toHaveBeenCalledWith('verifyRelayerWithdrawal', expect.anything())
      expect(h.successNotices()).toHaveLength(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('relayer-reported FAILED keeps the legacy failure path (no verification)', async () => {
    const h = buildHarness({ verified: true })
    const outcome = await h.run({ txHash: null, confirmations: 0, status: 'FAILED', failedReason: 'x' })

    expect(outcome.error).toBe('relayerError')
    expect(h.state.jobs.netId1.tornado['job-1']).toBeUndefined() // DELETE_JOB
    expect(h.dispatch).not.toHaveBeenCalledWith('verifyRelayerWithdrawal', expect.anything())
  })
})

describe('relayTornadoWithdraw job id guard', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const build = (relayerId) => {
    const note = makeNote()
    const state = {
      selectedRelayer: { url: 'https://relayer.example/', name: 'custom' },
      jobs: { netId1: { tornado: {} } }
    }
    const commit = vi.fn((type, payload) => mutations[type]?.(state, payload))
    const dispatch = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ status: 200, json: async () => ({ id: relayerId }) }))
    )
    const run = () =>
      actions.relayTornadoWithdraw
        .call(
          self,
          {
            state,
            commit,
            dispatch,
            rootState: { application: { notes: { [note]: { proof: '0x', args: [] } } } }
          },
          { note }
        )
        .then(
          () => ({ error: undefined }),
          (e) => ({ error: e.message })
        )
    return { state, commit, dispatch, run }
  }

  it('rejects a relayer job id that would act as a prototype key', async () => {
    const h = build('__proto__')
    const outcome = await h.run()
    expect(outcome.error).toBe('relayRequestFailed')
    expect(h.commit).not.toHaveBeenCalledWith('SAVE_JOB', expect.anything())
    expect(Object.getPrototypeOf(h.state.jobs.netId1.tornado)).toBe(Object.prototype)
  })

  it('accepts an ordinary job id', async () => {
    const h = build('6a4a8b2c-98fc-4c14-9afb-4c8996fb9242')
    const outcome = await h.run()
    expect(outcome.error).toBeUndefined()
    expect(h.state.jobs.netId1.tornado['6a4a8b2c-98fc-4c14-9afb-4c8996fb9242']).toMatchObject({
      currency: 'eth',
      amount: '0.1'
    })
    expect(h.dispatch).toHaveBeenCalledWith(
      'runJobWatcherWithNotifications',
      expect.objectContaining({ id: '6a4a8b2c-98fc-4c14-9afb-4c8996fb9242' })
    )
  })
})
