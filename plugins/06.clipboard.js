// Replaces vue-clipboard2: provides `$copyText` and `v-clipboard` directive
async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }

  // fallback for non-secure contexts (http, some ipfs gateways)
  const el = document.createElement('textarea')
  el.value = text
  el.setAttribute('readonly', '')
  el.style.position = 'fixed'
  el.style.opacity = '0'
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('clipboard', {
    mounted(el, binding) {
      const arg = binding.arg || 'copy'
      if (arg === 'copy') {
        el.__clipboardValue = binding.value
        el.__clipboardHandler = async () => {
          try {
            await copyText(el.__clipboardValue)
            if (typeof el.__clipboardSuccess === 'function') {
              el.__clipboardSuccess()
            }
          } catch (err) {
            if (typeof el.__clipboardError === 'function') {
              el.__clipboardError(err)
            }
          }
        }
        el.addEventListener('click', el.__clipboardHandler)
      } else if (arg === 'success') {
        el.__clipboardSuccess = binding.value
      } else if (arg === 'error') {
        el.__clipboardError = binding.value
      }
    },
    updated(el, binding) {
      const arg = binding.arg || 'copy'
      if (arg === 'copy') {
        el.__clipboardValue = binding.value
      } else if (arg === 'success') {
        el.__clipboardSuccess = binding.value
      } else if (arg === 'error') {
        el.__clipboardError = binding.value
      }
    },
    unmounted(el) {
      if (el.__clipboardHandler) {
        el.removeEventListener('click', el.__clipboardHandler)
      }
      delete el.__clipboardHandler
      delete el.__clipboardValue
      delete el.__clipboardSuccess
      delete el.__clipboardError
    }
  })

  return {
    provide: {
      copyText
    }
  }
})
