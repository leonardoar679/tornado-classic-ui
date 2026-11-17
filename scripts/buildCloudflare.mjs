/**
 * Builds the SPA for Cloudflare Workers deployment.
 *
 * Output: .output/public (consumed by wrangler.jsonc `assets.directory`).
 * The app base URL is '/' by default (see nuxt.config.js); NUXT_APP_BASE_URL
 * can still override it for sub-path deploys on regular hosts.
 *
 * Build-time env keys (INFURA_KEY, WALLET_CONNECT_PROJECT_ID, ...) are read
 * from the environment by nuxt.config.js and baked into the bundle — set them
 * before running this script if you want them included. The public RPCs added
 * to networkConfig.js make the app fully functional without any keys.
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const nuxtBin = path.join(root, 'node_modules', 'nuxt', 'bin', 'nuxt.mjs')

const runNuxt = (args) => {
  const result = spawnSync(process.execPath, [nuxtBin, ...args], {
    stdio: 'inherit',
    env: process.env,
    cwd: root
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

runNuxt(['generate', ...process.argv.slice(2)])

// `nuxt generate` rewrites the shared .nuxt/ templates in production mode, which
// empties the eslint auto-import globals registry (.nuxt/eslint.config.mjs) and
// breaks `npm run lint` until types are regenerated. Restore them for dev/lint.
runNuxt(['prepare'])
