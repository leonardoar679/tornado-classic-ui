/**
 * Single-tab guard (classic-ui parity).
 *
 * The Nuxt 2 version used a localStorage handshake, but calling it again on
 * every `window.focus` reassigned `window.id` / `firstTab` and stacked storage
 * listeners — so a second tab never got blocked after the Oruga/Nuxt port.
 *
 * This implementation:
 *  - initializes once per page
 *  - uses BroadcastChannel + a heartbeat lock in localStorage
 *  - locks out the newer tab (alert + blank page + window.close when allowed)
 *  - on focus, only refreshes the heartbeat (does not reset identity)
 */

const STORAGE_KEY = 'tornado_classic_active_tab'
const CHANNEL_NAME = 'tornado-classic-ui-tab'
const STALE_MS = 5000
const HEARTBEAT_MS = 1500

function readLock() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

function writeLock(tabId) {
  const payload = { id: tabId, t: Date.now() }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  return payload
}

function startedAt(tabId) {
  return Number(String(tabId).split('-')[0]) || 0
}

function lockOutDuplicateTab(tabId) {
  if (window.multipleTabsDetected) {
    return
  }
  window.multipleTabsDetected = true

  try {
    const lock = readLock()
    if (lock?.id === tabId) {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // ignore
  }

  window.alert(
    'Multiple tabs opened. Please use only one instance of Tornado Cash Classic. This page will be closed.'
  )

  try {
    document.body.innerHTML =
      '<div style="font-family:system-ui,sans-serif;padding:2rem;text-align:center;max-width:32rem;margin:10vh auto">' +
      '<h1 style="font-size:1.5rem;margin-bottom:0.75rem">Multiple tabs detected</h1>' +
      '<p>Using multiple tabs can corrupt encrypted note data. Please close this tab and continue in the first one.</p>' +
      '</div>'
  } catch {
    // ignore
  }

  try {
    window.close()
  } catch {
    // Browsers only allow close() for script-opened windows; blank page remains.
  }
}

function touchHeartbeat() {
  if (window.multipleTabsDetected || !window.__tornadoTabId) {
    return
  }
  try {
    writeLock(window.__tornadoTabId)
    window.__tornadoTabBc?.postMessage({ type: 'claim', id: window.__tornadoTabId })
  } catch {
    // ignore
  }
}

function main() {
  if (typeof window === 'undefined') {
    return
  }

  // Focus / remount: refresh heartbeat only — never reassign tab identity.
  if (window.__tornadoTabGuardStarted) {
    touchHeartbeat()
    return
  }
  window.__tornadoTabGuardStarted = true

  const tabId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  window.__tornadoTabId = tabId

  const existing = readLock()
  if (existing && existing.id !== tabId && Date.now() - Number(existing.t) < STALE_MS) {
    lockOutDuplicateTab(tabId)
    return
  }

  writeLock(tabId)

  const heartbeat = window.setInterval(() => {
    if (window.multipleTabsDetected) {
      window.clearInterval(heartbeat)
      return
    }
    writeLock(tabId)
  }, HEARTBEAT_MS)

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue || window.multipleTabsDetected) {
      return
    }
    try {
      const other = JSON.parse(event.newValue)
      if (!other?.id || other.id === tabId) {
        return
      }
      // Newer tab is the duplicate and must exit; older tab keeps ownership.
      if (startedAt(tabId) >= startedAt(other.id)) {
        window.clearInterval(heartbeat)
        lockOutDuplicateTab(tabId)
      } else {
        // We are older — re-assert so the new tab can detect us immediately.
        writeLock(tabId)
        window.__tornadoTabBc?.postMessage({ type: 'claim', id: tabId })
      }
    } catch {
      // ignore
    }
  })

  window.addEventListener('beforeunload', () => {
    try {
      const lock = readLock()
      if (lock?.id === tabId) {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // ignore
    }
    try {
      window.__tornadoTabBc?.close()
    } catch {
      // ignore
    }
  })

  try {
    const bc = new BroadcastChannel(CHANNEL_NAME)
    window.__tornadoTabBc = bc
    bc.onmessage = (event) => {
      const data = event?.data
      if (!data || data.id === tabId || window.multipleTabsDetected) {
        return
      }
      if (data.type !== 'claim') {
        return
      }
      if (startedAt(tabId) >= startedAt(data.id)) {
        window.clearInterval(heartbeat)
        lockOutDuplicateTab(tabId)
      } else {
        bc.postMessage({ type: 'claim', id: tabId })
        writeLock(tabId)
      }
    }
    bc.postMessage({ type: 'claim', id: tabId })
  } catch {
    // BroadcastChannel unavailable — localStorage heartbeat still applies.
  }
}

export default defineNuxtPlugin(() => {
  return {
    provide: {
      preventMultitabs: main
    }
  }
})
