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
    // Relative base so the built SPA works from any sub-path (IPFS gateways, custom roots).
    // `npm run deploy:cloudflare` overrides this to '/' via NUXT_APP_BASE_URL: the Workers
    // SPA fallback serves index.html from any path, and a relative base would break
    // asset URLs on multi-segment routes like /governance/proposal.
    baseURL: process.env.NUXT_APP_BASE_URL || './',
    head: {
      title: 'Tornado.cash',
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        {
          'http-equiv': 'Content-Security-Policy',
          content:
            "img-src 'self' data:;font-src data:;style-src 'self' 'unsafe-inline';connect-src *;script-src 'self' 'unsafe-eval' 'unsafe-inline';default-src 'self';object-src 'none';base-uri 'none';upgrade-insecure-requests;child-src blob:;worker-src blob:;"
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
    resolve: {
      alias: {
        // websnark requires 'assert' at module level and calls it while proving;
        // webpack 4 polyfilled it, Vite externalizes it (throws at runtime).
        // The npm `assert` package is the same browserify polyfill.
        assert: 'assert/'
      }
    },
    build: {
      assetsInlineLimit: 25000
    }
  },

  compatibilityDate: '2026-11-01'
})
