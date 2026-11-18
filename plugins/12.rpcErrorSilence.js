/**
 * Infura/Alchemy RPC failures (429, empty "Returned error:") are expected under
 * parallel nextIndex / price fan-out. Nuxt 4 treats unhandled ResponseError
 * rejections as fatal client overlays; swallow only those transient RPC errors.
 *
 * Also quiets web3-eth-abi's console.error for empty revert data (`0x`), which
 * fires on expected ENS/aggregator misses and is not an app bug.
 */
import { formatRpcError, isTransientRpcError } from '@/utils/rpcError.js'

function isEmptyAbiErrorLog(args) {
  const [first, second] = args
  return (
    first === 'No matching error abi found for error data' &&
    (second === '0x' || second === '0x0' || second == null)
  )
}

export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) {
    return
  }

  const originalError = console.error.bind(console)
  console.error = (...args) => {
    if (isEmptyAbiErrorLog(args)) {
      return
    }
    return originalError(...args)
  }

  const prev = nuxtApp.vueApp.config.errorHandler
  nuxtApp.vueApp.config.errorHandler = (err, instance, info) => {
    if (isTransientRpcError(err)) {
      console.warn('[rpc]', formatRpcError(err))
      return
    }
    if (typeof prev === 'function') {
      return prev(err, instance, info)
    }
    console.error(err)
  }

  nuxtApp.hook('app:error', (err) => {
    if (isTransientRpcError(err)) {
      console.warn('[rpc]', formatRpcError(err))
      clearError({ redirect: undefined })
    }
  })

  nuxtApp.hook('vue:error', (err) => {
    if (isTransientRpcError(err)) {
      console.warn('[rpc]', formatRpcError(err))
      clearError({ redirect: undefined })
    }
  })

  window.addEventListener('unhandledrejection', (event) => {
    if (isTransientRpcError(event.reason)) {
      event.preventDefault()
      console.warn('[rpc]', formatRpcError(event.reason))
      clearError({ redirect: undefined })
    }
  })
})
