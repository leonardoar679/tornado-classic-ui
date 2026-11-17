<template>
  <div class="modal-card box box-modal">
    <header class="box-modal-header is-spaced">
      <div class="box-modal-title">{{ $t('account.modals.setupAccount.title') }}</div>
      <button type="button" class="delete" @click="$emit('close')" />
    </header>
    <div class="note">{{ $t('account.modals.setupAccount.description') }}</div>
    <div class="field">
      <div class="label-with-buttons">
        <div class="label">{{ $t('account.modals.setupAccount.label') }}</div>
        <o-button v-clipboard:copy="recoveryKey" v-clipboard:success="onCopy" class="is-primary-text">
          {{ $t('copy') }}
        </o-button>
      </div>
      <div class="notice is-recovery-key">
        <div class="notice__p">{{ recoveryKey }}</div>
      </div>
    </div>
    <o-notification class="main-notification" variant="info">
      {{ $t('account.modals.setupAccount.isNotSupportedWithHw') }}
    </o-notification>
    <o-checkbox v-model="isSaveOnChain" :disabled="isPartialSupport">{{
      $t('account.modals.setupAccount.saveOnChain')
    }}</o-checkbox>
    <o-checkbox v-if="!isSaveOnChain" v-model="isBackuped">{{
      $t('account.modals.setupAccount.backedUp')
    }}</o-checkbox>
    <o-notification
      v-if="!isSaveOnChain && warningMessage"
      class="main-notification"
      variant="warning"
    >
      {{ warningMessage }}
    </o-notification>
    <o-notification
      v-if="setupAccountRequest.isError"
      class="main-notification"
      variant="warning"
    >
      {{ setupAccountRequest.errorMessage }}
    </o-notification>
    <o-button
      v-if="!isBackuped && isSaveOnChain"
      variant="primary"
      expanded
      data-test="button_confirm_setup_account"
      :loading="setupAccountRequest.isFetching"
      @click="onSetupAccount"
    >
      {{ $t('account.modals.setupAccount.setupAccount') }}
    </o-button>
    <o-button v-else variant="primary" expanded :disabled="!isBackuped" @click="setAccount">
      {{ $t('account.modals.setupAccount.setAccount') }}
    </o-button>
  </div>
</template>

<script>
import { setupMethods, setupComputed } from '../injectors/index.js'

export default {
  emits: ['close'],
  data() {
    return {
      timer: null,
      recoveryKey: '',
      isBackuped: false,
      isSaveOnChain: true,
      warningMessage: ''
    }
  },
  computed: {
    ...setupComputed
  },
  watch: {
    isSaveOnChain() {
      if (this.isSaveOnChain) {
        this.isBackuped = false
      }
    }
  },
  beforeUpdate() {
    if (this.setupAccountRequest.isSuccess) {
      this.$parent.close()
    }
  },
  mounted() {
    this.recoveryKey = this.$provider.web3.eth.accounts.create().privateKey.slice(2)

    if (this.isPartialSupport) {
      this.isSaveOnChain = false
    }

    this.timer = setTimeout(() => {
      this.saveRecoveryKeyOnFile({ recoveryKey: this.recoveryKey })
    }, 1500)
  },
  beforeUnmount() {
    clearTimeout(this.timer)
    this.clearState({ key: 'setupAccount' })
  },
  methods: {
    ...setupMethods,
    onCopy() {
      this.addNoticeWithInterval({
        notice: {
          title: 'copied',
          type: 'info'
        },
        interval: 2000
      })
    },
    async setAccount() {
      try {
        await this.recoverAccountFromKey({ recoveryKey: this.recoveryKey })
        this.$emit('close')
      } catch (err) {
        this.warningMessage = err.message
      }
    },
    async onSetupAccount() {
      if (!this.isSaveOnChain) {
        this.warningMessage = this.$t('account.modals.setupAccount.yourRecoveryKeyWontBeSaved')
        return
      }

      try {
        await this.setupAccount({ privateKey: this.recoveryKey })
      } catch (err) {
        this.warningMessage = err.message
      }
    }
  }
}
</script>
