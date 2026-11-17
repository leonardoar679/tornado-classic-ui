import { mapGetters } from 'vuex'
import { fromWei, toWei } from 'web3-utils'
import { toBN } from '@/utils/bn.js'

export default {
  computed: {
    ...mapGetters('governance/gov', ['quorumVotes']),
    results() {
      const resultFor = toBN(toWei(this.data.results.for, 'ether'))
      const resultAgainst = toBN(toWei(this.data.results.against, 'ether'))
      return resultFor.add(resultAgainst)
    },
    quorumResult() {
      return fromWei(this.results, 'ether')
    },
    quorumVotesToWei() {
      return toBN(toWei(this.quorumVotes, 'ether'))
    },
    isQuorumCompleted() {
      return this.results.gte(this.quorumVotesToWei)
    },
    quorumPercent() {
      return this.isQuorumCompleted
        ? 100
        : toBN('100').mul(this.results).div(this.quorumVotesToWei).toNumber()
    }
  }
}
