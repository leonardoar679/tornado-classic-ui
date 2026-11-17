<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isActive" class="snackbar" :class="[position, type]">
        <div class="text">{{ message }}</div>
        <div v-if="actionText" class="action">
          <button class="button is-dark is-small" @click="action">{{ actionText }}</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
/** Replacement for Buefy's SnackbarProgrammatic */
export default {
  name: 'SnackbarHost',
  props: {
    message: { type: String, default: '' },
    type: { type: String, default: '' },
    position: { type: String, default: 'is-bottom-right' },
    actionText: { type: String, default: '' },
    duration: { type: Number, default: 3500 },
    indefinite: { type: Boolean, default: false },
    onAction: { type: Function, default: null }
  },
  emits: ['close'],
  data() {
    return { isActive: false, timer: null }
  },
  mounted() {
    this.isActive = true
    if (!this.indefinite) {
      this.timer = setTimeout(() => this.close(), this.duration)
    }
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
    },
    action() {
      if (typeof this.onAction === 'function') {
        this.onAction()
      }
      this.close()
    }
  }
}
</script>
