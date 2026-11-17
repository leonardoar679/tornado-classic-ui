<template>
  <nav class="navbar header" role="navigation" aria-label="main navigation">
    <div class="container navbar-wrapper">
      <div class="navbar-brand">
        <RouterLink to="/" class="navbar-item" data-test="tornado_main_page">
          <Logo />
        </RouterLink>
      </div>
      <div class="navbar-start">
        <RouterLink
          v-if="isEnabledGovernance"
          to="/governance"
          data-test="voting_link"
          :class="{ 'is-active': $route.path.includes('governance') }"
          class="navbar-item has-tag"
        >
          {{ $t('governance') }} <span v-if="hasActiveProposals" class="navbar-item--tag"></span>
        </RouterLink>
        <RouterLink to="/compliance" class="navbar-item" data-test="compliance_link">
          {{ $t('compliance') }}
        </RouterLink>
        <a
          href="https://docs.tornado.cash"
          target="_blank"
          data-test="docs_link"
          rel="noopener noreferrer"
          class="navbar-item has-tag"
        >
          <o-icon icon="open-book" size="small" class="mr-1" />
          <span>{{ $t('docs') }}</span>
        </a>
      </div>
      <div class="navbar-end">
        <div class="navbar-item">
          <div class="buttons">
            <network-navbar-icon />
            <metamask-navbar-icon data-test="metamask_connection_state" />
            <indicator data-test="note_account_connection_state" />
            <o-button
              icon-left="settings"
              variant="primary"
              outlined
              data-test="button_settings"
              @mousedown.prevent
              @click="onAccount"
            >
              {{ $t('settings') }}
            </o-button>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import Logo from '@/components/Logo.vue'
import { Indicator } from '@/account/index.js'
import MetamaskNavbarIcon from '@/components/MetamaskNavbarIcon.vue'
import NetworkNavbarIcon from '@/components/NetworkNavbarIcon.vue'

export default {
  components: {
    Logo,
    Indicator,
    NetworkNavbarIcon,
    MetamaskNavbarIcon
  },
  data() {
    return {
      isActive: false
    }
  },
  computed: {
    ...mapGetters('metamask', ['netId', 'isLoggedIn']),
    ...mapGetters('governance/gov', ['isEnabledGovernance']),
    ...mapState('governance/gov', ['hasActiveProposals'])
  },
  methods: {
    onAccount() {
      this.$router.push('/account')
    }
  }
}
</script>
