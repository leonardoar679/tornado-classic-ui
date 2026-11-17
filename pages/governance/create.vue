<template>
  <div>
    <o-button class="is-back" icon-left="arrow-left" @click="onBack">
      {{ $t('back') }}
    </o-button>
    <CreateProposal @on-back="onBack" />
  </div>
</template>

<script>
import CreateProposal from '@/components/governance/CreateProposal.vue'

export default {
  components: {
    CreateProposal
  },
  methods: {
    onBack() {
      this.$router.push({ path: '/governance' })
    }
  }
}
</script>
