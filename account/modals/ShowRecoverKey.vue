<template>
  <div class="modal-card box box-modal">
    <header class="box-modal-header is-spaced">
      <div class="box-modal-title">{{ $t('account.modals.showRecoveryKey.title') }}</div>
      <button type="button" class="delete" @click="$emit('close')" />
    </header>
    <div class="note">{{ $t('account.modals.showRecoveryKey.description') }}</div>
    <div class="field">
      <div class="label-with-buttons">
        <div class="label"></div>
        <o-button v-clipboard:copy="recoveryKey" v-clipboard:success="onCopy" class="is-primary-text">
          {{ $t('copy') }}
        </o-button>
      </div>
      <div class="notice is-recovery-key">
        <div class="notice__p">{{ recoveryKey }}</div>
      </div>
    </div>
    <o-button variant="primary" outlined @click="onClose">
      {{ $t('account.modals.showRecoveryKey.close') }}
    </o-button>
  </div>
</template>

<script>
import { showRecoveryKeyMethods } from '../injectors/index.js'

export default {
  props: {
    recoveryKey: {
      type: String,
      required: true
    }
  },
  emits: ['close'],
  data() {
    return {}
  },
  computed: {},
  methods: {
    ...showRecoveryKeyMethods,
    onClose() {
      this.$emit('close')
    },
    onCopy() {
      this.addNoticeWithInterval({
        notice: {
          title: 'copied',
          type: 'info'
        },
        interval: 2000
      })
    }
  }
}
</script>
