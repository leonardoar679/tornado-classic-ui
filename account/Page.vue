<template>
  <div class="account">
    <WalletSettings />
    <NoteAccount />
  </div>
</template>

<script>
import { Settings as WalletSettings, NoteAccount } from './components/index.js'

export default {
  components: {
    WalletSettings,
    NoteAccount
  }
}
</script>
