<template>
  <div class="wrapper">
    <Navbar />
    <div v-show="mismatchNetwork" class="network has-background-warning">
      {{ $t('pleaseChangeNetwork', { network: netId }) }}
      <o-button variant="warning" class="is-dark ml-3" @click="changeNetwork">{{
        $t('changeNetwork')
      }}</o-button>
    </div>
    <section class="main-content section">
      <div class="container">
        <slot />
      </div>
    </section>
    <Footer />
    <Loader />
    <Notices />
    <idle-tracker v-if="isSetupAccount && !isOpen" :loop="true" :duration="300" @idle="handleOpenModal" />
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'

import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'
import Loader from '@/components/Loaders/Loader.vue'
import Settings from '@/components/Settings.vue'
import Notices from '@/components/Notices.vue'
import IdleTracker from '@/components/IdleTracker.vue'
import { openConfirmModal } from '@/account/index.js'
import NetworkModal from '@/components/NetworkModal.vue'

export default {
  components: {
    Navbar,
    Footer,
    Loader,
    Notices,
    IdleTracker
  },
  data() {
    return {
      isOpen: false
    }
  },
  computed: {
    ...mapGetters('encryptedNote', ['isSetupAccount', 'accounts']),
    ...mapGetters('metamask', ['netId', 'mismatchNetwork'])
  },
  watch: {
    netId(value, oldValue) {
      if (value !== oldValue) {
        this.checkRecoveryKey()
      }
    }
  },
  created() {
    this.checkRecoveryKey()
    this.newNotify()
    this.$store.dispatch('gasPrices/setDefault')
  },
  mounted() {
    this.$preventMultitabs()
    window.addEventListener('focus', this.$preventMultitabs)

    // replaces the old window.onNuxtReady (removed in Nuxt 3+); SPA is mounted client-side
    setTimeout(async () => {
      await this.selectRpc({ netId: this.netId, action: this.checkCurrentRpc })

      if (this.netId !== 1) {
        await this.selectRpc({ netId: 1, action: this.preselectRpc })
      }

      this.$store.dispatch('gasPrices/fetchGasPrice')
      this.$store.dispatch('price/fetchTokenPrice', {}, { root: true })
      try {
        this.$store.dispatch('application/loadAllNotesData')
      } catch (e) {
        console.error('default', e)
      }
      this.$store.dispatch('relayer/runAllJobs')
      this.$store.dispatch('governance/gov/checkActiveProposals')
    }, 500)
  },
  beforeUnmount() {
    window.removeEventListener('focus', this.$preventMultitabs)
  },
  methods: {
    ...mapActions('settings', ['checkCurrentRpc', 'preselectRpc']),
    checkRecoveryKey() {
      this.$store.dispatch('encryptedNote/checkRecoveryKey', {}, { root: true })
    },
    changeNetwork() {
      this.$buefy.modal.open({
        parent: this,
        component: NetworkModal,
        hasModalCard: true,
        width: 440
      })
    },
    newNotify() {
      const hasNotify = window.localStorage.getItem('hasNotify')

      if (!hasNotify) {
        this.$store.dispatch(
          'notice/addNotice',
          {
            notice: {
              untranslatedTitle: 'New version',
              type: 'info',
              nova: true
            },
            interval: 10000
          },
          { root: true }
        )
        window.localStorage.setItem('hasNotify', true)
      }
    },
    handleOpenModal() {
      const recoveryKey = this.$sessionStorage.getItem(this.accounts.encrypt)
      if (recoveryKey) {
        this.isOpen = true
        openConfirmModal({
          onCancel: () => {
            this.isOpen = false
            this.$sessionStorage.clear()
            this.checkRecoveryKey()
          },
          onConfirm: () => {
            this.isOpen = false
          },
          parent: this
        })
      }
    },
    async selectRpc({ netId, action }) {
      try {
        await action({ netId })
      } catch (e) {
        console.error(e)
        this.$buefy.snackbar.open({
          message: this.$t('rpcSelectError'),
          type: 'is-danger',
          duration: 10000,
          indefinite: true,
          position: 'is-top',
          actionText: 'Open Settings',
          onAction: () => {
            this.$buefy.modal.open({
              parent: this,
              component: Settings,
              hasModalCard: true,
              width: 440,
              customClass: 'is-pinned',
              props: {
                netId
              },
              onCancel: () => {
                this.selectRpc({ netId, action })
              }
            })
          }
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.network {
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  margin-top: 1rem;

  :deep(.is-dark) {
    background-color: darken(#ff8a00, 15);
    font-size: 0.9rem;

    &:hover {
      background-color: darken(#ff8a00, 10);
    }
  }
}
</style>
