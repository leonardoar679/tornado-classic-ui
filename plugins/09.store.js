import { createStore } from 'vuex'
import createPersistedState from 'vuex-persistedstate'

import { setAppContext } from '@/services/ui/index.js'
import { isStorageAvailable } from '@/utils/index.js'

import * as application from '@/store/application.js'
import * as encryptedNote from '@/store/encryptedNote.js'
import * as gasPrices from '@/store/gasPrices.js'
import * as loading from '@/store/loading.js'
import * as metamask from '@/store/metamask.js'
import * as notice from '@/store/notice.js'
import * as price from '@/store/price.js'
import * as relayer from '@/store/relayer.js'
import * as settings from '@/store/settings.js'
import * as token from '@/store/token.js'
import * as torn from '@/store/torn.js'
import * as txHashKeeper from '@/store/txHashKeeper.js'
import * as txStatus from '@/store/txStatus.js'

import * as gov from '@/store/governance/gov.js'
import * as proposal from '@/store/governance/proposal.js'
import * as staking from '@/store/governance/staking.js'

const OLD_STORE_NAME = process.env.OLD_STORE_NAME
const STORE_NAME = process.env.STORE_NAME || 'tornadoClassicV2'

/**
 * Nuxt 2 supported two store file shapes:
 *  - module mode: `export default { namespaced, state, getters, mutations, actions }`
 *  - store file mode: named exports `export const { state, getters, mutations, actions }`
 * This helper accepts both (import * gives named exports; .default when present).
 */
function ns(moduleMeta) {
  const mod = moduleMeta.default || moduleMeta
  return { namespaced: true, ...mod }
}

function migrate() {
  if (isStorageAvailable('localStorage') && OLD_STORE_NAME !== STORE_NAME) {
    const oldStore = localStorage[OLD_STORE_NAME]
    if (oldStore) {
      localStorage.setItem(STORE_NAME, oldStore)
      localStorage.removeItem(OLD_STORE_NAME)
    }
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const store = createStore({
    modules: {
      application: ns(application),
      encryptedNote: ns(encryptedNote),
      gasPrices: ns(gasPrices),
      loading: ns(loading),
      metamask: ns(metamask),
      notice: ns(notice),
      price: ns(price),
      relayer: ns(relayer),
      settings: ns(settings),
      token: ns(token),
      torn: ns(torn),
      txHashKeeper: ns(txHashKeeper),
      txStatus: ns(txStatus),
      governance: {
        namespaced: true,
        modules: {
          gov: ns(gov),
          proposal: ns(proposal),
          staking: ns(staking)
        }
      }
    }
  })

  // persistence (ported from the old plugins/localStorage.js)
  if (!nuxtApp.$isLoadedFromIPFS()) {
    const paths = [
      'metamask.netId',
      'application.selectedStatistic',
      'application.selectedInstance',
      'txHashKeeper',
      'settings',
      'account',
      'relayer.jobs',
      'encryptedNote.ui'
    ]

    migrate()

    createPersistedState({
      key: STORE_NAME,
      paths
    })(store)
  }

  nuxtApp.vueApp.use(store)
  nuxtApp.provide('store', store)

  // programmatic modal/dialog/snackbar hosts must share the app context
  setAppContext(nuxtApp.vueApp._context)

  // In Nuxt 2, `inject()` added services to the store instance too, so store
  // actions could use `this.$provider`, `this.$indexedDB`, `this.app.i18n`, ...
  // Replicate that wiring so the store modules keep working unchanged.
  store.app = { i18n: nuxtApp.$i18n.global }

  for (const key of [
    '$moment',
    '$numbro',
    '$indexedDB',
    '$sessionStorage',
    '$provider',
    '$copyText',
    '$isLoadedFromIPFS',
    '$preventMultitabs'
  ]) {
    if (nuxtApp[key] !== undefined) {
      store[key] = nuxtApp[key]
    }
  }

  // router may not exist yet when plugins run — bind lazily
  Object.defineProperty(store, '$router', {
    configurable: true,
    get: () => nuxtApp.$router
  })
})
