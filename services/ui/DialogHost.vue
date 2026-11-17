<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isActive" class="modal is-active">
        <div class="modal-background" @click="onCancel" />
        <div class="animation-content">
          <div class="modal-card dialog" :class="type">
            <header v-if="title" class="modal-card-head">
              <p class="modal-card-title">{{ title }}</p>
            </header>
            <section class="modal-card-body">
              <p>{{ message }}</p>
            </section>
            <footer class="modal-card-foot">
              <button class="button" :class="type" @click="confirm">
                {{ confirmText }}
              </button>
              <button v-if="cancelText" class="button" @click="cancel">
                {{ cancelText }}
              </button>
            </footer>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
/** Replacement for Buefy's DialogProgrammatic.confirm */
export default {
  name: 'DialogHost',
  props: {
    title: { type: String, default: '' },
    message: { type: String, default: '' },
    cancelText: { type: String, default: 'Cancel' },
    confirmText: { type: String, default: 'OK' },
    type: { type: String, default: 'is-primary' },
    onConfirm: { type: Function, default: null },
    onCancel: { type: Function, default: null }
  },
  emits: ['close'],
  data() {
    return { isActive: false }
  },
  mounted() {
    this.isActive = true
    document.documentElement.classList.add('is-clipped')
    document.addEventListener('keydown', this.onKeydown)
  },
  beforeUnmount() {
    document.documentElement.classList.remove('is-clipped')
    document.removeEventListener('keydown', this.onKeydown)
  },
  methods: {
    confirm() {
      this.isActive = false
      if (typeof this.onConfirm === 'function') {
        this.onConfirm()
      }
      this.$emit('close')
    },
    cancel() {
      this.isActive = false
      if (typeof this.onCancel === 'function') {
        this.onCancel()
      }
      this.$emit('close')
    },
    onKeydown(event) {
      if (event.key === 'Escape') {
        this.cancel()
      }
    }
  }
}
</script>
