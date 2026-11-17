<template>
  <div class="proposals-box is-link" @click="onClick">
    <div class="columns is-gapless">
      <div class="column is-8-tablet is-9-desktop">
        <div class="proposals-box--title">
          {{ data.title }}
        </div>
        <div class="proposals-box--info">
          <div class="proposals-box--id">
            <span class="tag">{{ data.id }}</span>
          </div>
          <o-tag :variant="getStatusVariant(data.status)">
            {{ $t(data.status) }}
          </o-tag>
          <div class="date">
            <span>{{ $t('startDate') }}:</span> {{ $moment.unix(data.startTime).format('l') }}
          </div>
          <div class="date">
            <span>{{ $t('endDate') }}:</span> {{ $moment.unix(data.endTime).format('l') }}
          </div>
          <div class="date">
            <span>{{ $t('quorum') }}:</span> {{ quorumPercent }}%
          </div>
        </div>
      </div>
      <div class="column is-4-tablet is-3-desktop">
        <div class="results">
          <div class="result">
            <span class="has-text-primary"><o-icon icon="check" /> {{ $t('for') }}</span>
            <span><number-format :value="data.results.for" /> TORN</span>
          </div>
          <div class="result is-danger">
            <span class="has-text-danger"><o-icon icon="close" /> {{ $t('against') }}</span>
            <span><number-format :value="data.results.against" /> TORN</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import quorum from './mixins/quorum.js'
import NumberFormat from '@/components/NumberFormat.vue'

export default {
  components: {
    NumberFormat
  },
  mixins: [quorum],
  props: {
    data: {
      type: Object,
      required: true
    }
  },
  methods: {
    getStatusVariant(status) {
      let statusVariant = ''
      switch (status) {
        case 'awaitingExecution':
        case 'active':
          statusVariant = 'primary'
          break
        case 'expired':
          statusVariant = 'gray'
          break
        case 'failed':
        case 'defeated':
          statusVariant = 'danger'
          break
        case 'pending':
        case 'timeLocked':
          statusVariant = 'warning'
          break
        case 'executed':
          statusVariant = 'violet'
          break
      }
      return statusVariant
    },
    onClick() {
      if (this.data.status !== 'loading') {
        this.$router.push({ path: `/governance/${this.data.id}` })
      }
    }
  }
}
</script>
