import { i18n, setupI18nLocales } from '@/services/i18n.js'
import { LOCALES_NAMES } from '@/constants/variables.js'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(i18n)
  nuxtApp.provide('i18n', i18n)

  const momentLang = setupI18nLocales()
  nuxtApp.$moment.locale(momentLang)
  nuxtApp.$numbro.setLanguage(LOCALES_NAMES[momentLang])
})
