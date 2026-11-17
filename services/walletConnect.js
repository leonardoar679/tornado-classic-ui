import BN from 'bignumber.js'
import EthereumProvider from '@walletconnect/ethereum-provider'

import { NETWORKS } from '@/constants/index.js'
import networkConfig from '@/networkConfig.js'

const RECONNECT_TIME = 3600000 // 1 hour

const getFirstRpcUrls = (acc, netId) => {
  const { rpcUrls } = networkConfig[`netId${netId}`]
  const [{ url }] = Object.values(rpcUrls)

  return { ...acc, [Number(netId)]: url }
}

const RPC = NETWORKS.reduce(getFirstRpcUrls, {})

/**
 * WalletConnect v2 provider factory (replaces the deprecated
 * @walletconnect/web3-provider v1). The v2 protocol uses a projectId —
 * set WALLET_CONNECT_PROJECT_ID in the environment. If not set, WalletConnect
 * login is unavailable and other wallets still work.
 */
const walletConnectConnector = async (chainId) => {
  try {
    const prevConnection = localStorage.getItem('walletconnectTimeStamp')

    if (new BN(Date.now()).minus(prevConnection).isGreaterThanOrEqualTo(RECONNECT_TIME)) {
      localStorage.removeItem('walletconnect')
    }

    const provider = await EthereumProvider.init({
      projectId: process.env.WALLET_CONNECT_PROJECT_ID,
      chains: [Number(chainId)],
      optionalChains: Object.keys(RPC).map(Number),
      rpcMap: RPC,
      showQrModal: true,
      metadata: {
        name: 'Tornado Cash Classic',
        description: 'Private ethereum transactions',
        url: 'https://tornado.cash',
        icons: ['https://tornado.cash/tw.png']
      }
    })

    await provider.connect()

    provider.injectedRequest = async () => {
      await provider.enable()
    }

    localStorage.setItem('walletconnectTimeStamp', Date.now())
    return provider
  } catch (err) {
    console.log(err)
    throw new Error(`WalletConnect error: ${err.message}`)
  }
}

export default walletConnectConnector
