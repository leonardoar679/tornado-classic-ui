<template>
  <o-select v-model="selectedNetwork" expanded @change="updateNetwork()">
    <option v-for="network in networks" :key="network.networkName" :value="network.networkName.toLowerCase()">
      {{ network.networkName }}
    </option>
  </o-select>
</template>

<script>
import networkConfig from '@/networkConfig.js'

export default {
  props: {
    value: {
      type: String,
      required: true
    }
  },
  emits: ['input'],
  data() {
    return {
      selectedNetwork: this.value,
      networkConfig
    }
  },
  computed: {
    networks() {
      const networkConfig = Object.assign({}, this.networkConfig)
      delete networkConfig.netId333
      return networkConfig
    }
  },
  methods: {
    updateNetwork() {
      this.$emit('input', this.selectedNetwork)
    }
  }
}
</script>
