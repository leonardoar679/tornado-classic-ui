<template>
  <o-tab-item value="reward" :label="$t('stakingReward.label.tab')">
    <div class="p">
      {{ $t('stakingReward.description') }}
    </div>
    <div class="label-with-value">
      {{ $t('stakingReward.label.input') }}:
      <span><number-format :value="reward" /> TORN</span>
    </div>
    <o-button :disabled="notAvailableClaim" variant="primary" expanded outlined @click="onClaim">
      {{ $t('stakingReward.action') }}
    </o-button>
  </o-tab-item>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import { BigNumber as BN } from 'bignumber.js'

import NumberFormat from '@/components/NumberFormat.vue'

export default {
  components: {
    NumberFormat
  },
  inject: ['close'],
  computed: {
    ...mapGetters('governance/staking', ['reward']),
    notAvailableClaim() {
      return BN(this.reward).isZero()
    }
  },
  methods: {
    ...mapActions('governance/staking', ['claimReward']),
    async onClaim() {
      this.$store.dispatch('loading/enable', { message: this.$t('preparingTransactionData') })
      await this.claimReward()
      this.$store.dispatch('loading/disable')
      this.close()
    }
  }
}
</script>
