import { toChecksumAddress } from 'web3-utils'
import { toBN } from '@/utils/bn.js'

import networkConfig from '@/networkConfig.js'
import offchainOracleABI from '@/abis/OffchainOracle.abi.json'
import { createWeb3 } from '@/utils/web3.js'
import { formatRpcError, isRateLimitError } from '@/utils/rpcError.js'

const offchainOracleAddress = '0x07D91f5fb9Bf7798734C3f606dB065549F6893bb'

const TOKENS = {
  torn: {
    tokenAddress: '0x77777FeDdddFfC19Ff86DB637967013e6C6A116C',
    symbol: 'TORN',
    decimals: 18
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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

function resolveMainnetRpcUrl(rootState) {
  const candidates = []
  const saved = rootState.settings?.netId1?.rpc?.url
  if (saved) {
    candidates.push(saved)
  }
  for (const { url } of Object.values(networkConfig.netId1.rpcUrls || {})) {
    candidates.push(url)
  }
  return candidates.find((url) => !isPlaceholderUrl(url)) || networkConfig.netId1.rpcUrls.Infura.url
}

let pollTimer = null
let fetching = false

export const state = () => {
  return {
    prices: {
      dai: '593970928097706',
      cdai: '12623454013395',
      usdc: '593319851383838',
      usdt: '592852719537467',
      torn: '85362951428474830',
      wbtc: '32269526951862905063'
    }
  }
}

export const getters = {
  tokenRate: (state, getters, rootState, rootGetters) => {
    return state.prices[rootState.application.selectedStatistic.currency]
  },
  getArgsForOracle: (state, getters, rootState, rootGetters) => {
    const tokens = {
      ...networkConfig.netId1.tokens,
      ...TOKENS
    }
    const tokenAddresses = []
    const oneUintAmount = []
    const currencyLookup = {}
    Object.entries(tokens).map(([currency, data]) => {
      if (currency !== 'eth') {
        tokenAddresses.push(data.tokenAddress)
        oneUintAmount.push(toBN('10').pow(toBN(data.decimals.toString())).toString())
        currencyLookup[data.tokenAddress] = currency
      }
    })
    return { tokenAddresses, oneUintAmount, currencyLookup }
  },
  getTokenPrice: (state, getters, rootState, rootGetters) => (currency) => {
    return state.prices[currency]
  },
  isPriceWatcherDisabled: (state, getters, rootState, rootGetters) => {
    const nativeCurrency = rootGetters['metamask/nativeCurrency']
    const tokens = Object.keys(rootGetters['metamask/networkConfig'].tokens)
    return tokens.includes(nativeCurrency) && tokens.length === 1
  }
}

export const mutations = {
  SAVE_TOKEN_PRICES(state, prices) {
    state.prices = {
      ...state.prices,
      ...prices
    }
  }
}

async function fetchRateWithRetry(offchainOracle, tokenAddress, isWrap, attempts = 3) {
  let lastError
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await offchainOracle.methods.getRateToEth(tokenAddress, isWrap).call()
    } catch (err) {
      lastError = err
      // brief backoff helps under Infura 429 / public RPC throttling
      await sleep(250 * (attempt + 1) * (attempt + 1))
    }
  }
  throw lastError
}

export const actions = {
  async fetchTokenPrice({ getters, commit, dispatch, rootState }) {
    if (getters.isPriceWatcherDisabled) {
      return
    }
    if (fetching) {
      return
    }

    fetching = true

    try {
      let rpcUrl = resolveMainnetRpcUrl(rootState)
      let web3 = this.$provider?.getWeb3?.(rpcUrl) || createWeb3(rpcUrl)
      let offchainOracle = new web3.eth.Contract(offchainOracleABI, offchainOracleAddress)
      const { tokenAddresses, oneUintAmount, currencyLookup } = getters.getArgsForOracle

      const prices = {}
      let failedOver = false

      for (let i = 0; i < tokenAddresses.length; i++) {
        try {
          const isWrap =
            toChecksumAddress(tokenAddresses[i]) ===
            toChecksumAddress('0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643')

          const price = await fetchRateWithRetry(offchainOracle, tokenAddresses[i], isWrap)
          const numerator = toBN(oneUintAmount[i])
          const denominator = toBN(10).pow(toBN(18)) // eth decimals
          const priceFormatted = toBN(price).mul(numerator).div(denominator)

          prices[currencyLookup[tokenAddresses[i]]] = priceFormatted.toString()
        } catch (e) {
          if (!failedOver && isRateLimitError(e)) {
            failedOver = true
            const next = await dispatch(
              'settings/failoverRpc',
              { netId: 1, reason: 'token price rate limit' },
              { root: true }
            )
            if (next?.url) {
              rpcUrl = next.url
              web3 = this.$provider?.getWeb3?.(rpcUrl) || createWeb3(rpcUrl)
              offchainOracle = new web3.eth.Contract(offchainOracleABI, offchainOracleAddress)
              i -= 1 // retry this token on the new RPC
              continue
            }
          }
          console.warn('cant get price of ', tokenAddresses[i], formatRpcError(e))
        }

        // space out calls so nextIndex / relayer jobs don't trip RPC rate limits
        if (i < tokenAddresses.length - 1) {
          await sleep(120)
        }
      }

      if (Object.keys(prices).length) {
        commit('SAVE_TOKEN_PRICES', prices)
      }
    } catch (e) {
      console.error('fetchTokenPrice failed:', formatRpcError(e))
    } finally {
      fetching = false
      if (pollTimer) {
        clearTimeout(pollTimer)
      }
      pollTimer = setTimeout(() => dispatch('fetchTokenPrice'), 1000 * 30)
    }
  }
}
