<template>
  <div class="proposal">
    <div class="columns">
      <div class="column is-7-tablet is-8-desktop">
        <h1 class="title">{{ data.title }}</h1>
        <div class="description">
          <p class="proposal--description">{{ data.description }}</p>
        </div>
        <ProposalComments
          v-if="isEnabledGovernance && quorumPercent"
          :proposal="data"
          :is-initialized="isInitialized"
          class="proposal--comments"
        />
      </div>
      <div class="column is-5-tablet is-4-desktop">
        <div class="proposal--blocks">
          <div v-if="data.status === 'active'" class="proposal-block">
            <div class="title">{{ $t('castYourVote') }}</div>
            <o-tooltip
              class="fit-content"
              :label="tooltipMessage"
              position="top"
              :active="readyForAction"
              multiline
            >
              <div class="buttons buttons__halfwidth">
                <o-button
                  :disabled="readyForAction"
                  variant="primary"
                  :icon-left="isFetchingBalances || isCastingVote ? '' : 'check'"
                  outlined
                  :loading="isFetchingBalances || isCastingVote"
                  @click="onCastVote(true)"
                  >{{ $t('for') }}</o-button
                >
                <o-button
                  :disabled="readyForAction"
                  variant="danger"
                  :icon-left="isFetchingBalances || isCastingVote ? '' : 'close'"
                  outlined
                  :loading="isFetchingBalances || isCastingVote"
                  @click="onCastVote(false)"
                  >{{ $t('against') }}</o-button
                >
              </div>
            </o-tooltip>
            <i18n-t keypath="yourCurrentVote">
              <template #vote>
                <span
                  :class="{
                    'has-text-primary': voterReceipts[data.id].support,
                    'has-text-danger': !voterReceipts[data.id].support
                  }"
                  >{{ $n(fromWeiToTorn(voterReceipts[data.id].balance)) }} TORN</span
                >
              </template>
            </i18n-t>
          </div>
          <div v-else-if="data.status === 'awaitingExecution'" class="proposal-block">
            <div class="title">{{ $t('executeProposal') }}</div>
            <o-tooltip
              class="fit-content"
              :label="$t('connectYourWalletFirst')"
              position="top"
              :active="!ethAccount"
              multiline
            >
              <o-button
                variant="primary"
                icon-left="check"
                outlined
                :disabled="!ethAccount"
                expanded
                @click="onExecute"
                >{{ $t('execute') }}</o-button
              >
            </o-tooltip>
          </div>

          <div class="proposal-block">
            <div class="title">{{ $t('currentResults') }}</div>
            <div class="label">
              {{ $t('for') }}
              <span class="percent"
                ><number-format :value="data.results.for" /> TORN / {{ calculatePercent('for') }}%</span
              >
            </div>
            <progress class="progress is-primary" :value="calculatePercent('for')" max="100"></progress>
            <div class="label">
              {{ $t('against') }}
              <span class="percent"
                ><number-format :value="data.results.against" class="value" /> TORN /
                {{ calculatePercent('against') }}%</span
              >
            </div>
            <progress class="progress is-danger" :value="calculatePercent('against')" max="100"></progress>
            <div class="label">
              {{ $t('quorum') }}
              <o-tooltip
                :label="
                  $t('quorumTooltip', {
                    days: $tc('dayPlural', votingPeriod),
                    votes: $n(quorumVotes, 'compact')
                  })
                "
                size="medium"
                position="top"
                multiline
              >
                <button class="button is-primary has-icon">
                  <span class="icon icon-info"></span>
                </button>
              </o-tooltip>
              <span class="percent"
                ><number-format :value="isQuorumCompleted ? quorumVotes : quorumResult" class="value" /> TORN
                / {{ quorumPercent }}%</span
              >
            </div>
            <progress class="progress is-violet" :value="quorumPercent" max="100"></progress>
          </div>
          <div class="proposal-block">
            <div class="title">{{ $t('information') }}</div>
            <div class="columns is-multiline is-small" :class="{ 'has-countdown': countdown }">
              <div class="column is-full-small">
                <strong>{{ $t('proposalAddress') }}</strong>
                <div class="value">
                  <a :href="contractUrl" class="address" target="_blank" rel="noopener noreferrer">
                    {{ data.target }}
                  </a>
                </div>
              </div>
              <div class="column is-half-small">
                <strong>{{ $t('id') }}</strong>
                <div class="value">{{ data.id }}</div>
              </div>
              <div class="column is-half-small">
                <strong>{{ $t('status') }}</strong>
                <div class="value">
                  <o-tag :type="getStatusType(data.status)">{{ $t(data.status) }}</o-tag>
                </div>
              </div>
              <div class="column is-half-small">
                <strong>{{ $t('startDate') }}</strong>
                <div class="value">{{ $moment.unix(data.startTime).format('llll') }}</div>
              </div>
              <div class="column is-half-small">
                <strong>{{ $t('endDate') }}</strong>
                <div class="value">{{ $moment.unix(data.endTime).format('llll') }}</div>
              </div>
              <div v-if="countdown" class="column is-full-small">
                <strong>{{ $t(timerLabel) }}</strong>
                <div class="value">
                  {{ countdown }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions, mapGetters } from 'vuex'
import quorum from './mixins/quorum.js'
import ProposalComments from './ProposalComments.vue'
import NumberFormat from '@/components/NumberFormat.vue'
import ProposalCommentFormModal from '@/components/ProposalCommentFormModal.vue'
import { fromWei, toWei } from 'web3-utils'
import { toBN } from '@/utils/bn.js'

export default {
  components: {
    ProposalComments,
    NumberFormat
  },
  mixins: [quorum],
  props: {
    data: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      timeId: null,
      countdown: false,
      timerLabel: ''
    }
  },
  computed: {
    ...mapState('governance/gov', ['proposals', 'voterReceipts', 'isCastingVote']),
    ...mapState('metamask', ['ethAccount', 'isInitialized']),
    ...mapGetters('txHashKeeper', ['addressExplorerUrl']),
    ...mapGetters('metamask', ['networkConfig']),
    ...mapGetters('governance/gov', [
      'votingPower',
      'constants',
      'votingPeriod',
      'isFetchingBalances',
      'isEnabledGovernance'
    ]),
    readyForAction() {
      return (
        this.data.status !== 'active' ||
        !this.ethAccount ||
        !this.votingPower ||
        toBN(this.votingPower).isZero()
      )
    },
    tooltipMessage() {
      if (!this.ethAccount) {
        return this.$t('connectYourWalletFirst')
      }

      if (this.data.status !== 'active') {
        return this.$t('proposalIsActive')
      }

      if (!this.votingPower || toBN(this.votingPower).isZero()) {
        return this.$t('lockedBalanceError')
      }

      return ''
    },
    contractUrl() {
      return this.addressExplorerUrl(this.data.target) + '#code'
    }
  },
  watch: {
    isInitialized: {
      handler(isInitialized) {
        if (isInitialized && this.isEnabledGovernance) {
          this.fetchReceipt({ id: this.data.id })
        }
      },
      immediate: true
    },
    data: {
      handler(data) {
        const statusesWithNoTimer = ['failed', 'defeated', 'expired', 'executed']
        if (statusesWithNoTimer.includes(data.status)) {
          return
        }

        const { MINING_BLOCK_TIME } = this.networkConfig.constants
        const { EXECUTION_DELAY, EXECUTION_EXPIRATION } = this.constants
        const now = Math.floor(Date.now() / 1000)
        const startTime = data.startTime + MINING_BLOCK_TIME
        const endTime = data.endTime + MINING_BLOCK_TIME
        const executionStartTime = endTime + EXECUTION_DELAY
        const expirationEndTime = executionStartTime + EXECUTION_EXPIRATION

        if (now <= startTime) {
          this.timerLabel = 'timerRemainingForPending'
          this.startTimer(startTime)
        } else if (now <= endTime) {
          this.timerLabel = 'timerRemainingForVoting'
          this.startTimer(endTime)
        } else if (now <= executionStartTime) {
          this.timerLabel = 'timerRemainingForAwaitingExecution'
          this.startTimer(executionStartTime)
        } else if (now <= expirationEndTime) {
          this.timerLabel = 'timerRemainingForExecution'
          this.startTimer(expirationEndTime)
        }
      },
      immediate: true
    }
  },
  beforeUnmount() {
    clearTimeout(this.timeId)
  },
  methods: {
    ...mapActions('governance/gov', ['castVote', 'executeProposal', 'fetchReceipt', 'fetchProposals']),
    getStatusType(status) {
      let statusType = ''
      switch (status) {
        case 'awaitingExecution':
        case 'active':
          statusType = 'is-primary'
          break
        case 'expired':
          statusType = 'is-gray'
          break
        case 'failed':
        case 'defeated':
          statusType = 'is-danger'
          break
        case 'pending':
        case 'timeLocked':
          statusType = 'is-warning'
          break
        case 'executed':
          statusType = 'is-violet'
          break
      }
      return statusType
    },
    calculatePercent(result) {
      return this.results.isZero()
        ? 0
        : toBN(toWei(this.data.results[result], 'ether')).mul(toBN(100)).divRound(this.results).toNumber()
    },
    onCastVote(support) {
      const { id } = this.data

      this.$buefy.modal.open({
        parent: this,
        component: ProposalCommentFormModal,
        hasModalCard: true,
        width: 440,
        customClass: 'is-pinned',
        props: {
          support,
          proposal: this.data
        },
        events: {
          castVote: ({ contact, message }) => {
            this.castVote({ id, support, contact, message })
          }
        }
      })
    },
    onExecute() {
      this.executeProposal({ id: this.data.id })
    },
    fromWeiToTorn(v) {
      return fromWei(v, 'ether')
    },
    accurateHumanize(duration, accuracy = 4) {
      const units = ['y', 'M', 'd', 'h', 'm', 's']
      let beginFilter = false
      let componentCount = 0

      return (
        units
          .map((unit) => ({ value: duration.get(unit), unit }))
          .filter(({ value }) => {
            if (beginFilter === false) {
              if (value === 0) {
                return false
              }
              beginFilter = true
            }
            componentCount++
            return value !== 0 && componentCount <= accuracy
          })
          // dayjs duration.humanize() reproduces moment's per-locale
          // relativeTime(value, withoutSuffix, key, isFuture) output
          .map(({ value, unit }) => this.$moment.duration(value, unit).humanize())
          .join(' ')
      )
    },
    startTimer(time) {
      this.timeId = setTimeout(() => {
        const diffTime = this.$moment.unix(time).diff(this.$moment())

        if (diffTime > 0) {
          this.countdown = this.accurateHumanize(this.$moment.duration(diffTime, 'millisecond'))

          this.startTimer(time)
        } else {
          this.countdown = false

          this.fetchProposals({})
        }
      }, 1000)
    }
  }
}
</script>

<style lang="scss" scoped>
.proposal {
  &--description {
    word-break: break-word;
  }

  &--comments {
    margin-top: 2rem;
  }

  &--blocks {
    position: sticky;
    top: 1rem;
  }
}
</style>
