import { Buffer } from 'buffer'

/**
 * Browser polyfill for the Node `Buffer` global.
 * Webpack 4 (the old toolchain) polyfilled Buffer automatically; Vite does not.
 * App code (utils/crypto, store/application, account store, pedersen service)
 * uses Buffer.from/concat/alloc for note and encryption payloads.
 * The `assert` builtin used by websnark is polyfilled via vite resolve alias.
 *
 * Bundled dependencies get `Buffer` injected per module (`injectNodeGlobals` in
 * nuxt.config.js); this global covers app modules served unbundled in dev.
 * Assigned at module scope so it exists before later plugins import their modules.
 */
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer
}

export default defineNuxtPlugin(() => {})
