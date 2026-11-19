import { encrypt, getEncryptionPublicKey } from '@metamask/eth-sig-util'

import { strip0x, with0x } from '@/utils/privateKey.js'

export function getEncryptedAccount(_, { privateKey, pubKey }) {
  try {
    const keyWithOutPrefix = strip0x(privateKey)
    const { address } = this.$provider.web3.eth.accounts.privateKeyToAccount(with0x(keyWithOutPrefix))

    const publicKey = getEncryptionPublicKey(keyWithOutPrefix)

    const encryptedData = encrypt(pubKey, { data: keyWithOutPrefix }, 'x25519-xsalsa20-poly1305')
    const hexPrivateKey = Buffer.from(JSON.stringify(encryptedData)).toString('hex')

    return {
      address,
      publicKey,
      hexPrivateKey,
      encryptedData
    }
  } catch (err) {
    throw new Error(`Method getEncryptedAccount has error: ${err.message}`)
  }
}
