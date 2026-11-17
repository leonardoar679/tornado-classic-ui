<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <article v-if="isActive" class="toast" :class="[position, type]">
        <div>{{ message }}</div>
      </article>
    </Transition>
  </Teleport>
</template>

<script>
/** Replacement for Buefy's ToastProgrammatic */
export default {
  name: 'ToastHost',
  props: {
    message: { type: String, default: '' },
    type: { type: String, default: '' },
    position: { type: String, default: 'is-top' },
    duration: { type: Number, default: 2000 }
  },
  emits: ['close'],
  data() {
    return { isActive: false, timer: null }
  },
  mounted() {
    this.isActive = true
    this.timer = setTimeout(() => this.close(), this.duration)
  },
  beforeUnmount() {
    if (this.timer) {
      clearTimeout(this.timer)
    }
  },
  methods: {
    close() {
      this.isActive = false
      this.$emit('close')
    }
  }
}
</script>
