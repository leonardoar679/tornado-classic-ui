<template>
  <o-tab-item :label="$t('unlock')" tab-class="unlock_torn_tab">
    <div class="p">
      {{ $t('unlockTabDesc') }}
    </div>
    <o-field :label="$t('amountToUnlock')">
      <o-field :class="hasErrorAmount ? 'is-warning' : ''">
        <o-input
          v-model="computedAmountToUnlock"
          data-test="input_torn_amount_to_unlock"
          step="0.01"
          :min="minAmount"
          :max="maxAmountToUnlock"
          input-class="hide-spinner"
          :placeholder="$t('amount')"
          :use-html5-validation="false"
          expanded
        ></o-input>
        <div class="control has-button">
          <button
            class="button is-primary is-small is-outlined"
            data-test="button_max_torn_amount_to_unlock"
            @mousedown.prevent
            @click="setMaxAmountToUnlock"
          >
            {{ $t('max') }}
          </button>
        </div>
      </o-field>
    </o-field>
    <div class="label-with-value">
      {{ $t('lockedBalance') }}:
      <span><number-format data-test="info_locked_balance" :value="maxAmountToUnlock" /> TORN</span>
    </div>
    <o-tooltip
      class="is-block"
      :label="unlockMsgErr"
      position="top"
      :disabled="Boolean(hasLockedBalance && canWithdraw)"
      multiline
    >
      <o-button
        :disabled="disableUnlock"
        variant="primary"
        expanded
        outlined
        data-test="button_unlock_torn"
        @click="onUnlock"
      >
        {{ $t('unlock') }}
      </o-button>
    </o-tooltip>
  </o-tab-item>
</template>

<script>
import { fromWei } from 'web3-utils'
import { BigNumber as BN } from 'bignumber.js'
import { mapActions, mapState, mapGetters } from 'vuex'

import { debounce } from '@/utils/index.js'
import NumberFormat from '@/components/NumberFormat.vue'

export default {
  components: {
    NumberFormat
  },
  inject: ['close', 'formatNumber'],
  data() {
    return {
      amountToUnlock: '',
      minAmount: '0',
      hasErrorAmount: false
    }
  },
  computed: {
    ...mapState('torn', ['signature', 'balance', 'allowance']),
    ...mapState('governance/gov', ['lockedBalance', 'timestamp', 'currentDelegate']),
    ...mapGetters('token', ['toDecimals']),
    ...mapGetters('txHashKeeper', ['addressExplorerUrl']),
    unlockMsgErr() {
      if (this.hasLockedBalance && !this.canWithdraw) {
        return this.$t('tokensLockedUntil', {
          date: this.$moment.unix(this.timestamp).format('llll')
        })
      } else {
        return this.$t('pleaseLockTornFirst')
      }
    },
    maxAmountToUnlock() {
      return fromWei(this.lockedBalance, 'ether')
    },
    hasLockedBalance() {
      return !new BN(this.lockedBalance).isZero()
    },
    disableUnlock() {
      return !Number(this.amountToUnlock) || !this.hasLockedBalance || !this.canWithdraw
    },
    canWithdraw() {
      return Date.now() > Number(this.timestamp) * 1000
    },
    computedAmountToUnlock: {
      get() {
        return this.amountToUnlock
      },
      set(value) {
        this.amountToUnlock = this.formatNumber(value)

        debounce(this.validateUnlock, this.amountToUnlock)
      }
    }
  },
  methods: {
    ...mapActions('governance/gov', ['unlock']),
    async onUnlock() {
      this.$store.dispatch('loading/enable', { message: this.$t('preparingTransactionData') })
      await this.unlock({ amount: this.amountToUnlock })
      this.$store.dispatch('loading/disable')
      this.close()
    },
    setMaxAmountToUnlock() {
      this.computedAmountToUnlock = this.maxAmountToUnlock
    },
    validateUnlock(value) {
      this.amountToUnlock = this.validateAmount(value, this.maxAmountToUnlock)
    },
    validateAmount(value, maxAmount) {
      this.hasErrorAmount = false

      let amount = new BN(value)

      if (amount.isZero()) {
        amount = this.minAmount
        this.hasErrorAmount = true
      } else if (amount.lt(this.minAmount)) {
        amount = this.minAmount
        this.hasErrorAmount = true
      } else if (amount.gt(maxAmount)) {
        amount = maxAmount
        this.hasErrorAmount = true
      }

      return amount.toString(10)
    }
  }
}
</script>
