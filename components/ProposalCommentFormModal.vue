<template>
  <div class="modal-card box box-modal">
    <header class="box-modal-header is-spaced">
      <div class="box-modal-title">{{ $t('proposalComment.modal-title', { id: proposal.id }) }}</div>
      <button type="button" class="delete" @click="$emit('close')" />
    </header>

    <p class="detail" v-text="$t('proposalComment.modal-subtitle')" />

    <div class="columns is-multiline">
      <div class="column is-12">
        <o-field>
          <template #label>
            {{ $t('proposalComment.form-contact') }}
            <o-tooltip
              :label="$t('proposalComment.form-contact-tooltip')"
              size="medium"
              position="top"
              multiline
            >
              <button class="button is-primary has-icon">
                <span class="icon icon-info"></span>
              </button>
            </o-tooltip>
          </template>

          <o-input
            v-model.trim="form.contact"
            :maxlength="limit / 2"
            :has-counter="false"
            :placeholder="$t('proposalComment.form-contact-placeholder')"
          />
        </o-field>
      </div>
      <div class="column is-12">
        <o-field
          :message="fields.message ? '' : $t('proposalComment.form-message-required')"
          :type="{ 'is-warning': !fields.message && !support }"
          :label="$t('proposalComment.form-message')"
        >
          <o-input
            v-model="form.message"
            :maxlength="limit"
            type="textarea"
            :placeholder="
              support
                ? $t('proposalComment.form-message-opt-placeholder')
                : $t('proposalComment.form-message-placeholder')
            "
          />
        </o-field>
      </div>
    </div>

    <o-button
      v-if="support"
      :disabled="!isValid"
      variant="primary"
      icon-left="check"
      outlined
      @click="onCastVote(true)"
    >
      {{ $t('for') }}
    </o-button>

    <o-button
      v-else
      :disabled="!isValid"
      variant="danger"
      icon-left="close"
      outlined
      @click="onCastVote(false)"
    >
      {{ $t('against') }}
    </o-button>
  </div>
</template>

<script>
const MESSAGE_LIMIT = 100

export default {
  props: {
    support: {
      type: Boolean,
      required: true
    },
    proposal: {
      type: Object,
      required: true,
      validator: (prop) => 'id' in prop
    }
  },
  emits: ['close', 'castVote'],
  data: () => ({
    limit: MESSAGE_LIMIT,
    fields: {
      contact: true,
      message: true
    },
    form: {
      contact: '',
      message: ''
    }
  }),
  computed: {
    isValid() {
      return this.validate()
    }
  },
  methods: {
    validate() {
      const { form, fields, support } = this
      fields.contact = form.contact.length <= this.limit

      fields.message = support
        ? form.message.length <= this.limit
        : form.message.length > 2 && form.message.length <= this.limit

      return fields.contact && fields.message
    },
    onCastVote() {
      if (this.isValid) {
        this.$emit('castVote', this.form)
        this.$emit('close')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.box-modal {
  overflow: initial !important;
}

.detail {
  margin-bottom: 1.25rem;
}
</style>
