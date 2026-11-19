import { getEncryptionPublicKey } from '@metamask/eth-sig-util'

import { strip0x, with0x } from '@/utils/privateKey.js'

export function recoverAccountFromKey({ dispatch }, { recoveryKey }) {
  try {
    dispatch('createMutation', { type: 'SET_DOMAIN_REQUEST', payload: { key: 'recoverAccountFromKey' } })

    const keyWithOutPrefix = strip0x(recoveryKey)
    const publicKey = getEncryptionPublicKey(keyWithOutPrefix)

    const { address } = this.$provider.web3.eth.accounts.privateKeyToAccount(with0x(keyWithOutPrefix))

    this.$sessionStorage.setItem(address, keyWithOutPrefix)

    dispatch('saveAccount', { account: { publicKey, privateKey: '' }, address })

    dispatch('createMutation', { type: 'SET_DOMAIN_SUCCESS', payload: { key: 'recoverAccountFromKey' } })
  } catch (err) {
    dispatch('createMutation', {
      type: 'SET_DOMAIN_FAILED',
      payload: { key: 'recoverAccountFromKey', errorMessage: err.message }
    })
  }
}
