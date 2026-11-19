<template>
  <o-tab-item value="delegate" :label="$t('delegate')" tab-class="delegate_tab">
    <div class="p">
      {{ $t('delegateTabDesc') }}
    </div>
    <o-field :label="$t('recipient')">
      <o-input
        v-model="delegatee"
        :placeholder="$t('address')"
        :input-class="!delegatee ? '' : isValidAddress ? 'is-primary' : 'is-warning'"
      ></o-input>
    </o-field>
    <div class="label-with-value">
      {{ $t('currentDelegate') }}:
      <a target="_blank" :href="addressExplorerUrl(currentDelegate)" rel="noopener noreferrer">{{
        delegateMsg
      }}</a>
    </div>
    <div>
      <o-tooltip
        class="is-block"
        :label="`${$t('pleaseLockBalance')}`"
        position="top"
        :disabled="canDelegate"
        multiline
      >
        <o-button
          :disabled="!canDelegate || !isValidAddress"
          variant="primary"
          expanded
          outlined
          @click="onDelegate"
        >
          {{ $t('delegate') }}
        </o-button>
      </o-tooltip>
    </div>
  </o-tab-item>
</template>

<script>
import { isAddress } from 'web3-utils'
import { BigNumber as BN } from 'bignumber.js'
import { mapActions, mapState, mapGetters } from 'vuex'

export default {
  inject: ['close'],
  data() {
    return {
      delegatee: ''
    }
  },
  computed: {
    ...mapState('torn', ['signature', 'balance', 'allowance']),
    ...mapState('governance/gov', ['lockedBalance', 'timestamp', 'currentDelegate']),
    ...mapGetters('token', ['toDecimals']),
    ...mapGetters('txHashKeeper', ['addressExplorerUrl']),
    isValidAddress() {
      return isAddress(this.delegatee)
    },
    canDelegate() {
      return new BN(this.lockedBalance).gt(new BN('0'))
    },
    canUndelegate() {
      return this.currentDelegate !== '0x0000000000000000000000000000000000000000'
    },
    delegateMsg() {
      if (!this.canUndelegate) {
        return this.$t('none')
      } else {
        return this.currentDelegate
      }
    }
  },
  methods: {
    ...mapActions('governance/gov', ['delegate']),
    async onDelegate() {
      this.$store.dispatch('loading/enable', { message: this.$t('preparingTransactionData') })
      await this.delegate({ delegatee: this.delegatee })
      this.$store.dispatch('loading/disable')
      this.close()
    }
  }
}
</script>
