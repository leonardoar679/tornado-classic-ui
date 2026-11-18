/**
 * Helpers for web3 v4 / Infura-style RPC failures.
 * web3 often surfaces Infura 429s as empty `Returned error: ` with statusCode 429
 * on the ResponseError itself (not always on err.cause).
 */

function collectErrorParts(err) {
  if (!err) {
    return []
  }

  return [
    err.message,
    err.statusCode && `status ${err.statusCode}`,
    err.code && `code ${err.code}`,
    err.data?.message,
    typeof err.data === 'string' ? err.data : null,
    err.cause?.message,
    err.cause?.data?.message,
    err.cause?.statusCode && `status ${err.cause.statusCode}`,
    err.cause?.code && `cause ${err.cause.code}`,
    err.innerError?.message,
    err.request?.statusCode && `request status ${err.request.statusCode}`
  ]
    .filter(Boolean)
    .map(String)
}

export function formatRpcError(err) {
  if (!err) {
    return 'Unknown RPC error'
  }

  const parts = collectErrorParts(err)
  const joined = [...new Set(parts)].join(' | ')

  // Prefer useful detail over the empty web3 wrapper message alone.
  if (joined && !/^Returned error:\s*(\|.*)?$/.test(joined.trim())) {
    return joined
  }

  if (err.statusCode === 429 || err.cause?.statusCode === 429) {
    return 'Returned error: Too Many Requests (429)'
  }

  try {
    return JSON.stringify({
      message: err.message,
      name: err.name,
      code: err.code,
      statusCode: err.statusCode,
      data: err.data,
      cause: err.cause
    }).slice(0, 300)
  } catch {
    return String(err)
  }
}

export function isRateLimitError(err) {
  if (!err) {
    return false
  }

  if (err.statusCode === 429 || err.cause?.statusCode === 429) {
    return true
  }

  const text = `${formatRpcError(err)} ${err.name || ''} ${err.code || ''}`
  return /429|rate.?limit|Too Many Requests|capacity|throughput|-32005/i.test(text)
}

export function isTransientRpcError(err) {
  if (!err) {
    return false
  }
  const name = err.name || ''
  const message = formatRpcError(err)
  return (
    name === 'ResponseError' ||
    name === 'ContractExecutionError' ||
    message.startsWith('Returned error:') ||
    isRateLimitError(err) ||
    /Failed to fetch|ECONNRESET|ETIMEDOUT|network/i.test(message)
  )
}
