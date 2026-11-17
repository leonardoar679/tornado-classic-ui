<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isActive" class="modal is-active" :class="customClass">
        <div class="modal-background" @click="tryCancel('outside')" />
        <div class="animation-content" :style="contentStyle">
          <component :is="component" v-bind="componentProps" v-on="allListeners" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
/**
 * Host for programmatically opened modals (replacement for Buefy's ModalProgrammatic).
 * The wrapped component can close itself by emitting `close` or calling
 * `this.$parent.close()` — both conventions this codebase uses.
 */
export default {
  name: 'ModalHost',
  props: {
    component: { type: [Object, Function], required: true },
    componentProps: { type: Object, default: () => ({}) },
    componentListeners: { type: Object, default: () => ({}) },
    width: { type: Number, default: null },
    customClass: { type: String, default: '' },
    canCancel: { type: Boolean, default: true },
    onCancel: { type: Function, default: null }
  },
  emits: ['close'],
  data() {
    return { isActive: false }
  },
  computed: {
    contentStyle() {
      return this.width ? { maxWidth: `${this.width}px` } : undefined
    },
    allListeners() {
      return { close: this.close, ...this.componentListeners }
    }
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
    close() {
      this.isActive = false
      this.$emit('close')
    },
    tryCancel(source) {
      if (!this.canCancel) {
        return
      }
      this.isActive = false
      if (typeof this.onCancel === 'function') {
        this.onCancel(source)
      }
      this.$emit('close')
    },
    onKeydown(event) {
      if (event.key === 'Escape') {
        this.tryCancel('escape')
      }
    }
  }
}
</script>
