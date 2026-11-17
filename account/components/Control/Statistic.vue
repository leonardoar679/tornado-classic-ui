<template>
  <div class="action-item">
    <o-icon icon="account-balance" size="large" />
    <i18n-t keypath="account.control.balance" tag="div" class="desc">
      <template v-if="hasBalances" #value>
        <p class="balance">
          <span v-for="(item, index) in getBalance" :key="item.currency" class="balance-item"
            ><NumberFormat :value="item.amount" /> {{ getSymbol(item.currency)
            }}{{ index !== getBalance.length - 1 ? ',' : '' }}</span
          >
        </p>
      </template>
    </i18n-t>
  </div>
</template>

<script>
import { statisticComputed } from '../../injectors/index.js'
import { NumberFormat } from '../../dependencies/index.js'

export default {
  components: {
    NumberFormat
  },
  computed: {
    ...statisticComputed,
    getBalance() {
      const balances = this.statistic.reduce((acc, { currency, amount }) => {
        if (acc[currency]) {
          acc[currency] += Number(amount)
        } else {
          acc[currency] = Number(amount)
        }
        return acc
      }, {})
      return Object.keys(balances).map((k) => {
        return {
          currency: k,
          amount: balances[k]
        }
      })
    },
    hasBalances() {
      return this.getBalance && this.getBalance.length
    }
  }
}
</script>
