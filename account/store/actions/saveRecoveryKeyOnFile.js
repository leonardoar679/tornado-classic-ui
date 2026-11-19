import { saveAsFile } from '@/utils/index.js'
import { strip0x, with0x } from '@/utils/privateKey.js'

export function saveRecoveryKeyOnFile(_, { recoveryKey }) {
  try {
    const keyWithOutPrefix = strip0x(recoveryKey)
    const { address } = this.$provider.web3.eth.accounts.privateKeyToAccount(with0x(keyWithOutPrefix))

    const data = new Blob([`${keyWithOutPrefix}`], { type: 'text/plain;charset=utf-8' })

    saveAsFile(data, `backup-note-account-key-${address.slice(0, 10)}.txt`)
  } catch (err) {
    console.error('saveFile', err.message)
  }
}
