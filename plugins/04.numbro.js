import numbro from 'numbro'

import { locales } from '@/constants/numbro-languages/index.js'

export default defineNuxtPlugin((nuxtApp) => {
  locales.forEach((lang) => {
    numbro.registerLanguage(lang)
  })

  nuxtApp.provide('numbro', numbro)
})
