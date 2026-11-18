/**
 * Infura/Alchemy RPC failures (429, empty "Returned error:") are expected under
 * parallel nextIndex / price fan-out. Nuxt 4 treats unhandled ResponseError
 * rejections as fatal client overlays; swallow only those transient RPC errors.
 */
function isTransientRpcError(err) {
  if (!err) {
    return false
  }
  const name = err.name || ''
  const message = err.message || String(err)
  return (
    name === 'ResponseError' ||
    message.startsWith('Returned error:') ||
    /429|rate.?limit|Too Many Requests/i.test(message)
  )
}

export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) {
    return
  }

  const prev = nuxtApp.vueApp.config.errorHandler
  nuxtApp.vueApp.config.errorHandler = (err, instance, info) => {
    if (isTransientRpcError(err)) {
      console.warn('[rpc]', err.message || err)
      return
    }
    if (typeof prev === 'function') {
      return prev(err, instance, info)
    }
    console.error(err)
  }

  window.addEventListener('unhandledrejection', (event) => {
    if (isTransientRpcError(event.reason)) {
      event.preventDefault()
      console.warn('[rpc]', event.reason?.message || event.reason)
    }
  })
})
