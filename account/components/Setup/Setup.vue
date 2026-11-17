<template>
  <div class="account-box">
    <Header />
    <Actions />
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
