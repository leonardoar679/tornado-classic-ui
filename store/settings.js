import networkConfig from '@/networkConfig.js'
import { createWeb3 } from '@/utils/web3.js'
import { formatRpcError, isRateLimitError } from '@/utils/rpcError.js'

const getFirstRpcs = (acc, [netId, { rpcUrls }]) => {
  const [rpc] = Object.values(rpcUrls)

  acc[netId] = {
    rpc
  }

  return acc
}

const rpcData = Object.entries(networkConfig).reduce(getFirstRpcs, {})

/** One shared failover promise per netId so parallel 429s don't thrash endpoints. */
const failoverInflight = {}

function isPlaceholderUrl(url) {
  if (!url) {
    return true
  }
  const value = String(url)
  // Empty Alchemy/Infura keys compile to `.../v2/` or `.../v3/` and look "up"
  // on getChainId while failing for eth_call / eth_getLogs.
  return (
    value.includes('/null') ||
    value.includes('/undefined') ||
    /\/v[23]\/?$/.test(value) ||
    value.endsWith('/v2/') ||
    value.endsWith('/v3/')
  )
}

export const state = () => {
  return {
    ...rpcData,
    isActiveNotification: {
      first: true,
      second: true,
      third: true,
      ethLink: true,
      binanceInternal: true
    }
  }
}

export const getters = {
  getRpc: (state) => (netId) => {
    return state[`netId${netId}`].rpc
  },
  currentRpc: (state, getters, rootState) => {
    const netId = rootState.metamask.netId
    return state[`netId${netId}`].rpc
  }
}

export const mutations = {
  SAVE_RPC(state, { netId, name, url }) {
    state[`netId${netId}`]['rpc'] = { name, url }
  },
  DISABLE_NOTIFICATION(state, { key }) {
    state['isActiveNotification'] = { ...state.isActiveNotification, [key]: false }
  }
}

export const actions = {
  disableNotification({ commit }, params) {
    commit('DISABLE_NOTIFICATION', params)
  },
  async checkCurrentRpc({ dispatch, getters, rootGetters }) {
    const netId = rootGetters['metamask/netId']
    await dispatch('preselectRpc', { netId })
  },
  async preselectRpc({ getters, commit, dispatch }, { netId }) {
    const { rpcUrls } = networkConfig[`netId${netId}`]

    // Prefer keyed providers (Infura/Alchemy) over public endpoints that often
    // pass getChainId then rate-limit eth_getLogs. Walk networkConfig order.
    for (const [, { name, url }] of Object.entries(rpcUrls)) {
      if (isPlaceholderUrl(url)) {
        continue
      }
      const { isValid, error } = await dispatch('checkRpc', { url, netId })
      if (isValid) {
        commit('SAVE_RPC', { netId, name, url })
        return
      }
      console.warn('preselectRpc', name || url, error)
    }

    // Fall back to whatever was persisted from a previous session
    const savedRpc = getters.getRpc(netId)
    if (!isPlaceholderUrl(savedRpc?.url)) {
      const { isValid } = await dispatch('checkRpc', { ...savedRpc, netId })
      if (isValid) {
        return
      }
    }

    throw new Error(this.app.i18n.t('rpcSelectError'))
  },
  async checkRpc(_, { url, netId }) {
    try {
      if (isPlaceholderUrl(url)) {
        return { isValid: false, error: this.app.i18n.t('rpcIsDown') }
      }

      const web3 = createWeb3(url)

      const chainId = await web3.eth.getChainId()
      const isCurrent = Number(chainId) === Number(netId)
      if (!isCurrent) {
        return { isValid: false, error: this.app.i18n.t('thisRpcIsForDifferentNetwork') }
      }

      // getChainId alone can succeed while eth_call/eth_blockNumber is 429'd.
      await web3.eth.getBlockNumber()

      return { isValid: true }
    } catch (e) {
      const detail = formatRpcError(e)
      console.warn('checkRpc', url, detail)
      return {
        isValid: false,
        error: isRateLimitError(e) ? `Rate limited (${detail})` : this.app.i18n.t('rpcIsDown')
      }
    }
  },
  /**
   * Switch away from a rate-limited / failing RPC to the next healthy endpoint.
   * Used by price / nextIndex / governance readers when Infura returns 429.
   * Concurrent callers share one in-flight attempt so a burst of 429s does not
   * walk every endpoint at once.
   */
  async failoverRpc({ getters, commit, dispatch, rootGetters }, { netId, reason } = {}) {
    netId = Number(netId || rootGetters['metamask/netId'])

    if (failoverInflight[netId]) {
      return failoverInflight[netId]
    }

    failoverInflight[netId] = (async () => {
      const current = getters.getRpc(netId)
      const { rpcUrls } = networkConfig[`netId${netId}`] || {}
      if (!rpcUrls) {
        return null
      }

      const entries = Object.values(rpcUrls)
      const startIdx = Math.max(
        0,
        entries.findIndex((rpc) => rpc.url === current?.url)
      )
      const ordered = [...entries.slice(startIdx + 1), ...entries.slice(0, startIdx + 1)]

      for (const { name, url } of ordered) {
        if (isPlaceholderUrl(url) || url === current?.url) {
          continue
        }
        const { isValid } = await dispatch('checkRpc', { url, netId })
        if (!isValid) {
          continue
        }

        commit('SAVE_RPC', { netId, name, url })
        if (netId === Number(rootGetters['metamask/netId']) && this.$provider?.initWeb3) {
          this.$provider.initWeb3(url)
        }
        console.warn(`RPC failover → ${name}${reason ? ` (${reason})` : ''}`)
        return { name, url }
      }

      console.warn('RPC failover: no healthy endpoint found', reason || '')
      return null
    })().finally(() => {
      delete failoverInflight[netId]
    })

    return failoverInflight[netId]
  }
}
