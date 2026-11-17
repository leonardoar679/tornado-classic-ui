import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.spec.js'],
    setupFiles: ['tests/setup/globals.js'],
    testTimeout: 300000
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
      '~': fileURLToPath(new URL('.', import.meta.url))
    }
  }
})
