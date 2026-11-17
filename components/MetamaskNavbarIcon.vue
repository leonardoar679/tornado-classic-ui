<template>
  <o-tooltip position="bottom" class="is-dark-tooltip" :triggers="[]">
    <template #content>
      <template v-if="isLoggedIn">
        <p>{{ $t('web3connected') }}</p>
        <a :href="addressExplorerUrl(ethAccount)" target="_blank" rel="noopener noreferrer">{{
          shortAddress(ethAccount)
        }}</a>
        <p><NumberFormat :value="balance" /> {{ currency }}</p>
      </template>
      <template v-else>
        <p>{{ $t('notConnected') }}</p>
        <connect-button type="is-primary-link mb-0" />
      </template>
    </template>
    <o-button class="is-nav-icon" :icon-left="wallet" :class="{ [wallet]: isLoggedIn }"></o-button>
  </o-tooltip>
</template>

<script>
import { mapState, mapGetters } from 'vuex'

import { sliceAddress } from '@/utils/index.js'
import NumberFormat from '@/components/NumberFormat.vue'
import { ConnectButton } from '@/components/web3Connect/index.js'

export default {
  components: {
    NumberFormat,
    ConnectButton
  },
  props: {
    active: {
      type: Boolean
    }
  },
  data() {
    return {
      isActive: false,
      timer: null
    }
  },
  computed: {
    ...mapState('metamask', ['ethAccount', 'ethBalance', 'providerName']),
    ...mapGetters('metamask', ['isLoggedIn', 'currency']),
    ...mapGetters('token', ['toDecimals']),
    ...mapGetters('txHashKeeper', ['addressExplorerUrl']),
    balance() {
      return this.toDecimals(this.ethBalance)
    },
    wallet() {
      const supportedWallets = ['metamask', 'walletConnect']

      if (supportedWallets.includes(this.providerName)) {
        return this.providerName
      }
      return 'metamask'
    }
  },
  methods: {
    shortAddress(address) {
      return sliceAddress(address)
    }
  }
}
</script>
