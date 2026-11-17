/**
 * Node-environment stubs for modules that expect browser globals at import time
 * (services/i18n.js reads localStorage/navigator at module load).
 * Only active when there is no real window (node env test files).
 */
if (typeof window === 'undefined') {
  if (typeof globalThis.localStorage === 'undefined') {
    globalThis.localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    }
  }
  if (typeof globalThis.navigator === 'undefined') {
    globalThis.navigator = { language: 'en-US' }
  }
}
