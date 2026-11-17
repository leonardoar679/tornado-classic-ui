import networkConfig from '@/networkConfig.js'
import { createWeb3 } from '@/utils/web3.js'

/**
 * Local replacement for the archived `nuxt-web3-provider` fork.
 * Keeps the same public API the store modules were written against:
 *   $provider.web3, $provider.provider, $provider.config,
 *   getWeb3, initProvider, initWeb3, sendRequest, getBalance,
 *   on, _onNetworkChanged, waitForTxReceipt
 */
class Web3ProviderService {
  constructor() {
    this.provider = null
    this.web3 = createWeb3(networkConfig.netId1.rpcUrls.Infura.url)
    this.config = { id: 1 }
  }

  getWeb3(url) {
    return createWeb3(url)
  }

  async initProvider(provider) {
    this.provider = provider

    const accounts = await this.sendRequest({ method: 'eth_requestAccounts', params: [] })
    const chainId = await this.sendRequest({ method: 'eth_chainId', params: [] })

    this.config = { id: Number(chainId) }

    return accounts[0]
  }

  initWeb3(url) {
    this.web3 = createWeb3(url)
  }

  async sendRequest({ method, params = [] }) {
    if (!this.provider) {
      throw new Error('Provider is not initialized')
    }
    return this.provider.request({ method, params })
  }

  async getBalance({ address }) {
    const balance = await this.web3.eth.getBalance(address)
    return balance.toString()
  }

  on({ method, callback }) {
    if (this.provider && typeof this.provider.on === 'function') {
      this.provider.on(method, callback)
    }
  }

  async _onNetworkChanged({ id }) {
    this.config = { id: Number(id) }
  }

  async waitForTxReceipt({ txHash }, interval = 3000, maxAttempts = 100) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const receipt = await this.web3.eth.getTransactionReceipt(txHash)

      if (receipt) {
        return {
          status: receipt.status,
          blockNumber: Number(receipt.blockNumber)
        }
      }

      await new Promise((resolve) => setTimeout(resolve, interval))
    }

    throw new Error(
      `Transaction ${txHash} was not mined within ${Math.round((maxAttempts * interval) / 1000)}s`
    )
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const service = new Web3ProviderService()

  nuxtApp.provide('provider', service)
})
