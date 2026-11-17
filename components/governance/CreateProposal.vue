<template>
  <div class="proposal">
    <h1 class="title">{{ $t('createProposal') }}</h1>

    <div class="columns is-multiline">
      <div class="column is-6">
        <o-field
          :label="$t('proposalTitle')"
          :message="isValidTitle ? '' : $t('proposal.error.title')"
          :variant="isValidTitle ? '' : 'warning'"
        >
          <o-input v-model="validTitle" :placeholder="$t('title')"></o-input>
        </o-field>
      </div>
      <div class="column is-6">
        <o-field
          :label="$t('proposalAddress')"
          :variant="hasValidAddress ? '' : 'warning'"
          :message="hasValidAddress ? '' : addressErrorMessage"
        >
          <o-input
            v-model="address"
            :placeholder="$t('proposalAddress')"
            :input-class="!address ? '' : hasValidAddress ? '' : 'is-warning'"
          ></o-input>
        </o-field>
      </div>
      <div class="column is-12">
        <o-field
          :message="isValidDescription ? '' : $t('proposal.error.description')"
          :variant="isValidDescription ? '' : 'warning'"
          :label="$t('proposalDescription')"
        >
          <o-input v-model="validDescription" maxlength="2000" counter type="textarea"></o-input>
        </o-field>
      </div>
    </div>
    <o-tooltip :label="`${$t('onlyOneProposalErr')}`" position="top" :disabled="!cannotCreate" multiline>
      <o-button
        :disabled="cannotCreate"
        variant="primary"
        :icon-left="isFetchingBalances ? '' : 'plus'"
        outlined
        :loading="isFetchingBalances"
        @click="onCreateProposal"
      >
        {{ $t('createProposal') }}
      </o-button>
    </o-tooltip>
  </div>
</template>
<script>
import { mapActions, mapState, mapGetters } from 'vuex'
import { debounce } from '@/utils/index.js'
import { isAddress } from 'web3-utils'

export default {
  data() {
    return {
      proposalAddress: '',
      description: '',
      title: '',
      isValidAddress: true,
      isValidContract: true,
      isValidTitle: true,
      isValidDescription: true
    }
  },
  computed: {
    ...mapState('governance/gov', ['latestProposalId']),
    ...mapGetters('governance/gov', ['isFetchingBalances']),
    address: {
      get() {
        return this.proposalAddress
      },
      set(address) {
        this.setInitialState()
        this.proposalAddress = address

        debounce(this.validateAddress, address)
      }
    },
    validTitle: {
      get() {
        return this.title
      },
      set(title) {
        this.isValidTitle = true
        this.title = title
      }
    },
    addressErrorMessage() {
      if (!this.isValidAddress) {
        return this.$t('proposal.error.address')
      }

      if (!this.isValidContract) {
        return this.$t('proposal.error.contract')
      }

      return this.$t('proposal.error.address')
    },
    validDescription: {
      get() {
        return this.description
      },
      set(description) {
        this.isValidDescription = true
        this.description = description
      }
    },
    hasValidAddress() {
      return this.isValidAddress && this.isValidContract
    },
    cannotCreate() {
      return (
        this.latestProposalId.value !== 0 &&
        (this.latestProposalId.status === 'active' || this.latestProposalId.status === 'pending')
      )
    }
  },
  methods: {
    ...mapActions('governance/gov', ['createProposal']),
    async addressIsContract(address) {
      if (!address) {
        return false
      }

      const code = await this.$provider.web3.eth.getCode(address)

      return code !== '0x'
    },
    isAddress(address) {
      const isCorrect = isAddress(address)

      if (!isCorrect && address) {
        this.isValidAddress = isCorrect
      }

      return isCorrect
    },
    async isContract(address) {
      const isContract = await this.addressIsContract(address)

      if (!isContract && address) {
        this.isValidContract = isContract
      }

      return isContract
    },
    setInitialState() {
      this.isValidAddress = true
      this.isValidContract = true
    },
    async validateAddress(address) {
      const isCorrect = this.isAddress(address)

      if (!isCorrect) {
        return false
      }

      const isContract = await this.isContract(address)

      return isContract
    },
    async validationForms() {
      this.isValidTitle = this.title
      this.isValidDescription = this.description
      this.isValidAddress = this.proposalAddress

      const isCorrect = await this.validateAddress(this.proposalAddress)

      return isCorrect && this.isValidAddress && this.isValidTitle && this.isValidDescription
    },
    async onCreateProposal() {
      const isValidForms = await this.validationForms()

      if (!isValidForms) {
        return
      }

      this.$store.dispatch('loading/enable', { message: this.$t('preparingTransactionData') })

      await this.createProposal({
        proposalAddress: this.proposalAddress,
        title: this.title,
        description: this.description
      })
      this.$store.dispatch('loading/disable')
      // this.$parent.close()
    }
  }
}
</script>
