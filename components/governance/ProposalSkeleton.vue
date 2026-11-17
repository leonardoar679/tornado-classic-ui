<template>
  <div class="proposal">
    <div class="columns">
      <div class="column is-7-tablet is-8-desktop">
        <h1 class="title"><o-skeleton height="24" width="200"></o-skeleton></h1>
        <div class="description">
          <o-skeleton width="60%"></o-skeleton>
          <o-skeleton width="60%"></o-skeleton>
          <o-skeleton width="60%"></o-skeleton>
          <o-skeleton width="60%"></o-skeleton>
          <o-skeleton width="60%"></o-skeleton>
        </div>
        <ProposalCommentsSkeleton />
      </div>
      <div class="column is-5-tablet is-4-desktop">
        <div class="proposal-block">
          <div class="title">{{ $t('castYourVote') }}</div>
          <div class="buttons buttons__halfwidth">
            <o-skeleton height="2.857em"></o-skeleton>
            <o-skeleton height="2.857em"></o-skeleton>
          </div>
          <div><o-skeleton height="21"></o-skeleton></div>
        </div>
        <div class="proposal-block">
          <div class="title">{{ $t('currentResults') }}</div>
          <div class="label">
            <o-skeleton width="26" height="21"></o-skeleton>
            <span class="percent"><o-skeleton width="90" height="21"></o-skeleton></span>
          </div>
          <progress class="progress is-primary" :value="0" max="100"></progress>
          <div class="label">
            <o-skeleton width="58" height="21"></o-skeleton>
            <span class="percent"><o-skeleton width="90" height="21"></o-skeleton></span>
          </div>
          <progress class="progress is-danger" :value="0" max="100"></progress>
          <div class="label">
            <o-skeleton width="50" height="21"></o-skeleton>
            <span class="percent"><o-skeleton width="90" height="21"></o-skeleton></span>
          </div>
          <progress class="progress is-danger" :value="0" max="100"></progress>
        </div>
        <div class="proposal-block">
          <div class="title">{{ $t('information') }}</div>
          <div class="columns is-multiline is-small">
            <div class="column is-full-small">
              <strong>{{ $t('proposalAddress') }}</strong>
              <div class="value">
                <o-skeleton height="21"></o-skeleton>
              </div>
            </div>
            <div class="column is-half-small">
              <strong>{{ $t('id') }}</strong>
              <div class="value">
                <o-skeleton width="20" height="21"></o-skeleton>
              </div>
            </div>
            <div class="column is-half-small">
              <strong>{{ $t('status') }}</strong>
              <div class="value">
                <o-skeleton width="70" height="21"></o-skeleton>
              </div>
            </div>
            <div class="column is-half-small">
              <strong>{{ $t('startDate') }}</strong>
              <div class="value">
                <o-skeleton width="70" height="21"></o-skeleton>
              </div>
            </div>
            <div class="column is-half-small">
              <strong>{{ $t('endDate') }}</strong>
              <div class="value">
                <o-skeleton width="70" height="21"></o-skeleton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ProposalCommentsSkeleton from './ProposalCommentsSkeleton.vue'

export default {
  components: {
    ProposalCommentsSkeleton
  }
}
</script>
