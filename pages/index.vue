<template>
  <div>
    <o-notification
      v-if="netId === 56"
      :active="isActiveNotification.binanceInternal"
      class="main-notification"
      variant="warning"
      icon-pack="icon"
      :aria-close-label="$t('closeNotification')"
      @close="disableNotification({ key: 'binanceInternal' })"
    >
      <i18n-t keypath="binanceInternalTxsNotification" />
    </o-notification>

    <o-notification
      :active="isActiveNotification.third"
      class="main-notification"
      variant="warning"
      icon-pack="icon"
      :aria-close-label="$t('closeNotification')"
      @close="disableNotification({ key: 'third' })"
    >
      <i18n-t keypath="trustBanner.trustLess">
        <template #link>
          <a href="https://tornado.cash/">{{ $t('trustBanner.link') }}</a>
        </template>
      </i18n-t>
    </o-notification>

    <o-notification
      :active="isActiveNotification.first"
      class="main-notification"
      variant="info"
      icon-pack="icon"
      :aria-close-label="$t('closeNotification')"
      @close="disableNotification({ key: 'first' })"
    >
      <i18n-t keypath="indexNotification">
        <template #link>
          <a
            href="https://twitter.com/TornadoCash/status/1204745639759884289"
            target="_blank"
            rel="noopener noreferrer"
            >{{ $t('indexNotificationLinkText') }}</a
          >
        </template>
      </i18n-t>
    </o-notification>

    <o-notification
      v-if="isEthLink"
      :active="isActiveNotification.ethLink"
      class="main-notification"
      variant="warning"
      icon-pack="icon"
      :aria-close-label="$t('closeNotification')"
      @close="disableNotification({ key: 'ethLink' })"
    >
      <i18n-t keypath="ethLinkBanner.notification">
        <template #issue>
          <a
            href="https://discuss.ens.domains/t/eth-link-expiry/13899"
            target="_blank"
            rel="noopener noreferrer"
            >{{ $t('ethLinkBanner.issue') }}</a
          >
        </template>
        <template #alternative>
          <a href="https://tornado.cash/">{{ $t('ethLinkBanner.alternative') }}</a>
        </template>
      </i18n-t>
    </o-notification>

    <div class="columns">
      <div class="column is-half">
        <o-tabs v-model="activeTab" class="is-tornado" :animated="false" @change="tabChanged">
          <Deposit />
          <Withdraw :active-tab="activeTab" @get-key="onGetKey" />
        </o-tabs>
      </div>
      <Statistics />
    </div>
    <Txs />
  </div>
</template>
<script>
import { mapState, mapGetters, mapActions } from 'vuex'

import Txs from '@/components/Txs.vue'
import Deposit from '@/components/Deposit.vue'
import Statistics from '@/components/Statistics.vue'
import Withdraw from '@/components/withdraw/Withdraw.vue'

export default {
  name: 'HomePage',
  components: {
    Txs,
    Deposit,
    Withdraw,
    Statistics
  },
  data() {
    return {
      activeTab: 0,
      isActive: false,
      isEthLink: window.location.host === 'tornadocash.eth.link'
    }
  },
  computed: {
    ...mapState('application', ['selectedInstance']),
    ...mapState('settings', ['isActiveNotification']),
    ...mapGetters('metamask', ['netId'])
  },
  watch: {
    netId() {
      if (this.activeTab === 1) {
        this.$store.dispatch('relayer/pickRandomRelayer', { type: 'tornado' })
      }
    }
  },
  created() {
    this.$store.dispatch('application/setNativeCurrency', { netId: this.netId })
    this.checkIsTrustedUrl()
  },
  methods: {
    ...mapActions('settings', ['disableNotification']),
    checkIsTrustedUrl() {
      const isIpfs = this.$isLoadedFromIPFS()
      if (!isIpfs) {
        this.disableNotification({ key: 'third' })
      }
    },
    onGetKey(fn) {
      this.getKeys = fn
    },
    async tabChanged(tabIndex) {
      if (tabIndex === 1) {
        this.$store.dispatch('relayer/pickRandomRelayer', { type: 'tornado' })

        if (typeof this.getKeys === 'function' && !this.isActive) {
          this.isActive = true
          const result = await this.getKeys()

          if (!result) {
            this.isActive = false
          }
        }
      } else {
        const { currency, amount } = this.selectedInstance
        this.$store.dispatch('application/setAndUpdateStatistic', { currency, amount })
      }
    }
  }
}
</script>
