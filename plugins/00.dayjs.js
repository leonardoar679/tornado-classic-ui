import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import localeData from 'dayjs/plugin/localeData'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'

import 'dayjs/locale/es'
import 'dayjs/locale/fr'
import 'dayjs/locale/ru'
import 'dayjs/locale/tr'
import 'dayjs/locale/uk'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)
dayjs.extend(localeData)
dayjs.extend(duration)

dayjs.locale('en')

// Replaces @nuxtjs/moment: provides `$moment` (dayjs is the maintained moment replacement).
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.provide('moment', dayjs)
})
