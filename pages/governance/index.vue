<template>
  <ProposalsList @on-create-proposal="onCreateProposal" />
</template>

<script>
import ProposalsList from '@/components/governance/ProposalsList.vue'

export default {
  components: {
    ProposalsList
  },
  methods: {
    onCreateProposal() {
      this.$router.push({ path: '/governance/create' })
    }
  }
}
</script>
