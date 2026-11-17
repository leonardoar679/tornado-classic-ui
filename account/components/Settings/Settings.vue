<template>
  <div class="wallet-account">
    <h2 class="title">
      {{ $t('wallet') }}
    </h2>
    <div class="account-box">
      <Header />
      <Actions />
    </div>
  </div>
</template>

<script>
import Header from './Header.vue'
import Actions from './Actions.vue'

export default {
  components: {
    Header,
    Actions
  }
}
</script>
