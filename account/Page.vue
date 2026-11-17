<template>
  <div class="account">
    <Settings />
    <NoteAccount />
  </div>
</template>

<script>
import { Settings, NoteAccount } from './components/index.js'

export default {
  components: {
    Settings,
    NoteAccount
  }
}
</script>
