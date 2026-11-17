<template>
  <div class="main">
    <Metrics />
    <NuxtPage />
  </div>
</template>

<script>
import { mapActions, mapState, mapGetters } from 'vuex'
import { showError } from '#app'
import Metrics from '@/components/governance/Metrics.vue'

export default {
  components: {
    Metrics
  },
  computed: {
    ...mapState('metamask', ['isInitialized']),
    ...mapGetters('governance/gov', ['isEnabledGovernance'])
  },
  watch: {
    isInitialized: {
      handler() {
        if (this.isEnabledGovernance) {
          this.fetchProposals({})
          this.fetchConstants()
        } else if (this.isInitialized) {
          showError({ statusCode: 204, pageName: 'governance' })
        }
      },
      immediate: true
    },
    isEnabledGovernance(isEnabled) {
      if (!isEnabled) {
        showError({ statusCode: 204, pageName: 'governance' })
      }
    }
  },
  methods: {
    ...mapActions('governance/gov', ['fetchProposals', 'fetchConstants'])
  }
}
</script>
