/**
 * Builds the SPA for Cloudflare Workers deployment.
 *
 * Sets an absolute app base ("/") before running `nuxt generate`: the Workers
 * static-assets SPA fallback serves index.html for every unknown path, and the
 * default relative base ('./' — kept for IPFS sub-path deploys) would resolve
 * asset URLs against the current route (e.g. /governance/_nuxt/... -> 404 on
 * multi-segment routes).
 *
 * Output: .output/public (consumed by wrangler.jsonc `assets.directory`).
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

process.env.NUXT_APP_BASE_URL = process.env.NUXT_APP_BASE_URL || '/'

runNuxt(['generate', ...process.argv.slice(2)])

// `nuxt generate` rewrites the shared .nuxt/ templates in production mode, which
// empties the eslint auto-import globals registry (.nuxt/eslint.config.mjs) and
// breaks `npm run lint` until types are regenerated. Restore them for dev/lint.
runNuxt(['prepare'])
