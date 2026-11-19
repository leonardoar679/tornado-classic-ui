import FileSaver from 'file-saver'

export * from './crypto.js'
export * from './debounce.js'
export * from './adapters.js'
export * from './storeUtils.js'
export * from './stringUtils.js'
export * from './numberUtils.js'
export * from './instanceUtils.js'
export * from './privateKey.js'

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function detectMob() {
  if (
    navigator.userAgent.match(/Android/i) ||
    navigator.userAgent.match(/webOS/i) ||
    navigator.userAgent.match(/iPhone/i) ||
    navigator.userAgent.match(/iPad/i) ||
    navigator.userAgent.match(/iPod/i) ||
    navigator.userAgent.match(/BlackBerry/i) ||
    navigator.userAgent.match(/Windows Phone/i)
  ) {
    return true
  } else {
    return false
  }
}

/**
 * Trigger a note/key backup download. Must run inside a user gesture
 * (click handler). setTimeout/await before calling this will make Chromium
 * silently block the download.
 */
export function saveAsFile(data, name) {
  if (typeof window === 'undefined' || detectMob()) {
    return false
  }

  const blob =
    data instanceof Blob ? data : new Blob([data], { type: 'text/plain;charset=utf-8' })

  try {
    const saveAs = FileSaver?.saveAs || FileSaver
    if (typeof saveAs === 'function') {
      saveAs(blob, name)
      return true
    }
  } catch (err) {
    console.warn('file-saver failed, falling back to anchor download', err?.message || err)
  }

  try {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = name
    anchor.rel = 'noopener'
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    return true
  } catch (err) {
    console.warn('anchor download failed', err?.message || err)
    return false
  }
}
