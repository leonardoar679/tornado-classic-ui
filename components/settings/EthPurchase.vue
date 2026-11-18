<template>
  <o-field :variant="variant" :message="error">
    <template #label>
      {{ $t('ethPurchase', { currency }) }}
      <o-tooltip
        :label="$t('ethPurchaseTooltip', { currency: selectedStatisticCurrency, networkCurrency: currency })"
        class="is-small"
        position="right"
        multiline
      >
        <button class="button is-primary has-icon">
          <span class="icon icon-info"></span>
        </button>
      </o-tooltip>
    </template>
    <div
      class="field has-eth-purchase"
      :class="[variant && `is-${variant}`, { 'is-disabled': disabled }]"
      @click="onEthPurchaseClick"
    >
      <div class="columns is-mobile">
        <div class="column currency-container is-light">
          <div class="currency">{{ currency }}</div>
          <o-input
            ref="input"
            v-model.number="newValue"
            type="number"
            step="0.01"
            :max="max"
            :min="min"
            :disabled="disabled"
            :use-html5-validation="false"
            expanded
            input-class="hide-spinner"
            @input="onInput"
            @focus="$emit('focus', $event)"
            @blur="$emit('blur', $event)"
          />
          <div class="withdraw-data">
            <div class="withdraw-data-item">
              {{ $t('rate') }}
              <span> {{ toDecimals(tokenRate, 18, 6) }} {{ currency }}/{{ selectedStatisticCurrency }} </span>
            </div>
          </div>
        </div>
        <div class="column arrow-container">
          <EthPurchaseArrow />
        </div>
        <div class="column currency-container is-inverted">
          <div class="currency">{{ selectedStatisticCurrency }}</div>
          <div class="input">{{ ethToReceiveInToken }}</div>
        </div>
      </div>
    </div>
  </o-field>
</template>
<script>
import { mapState, mapGetters } from 'vuex'
import { EthPurchaseArrow } from '@/components/icons/index.js'
import { debounce } from '@/utils/index.js'
import { toWei } from 'web3-utils'
import { toBN, pow10 } from '@/utils/bn.js'

export default {
  components: {
    EthPurchaseArrow
  },
  props: {
    disabled: Boolean,
    value: {
      type: Number,
      required: true
    },
    defaultEthToReceive: {
      type: Number,
      required: true
    }
  },
  emits: ['focus', 'blur', 'input', 'isValidEthToReceive'],
  data() {
    return {
      variant: '',
      min: 0,
      error: '',
      newValue: this.value
    }
  },
  computed: {
    ...mapState('application', ['selectedStatistic']),
    ...mapGetters('application', ['maxEthToReceive', 'selectedStatisticCurrency']),
    ...mapGetters('token', ['toDecimals']),
    ...mapGetters('metamask', ['networkConfig', 'currency']),
    ...mapGetters('price', ['tokenRate']),
    max() {
      return Math.max(0, Number(this.toDecimals(this.maxEthToReceive, 18, 5)))
    },
    ethToReceiveInToken() {
      const { currency } = this.selectedStatistic
      const { decimals } = this.networkConfig.tokens[currency]
      const price = this.tokenRate

      const ethToReceive = toBN(toWei(Math.min(Math.max(this.min, this.newValue), this.max).toString()))
      if (!price || price === '0') {
        return this.toDecimals(toBN(0), null, 6)
      }
      return this.toDecimals(ethToReceive.mul(pow10(decimals)).div(toBN(price)), null, 6)
    }
  },
  watch: {
    value(value) {
      this.newValue = value
    },
    newValue(value) {
      debounce(this.validateEthToReceive, value)
    }
  },
  mounted() {
    this.validateEthToReceive(this.newValue)
  },
  methods: {
    onEthPurchaseClick() {
      this.$refs.input.focus()
    },
    onInput(value) {
      const parsedValue = parseFloat(value)
      if (!Number.isNaN(parsedValue)) {
        this.$emit('input', parsedValue)
      }
    },
    validateEthToReceive(value) {
      let variant = ''
      let error = ''

      if (value === '') {
        variant = 'warning'
        error = this.$t('incorrectAmount')
      } else if (value < 0) {
        variant = 'warning'
        error = this.$t('amountIsLow', { value: this.min })
      } else if (value > this.max) {
        variant = 'warning'
        error = this.$t('amountIsHigh', { value: this.max })
      } else if (value === this.defaultEthToReceive) {
        variant = 'primary'
      }

      this.error = error
      this.variant = variant
      this.$emit('isValidEthToReceive', variant !== 'warning')
    }
  }
}
</script>
