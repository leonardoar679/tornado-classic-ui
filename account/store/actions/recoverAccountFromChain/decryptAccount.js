import { getEncryptionPublicKey } from '@metamask/eth-sig-util'

import { strip0x, with0x } from '@/utils/privateKey.js'

export async function decryptAccount({ dispatch }, encryptedAccount) {
  try {
    const decrypted = await dispatch('metamask/ethDecrypt', encryptedAccount, { root: true })
    const privateKey = strip0x(decrypted)
    const publicKey = getEncryptionPublicKey(privateKey)

    const { address } = this.$provider.web3.eth.accounts.privateKeyToAccount(with0x(privateKey))

    return { address, publicKey, privateKey }
  } catch (err) {
    throw new Error(`Method decryptAccount has error: ${err.message}`)
  }
}
