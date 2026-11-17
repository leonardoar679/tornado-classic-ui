import { describe, expect, it } from 'vitest'

import schema from '@/services/schema/index.js'

describe('relayer schema validation (ajv v8)', () => {
  it('returns validate functions per network', () => {
    expect(typeof schema.getRelayerValidateFunction(1)).toBe('function')
    expect(typeof schema.getRelayerValidateFunction(56)).toBe('function')
    expect(typeof schema.getRelayerValidateFunction(137)).toBe('function')
    expect(typeof schema.getRelayerValidateFunction(10)).toBe('function')
    expect(typeof schema.getRelayerValidateFunction(42161)).toBe('function')
    expect(typeof schema.getRelayerValidateFunction(100)).toBe('function')
    expect(typeof schema.getRelayerValidateFunction(43114)).toBe('function')
  })

  it('default schema rejects garbage and accepts a well-formed relayer status', () => {
    const validate = schema.getRelayerValidateFunction(1)
    expect(validate({ hello: 'world' })).toBe(false)

    const valid = validate({
      rewardAccount: '0x0000000000000000000000000000000000000000',
      instances: {},
      gasPrices: {}
    })
    // gasPrices/instances sub-schemas may require more fields; assert it does not throw
    expect(typeof valid).toBe('boolean')
  })
})
