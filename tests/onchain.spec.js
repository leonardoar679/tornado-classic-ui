// @vitest-environment node
/**
 * End-to-end deposit/withdraw/compliance verification against REAL mainnet data.
 *
 * What this proves (without spending gas):
 *  1. Deposit computation: note generation + pedersen commitment (exact prepareDeposit path)
 *  2. Withdraw computation: merkle tree + path + SNARK proof with the real circuit and
 *     proving key (exact createSnarkProof path, websnark groth16)
 *  3. The generated proofs are ACCEPTED by the real mainnet Verifier contracts (eth_call)
 *  4. Instance state reads work per amount (nextIndex, roots, denomination)
 *  5. Compliance lookups: real historical deposits/withdrawals are found by commitment /
 *     nullifier via RPC getPastEvents, spent-check returns true (exact loadDepositEvent /
 *     loadWithdrawalData path)
 *  6. web3 v4 STR return format holds on real RPC data (no BigInt leakage)
 */
import fs from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import Jszip from 'jszip'
import { MerkleTree } from 'fixed-merkle-tree'

import networkConfig from '@/networkConfig.js'
import { createWeb3 } from '@/utils/web3.js'
import { toBN } from '@/utils/bn.js'
import { randomBN, parseNote, toFixedHex, buffPedersenHash } from '@/utils/crypto.js'
import { mimc, pedersen } from '@/services/index.js'
import InstanceABI from '@/abis/Instance.abi.json'

const websnarkUtils = require('websnark/src/utils')
const groth16Build = require('websnark/src/groth16')

// drpc serves archive-era blocks/logs without a token (publicnode refuses them);
// the app itself has no hard-coded RPC — users configure one in settings
const RPC = 'https://eth.drpc.org'
const AMOUNTS = ['0.1', '1', '10', '100']
const NET = networkConfig.netId1

const VERIFIER_ABI = [
  {
    // real tornado-core verifier signature (confirmed from the on-chain contract ABI)
    inputs: [
      { internalType: 'bytes', name: 'proof', type: 'bytes' },
      { internalType: 'uint256[6]', name: 'input', type: 'uint256[6]' }
    ],
    name: 'verifyProof',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  }
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let web3
let circuit
let provingKey
let groth16
let cachedDeposits = {}
let cachedWithdrawals = {}

beforeAll(async () => {
  // 1. real RPC via the app's own configured web3 factory
  web3 = createWeb3(RPC)

  // 2. real circuit + proving key (same zips the browser downloads from static/)
  const circuitZip = await Jszip.loadAsync(fs.readFileSync('static/tornado.json.zip'))
  circuit = JSON.parse(await circuitZip.file('tornado.json').async('string'))
  const keyZip = await Jszip.loadAsync(fs.readFileSync('static/tornadoProvingKey.bin.zip'))
  provingKey = await keyZip.file('tornadoProvingKey.bin').async('arraybuffer')

  // 3. wait for the app's async-singleton hashers (pedersen / mimc)
  for (let i = 0; i < 100 && (!pedersen.pedersenHash || !mimc.hash); i++) {
    await sleep(100)
  }
  expect(pedersen.pedersenHash).toBeTruthy()
  expect(mimc.hash).toBeTruthy()

  // 4. websnark prover (same buildGroth16 path as store/snark.js)
  groth16 = await groth16Build({ wasmInitialMemory: 2000 })

  // 5. cached real mainnet events per amount (compliance anchors)
  for (const amount of AMOUNTS) {
    const dz = await Jszip.loadAsync(fs.readFileSync(`static/events/deposits_eth_${amount}.json.zip`))
    cachedDeposits[amount] = JSON.parse(await dz.file(`deposits_eth_${amount}.json`).async('string'))
    const wz = await Jszip.loadAsync(fs.readFileSync(`static/events/withdrawals_eth_${amount}.json.zip`))
    cachedWithdrawals[amount] = JSON.parse(await wz.file(`withdrawals_eth_${amount}.json`).async('string'))
  }
}, 300000)

/** Exact prepareDeposit computation for one deposit */
function makeDepositNote(amount) {
  const secret = randomBN(31)
  const nullifier = randomBN(31)
  // Buffer polyfill is global in the browser app; use it the same way here
  const preimage = Buffer.concat([nullifier.toBuffer('le', 31), secret.toBuffer('le', 31)])
  const commitment = buffPedersenHash(preimage)
  const note = `0x${preimage.toString('hex')}`
  return { secret, nullifier, note, commitment, prefix: `tornado-eth-${amount}-1` }
}

/** Exact createSnarkProof computation (minus relayer selection) */
async function proveWithdraw({ amount, note }) {
  const parsed = parseNote(`${`tornado-eth-${amount}-1`}-${note}`)
  const tree = new MerkleTree(NET.merkleTreeHeight, [parsed.commitmentHex], {
    zeroElement: NET.emptyElement,
    hashFunction: mimc.hash
  })
  const { pathElements, pathIndices, pathRoot } = tree.path(0)

  const recipient = '0x1111111111111111111111111111111111111111'
  const relayer = '0x2222222222222222222222222222222222222222'
  const fee = BigInt(0)
  const refund = BigInt(0)

  const input = {
    // public
    fee,
    root: toFixedHex(pathRoot),
    refund,
    relayer: BigInt(relayer),
    recipient: BigInt(recipient),
    nullifierHash: parsed.nullifierHash,
    // private
    pathIndices,
    pathElements,
    secret: parsed.secret,
    nullifier: parsed.nullifier
  }

  const proofData = await websnarkUtils.genWitnessAndProve(groth16, input, circuit, provingKey)
  const { proof, publicSignals } = websnarkUtils.toSolidityInput(proofData)

  return { parsed, tree, input, proofData, proof, publicSignals, recipient }
}

describe('deposit computation (prepareDeposit path), all amounts', () => {
  for (const amount of AMOUNTS) {
    it(`generates a valid note + commitment for ${amount} ETH`, async () => {
      const { note, commitment, prefix } = makeDepositNote(amount)

      expect(note).toMatch(/^0x[0-9a-f]{124}$/) // 62 hex chars (31 bytes) x 2
      expect(commitment).toMatch(/^[0-9]+$/)

      // the commitment must be a valid babyjub point field element (the circuit enforces this)
      expect(
        BigInt(commitment) <
          BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')
      ).toBe(true)

      // parseNote must recover the same values (what a withdraw does with the saved note)
      const parsed = parseNote(`${prefix}-${note}`)
      expect(parsed.currency).toBe('eth')
      expect(parsed.amount).toBe(amount)
      expect(parsed.netId).toBe('1')
      expect(parsed.commitmentHex).toBe(toFixedHex(commitment))
    }, 60000)
  }
})

describe('withdraw proof (createSnarkProof path) verified on the REAL mainnet verifier, all amounts', () => {
  for (const amount of AMOUNTS) {
    it(`generates a SNARK proof for ${amount} ETH that the mainnet Verifier contract ACCEPTS`, async () => {
      const { note } = makeDepositNote(amount)
      const { parsed, input, proof, publicSignals } = await proveWithdraw({ amount, note })

      // witness public signals must match the inputs we declared
      expect(publicSignals).toHaveLength(6)
      expect(BigInt(publicSignals[0])).toBe(BigInt(input.root))
      expect(BigInt(publicSignals[1])).toBe(parsed.nullifierHash)
      expect(BigInt(publicSignals[2])).toBe(input.recipient)

      // solidity bytes proof: 0x + 8 x 32 bytes
      expect(proof).toMatch(/^0x[0-9a-f]{512}$/)

      // on-chain check: eth_call the real verifier of this instance with the
      // exact bytes the app's withdraw action would submit.
      const instanceAddress = NET.tokens.eth.instanceAddress[amount]
      const instance = new web3.eth.Contract(InstanceABI, instanceAddress)
      const verifierAddress = await instance.methods.verifier().call()
      const verifier = new web3.eth.Contract(VERIFIER_ABI, verifierAddress)

      const accepted = await verifier.methods.verifyProof(proof, publicSignals).call({ gas: 6000000 })
      expect(accepted).toBe(true)
    }, 240000)
  }
})

describe('on-chain instance state, all amounts', () => {
  for (const amount of AMOUNTS) {
    it(`reads ${amount} ETH instance state (STR format, roots, index)`, async () => {
      const instanceAddress = NET.tokens.eth.instanceAddress[amount]
      const instance = new web3.eth.Contract(InstanceABI, instanceAddress)

      const denomination = await instance.methods.denomination().call()
      expect(denomination).toBe(web3.utils.toWei(amount, 'ether'))

      const nextIndex = await instance.methods.nextIndex().call()
      // STR return format: decimal string, never BigInt
      expect(typeof nextIndex).toBe('string')
      expect(Number(nextIndex)).toBeGreaterThan(cachedDeposits[amount].length - 1)

      const lastRoot = await instance.methods.getLastRoot().call()
      expect(lastRoot).toMatch(/^0x[0-9a-f]{64}$/)

      const isKnown = await instance.methods.isKnownRoot(lastRoot).call()
      expect(isKnown).toBe(true)
    }, 60000)
  }
})

describe('compliance lookups on REAL historical data, all amounts', () => {
  for (const amount of AMOUNTS) {
    it(`finds the real deposit event by commitment (${amount} ETH)`, async () => {
      // last cached real deposit — replicate loadDepositEvent's lookup
      const real = cachedDeposits[amount][cachedDeposits[amount].length - 1]
      const instanceAddress = NET.tokens.eth.instanceAddress[amount]
      const instance = new web3.eth.Contract(InstanceABI, instanceAddress)

      const events = await instance.getPastEvents('Deposit', {
        fromBlock: Number(real.blockNumber) - 5,
        toBlock: Number(real.blockNumber) + 5
      })

      const found = events.find((e) => e.returnValues.commitment === real.commitment)
      expect(found).toBeTruthy()
      expect(Number(found.returnValues.leafIndex)).toBe(Number(real.leafIndex))
      expect(found.transactionHash).toBe(real.transactionHash)
      expect(Number(found.returnValues.timestamp)).toBe(Number(real.timestamp))

      // compliance page also fetches the receipt (shows the sender)
      const receipt = await web3.eth.getTransactionReceipt(real.transactionHash)
      expect(receipt.from).toMatch(/^0x[0-9a-fA-F]{40}$/)
    }, 120000)

    it(`marks the real withdrawn note as spent (${amount} ETH)`, async () => {
      // last cached real withdrawal — replicate checkSpentEventFromNullifier + loadWithdrawalData
      const real = cachedWithdrawals[amount][cachedWithdrawals[amount].length - 1]
      const instanceAddress = NET.tokens.eth.instanceAddress[amount]
      const instance = new web3.eth.Contract(InstanceABI, instanceAddress)

      const isSpent = await instance.methods.isSpent(real.nullifierHash).call()
      expect(isSpent).toBe(true)

      const events = await instance.getPastEvents('Withdrawal', {
        fromBlock: Number(real.blockNumber) - 5,
        toBlock: Number(real.blockNumber) + 5
      })

      const found = events.find((e) => e.returnValues.nullifierHash === real.nullifierHash)
      expect(found).toBeTruthy()
      expect(found.returnValues.to.toLowerCase()).toBe(real.to.toLowerCase())
      expect(found.transactionHash).toBe(real.transactionHash)
      // fee is a wei string under the STR format (feeds loadWithdrawalData's toDecimals)
      expect(typeof found.returnValues.fee).toBe('string')
      expect(toBN(found.returnValues.fee).gte(toBN(0))).toBe(true)
    }, 120000)
  }
})
