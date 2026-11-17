import { createOruga, OrugaComponentPlugins } from '@oruga-ui/oruga-next'
import { bulmaConfig } from '@oruga-ui/theme-bulma'

import TrndIcon from '@/components/ui/TrndIcon.vue'

// Replaces nuxt-buefy: Oruga is Buefy's official Vue 3 successor, theme-bulma
// keeps the Bulma class conventions this app's custom SCSS is written against.
// Oruga >= 0.13 registers no components by default: they must be passed explicitly.
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(
    createOruga(
      {
        ...bulmaConfig,
        iconComponent: TrndIcon,
        iconPack: 'trnd',
        // Buefy's defaults, which the design relies on
        tooltip: { ...bulmaConfig.tooltip, variant: 'primary', position: 'top' },
        dropdown: { ...bulmaConfig.dropdown, activeClass: 'is-active' }
      },
      OrugaComponentPlugins
    )
  )
})
