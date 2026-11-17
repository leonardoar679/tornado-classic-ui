export const encryptedAccount = {
  SET_ENCRYPTED_ACCOUNT(state, { netId, publicKey, privateKey }) {
    state.ui[`netId${netId}`]['encryptedPublicKey'] = publicKey
    state.ui[`netId${netId}`]['encryptedPrivateKey'] = privateKey
  },
  CHECK_ACCOUNT(state, { netId, isExist }) {
    state.ui[`netId${netId}`]['isExistAccount'] = isExist
  },
  REMOVE_KEY(state, { netId }) {
    state.ui[`netId${netId}`]['encryptedPublicKey'] = ''
    state.ui[`netId${netId}`]['encryptedPrivateKey'] = ''
  },
  SET_HIGHLIGHT_NOTE_ACCOUNT(state, { netId, isHighlighted }) {
    state.ui[`netId${netId}`]['isHighlightedNoteAccount'] = isHighlighted
  }
}
