<template>
  <div class="modal-card box box-modal">
    <header class="box-modal-header is-spaced">
      <div class="box-modal-title">{{ $t('withdrawalConfirmation') }}</div>
      <button type="button" class="delete" @click="$emit('close')" />
    </header>
    <div class="note" data-test="withdrawal_confirmation_text">
      {{ $t('yourZkSnarkProofHasBeenSuccesfullyGenerated') }}
    </div>
    <o-button variant="primary" expanded data-test="withdrawal_confirm_button" @click="_sendWithdraw">
      {{ $t('confirm') }}
    </o-button>
  </div>
</template>
<script>
import { eventBus } from '@/services/eventBus.js'

export default {
  props: {
    note: {
      type: String,
      required: true
    },
    withdrawType: {
      type: String,
      required: true
    }
  },
  emits: ['close'],
  computed: {
    withdrawalMethod() {
      if (this.withdrawType === 'wallet') {
        return 'application/withdraw'
      }

      return 'relayer/relayTornadoWithdraw'
    }
  },
  methods: {
    async _sendWithdraw() {
      this.$store.dispatch('loading/enable', { message: this.$t('preparingTransactionData') })

      try {
        await this.$store.dispatch(this.withdrawalMethod, {
          note: this.note
        })
        eventBus.emit('resetWithdraw')
      } catch (e) {
        console.error(e)
        this.$store.dispatch('notice/addNoticeWithInterval', {
          notice: {
            untranslatedTitle: e.message,
            type: 'danger'
          },
          interval: 3000
        })
      } finally {
        this.$store.dispatch('loading/disable')
        this.$parent.close()
      }
    }
  }
}
</script>
