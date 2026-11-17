<template>
  <div class="modal-card box box-modal">
    <header class="box-modal-header is-spaced">
      <div class="box-modal-title">{{ $t('yourNote') }}</div>
      <button type="button" class="delete" @click="$emit('close')" />
    </header>
    <div class="note">
      <div>{{ $t('pleaseBackupYourNote') }}</div>
      <div>{{ $t('treatYourNote') }}</div>
    </div>
    <div class="znote">
      {{ prefix }}-{{ note }}
      <o-tooltip :label="tooltipCopy" position="top">
        <button
          v-clipboard:copy="`${prefix}-${note}`"
          v-clipboard:success="onCopy"
          class="button is-primary has-icon"
        >
          <span class="icon icon-copy"></span>
        </button>
      </o-tooltip>
      <o-tooltip :label="$t('saveNote')" position="top">
        <button class="button is-primary has-icon" @click="onSave">
          <span class="icon icon-save"></span>
        </button>
      </o-tooltip>
    </div>
    <div v-show="isEnabledSaveFile" class="note">
      {{ $t('saveAsFile') }} <span class="has-text-primary">{{ filename }}</span>
    </div>
    <template v-if="!isSetupAccount">
      <i18n-t keypath="yourDontHaveAccount" class="notice">
        <template #account>
          <a @click="_redirectToAccount">{{ $t('account.button') }}</a>
        </template>
      </i18n-t>
    </template>
    <o-checkbox v-if="isSetupAccount" v-model="isEncrypted">
      <i18n-t keypath="iEncryptedTheNote">
        <template #address>
          <o-tooltip :label="tooltipCopy" position="top">
            <a class="has-text-primary" @click.prevent.stop="copyNoteAccount">{{ getEncryptAccount }}</a>
          </o-tooltip>
        </template>
      </i18n-t>
    </o-checkbox>
    <template v-if="!isSetupAccount || !isEncrypted">
      <o-checkbox v-model="isBackuped" data-test="backup_note_checkbox">{{
        $t('iBackedUpTheNote')
      }}</o-checkbox>
      <div v-if="isBackuped && isIPFS" class="notice is-warning">
        <div class="notice__p">{{ $t('yourNoteWontBeSaved') }}</div>
      </div>
    </template>
    <connect-button v-if="!isLoggedIn" type="is-primary is-fullwidth" />
    <o-button
      v-else
      variant="primary"
      expanded
      :disabled="disableButton"
      data-test="send_deposit_button"
      @click="_sendDeposit"
    >
      {{ $t('sendDeposit') }}
    </o-button>
  </div>
</template>
<script>
import { mapActions, mapState, mapGetters } from 'vuex'

import { sliceAddress } from '@/utils/index.js'
import { ConnectButton } from '@/components/web3Connect/index.js'

export default {
  components: {
    ConnectButton
  },
  emits: ['close'],
  data() {
    return {
      isBackuped: false,
      tooltipCopy: this.$t('clickToCopy'),
      isEncrypted: false,
      copyTimer: null
    }
  },
  computed: {
    ...mapGetters('metamask', ['isLoggedIn']),
    ...mapGetters('txHashKeeper', ['addressExplorerUrl']),
    ...mapGetters('encryptedNote', ['isSetupAccount', 'accounts', 'isEnabledSaveFile']),
    ...mapState('application', ['note', 'prefix']),
    isIPFS() {
      return this.$isLoadedFromIPFS()
    },
    filename() {
      return `backup-${this.prefix}-${this.note.slice(0, 10)}.txt`
    },
    getEncryptAccount() {
      return sliceAddress(this.accounts.encrypt)
    },
    disableButton() {
      if (this.isBackuped) {
        return !this.isBackuped
      } else {
        return !this.isEncrypted || !this.isSetupAccount
      }
    }
  },
  beforeMount() {
    this.isEncrypted = this.isSetupAccount
  },
  beforeUnmount() {
    clearTimeout(this.copyTimer)
  },
  methods: {
    ...mapActions('application', ['sendDeposit', 'saveFile']),
    ...mapActions('encryptedNote', ['redirectToAccount']),
    onCopy() {
      this.tooltipCopy = this.$t('copied')
      this.copyTimer = setTimeout(() => {
        this.tooltipCopy = this.$t('clickToCopy')
      }, 1500)
    },
    onSave() {
      this.saveFile({ note: this.note, prefix: this.prefix })
    },
    _redirectToAccount() {
      this.redirectToAccount()
      this.$emit('close')
    },
    async _sendDeposit() {
      this.$store.dispatch('loading/enable', { message: this.$t('preparingTransactionData') })
      await this.sendDeposit({ isEncrypted: this.isEncrypted })
      this.$store.dispatch('loading/disable')
      this.$parent.close()
    },
    async copyNoteAccount() {
      await this.$copyText(this.accounts.encrypt)
      this.onCopy()
    }
  }
}
</script>
