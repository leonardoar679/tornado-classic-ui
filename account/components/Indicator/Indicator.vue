<template>
  <o-tooltip position="bottom" class="is-dark-tooltip" :triggers="[]">
    <template #content>
      <template v-if="isSetupAccount">
        <p>{{ $t('accountConnected') }}</p>
        <a @click="onCopy">{{ shortAddress(accounts.encrypt) }}</a>
        <p><NumberFormat :value="noteAccountBalance" /> {{ currency }}</p>
      </template>
      <template v-else>
        <p>{{ $t('notConnected') }}</p>
        <o-button class="is-primary-link mb-0" @click="redirectToAccount">{{
          $t('connectAccount')
        }}</o-button>
      </template>
    </template>
    <o-button class="is-nav-icon" icon-left="wallet" :class="{ tornado: isSetupAccount }"></o-button>
  </o-tooltip>
</template>

<script>
import { indicatorComputed, indicatorMethods } from '../../injectors/index.js'
import { NumberFormat } from '../../dependencies/index.js'
import { sliceAddress } from '@/utils/index.js'

export default {
  components: {
    NumberFormat
  },
  props: {
    active: {
      type: Boolean
    }
  },
  computed: {
    ...indicatorComputed
  },
  methods: {
    ...indicatorMethods,
    shortAddress(address) {
      return sliceAddress(address)
    },
    async onCopy() {
      await this.$copyText(this.accounts.encrypt)
      this.$store.dispatch('notice/addNoticeWithInterval', {
        notice: {
          title: 'copied',
          type: 'info'
        },
        interval: 2000
      })
    }
  }
}
</script>
