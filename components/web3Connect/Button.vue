<template>
  <o-button :variant="variant" v-bind="$attrs" @click="onLogIn">{{ $t(actionText) }}</o-button>
</template>

<script>
import { mapActions } from 'vuex'

import Web3Connect from './Modal.vue'

import { detectMob } from '@/utils/index.js'

export default {
  inheritAttrs: false,
  props: {
    variant: {
      type: String,
      default: 'primary'
    },
    actionText: {
      type: String,
      default: () => 'connect'
    }
  },
  computed: {
    hasInjectedProvider() {
      return Boolean(window.ethereum)
    }
  },
  methods: {
    ...mapActions('metamask', ['initialize']),
    async web3Connect(name) {
      this.$store.dispatch('loading/enable', {})
      try {
        await this.initialize({
          providerName: name
        })
      } catch (e) {
        console.error(e)
      }
      this.$store.dispatch('loading/disable')
    },
    onLogIn() {
      if (detectMob() && this.hasInjectedProvider) {
        this.web3Connect('mobileWallet')
        return
      }

      this.$buefy.modal.open({
        parent: this,
        component: Web3Connect,
        hasModalCard: true,
        width: 440,
        props: {
          web3Connect: this.web3Connect
        }
      })
    }
  }
}
</script>
