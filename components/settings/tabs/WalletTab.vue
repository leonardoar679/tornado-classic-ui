<template>
  <o-tab-item :label="$t('wallet')" value="wallet" header-class="withdrawal_settings_wallet_tab">
    <fieldset :disabled="isNotLoggedIn">
      <div class="notice is-warning">
        <div class="notice__p">{{ $t('withdrawWalletWarning', { currency: networkCurrency }) }}</div>
        <div v-if="isNotLoggedIn" class="tooltip" :data-label="$t('connectYourWalletFirst')"></div>
      </div>
      <WithdrawTotal :currency="currency" withdraw-type="wallet" />
    </fieldset>
    <div class="buttons buttons__halfwidth mt-5">
      <o-button variant="primary" outlined @mousedown.prevent @click="onReset">
        {{ $t('reset') }}
      </o-button>
      <connect-button v-if="isNotLoggedIn" />
      <o-button v-else variant="primary" @click="onSave">
        {{ $t('save') }}
      </o-button>
    </div>
  </o-tab-item>
</template>

<script>
import { mapGetters } from 'vuex'

import { ConnectButton } from '@/components/web3Connect/index.js'
import WithdrawTotal from '@/components/withdraw/WithdrawTotal.vue'

export default {
  components: {
    ConnectButton,
    WithdrawTotal
  },
  inject: ['save', 'reset', 'currency'],
  computed: {
    ...mapGetters('metamask', ['isLoggedIn']),
    ...mapGetters('metamask', {
      networkCurrency: 'currency'
    }),
    isNotLoggedIn() {
      return !this.isLoggedIn
    }
  },
  methods: {
    onReset() {
      this.reset()
    },
    onSave() {
      this.save()
    }
  }
}
</script>
