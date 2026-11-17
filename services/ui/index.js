import { h, render } from 'vue'

import DialogHost from './DialogHost.vue'
import ModalHost from './ModalHost.vue'
import SnackbarHost from './SnackbarHost.vue'
import ToastHost from './ToastHost.vue'

/**
 * Programmatic UI layer replacing Buefy's ModalProgrammatic / DialogProgrammatic /
 * SnackbarProgrammatic / ToastProgrammatic.
 *
 * Components are mounted with the main app's context, so wrapped components keep
 * access to the store, i18n and all injected services.
 */
let appContext = null

export function setAppContext(context) {
  appContext = context
}

function mountHost(HostComponent, props) {
  const container = document.createElement('div')
  document.body.appendChild(container)

  let closed = false
  let resolveClose = () => {}
  const promise = new Promise((resolve) => {
    resolveClose = resolve
  })

  const cleanup = () => {
    if (closed) {
      return
    }
    closed = true
    // let the leave transition finish before tearing down
    setTimeout(() => {
      render(null, container)
      container.remove()
    }, 200)
    resolveClose()
  }

  const vnode = h(HostComponent, {
    ...props,
    onClose: cleanup
  })

  if (appContext) {
    vnode.appContext = appContext
  }

  render(vnode, container)

  const close = () => {
    const proxy = vnode.component && vnode.component.proxy
    if (proxy && typeof proxy.close === 'function') {
      proxy.close()
    } else {
      cleanup()
    }
  }

  return { close, promise }
}

/**
 * Open a component in a modal.
 * Supports the options this codebase uses:
 *   { component, props, events, parent, width, customClass, canCancel, onCancel }
 * `parent` is accepted for compatibility and ignored.
 */
export function openModal(options = {}) {
  // `parent` and `hasModalCard` are Buefy-era options, accepted and ignored
  const { component, props = {}, events = {}, ...rest } = options
  // `parent` and `hasModalCard` are Buefy-era options, accepted and ignored
  delete rest.parent
  delete rest.hasModalCard

  return mountHost(ModalHost, {
    component,
    componentProps: props,
    componentListeners: events,
    ...rest
  })
}

/** Buefy-compatible dialog confirm */
export function dialogConfirm(options = {}) {
  return mountHost(DialogHost, options)
}

/** Buefy-compatible snackbar */
export function snackbarOpen(options = {}) {
  return mountHost(SnackbarHost, options)
}

/** Buefy-compatible toast */
export function toastOpen(options = {}) {
  return mountHost(ToastHost, options)
}

/**
 * Buefy-compatible programmatic facades, so existing call sites keep working:
 *   Snackbar.open(...), Dialog.confirm(...), Toast.open(...), ModalProgrammatic.open(...)
 */
export const Snackbar = { open: snackbarOpen }
export const Dialog = { confirm: dialogConfirm }
export const Toast = { open: toastOpen }
export const ModalProgrammatic = { open: openModal }
export const DialogProgrammatic = { confirm: dialogConfirm }
