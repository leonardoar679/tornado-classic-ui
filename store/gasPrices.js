import { toHex, fromWei, toWei } from 'web3-utils'
import { GasPriceOracle } from 'gas-price-oracle'
import { serialize } from '@ethersproject/transactions'

import networkConfig from '@/networkConfig.js'
import OvmGasPriceOracleABI from '@/abis/OvmGasPriceOracle.abi.json'
import { DUMMY_NONCE, DUMMY_WITHDRAW_DATA } from '@/constants/variables.js'
import { createWeb3 } from '@/utils/web3.js'

const DEFAULT_GAS_GWEI = 50
const DEFAULT_GAS_WEI = toWei(String(DEFAULT_GAS_GWEI), 'gwei')

function isPlaceholderUrl(url) {
  if (!url) {
    return true
  }
  const value = String(url)
  return (
    value.includes('/null') ||
    value.includes('/undefined') ||
    /\/v[23]\/?$/.test(value) ||
    value.endsWith('/v2/') ||
    value.endsWith('/v3/')
  )
}

function normalizeGasParams(params) {
  if (!params || typeof params !== 'object') {
    return { gasPrice: DEFAULT_GAS_WEI }
  }

  const next = { ...params }

  // Older defaults stored gwei as a small number (e.g. 50). Oracle returns wei hex/strings.
  if (next.gasPrice != null && next.maxFeePerGas == null) {
    const asNumber = Number(next.gasPrice)
    if (Number.isFinite(asNumber) && asNumber > 0 && asNumber < 1e9) {
      next.gasPrice = toWei(String(asNumber), 'gwei')
    }
  }

  return next
}

let pollTimer = null

export const state = () => {
  return {
    gasParams: { gasPrice: DEFAULT_GAS_WEI },
    l1Fee: '0'
  }
}

export const getters = {
  oracle: (state, getters, rootState, rootGetters) => {
    const netId = Number(rootGetters['metamask/netId'])
    const { gasPrices } = rootGetters['metamask/networkConfig']
    let rpcUrl = rootGetters['settings/currentRpc']?.url

    if (isPlaceholderUrl(rpcUrl)) {
      const urls = networkConfig[`netId${netId}`]?.rpcUrls || {}
      rpcUrl = Object.values(urls).find((rpc) => !isPlaceholderUrl(rpc.url))?.url
    }

    const oracle = new GasPriceOracle({
      chainId: netId,
      defaultRpc: rpcUrl,
      // gas-price-oracle option name is `fallbackGasPrices`, not defaultFallbackGasPrices
      fallbackGasPrices: {
        gasPrices
      }
    })

    // ethgasstation / etherchain endpoints are dead and only produce console noise;
    // prefer on-chain Chainlink + eth_gasPrice / EIP-1559 feeHistory via RPC.
    try {
      oracle.legacy?.removeOffChainOracle?.('ethgasstation')
      oracle.legacy?.removeOffChainOracle?.('etherchain')
    } catch {
      // ignore
    }

    return oracle
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
    const { gasPrice, maxFeePerGas } = normalizeGasParams(getters.getGasParams)
    const raw = maxFeePerGas ?? gasPrice ?? DEFAULT_GAS_WEI
    return toHex(raw)
  },
  gasPriceInGwei: (state, getters) => {
    try {
      return fromWei(getters.gasPrice, 'gwei')
    } catch {
      return String(DEFAULT_GAS_GWEI)
    }
  }
}

export const mutations = {
  SAVE_GAS_PARAMS(state, payload) {
    state.gasParams = normalizeGasParams(payload)
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
      // Last-resort: eth_gasPrice from the current RPC
      try {
        const rpcUrl = rootGetters['settings/currentRpc']?.url
        if (!isPlaceholderUrl(rpcUrl)) {
          const web3 = createWeb3(rpcUrl)
          const gasPrice = await web3.eth.getGasPrice()
          commit('SAVE_GAS_PARAMS', { gasPrice: gasPrice.toString() })
        } else {
          console.warn('fetchGasPrice', e.message || e)
        }
      } catch (rpcErr) {
        console.warn('fetchGasPrice', e.message || e, rpcErr.message || rpcErr)
      }
    } finally {
      if (pollTimer) {
        clearTimeout(pollTimer)
      }
      pollTimer = setTimeout(() => dispatch('fetchGasPrice'), 1000 * pollInterval)
    }
  },
  setDefault({ commit, rootGetters }) {
    const { gasPrices } = rootGetters['metamask/networkConfig']
    const gwei = gasPrices?.fast ?? DEFAULT_GAS_GWEI
    commit('SAVE_GAS_PARAMS', { gasPrice: toWei(String(gwei), 'gwei') })
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
        console.warn('fetchL1Fee has error:', err.message)
      }
    }
  }
}
