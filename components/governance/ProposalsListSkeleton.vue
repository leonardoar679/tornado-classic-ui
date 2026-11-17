<template>
  <div>
    <div v-for="index in size" :key="index" class="proposals-box">
      <div class="columns is-gapless">
        <div class="column is-8-tablet is-9-desktop">
          <div class="proposals-box--title">
            <o-skeleton height="28" width="210"></o-skeleton>
          </div>
          <div class="proposals-box--info">
            <div class="proposals-box--id"><o-skeleton height="28" width="30"></o-skeleton></div>
            <o-skeleton height="28" width="70"></o-skeleton>
            <div class="date">
              <o-skeleton height="21" width="130"></o-skeleton>
            </div>
            <div class="date">
              <o-skeleton height="21" width="130"></o-skeleton>
            </div>
            <div class="date">
              <o-skeleton height="21" width="130"></o-skeleton>
            </div>
          </div>
        </div>
        <div class="column is-4-tablet is-3-desktop">
          <div class="results">
            <div class="result">
              <span class="has-text-primary"><o-icon icon="check" /> {{ $t('for') }}</span>
              <o-skeleton height="15" width="50"></o-skeleton>
            </div>
            <div class="result is-danger">
              <span class="has-text-danger"><o-icon icon="close" /> {{ $t('against') }}</span>
              <o-skeleton height="15" width="50"></o-skeleton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    size: {
      type: Number,
      default: 5
    }
  }
}
</script>
