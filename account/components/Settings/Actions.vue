<template>
  <div class="action">
    <div class="action-item">
      <o-icon icon="account-wallet" size="large" />
      <div class="desc">
        {{ isLoggedIn ? $t('account.wallet.disconnect') : $t('account.wallet.desc') }}
      </div>
      <o-button
        v-if="isLoggedIn"
        variant="primary"
        outlined
        data-test="button_disconnect_account"
        @mousedown.prevent
        @click="onLogOut"
      >
        {{ $t('account.wallet.logout') }}
      </o-button>
      <connect-button
        v-else
        outlined
        action-text="account.wallet.connectWeb3"
        data-test="button_connect_web3"
      />
    </div>
    <div class="action-item">
      <o-icon icon="account-rpc" size="large" />
      <div class="desc">
        {{ $t('account.wallet.rpcDesc') }}
      </div>
      <o-button variant="primary" data-test="button_change_rpc" outlined @click="onSettings">{{
        $t('account.wallet.changeRpc')
      }}</o-button>
    </div>
  </div>
</template>

<script>
import { walletComputed, walletActions } from '../../injectors/index.js'
import { openSettingsModal } from '../../modals/index.js'

import { ConnectButton } from '@/components/web3Connect/index.js'

export default {
  components: {
    ConnectButton
  },
  computed: {
    ...walletComputed
  },
  methods: {
    ...walletActions,
    onSettings() {
      openSettingsModal({
        parent: this,
        netId: this.netId
      })
    }
  }
}
</script>
