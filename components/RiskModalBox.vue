<template>
  <div class="modal-card box box-modal">
    <header class="box-modal-header is-spaced">
      <div class="box-modal-title">{{ $t('information') }}</div>
      <button type="button" class="delete" @click="$emit('close')" />
    </header>
    <i18n-t keypath="freezeRisk" tag="div" class="note">
      <template #currency>{{ selectedCurrency }}</template>
    </i18n-t>
    <o-button variant="primary" expanded @click="close">{{ $t('close') }}</o-button>
  </div>
</template>
<script>
import { mapGetters } from 'vuex'

export default {
  emits: ['close'],
  computed: {
    ...mapGetters('application', ['selectedCurrency'])
  },
  methods: {
    close() {
      this.$emit('close')
      if (this.$parent && typeof this.$parent.close === 'function') {
        this.$parent.close()
      }
    }
  }
}
</script>
