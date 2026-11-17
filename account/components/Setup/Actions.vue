<template>
  <div class="action">
    <div class="action-item">
      <o-icon icon="account-setup" size="large" />
      <div class="desc">
        {{ $t('account.setup.desc') }}
      </div>
      <o-tooltip :disabled="!isAccountDisabled" :label="$t(setupAccountTooltip)" multiline class="is-large">
        <o-button
          :disabled="isAccountDisabled"
          outlined
          variant="primary"
          data-test="button_setup_account"
          @click="showSetupModal"
        >
          {{ $t('account.setup.account') }}
        </o-button>
      </o-tooltip>
    </div>
    <div class="action-item">
      <o-icon icon="account-recover" size="large" />
      <div class="desc">
        {{ $t('account.setup.recoverDesc') }}
      </div>
      <o-tooltip :disabled="!isRecoverDisabled" :label="$t(recoverAccountTooltip)" multiline class="is-large">
        <o-button
          variant="primary"
          outlined
          :disabled="isRecoverDisabled"
          data-test="button_recover_account"
          @click="handleRecoverAccount"
        >
          {{ $t('account.setup.recover') }}
        </o-button>
      </o-tooltip>
    </div>
    <div class="action-item">
      <o-icon icon="account-raw" size="large" />
      <div class="desc">
        {{ $t('account.setup.enterRawDesc') }}
      </div>
      <o-button
        variant="primary"
        outlined
        data-test="button_enter_account_key"
        @click="showRecoverKeyModal"
        >{{ $t('account.setup.enterRaw') }}</o-button
      >
    </div>
  </div>
</template>

<script>
import { setupComputed, setupMethods } from '../../injectors/index.js'
import { openDecryptModal, openRecoverAccountModal, openSetupAccountModal } from '../../modals/index.js'

export default {
  computed: {
    ...setupComputed,
    isAccountDisabled() {
      return this.isExistAccount || !this.isLoggedIn
    },
    isRecoverDisabled() {
      return !this.isExistAccount || !this.isLoggedIn || this.isPartialSupport
    },
    recoverAccountTooltip() {
      if (this.isPartialSupport) {
        return 'mobileWallet.actions.disabled'
      }
      return this.isLoggedIn ? 'account.setup.recTooltip' : 'connectYourWalletFirst'
    },
    setupAccountTooltip() {
      return this.isLoggedIn ? 'account.setup.setTooltip' : 'connectYourWalletFirst'
    }
  },
  methods: {
    ...setupMethods,
    async getEncryptedNotes() {
      const props = await this.decryptNotes()

      if (props) {
        openDecryptModal({ ...props, parent: this })
      }
    },
    showRecoverKeyModal() {
      openRecoverAccountModal({ parent: this, getNotes: this.getEncryptedNotes })
    },
    showSetupModal() {
      openSetupAccountModal({ parent: this })
    },
    async handleRecoverAccount() {
      try {
        this.enable({ message: this.$t('account.setup.decrypt') })
        await this.recoverAccountFromChain()
        await this.getEncryptedNotes()
      } catch {
        this.addNoticeWithInterval({
          notice: {
            title: 'decryptFailed',
            type: 'danger'
          },
          interval: 5000
        })
      } finally {
        this.disable()
      }
    }
  }
}
</script>
