<template>
  <div class="modal-card box box-modal">
    <header class="box-modal-header is-spaced">
      <div class="box-modal-title">{{ $t('approvalIsRequired') }}</div>
      <button type="button" class="delete" @click="$emit('close')" />
    </header>
    <div class="note">
      {{ $t('inOrderToUse', { currency: selectedCurrency }) }}
    </div>
    <o-field class="withdraw-radio">
      <o-radio v-model="approvalAmount" :native-value="defaultApprovalAmount" class="radio-relayer">
        {{ defaultApprovalAmount }} {{ selectedCurrency }}
      </o-radio>
      <o-radio v-model="approvalAmount" :native-value="unlimitedValue" class="radio-metamask">
        {{ $t('unlimited') }}
        <o-tooltip :label="$t('unlimitedTooltip')" position="top" multiline>
          <button class="button is-primary has-icon">
            <span class="icon icon-info"></span>
          </button>
        </o-tooltip>
      </o-radio>
    </o-field>
    <o-button variant="primary" expanded :disabled="isApproveBtnAlreadyPressed" @click="_approve">
      {{ $t('enable') }}
    </o-button>
  </div>
</template>
<script>
import { mapActions, mapState, mapGetters } from 'vuex'

export default {
  emits: ['close'],
  data() {
    return {
      success: false,
      isApproveBtnAlreadyPressed: false,
      unlimitedValue: 'unlimited'
    }
  },
  computed: {
    ...mapState('application', ['selectedInstance']),
    ...mapState('token', ['allowance']),
    ...mapGetters('txHashKeeper', ['txExplorerUrl']),
    ...mapGetters('token', ['fromDecimals']),
    ...mapGetters('application', ['selectedCurrency']),
    approvalAmount: {
      get() {
        return this.$store.state.token.approvalAmount
      },
      set(approvalAmount) {
        this.$store.commit('token/SET_APPROVAL_AMOUNT', { approvalAmount })
      }
    },
    defaultApprovalAmount() {
      return this.selectedInstance.amount.toString()
    }
  },
  mounted() {
    this.approvalAmount = this.unlimitedValue
  },
  methods: {
    ...mapActions('token', ['approve']),
    async _approve() {
      this.isApproveBtnAlreadyPressed = true
      this.$store.dispatch('loading/enable', { message: this.$t('preparingTransactionData') })
      try {
        await this.approve()
        await this.$store.dispatch('token/fetchTokenAllowance')
        this.$store.dispatch('notice/addNoticeWithInterval', {
          notice: {
            title: 'transactionWasSuccessfullySent',
            type: 'success'
          },
          interval: 3000
        })
        this.success = true
      } catch (e) {
        console.error(e)
        this.$store.dispatch('notice/addNoticeWithInterval', {
          notice: {
            untranslatedTitle: e.message,
            type: 'danger'
          },
          interval: 5000
        })
        this.success = false
      }
      this.isApproveBtnAlreadyPressed = false
      this.$store.dispatch('loading/disable')
      this.$parent.close()
    }
  }
}
</script>
