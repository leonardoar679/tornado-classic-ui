<script>
/**
 * Replacement for the Vue-2-only `v-idle` package.
 * Emits `idle` after `duration` seconds without user interaction;
 * with `loop: true` keeps re-emitting every `duration` seconds while
 * the user stays inactive (same semantics as v-idle's loop).
 * Renders nothing.
 */
export default {
  name: 'IdleTracker',
  props: {
    duration: {
      type: Number,
      default: 300 // seconds, v-idle compatible
    },
    loop: {
      type: Boolean,
      default: false
    },
    events: {
      type: Array,
      default: () => ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    }
  },
  emits: ['idle'],
  data() {
    return {
      timer: null
    }
  },
  mounted() {
    this.reset()
    this.events.forEach((event) => {
      window.addEventListener(event, this.reset, { passive: true })
    })
  },
  beforeUnmount() {
    this.clear()
    this.events.forEach((event) => {
      window.removeEventListener(event, this.reset)
    })
  },
  methods: {
    clear() {
      if (this.timer) {
        clearTimeout(this.timer)
        this.timer = null
      }
    },
    fire() {
      this.$emit('idle')
      if (this.loop) {
        this.reset()
      }
    },
    reset() {
      this.clear()
      this.timer = setTimeout(this.fire, this.duration * 1000)
    }
  },
  render() {
    return null
  }
}
</script>
