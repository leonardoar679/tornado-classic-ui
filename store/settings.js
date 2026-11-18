import networkConfig from '@/networkConfig.js'
import { createWeb3 } from '@/utils/web3.js'

const getFirstRpcs = (acc, [netId, { rpcUrls }]) => {
  const [rpc] = Object.values(rpcUrls)

  acc[netId] = {
    rpc
  }

  return acc
}

const rpcData = Object.entries(networkConfig).reduce(getFirstRpcs, {})

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
    const isPlaceholderUrl = (url) =>
      !url || String(url).includes('/null') || String(url).includes('/undefined')

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
      console.warn('preselectRpc', url, error)
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
      if (!url || String(url).includes('/null') || String(url).includes('/undefined')) {
        return { isValid: false, error: this.app.i18n.t('rpcIsDown') }
      }

      const web3 = createWeb3(url)

      const chainId = await web3.eth.getChainId()

      const isCurrent = Number(chainId) === Number(netId)
      if (isCurrent) {
        return { isValid: true }
      } else {
        return { isValid: false, error: this.app.i18n.t('thisRpcIsForDifferentNetwork') }
      }
    } catch (e) {
      console.warn('checkRpc', e.message || e)
      return { isValid: false, error: this.app.i18n.t('rpcIsDown') }
    }
  }
}
