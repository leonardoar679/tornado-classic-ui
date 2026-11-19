<template>
  <div class="modal-card box box-modal">
    <header class="box-modal-header is-spaced">
      <div class="box-modal-title">{{ $t('information') }}</div>
      <button type="button" class="delete" @click="dismiss" />
    </header>
    <i18n-t keypath="freezeRisk" tag="div" class="note">
      <template #currency>{{ selectedCurrency }}</template>
    </i18n-t>
    <o-button variant="primary" expanded @click="confirm">{{ $t('close') }}</o-button>
  </div>
</template>
<script>
import { mapGetters } from 'vuex'

export default {
  emits: ['close', 'confirm'],
  computed: {
    ...mapGetters('application', ['selectedCurrency'])
  },
  methods: {
    dismiss() {
      // X / cancel: close only — must not continue into deposit.
      if (this.$parent && typeof this.$parent.close === 'function') {
        this.$parent.close()
      } else {
        this.$emit('close')
      }
    },
    confirm() {
      // Primary action acknowledges the risk warning, then closes.
      this.$emit('confirm')
      if (this.$parent && typeof this.$parent.close === 'function') {
        this.$parent.close()
      } else {
        this.$emit('close')
      }
    }
  }
}
</script>
