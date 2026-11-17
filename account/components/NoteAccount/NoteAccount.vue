<template>
  <div ref="note" class="note-account" :class="{ 'is-active': isActive }">
    <h2 class="title">
      <!-- <o-icon icon="astronaut" size="large" /> -->
      {{ $t('account.title') }}
    </h2>
    <o-notification class="main-notification" variant="info">
      {{ $t('account.description') }}
    </o-notification>
    <Setup v-if="!isSetupAccount" />
    <Control v-else />
  </div>
</template>

<script>
import { noteComputed, noteMethods } from '../../injectors/index.js'

import { Setup } from '../Setup/index.js'
import { Control } from '../Control/index.js'

export default {
  components: {
    Setup,
    Control
  },
  data() {
    return {
      isActive: false
    }
  },
  computed: {
    ...noteComputed
  },
  watch: {
    isInitialized(isInitialized) {
      if (isInitialized) {
        this.checkExistAccount()
      }
    },
    isHighlightedNoteAccount: {
      handler(value) {
        if (value) {
          this.scrollOnHiglight()
        }
      },
      immediate: true
    }
  },
  created() {
    this.checkExistAccount()
  },
  methods: {
    ...noteMethods,
    scrollOnHiglight() {
      setTimeout(() => {
        this.isActive = true
        this.$refs.note.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'start' })
      }, 100)

      setTimeout(() => {
        this.isActive = false
        this.highlightNoteAccount({ isHighlighted: false })
      }, 1000)
    }
  }
}
</script>
