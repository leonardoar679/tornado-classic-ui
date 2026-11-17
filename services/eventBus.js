/**
 * Minimal app-wide event bus, replacing the Vue 2 `this.$root.$on/$off/$emit`
 * instance events that were removed in Vue 3.
 */
const listeners = new Map()

export const eventBus = {
  on(event, handler) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set())
    }
    listeners.get(event).add(handler)
  },
  off(event, handler) {
    listeners.get(event)?.delete(handler)
  },
  emit(event, ...args) {
    listeners.get(event)?.forEach((handler) => handler(...args))
  }
}
