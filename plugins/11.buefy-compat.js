import { openModal, dialogConfirm, snackbarOpen, toastOpen } from '@/services/ui/index.js'

/**
 * Buefy-compatibility facade.
 * Keeps `this.$buefy.modal/dialog/snackbar/toast` call sites working on top of
 * the Oruga-based programmatic UI layer (services/ui).
 */
export default defineNuxtPlugin((nuxtApp) => {
  const buefy = {
    modal: { open: openModal },
    dialog: { confirm: dialogConfirm },
    snackbar: { open: snackbarOpen },
    toast: { open: toastOpen }
  }

  nuxtApp.provide('buefy', buefy)
})
