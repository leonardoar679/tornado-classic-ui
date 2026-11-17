import { domain } from './Domain.js'
import { statistic } from './Statistic.js'
import { addresses } from './Addresses.js'
import { enabledSaveFile } from './EnabledSaveFile.js'
import { encryptedAccount } from './EncryptedAccount.js'

export const mutations = {
  ...domain,
  ...addresses,
  ...statistic,
  ...enabledSaveFile,
  ...encryptedAccount
}
