<template>
  <div class="modal-card box box-modal">
    <header class="box-modal-header is-spaced">
      <div class="box-modal-title">{{ $t('insufficientBalance') }}</div>
      <button type="button" class="delete" @click="$emit('close')" />
    </header>
    <i18n-t keypath="youDontHaveEnoughTokens" tag="div" class="note">
      <template #currency>{{ selectedCurrency }}</template>
      <template #balance><number-format :value="currentBalance" /></template>
    </i18n-t>
    <o-button variant="primary" expanded @click="close">{{ $t('close') }}</o-button>
  </div>
</template>
<script>
import { mapState, mapGetters } from 'vuex'
import NumberFormat from '@/components/NumberFormat.vue'

export default {
  components: {
    NumberFormat
  },
  emits: ['close'],
  computed: {
    ...mapState('application', ['selectedInstance']),
    ...mapState('token', ['balance']),
    ...mapGetters('token', ['toDecimals']),
    ...mapState('metamask', ['ethBalance']),
    ...mapGetters('metamask', ['nativeCurrency']),
    ...mapGetters('application', ['selectedCurrency']),
    currentBalance() {
      const balance = this.selectedInstance.currency === this.nativeCurrency ? this.ethBalance : this.balance
      return this.toDecimals(balance, null, 6)
    }
  },
  methods: {
    close() {
      this.$parent.close()
    }
  }
}
</script>
