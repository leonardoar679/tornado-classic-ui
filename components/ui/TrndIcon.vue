<template>
  <span class="icon" :class="spanClasses">
    <i :class="iconClasses" />
  </span>
</template>

<script>
/**
 * Drop-in replacement for Buefy's `b-icon` using this app's CSS-based icon packs
 * (see assets/styles/components/_icon.scss):
 *  - pack "trnd" (default): mask-based icons, classes `trnd trnd-24px trnd-<name>`
 *  - pack "icon": background-image icons, classes `icon <name>` (e.g. `icon information`)
 */
const TRND_SIZES = {
  '': 'trnd-24px',
  default: 'trnd-24px',
  'is-small': null,
  'is-medium': 'trnd-36px',
  'is-large': 'trnd-48px'
}

export default {
  name: 'TrndIcon',
  props: {
    icon: { type: String, default: '' },
    pack: { type: String, default: 'trnd' },
    size: { type: String, default: '' },
    customClass: { type: String, default: '' },
    clickable: { type: Boolean, default: false }
  },
  computed: {
    normalizedSize() {
      if (!this.size) {
        return ''
      }
      return this.size.startsWith('is-') ? this.size : `is-${this.size}`
    },
    spanClasses() {
      return [this.normalizedSize, this.clickable ? 'is-clickable' : '', this.customClass]
    },
    iconClasses() {
      const classes = []

      if (this.pack === 'trnd') {
        classes.push('trnd')
        const sizeClass = TRND_SIZES[this.normalizedSize || 'default']
        if (sizeClass) {
          classes.push(sizeClass)
        }
        if (this.icon) {
          classes.push(`trnd-${this.icon}`)
        }
      } else if (this.pack === 'icon') {
        classes.push('icon')
        if (this.icon) {
          classes.push(this.icon)
        }
      } else if (this.pack) {
        classes.push(this.pack)
        if (this.icon) {
          classes.push(`${this.pack}-${this.icon}`)
        }
      }

      return classes
    }
  }
}
</script>
