import { Buffer } from 'buffer'

/**
 * Browser polyfill for the Node `Buffer` global.
 * Webpack 4 (the old toolchain) polyfilled Buffer automatically; Vite does not.
 * App code (utils/crypto, store/application, account store, pedersen service)
 * uses Buffer.from/concat/alloc for note and encryption payloads.
 * The `assert` builtin used by websnark is polyfilled via vite resolve alias.
 */
export default defineNuxtPlugin(() => {
  if (typeof globalThis.Buffer === 'undefined') {
    globalThis.Buffer = Buffer
  }
})
