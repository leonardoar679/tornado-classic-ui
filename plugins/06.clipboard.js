// Replaces vue-clipboard2: provides `$copyText`
export default defineNuxtPlugin(() => {
  const copyText = async (text) => {
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

  return {
    provide: {
      copyText
    }
  }
})
