import networkConfig from '@/networkConfig.js'
import { hexToNumber } from 'web3-utils'

const checkProvider = async ({ store, accounts, chainId, providerName }) => {
  if (accounts.length === 0) {
    // MetaMask is locked or the user has not connected any accounts
    return
  }

  if (!networkConfig[`netId${chainId}`]) {
    await store.dispatch('metamask/checkMismatchNetwork', chainId)
    return
  }

  await store.dispatch('metamask/initialize', { providerName })
}

export default defineNuxtRouteMiddleware(async () => {
  try {
    const store = useNuxtApp().$store
    const providerName = window.localStorage.getItem('provider')

    if (providerName === 'walletConnect') {
      const providerData = window.localStorage.getItem('walletconnect')
      if (!providerData) {
        return
      }

      const { accounts, chainId } = JSON.parse(providerData)

      await checkProvider({ store, accounts, chainId, providerName })
      return
    }

    if (providerName) {
      const provider = await store.getters['metamask/getEthereumProvider']()

      const accounts = await provider.request({ method: 'eth_accounts' })

      const chainId = hexToNumber(await provider.request({ method: 'eth_chainId' }))

      await checkProvider({ store, accounts, chainId, providerName })
    } else {
      const storedNetId = window.localStorage.getItem('netId')

      if (networkConfig[`netId${storedNetId}`]) {
        await store.dispatch('metamask/onNetworkChanged', { netId: Number(storedNetId) })
      }
    }
  } catch (err) {
    console.error(`Provider container has error: ${err.message}`)
  }
})
