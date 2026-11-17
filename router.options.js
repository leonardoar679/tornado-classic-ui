const ipfsPathRegExp = /^(\/(?:ipfs|ipns)\/[^/]+)/

function getBase() {
  if (typeof window === 'undefined') {
    return '/'
  }

  const ipfsPathPrefix = (window.location.pathname.match(ipfsPathRegExp) || [])[1]
  return ipfsPathPrefix ? `${ipfsPathPrefix}/` : '/'
}

export default {
  history: {
    base: getBase()
  }
}
