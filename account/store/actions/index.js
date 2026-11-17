import { decryptNote } from './decryptNote.js'
import { decryptNotes, _encryptFormatTx, _checkCurrentTx } from './decryptNotes/index.js'

import { saveAccount } from './saveAccount.js'
import { removeAccount } from './removeAccount.js'
import { getRecoveryKey } from './getRecoveryKey.js'
import { enabledSaveFile } from './enabledSaveFile.js'
import { checkRecoveryKey } from './checkRecoveryKey.js'

import { setupAccount, saveEncryptedAccount } from './setupAccount/index.js'
import {
  recoverAccountFromChain,
  decryptAccount,
  getAccountFromAddress
} from './recoverAccountFromChain/index.js'

import { checkExistAccount } from './checkExistAccount.js'
import { getEncryptedNote } from './getEncryptedNote.js'
import { getEncryptedAccount } from './getEncryptedAccount.js'
import { recoverAccountFromKey } from './recoverAccountFromKey.js'

import { redirectToAccount } from './redirectToAccount.js'
import { highlightNoteAccount } from './highlightNoteAccount.js'
import { saveRecoveryKeyOnFile } from './saveRecoveryKeyOnFile.js'

import { createMutation, clearState } from './utils.js'

export const actions = {
  // utils
  clearState,
  createMutation,
  // actions
  saveAccount,
  decryptNote,
  decryptNotes,
  setupAccount,
  removeAccount,
  decryptAccount,
  getRecoveryKey,
  enabledSaveFile,
  checkRecoveryKey,
  getEncryptedNote,
  redirectToAccount,
  checkExistAccount,
  getEncryptedAccount,
  highlightNoteAccount,
  saveEncryptedAccount,
  getAccountFromAddress,
  recoverAccountFromKey,
  recoverAccountFromChain,
  saveRecoveryKeyOnFile,
  // private actions
  _encryptFormatTx,
  _checkCurrentTx
}
