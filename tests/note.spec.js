import { describe, expect, it } from 'vitest'

import { toBN } from '@/utils/bn.js'
import { parseHexNote, parseNote, randomBN, toFixedHex } from '@/utils/crypto.js'

// the app serializes notes as LE byte buffers (see prepareDeposit in store/application.js)
const leHex = (bn) => bn.toBuffer('le', 31).toString('hex')

describe('note parsing (deposit secrets)', () => {
  it('round-trips a hex note', () => {
    const nullifier = randomBN(31)
    const secret = randomBN(31)
    const note = `0x${leHex(nullifier)}${leHex(secret)}`

    const parsed = parseHexNote(note)
    expect(parsed.nullifier.toString(10)).toBe(nullifier.toString(10))
    expect(parsed.secret.toString(10)).toBe(secret.toString(10))
  })

  it('parses a full tornado note with prefix', () => {
    const nullifier = randomBN(31)
    const secret = randomBN(31)
    const hexNote = `${leHex(nullifier)}${leHex(secret)}`
    const full = `tornado-eth-0.1-1-0x${hexNote}`

    const parsed = parseNote(full)
    expect(parsed.currency).toBe('eth')
    expect(parsed.amount).toBe('0.1')
    expect(parsed.netId).toBe('1')
    expect(parsed.nullifier.toString(10)).toBe(nullifier.toString(10))
    expect(parsed.secret.toString(10)).toBe(secret.toString(10))
  })

  it('randomBN returns values below 2^248 for 31 bytes', () => {
    const limit = toBN(2).pow(toBN(248))
    for (let i = 0; i < 50; i++) {
      expect(randomBN().lt(limit)).toBe(true)
    }
  })

  it('toFixedHex pads to 32 bytes', () => {
    expect(toFixedHex('0x1')).toBe('0x' + '0'.repeat(63) + '1')
  })
})
