<template>
  <div class="proposals-list">
    <div class="proposals-list--header">
      <div class="title">{{ $t('proposals') }}</div>
      <o-field class="field-tabs">
        <o-radio v-model="proposalStatusFilter" native-value="" variant="primary">
          <span>{{ $t('all') }}</span>
        </o-radio>

        <o-radio v-model="proposalStatusFilter" native-value="active" variant="primary">
          <span>{{ $t('active') }}</span>
        </o-radio>
      </o-field>
      <o-field class="field-btn">
        <o-tooltip
          :label="
            $t('proposalThresholdError', {
              PROPOSAL_THRESHOLD: $n(proposalThreshold)
            })
          "
          :disabled="hasProposalThreshold"
          multiline
        >
          <o-button
            variant="primary"
            :icon-left="isFetchingBalances ? '' : 'plus'"
            outlined
            :disabled="!hasProposalThreshold"
            :loading="isFetchingBalances"
            @click="onCreateProposal"
          >
            {{ $t('createProposal') }}
          </o-button>
        </o-tooltip>
      </o-field>
    </div>
    <div class="proposals-list--container">
      <ProposalsListSkeleton v-if="isFetchingProposals" />
      <ProposalsListItem v-for="proposal in filteredProposals" v-else :key="proposal.id" :data="proposal" />
    </div>
  </div>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import ProposalsListItem from '@/components/governance/ProposalsListItem.vue'
import ProposalsListSkeleton from '@/components/governance/ProposalsListSkeleton.vue'
import { toBN } from '@/utils/bn.js'

export default {
  components: {
    ProposalsListItem,
    ProposalsListSkeleton
  },
  emits: ['onCreateProposal'],
  data() {
    return {
      proposalStatusFilter: '',
      timer: null
    }
  },
  computed: {
    ...mapState('governance/gov', ['lockedBalance', 'proposals']),
    ...mapGetters('governance/gov', ['isFetchingProposals', 'constants', 'isFetchingBalances']),
    ...mapGetters('token', ['toDecimals']),
    filteredProposals() {
      return this.proposals
        .filter((proposal) => {
          if (this.proposalStatusFilter) {
            return proposal.status === this.proposalStatusFilter || proposal.status === 'awaitingExecution'
          }
          return true
        })
        .reverse()
    },
    hasProposalThreshold() {
      const PROPOSAL_THRESHOLD = toBN(this.constants.PROPOSAL_THRESHOLD)
      return toBN(this.lockedBalance).gte(PROPOSAL_THRESHOLD)
    },
    proposalThreshold() {
      return this.toDecimals(this.constants.PROPOSAL_THRESHOLD, 18)
    }
  },
  methods: {
    onCreateProposal() {
      this.$emit('onCreateProposal')
    }
  }
}
</script>
