import { getIndexedDB, initIndexedDBInstances } from '@/services/idb.js'

export default defineNuxtPlugin(async (nuxtApp) => {
  await initIndexedDBInstances()

  nuxtApp.provide('indexedDB', getIndexedDB)
})
