<template>
  <div class="action">
    <Statistic />
    <div v-for="action in actions" :key="action.description" class="action-item">
      <o-icon :icon="action.icon" size="large" />
      <div class="desc">
        {{ $t(action.description) }}
      </div>
      <o-button
        variant="primary"
        outlined
        :data-test="action.dataAttribute"
        @mousedown.prevent
        @click="action.onClick"
      >
        {{ $t(action.button) }}
      </o-button>
    </div>
    <div class="action-item has-switch">
      <o-icon icon="account-file" size="large" />
      <div class="desc">
        {{ $t('account.control.fileDesc') }}
      </div>
      <div data-test="download_notes__config_switch">
        <o-switch :value="isEnabledSaveFile" size="medium" @update:model-value="handleEnabledSaveFile" />
      </div>
    </div>
  </div>
</template>

<script>
import { openDecryptModal, openShowRecoverKeyModal, openRemoveAccountModal } from '../../modals/index.js'
import { controlComputed, controlMethods } from '../../injectors/index.js'
import Statistic from './Statistic.vue'

export default {
  components: {
    Statistic
  },
  data() {
    return {
      actions: [
        {
          icon: 'account-notes',
          onClick: this.getEncryptedNotes,
          button: 'account.control.loadAll',
          description: 'account.control.loadAllDesc',
          dataAttribute: 'load_all_encrypted_notes_button'
        },
        {
          icon: 'account-key',
          onClick: this.openRecoverKeyModal,
          button: 'account.control.showRecoveryKey',
          description: 'account.control.showRecoveryKeyDesc',
          dataAttribute: 'reveal_current_note_account'
        },
        {
          icon: 'account-remove',
          button: 'account.control.remove',
          onClick: this.handleRemoveAccount,
          description: 'account.control.removeDesc',
          dataAttribute: 'clear_account_info_button'
        }
      ]
    }
  },
  computed: {
    ...controlComputed
  },
  methods: {
    ...controlMethods,
    handleEnabledSaveFile() {
      this.enabledSaveFile()
    },
    async getEncryptedNotes() {
      const props = await this.decryptNotes()

      if (props) {
        openDecryptModal({ ...props, parent: this })
      }
    },
    handleRemoveAccount() {
      const onConfirm = () => {
        this.addNoticeWithInterval({
          notice: {
            title: 'accountHasBeenDeleted',
            type: 'info'
          },
          interval: 2000
        })
        this.removeAccount()
      }

      openRemoveAccountModal({ i18n: this.$i18n, onConfirm })
    },
    async openRecoverKeyModal() {
      const recoveryKey = await this.getRecoveryKey()

      if (recoveryKey) {
        openShowRecoverKeyModal({ recoveryKey, parent: this })
      }
    }
  }
}
</script>
