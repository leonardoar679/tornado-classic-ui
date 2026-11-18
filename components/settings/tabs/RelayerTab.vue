<template>
  <o-tab-item :label="$t('relayer')" value="relayer" tab-class="withdrawal_settings_relayer_tab">
    <div class="field">
      <o-field :label="$t('relayer')" data-test="withdrawal_settings_relayer_dropdown">
        <o-dropdown
          v-model="selectedRelayer"
          selectable
          expanded
          aria-role="list"
          @change="onChangeRelayer"
        >
          <template #trigger>
            <div class="control" :class="{ 'is-loading': checkingRelayer || isLoadingRelayers }">
              <div class="input">
                <span>{{ dropdownValue }}</span>
              </div>
            </div>
          </template>
          <o-dropdown-item
            v-for="{ name, tornadoServiceFee } in relayers"
            v-show="!isLoadingRelayers"
            :key="name"
            :value="name"
            aria-role="listitem"
          >
            {{ getRelayerName({ name, tornadoServiceFee }) }}
          </o-dropdown-item>
          <o-dropdown-item value="custom" aria-role="listitem">
            {{ $t('custom') }}
          </o-dropdown-item>
        </o-dropdown>
      </o-field>
      <div v-if="isCustomRelayer" class="field has-custom-field">
        <o-input
          ref="customInput"
          v-model="customRelayerUrl"
          type="url"
          data-test="enter_relayer_url_field"
          :placeholder="$t('pasteYourRelayerUrlorEnsRecord')"
          :input-class="hasErrorRelayer.type"
          :use-html5-validation="false"
          @input="onInputCustomRelayer"
        ></o-input>
      </div>
      <div class="withdraw-data is-spaced">
        <div class="withdraw-data-item">
          {{ $t('relayerFee') }}
          <span> {{ relayer.tornadoServiceFee }}% </span>
        </div>
      </div>
      <p v-if="hasErrorRelayer.msg" class="help" :class="hasErrorRelayer.type">
        {{ hasErrorRelayer.msg }}
      </p>
    </div>
    <eth-purchase
      v-if="isEnabledEthPurchase"
      v-model="ethToReceive"
      :default-eth-to-receive="defaultEthToReceive"
      @is-valid-eth-to-receive="ethToReceiveErrorHandler"
    />
    <WithdrawTotal
      :currency="currency"
      withdraw-type="relayer"
      :eth-to-receive="ethToReceiveToWei"
      :service-fee="relayer.tornadoServiceFee"
    />
    <div class="buttons buttons__halfwidth mt-5">
      <o-button
        variant="primary"
        outlined
        data-test="withdrawal_settings_reset_button"
        @mousedown.prevent
        @click="onReset"
      >
        {{ $t('reset') }}
      </o-button>
      <o-button
        variant="primary"
        :disabled="isDisabledSave"
        :loading="checkingRelayer || isLoadingRelayers"
        data-test="withdrawal_settings_save_button"
        @click="onSave"
      >
        {{ $t('save') }}
      </o-button>
    </div>
  </o-tab-item>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'
import EthPurchase from '@/components/settings/EthPurchase.vue'
import WithdrawTotal from '@/components/withdraw/WithdrawTotal.vue'
import { debounce } from '@/utils/index.js'
import { fromWei, toWei } from 'web3-utils'
import { eventBus } from '@/services/eventBus.js'

export default {
  components: {
    EthPurchase,
    WithdrawTotal
  },
  inject: ['currency', 'save'],
  data() {
    return {
      selectedRelayer: 'custom',
      checkingRelayer: false,
      customRelayerUrl: '',
      hasErrorRelayer: { type: '', msg: '' },
      isValidEthToReceive: true,
      isValidRelayer: true,
      ethToReceive: 0.02,
      relayer: {
        name: 'custom',
        url: '',
        address: '',
        tornadoServiceFee: 0.0,
        ethPrices: {
          torn: '1'
        }
      }
    }
  },
  computed: {
    ...mapGetters('token', ['toDecimals']),
    ...mapGetters('metamask', ['networkConfig', 'nativeCurrency']),
    ...mapGetters('metamask', {
      networkCurrency: 'currency'
    }),
    ...mapState('relayer', ['isLoadingRelayers']),
    ...mapState('relayer', {
      defaultRelayer: (state) => state.selectedRelayer,
      relayers: (state) => state.validRelayers
    }),
    ...mapState('application', {
      ethToReceiveFromStore: (state) => Number(fromWei(state.ethToReceive, 'ether')),
      defaultEthToReceive: (state) => Number(fromWei(state.defaultEthToReceive, 'ether'))
    }),
    isEnabledEthPurchase() {
      return this.currency.toLowerCase() !== this.nativeCurrency
    },
    ethToReceiveToWei() {
      return toWei(this.ethToReceive.toString(), 'ether')
    },
    isCustomRelayer() {
      return this.selectedRelayer === 'custom'
    },
    dropdownValue() {
      if (this.isLoadingRelayers) {
        return this.$t('loading')
      }
      if (this.isCustomRelayer) {
        return this.$t('custom')
      }
      return this.selectedRelayer
    },
    isDisabledSave() {
      return !this.isValidRelayer || this.hasErrorRelayer.type === 'is-warning' || !this.isValidEthToReceive
    }
  },
  watch: {
    defaultRelayer: {
      handler(relayer) {
        this.setRelayer(relayer)
      },
      immediate: true
    }
  },
  created() {
    this.setEthToReceive(this.ethToReceiveFromStore)
  },
  mounted() {
    eventBus.on('resetSettings', this.onReset)
  },
  beforeUnmount() {
    eventBus.off('resetSettings', this.onReset)
  },
  methods: {
    ...mapMutations('relayer', ['SET_SELECTED_RELAYER']),
    ...mapMutations('application', ['SAVE_ETH_TO_RECEIVE']),
    getRelayerName({ name, tornadoServiceFee }) {
      return `${name} - ${tornadoServiceFee}%`
    },
    onInputCustomRelayer(url) {
      const trimmedUrl = url.toLowerCase().trim()

      if (!trimmedUrl) {
        this.hasErrorRelayer = { type: '', msg: '' }
        this.isValidRelayer = false
        return
      }
      if (
        window.location.protocol !== 'http:' &&
        trimmedUrl.startsWith('http:') &&
        !trimmedUrl.includes('.onion')
      ) {
        this.hasErrorRelayer.type = 'is-warning'
        this.hasErrorRelayer.msg = this.$t('relayerShouldSupportSSL')
        this.isValidRelayer = false
        return
      }

      debounce(this.checkRelayer, { url, name: 'custom' })
    },
    onChangeRelayer(keyName) {
      if (keyName === 'custom') {
        this.hasErrorRelayer = { type: '', msg: '' }
        this.isValidRelayer = false
        this.customRelayerUrl = ''
        return
      }

      const { realUrl: url, name } = this.relayers.find((el) => el.name === keyName)

      debounce(this.checkRelayer, { url, name })
    },
    async checkRelayer({ url, name }) {
      this.hasErrorRelayer = { type: '', msg: '' }
      this.isValidRelayer = false
      this.checkingRelayer = true

      const { isValid, error, ...relayer } = await this.$store.dispatch('relayer/setupRelayer', {
        name,
        url
      })

      if (isValid) {
        this.hasErrorRelayer.type = 'is-primary'
        this.hasErrorRelayer.msg = this.$t('relayerStatusOk')
        this.relayer = relayer
      } else {
        this.hasErrorRelayer.type = 'is-warning'
        this.hasErrorRelayer.msg = error || this.$t('canNotFetchStatusFromTheRelayer')
      }

      this.checkingRelayer = false
      this.isValidRelayer = isValid
    },
    ethToReceiveErrorHandler(value) {
      this.isValidEthToReceive = value
    },
    setEthToReceive(ethToReceive) {
      if (this.isEnabledEthPurchase) {
        this.ethToReceive = ethToReceive
      }
    },
    setRelayer(relayer) {
      this.relayer = relayer
      this.selectedRelayer = relayer.name
      if (this.selectedRelayer === 'custom') {
        this.customRelayerUrl = relayer.url
      }
    },
    onReset() {
      this.hasErrorRelayer = { type: '', msg: '' }
      this.checkingRelayer = false
      this.isValidRelayer = true

      this.setRelayer(this.defaultRelayer)
      this.setEthToReceive(this.defaultEthToReceive)
    },
    onSave() {
      this.SET_SELECTED_RELAYER(this.relayer)

      if (this.isEnabledEthPurchase) {
        this.SAVE_ETH_TO_RECEIVE({
          ethToReceive: this.ethToReceiveToWei
        })
      }

      this.save()
    }
  }
}
</script>
