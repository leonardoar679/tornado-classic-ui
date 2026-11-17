import { execSync } from 'node:child_process'

function getCurrentCommit() {
  try {
    return execSync('git rev-parse HEAD').toString().trim().slice(0, 7)
  } catch (e) {
    console.error('Failed to get git commit', e.message)
    return 'debug'
  }
}

// Build-time env injection (replaces the old webpack DefinePlugin).
// Only exact `process.env.<KEY>` reads are replaced; `process.env.NODE_ENV` stays Vite-managed.
const ENV_KEYS = [
  'INFURA_KEY',
  'ALCHEMY_MAINNET_KEY',
  'ALCHEMY_POLYGON_KEY',
  'ALCHEMY_OPTIMISM_KEY',
  'ALCHEMY_ARBITRUM_KEY',
  'ALCHEMY_GOERLI_KEY',
  'WALLET_CONNECT_PROJECT_ID',
  'OLD_STORE_NAME',
  'STORE_NAME',
  'APP_ENS_NAME'
]

const envDefines = { 'process.env.commit': JSON.stringify(getCurrentCommit()) }
for (const key of ENV_KEYS) {
  envDefines[`process.env.${key}`] = JSON.stringify(process.env[key] ?? null)
}

export default defineNuxtConfig({
  ssr: false,
  srcDir: '.',
  // Nuxt 2 served this repo from the classic 'static/' dir; keep that mapping so the
  // proving keys / event caches / favicon ship in the build output (site root).
  dir: { public: 'static' },
  devtools: { enabled: false },
  modules: ['@nuxt/eslint'],

  css: ['~/assets/styles/app.scss'],

  app: {
    // Base URL must be absolute ('/' or '/subpath/') - a relative './' (used by the
    // old webpack build for IPFS) makes Nuxt 4's built server 302-redirect every
    // request whose path doesn't start with the base, breaking `nuxt generate`
    // (EISDIR on prerendered routes) and static previews. Override with
    // NUXT_APP_BASE_URL for sub-path deploys on regular hosts.
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    head: {
      title: 'Tornado.cash',
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        {
          'http-equiv': 'Content-Security-Policy',
          content:
            "img-src 'self' data:;font-src data:;style-src 'self' 'unsafe-inline';connect-src *;script-src 'self' 'unsafe-eval' 'unsafe-inline';default-src 'self';object-src 'none';base-uri 'none';child-src blob:;worker-src blob:;"
        },
        {
          name: 'Referer-Policy',
          content: 'no-referrer'
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
        },
        { name: 'theme-color', content: '#000403' },
        {
          hid: 'description',
          name: 'description',
          content: 'Non-custodial Ethereum Privacy solution.'
        },
        {
          hid: 'og:title',
          property: 'og:title',
          content: 'Tornado.Cash'
        },
        {
          hid: 'og:description',
          property: 'og:description',
          content: 'Non-custodial, trustless, serverless, private transactions on Ethereum network'
        },
        {
          hid: 'og:url',
          property: 'og:url',
          content: 'https://tornado.cash'
        },
        {
          hid: 'og:type',
          property: 'og:type',
          content: 'website'
        },
        {
          hid: 'og:image',
          property: 'og:image',
          content: 'https://tornado.cash/tw.png'
        },
        {
          hid: 'keywords',
          name: 'keywords',
          content:
            'Tornado, Ethereum, ERC20, dapp, smart contract, decentralized, metamask, zksnark, zero knowledge'
        }
      ],
      link: [
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'shortcut icon', type: 'image/x-icon', href: '/favicon/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/favicon/apple-touch-icon.png' }
      ]
    }
  },

  router: {
    options: {
      linkActiveClass: '',
      linkExactActiveClass: 'is-active'
    }
  },

  vite: {
    define: envDefines,
    css: {
      preprocessorOptions: {
        scss: {
          // Third-party Sass deprecation noise, silenced until the SCSS suite is
          // migrated off the Buefy-style @import cascade (a full @use rewrite):
          // - import: our deliberate @import cascade + Bulma 1.x internals
          // - global-builtin / if-function: Bulma 1.x utilities (string.length, if())
          silenceDeprecations: ['import', 'global-builtin', 'if-function']
        }
      }
    },
    resolve: {
      alias: {
        // websnark requires 'assert' at module level and calls it while proving;
        // webpack 4 polyfilled it, Vite externalizes it (throws at runtime).
        // The npm `assert` package is the same browserify polyfill.
        assert: 'assert/'
      }
    },
    build: {
      assetsInlineLimit: 25000,
      // the entry bundle legitimately embeds the zk crypto/proof stack (~3 MB);
      // splitting it further is a separate optimization, not a warning to chase
      chunkSizeWarningLimit: 3000,
      rolldownOptions: {
        onwarn(warning, warn) {
          // Node builtins (worker_threads, crypto, url, http, https, zlib) referenced
          // from Node-only branches in websnark/micro-ftch are externalized for
          // browser compatibility by design - those branches never run in a browser.
          if (warning?.message?.includes('externalized for browser compatibility')) {
            return
          }
          // direct eval() inside the pinned snarkjs git fork (witness generation);
          // the fork is protocol-critical and intentionally not upgradeable
          if (warning?.code === 'EVAL' || warning?.message?.includes('direct eval')) {
            return
          }
          warn(warning)
        },
        checks: {
          // build-speed diagnostic only ("callbacks ran for X% of the build"),
          // no code-quality signal
          bundlerTimings: false
        }
      }
    }
  },

  compatibilityDate: '2026-11-01'
})
