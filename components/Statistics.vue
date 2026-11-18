<template>
  <div class="column is-half">
    <div class="box-stats">
      <div class="tab-with-corner is-left-top">
        {{ $t('statistics') }}
        <span class="selected"
          ><NumberFormat :value="selectedStatistic.amount" /> {{ selectedStatisticCurrency }}</span
        >
      </div>
      <div class="box">
        <div class="label">
          {{ $t('anonymitySet') }}
          <o-tooltip :label="$t('anonymitySetTooltip')" position="top" multiline>
            <button class="button is-primary has-icon">
              <span class="icon icon-info"></span>
            </button>
          </o-tooltip>
        </div>
        <div class="field">
          <i18n-t keypath="equalUserDeposit">
            <template #only>
              <span v-if="anonimitySet > 1 && anonimitySet < 5">{{ $t('only') }}</span>
            </template>
            <template #n>
              <b v-if="anonimitySet > 1">{{ Number(anonimitySet) }}</b>
            </template>
            <template #equalUserDepositText>
              <span>{{ $t('equalUserDepositPlural', Number(anonimitySet)) }}</span>
            </template>
          </i18n-t>
          <o-skeleton size="large" :active="!anonimitySet" width="200"></o-skeleton>
        </div>
        <template v-if="anonimitySet != 0">
          <div class="label">{{ $t('latestDeposits') }}</div>
          <div v-if="latestDeposits && latestDeposits.length" class="columns is-small is-multiline">
            <div class="column is-half-small">
              <div class="deposits">
                <div v-for="{ index, depositTime } in latestDeposits.slice(0, 5)" :key="index" class="row">
                  <div class="value">{{ Number(index) + 1 }}.</div>
                  <div class="data">{{ depositTime }}</div>
                </div>
              </div>
            </div>
            <div class="column is-half-small">
              <div class="deposits">
                <div v-for="{ index, depositTime } in latestDeposits.slice(5, 10)" :key="index" class="row">
                  <div class="value">{{ Number(index) + 1 }}.</div>
                  <div class="data">{{ depositTime }}</div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="columns is-small is-multiline">
            <div class="column is-half-small">
              <div class="deposits">
                <o-skeleton size="large"></o-skeleton>
                <o-skeleton size="large"></o-skeleton>
                <o-skeleton size="large"></o-skeleton>
                <o-skeleton size="large"></o-skeleton>
                <o-skeleton size="large"></o-skeleton>
              </div>
            </div>
            <div class="column is-half-small">
              <div class="deposits">
                <o-skeleton size="large"></o-skeleton>
                <o-skeleton size="large"></o-skeleton>
                <o-skeleton size="large"></o-skeleton>
                <o-skeleton size="large"></o-skeleton>
                <o-skeleton size="large"></o-skeleton>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
<script>
import { mapState, mapGetters } from 'vuex'
import NumberFormat from '@/components/NumberFormat.vue'

export default {
  components: {
    NumberFormat
  },
  data() {
    return {
      timer: null
    }
  },
  computed: {
    ...mapState('application', ['ip', 'statistic', 'selectedStatistic']),
    ...mapGetters('metamask', ['networkConfig']),
    ...mapGetters('application', ['selectedStatisticCurrency', 'latestDeposits']),
    anonimitySet() {
      const currency = this.selectedStatistic?.currency?.toLowerCase()
      const amount = this.selectedStatistic?.amount
      return this.statistic?.[currency]?.[amount]?.anonymitySet
    }
  },
  mounted() {
    if (!this.timer) {
      this.updateEvents()
    }
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    updateEvents() {
      this.$store.dispatch('application/updateSelectEvents')

      this.timer = setTimeout(() => {
        this.updateEvents()
      }, 60 * 1000)
    }
  }
}
</script>
