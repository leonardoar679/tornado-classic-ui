<template>
  <o-tab-item :label="$t('deposit')" tab-class="button_tab_deposit">
    <fieldset>
      <o-field :label="$t('token')" data-test="token_list_dropdown">
        <o-dropdown v-model="selectedToken" selectable expanded aria-role="list">
          <template #trigger>
            <div class="control">
              <div class="input">
                <span>{{ selectedCurrency }}</span>
              </div>
            </div>
          </template>
          <o-dropdown-item
            v-for="(token, key) in tokens"
            :key="key"
            aria-role="listitem"
            :value="key"
            :data-test="token.dataTest"
          >
            {{ token.symbol }}
          </o-dropdown-item>
        </o-dropdown>
      </o-field>
      <o-field>
        <template #label>
          {{ $t('amount') }}
          <o-tooltip :label="$t('amountTooltip')" class="is-small" position="right" multiline>
            <button class="button is-primary has-icon">
              <span class="icon icon-info" data-test="choose_amount_info"></span>
            </button>
          </o-tooltip>
        </template>
        <o-steps v-model="currentStep" size="small" :has-navigation="false" @change="changeAmount">
          <template v-for="({ amount, address }, key) in amounts" :key="key">
            <o-step-item
              :value="key"
              :label="shortenAmount(amount)"
              :clickable="address !== ''"
              :step-class="`token-${selectedToken}-${amount}`"
            ></o-step-item>
          </template>
        </o-steps>
      </o-field>
    </fieldset>
    <connect-button v-if="!isLoggedIn" expanded data-test="button_connect" />
    <o-button
      v-else
      variant="primary"
      expanded
      :loading="isDepositBtnClicked"
      data-test="button_deposit"
      @click="onPreDeposit"
    >
      {{ $t('depositButton') }}
    </o-button>
  </o-tab-item>
</template>
<script>
import { mapGetters } from 'vuex'

import ApproveModalBox from '@/components/ApproveModalBox.vue'
import BalanceModalBox from '@/components/BalanceModalBox.vue'
import DepositModalBox from '@/components/DepositModalBox.vue'
import RiskModalBox from '@/components/RiskModalBox.vue'

import { ConnectButton } from '@/components/web3Connect/index.js'

export default {
  components: {
    ConnectButton
  },
  data() {
    return {
      currentStep: 0,
      amounts: [],
      isDepositBtnClicked: false,
      isDepositModalOpened: false
    }
  },
  computed: {
    ...mapGetters('token', ['isSufficientAllowance', 'isSufficientBalance']),
    ...mapGetters('metamask', ['networkConfig', 'netId', 'isLoggedIn', 'nativeCurrency']),
    ...mapGetters('application', ['selectedCurrency']),
    selectedAmount: {
      get() {
        return this.$store.state.application.selectedInstance.amount
      },
      set(selectedAmount) {
        const currency = this.selectedToken
        const amount = selectedAmount
        this.$store.commit('application/SET_SELECTED_INSTANCE', { currency, amount })
        this.$store.dispatch('application/setAndUpdateStatistic', { currency, amount })
      }
    },
    tokens() {
      return Object.keys(this.networkConfig.tokens).reduce((acc, curr) => {
        const item = this.networkConfig.tokens[curr]
        acc[curr] = {
          ...item,
          dataTest: `token_list_${item.symbol.toLowerCase()}`
        }
        return acc
      }, {})
    },
    selectedToken: {
      get() {
        return this.$store.state.application.selectedInstance.currency
      },
      set(selectedToken) {
        this.currentStep = 0
        const currency = selectedToken
        const amount = this.sortAmounts(currency)[0].amount
        this.$store.commit('application/SET_SELECTED_INSTANCE', { currency, amount })
        this.$store.dispatch('application/setAndUpdateStatistic', { currency, amount })
      }
    }
  },
  watch: {
    netId: {
      handler() {
        this.sortAmounts()
      }
    }
  },
  beforeMount() {
    this.sortAmounts()
  },
  methods: {
    shortenAmount(n) {
      return `${this.$n(Number(n), 'compact')} ${this.tokens[this.selectedToken].symbol}`
    },
    syncStepFromSelectedAmount() {
      const selected = Number(this.selectedAmount)
      const idx = this.amounts.findIndex((entry) => Number(entry.amount) === selected)
      this.currentStep = idx >= 0 ? idx : 0
    },
    changeAmount(i) {
      const index = Number(i)
      if (!Number.isFinite(index) || !this.amounts[index]) {
        return
      }
      this.currentStep = index
      this.selectedAmount = Number(this.amounts[index].amount)
    },
    sortAmounts(currency = this.selectedToken) {
      this.amounts = Object.entries(this.tokens[currency].instanceAddress)
        .sort((a, b) => {
          return a[0] - b[0]
        })
        .map(([amount, address]) => {
          return { amount: Number(amount), address }
        })
      this.syncStepFromSelectedAmount()
      return this.amounts
    },
    openDepositModal() {
      // Keep prepareDeposit + backup download in the same synchronous call stack as
      // the Deposit click so the browser still has user-activation for saveAs().
      // Do not await dispatch — Vuex wraps the return in a Promise and awaiting it
      // can drop the transient user gesture Chromium requires for downloads.
      this.$store.dispatch('application/prepareDeposit', {
        prefix: `tornado-${this.selectedToken}-${this.selectedAmount}-${this.netId}`
      })
      if (!this.$store.state.application.note || !this.$store.state.application.prefix) {
        this.isDepositModalOpened = false
        return false
      }
      const depositModal = this.$buefy.modal.open({
        parent: this,
        component: DepositModalBox,
        hasModalCard: true,
        width: 440,
        customClass: 'is-pinned',
        canCancel: false
      })
      depositModal.$on('close', () => {
        this.isDepositModalOpened = false
      })
      return true
    },
    async onDeposit() {
      const onApproval = () => {
        if (this.isSufficientAllowance) {
          if (!this.isDepositModalOpened) {
            this.isDepositModalOpened = true
            this.openDepositModal()
          }
        }
      }
      this.isDepositBtnClicked = true

      // Prefer opening the note modal (and triggering backup download) before any
      // await, using cached balances. Awaiting RPC first drops user-activation and
      // Chromium then blocks the automatic file download.
      const isNative = this.selectedToken === this.nativeCurrency
      const canOpenFromCache = (this.isSufficientAllowance || isNative) && this.isSufficientBalance
      if (canOpenFromCache && !this.isDepositModalOpened) {
        this.isDepositModalOpened = true
        this.openDepositModal()
      }

      await Promise.all([
        this.$store.dispatch('token/fetchTokenAllowance', {}, { root: true }),
        this.$store.dispatch('token/fetchTokenBalance', {}, { root: true }),
        this.$store.dispatch('metamask/updateAccountBalance')
      ])

      if (!this.isSufficientBalance) {
        if (!this.isDepositModalOpened) {
          this.$buefy.modal.open({
            parent: this,
            component: BalanceModalBox,
            hasModalCard: true,
            width: 440
          })
        }
      } else if (this.isSufficientAllowance || isNative) {
        if (!this.isDepositModalOpened) {
          this.isDepositModalOpened = true
          this.openDepositModal()
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const parent = this
        const approveModal = this.$buefy.modal.open({
          parent,
          component: ApproveModalBox,
          hasModalCard: true,
          width: 440
        })
        approveModal.$on('close', onApproval)
      }
      this.isDepositBtnClicked = false
    },
    onPreDeposit() {
      if (this.selectedToken.toUpperCase() === 'USDT' || this.selectedToken.toUpperCase() === 'USDC') {
        // canCancel:false — Escape must not count as acknowledging the risk.
        const riskModal = this.$buefy.modal.open({
          parent: this,
          component: RiskModalBox,
          hasModalCard: true,
          width: 440,
          canCancel: false
        })
        riskModal.$on('close', this.onDeposit)
      } else {
        this.onDeposit()
      }
    }
  }
}
</script>
