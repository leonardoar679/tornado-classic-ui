import { toHex, fromWei } from 'web3-utils'
import { GasPriceOracle } from 'gas-price-oracle'
import { serialize } from '@ethersproject/transactions'

import networkConfig from '@/networkConfig.js'
import OvmGasPriceOracleABI from '@/abis/OvmGasPriceOracle.abi.json'
import { DUMMY_NONCE, DUMMY_WITHDRAW_DATA } from '@/constants/variables.js'
import { createWeb3 } from '@/utils/web3.js'

export const state = () => {
  return {
    gasParams: { gasPrice: 50 },
    l1Fee: '0'
  }
}

export const getters = {
  oracle: (state, getters, rootState, rootGetters) => {
    const netId = Number(rootGetters['metamask/netId'])
    const { gasPrices } = rootGetters['metamask/networkConfig']

    return new GasPriceOracle({
      chainId: netId,
      defaultRpc: rootGetters['settings/currentRpc'].url,
      defaultFallbackGasPrices: gasPrices
    })
  },
  ovmGasPriceOracleContract:
    (state, getters, rootState) =>
    ({ netId }) => {
      const config = networkConfig[`netId${netId}`]
      const { url } = rootState.settings[`netId${netId}`].rpc
      const address = config.ovmGasPriceOracleContract
      if (address) {
        const web3 = createWeb3(url)
        return new web3.eth.Contract(OvmGasPriceOracleABI, address)
      }

      return null
    },
  l1Fee: (state) => {
    return state.l1Fee
  },
  getGasParams: (state) => {
    return state.gasParams
  },
  gasPrice: (state, getters) => {
    const { gasPrice, maxFeePerGas } = getters.getGasParams || {}
    // Fallback 50 gwei in wei — toHex(undefined) throws in web3 v4.
    const raw = maxFeePerGas ?? gasPrice ?? 50_000_000_000
    return toHex(raw)
  },
  gasPriceInGwei: (state, getters) => {
    try {
      return fromWei(getters.gasPrice, 'gwei')
    } catch {
      return '50'
    }
  }
}

export const mutations = {
  SAVE_GAS_PARAMS(state, payload) {
    state.gasParams = payload
  },
  SAVE_L1_FEE(state, l1Fee) {
    state.l1Fee = l1Fee
  }
}

export const actions = {
  async fetchGasPrice({ getters, dispatch, commit, rootGetters }) {
    const netId = rootGetters['metamask/netId']
    const { pollInterval } = rootGetters['metamask/networkConfig']

    const isLegacy = netId === 137

    try {
      const txGasParams = await getters.oracle.getTxGasParams({ isLegacy })
      commit('SAVE_GAS_PARAMS', txGasParams)
      await dispatch('fetchL1Fee')
    } catch (e) {
      console.error('fetchGasPrice', e.message || e)
    } finally {
      setTimeout(() => dispatch('fetchGasPrice'), 1000 * pollInterval)
    }
  },
  setDefault({ commit, rootGetters }) {
    const { gasPrices } = rootGetters['metamask/networkConfig']
    commit('SAVE_GAS_PARAMS', { gasPrice: gasPrices?.fast })
  },
  async fetchL1Fee({ commit, getters, rootGetters }) {
    const netId = rootGetters['metamask/netId']
    const isOptimismConnected = rootGetters['application/isOptimismConnected']

    const oracleInstance = getters.ovmGasPriceOracleContract({ netId })

    if (isOptimismConnected && oracleInstance) {
      try {
        const gasLimit = rootGetters['application/withdrawGas']
        const tornadoProxyInstance = rootGetters['application/tornadoProxyContract']({ netId })

        const tx = serialize({
          type: 0,
          gasLimit,
          chainId: netId,
          nonce: DUMMY_NONCE,
          data: DUMMY_WITHDRAW_DATA,
          gasPrice: getters.gasPrice,
          to: tornadoProxyInstance.options.address
        })

        const l1Fee = await oracleInstance.methods.getL1Fee(tx).call()

        commit('SAVE_L1_FEE', l1Fee)
      } catch (err) {
        console.error('fetchL1Fee has error:', err.message)
      }
    }
  }
}
