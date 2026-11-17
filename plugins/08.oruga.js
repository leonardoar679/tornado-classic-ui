import Oruga from '@oruga-ui/oruga-next'

import '@oruga-ui/theme-bulma/style.css'

import TrndIcon from '@/components/ui/TrndIcon.vue'

// Replaces nuxt-buefy: Oruga is Buefy's official Vue 3 successor, theme-bulma
// keeps the Bulma class conventions this app's custom SCSS is written against.
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(Oruga, {
    iconComponent: TrndIcon,
    iconPack: 'trnd'
  })
})
