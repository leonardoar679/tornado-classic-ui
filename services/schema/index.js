import Ajv from 'ajv'

import { toBN } from '@/utils/bn.js'

import relayerSchemas from './relayer/index.js'

const ajv = new Ajv({ allErrors: true, schemas: relayerSchemas })

// custom "BN" keyword: value must be a valid big number (ajv v8 definition form)
ajv.addKeyword({
  keyword: 'BN',
  validate: (schema, data) => {
    try {
      toBN(data)
      return true
    } catch (e) {
      return false
    }
  }
})

function getRelayerValidateFunction(netId) {
  switch (netId) {
    case 56:
      return ajv.getSchema('bscRelayer')
    case 100:
      return ajv.getSchema('xdaiRelayer')
    case 137:
      return ajv.getSchema('polygonRelayer')
    case 43114:
      return ajv.getSchema('avalancheRelayer')

    case 10:
    case 42161:
      return ajv.getSchema('l2Relayer')

    default:
      return ajv.getSchema('defaultRelayer')
  }
}

export default {
  getRelayerValidateFunction
}
