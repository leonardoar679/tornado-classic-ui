<template>
  <div class="modal-card box box-modal">
    <header class="box-modal-header is-spaced">
      <div class="box-modal-title">{{ $t('account.modals.recoverAccount.title') }}</div>
      <button type="button" class="delete" @click="$emit('close')" />
    </header>
    <div class="note">
      {{ $t('account.modals.recoverAccount.description') }}
    </div>
    <div class="field">
      <o-input
        v-model="recoveryKey"
        type="textarea"
        class="is-disabled-resize"
        rows="2"
        :placeholder="$t('enterRecoveryKey')"
        data-test="input_enter_recovery_key"
        :class="{ 'is-warning': hasAndValidKey }"
        @input="onInput"
      ></o-input>
      <p v-show="hasAndValidKey" class="help is-warning">
        {{ $t('account.modals.recoverAccount.warning') }}
      </p>
    </div>
    <o-notification
      v-if="recoverAccountFromKeyRequest.isError"
      class="main-notification"
      variant="warning"
    >
      {{ recoverAccountFromKeyRequest.errorMessage }}
    </o-notification>
    <o-button
      variant="primary"
      expanded
      :disabled="hasAndValidKey"
      :loading="recoverAccountFromKeyRequest.isFetching"
      data-test="button_connect_recovery_key"
      @click="handleRecoverAccount"
    >
      {{ $t('account.modals.recoverAccount.connect') }}
    </o-button>
  </div>
</template>

<script>
import { recoverAccountComputed, recoverAccountMethods } from '../injectors/index.js'
import { debounce, with0x } from '@/utils/index.js'

export default {
  props: {
    getNotes: {
      required: true,
      type: Function
    }
  },
  emits: ['close'],
  data() {
    return {
      recoveryKey: '',
      isValidRecoveryKey: true
    }
  },
  computed: {
    ...recoverAccountComputed,
    hasAndValidKey() {
      return this.recoveryKey && !this.isValidRecoveryKey
    }
  },
  beforeUnmount() {
    this.clearState({ key: 'recoverAccountFromKey' })
  },
  methods: {
    ...recoverAccountMethods,
    async handleRecoverAccount() {
      await this.recoverAccountFromKey({ recoveryKey: this.recoveryKey })
      this.$emit('close')
      await this.getNotes()
    },
    onInput(recoveryKey) {
      this.clearState({ key: 'recoverAccountFromKey' })
      debounce(this.checkPrivateKey, recoveryKey)
    },
    checkPrivateKey(recoveryKey) {
      try {
        this.$provider.web3.eth.accounts.privateKeyToAccount(with0x(recoveryKey))
        this.isValidRecoveryKey = true
      } catch {
        this.isValidRecoveryKey = false
      }
    }
  }
}
</script>
