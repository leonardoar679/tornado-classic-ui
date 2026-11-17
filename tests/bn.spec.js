import { describe, expect, it } from 'vitest'

import { BN, toBN } from '@/utils/bn.js'

describe('bn.js compat (web3 v4 migration)', () => {
  it('creates BN from hex and decimal strings', () => {
    expect(toBN('0x0a').toString()).toBe('10')
    expect(toBN('100').toString()).toBe('100')
  })

  it('supports bn.js arithmetic used across the stores', () => {
    const a = toBN('1000')
    const b = toBN('7')
    expect(a.gte(b)).toBe(true)
    expect(a.mul(b).toString()).toBe('7000')
    expect(a.sub(b).toString()).toBe('993')
    expect(a.mod(b).toString()).toBe('6')
    expect(toBN('0').isZero()).toBe(true)
  })

  it('BN is constructible directly', () => {
    expect(new BN('ff', 16).toString()).toBe('255')
  })
})
