function main() {
  // Match upstream classic-ui: only real IPFS gateways disable localStorage /
  // show the trust banner. Local/dev hosts and ordinary domains are trusted.
  const whiteListedDomains = ['tornadocash.eth.link', 'tornadocash.eth.limo']

  const IPFS_GATEWAY_REGEXP = /.ipfs./
  const IPFS_LOCAL_REGEXP = /.ipfs.localhost:/
  const IPFS_PATH_REGEXP = /\/ipfs\//
  const NETLIFY_REGEXP = /deploy-preview-(\d+)--tornadocash\.netlify\.app/

  if (
    NETLIFY_REGEXP.test(window.location.host) ||
    IPFS_LOCAL_REGEXP.test(window.location.host) ||
    whiteListedDomains.includes(window.location.host)
  ) {
    return false
  }

  if (IPFS_GATEWAY_REGEXP.test(window.location.host) || IPFS_PATH_REGEXP.test(window.location.pathname)) {
    console.warn('The page has been loaded from ipfs.io. LocalStorage is disabled')
    return true
  }

  return false
}

export default defineNuxtPlugin(() => {
  return {
    provide: {
      isLoadedFromIPFS: main
    }
  }
})
