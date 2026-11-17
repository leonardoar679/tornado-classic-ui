import { Buffer } from 'buffer'

/**
 * Browser polyfill for the Node `Buffer` global.
 * Webpack 4 (the old toolchain) polyfilled Buffer automatically; Vite does not.
 * App code (utils/crypto, store/application, account store, pedersen service)
 * uses Buffer.from/concat/alloc for note and encryption payloads.
 * The `assert` builtin used by websnark is polyfilled via vite resolve alias.
 *
 * Assigned at module scope, not inside the plugin setup: dependencies imported by
 * later plugins (e.g. circomlibjs via the store) read `Buffer` while their modules
 * are evaluated, which happens before any plugin setup function runs.
 */
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer
}

export default defineNuxtPlugin(() => {})
