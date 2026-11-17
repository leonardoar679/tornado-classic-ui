<template>
  <div class="modal-card">
    <header class="modal-card-head">
      <div class="modal-card-title">{{ $parent.$t('account.modals.checkRecoveryKey.title') }}</div>
    </header>
    <section class="modal-card-body">
      <div class="media">
        <div class="media-content">
          {{
            isShow
              ? $parent.$t('account.modals.checkRecoveryKey.inactiveDescription')
              : $parent.$t('account.modals.checkRecoveryKey.description')
          }}
        </div>
      </div>
    </section>
    <footer v-if="isShow" class="modal-card-foot">
      <o-button variant="primary" outlined @click="$emit('close')">
        {{ $parent.$t('close') }}
      </o-button>
    </footer>
    <footer v-else class="modal-card-foot">
      <o-button variant="primary" outlined @click="_onCancel">
        {{ $parent.$t('account.modals.checkRecoveryKey.no') }}
      </o-button>
      <o-button variant="primary" @click="_onConfirm">
        {{ $parent.$t('account.modals.checkRecoveryKey.yes') }}
      </o-button>
    </footer>
  </div>
</template>

<script>
export default {
  props: {
    onCancel: {
      type: Function,
      required: true
    },
    onConfirm: {
      type: Function,
      required: true
    }
  },
  emits: ['close'],
  data() {
    return {
      timer: null,
      isShow: false
    }
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  mounted() {
    this.timer = setTimeout(() => {
      this.onCancel()
      this.isShow = true
    }, 1000 * 60)
  },
  methods: {
    _onCancel() {
      this.onCancel()
      this.$emit('close')
    },
    _onConfirm() {
      this.onConfirm()
      this.$emit('close')
    }
  }
}
</script>
