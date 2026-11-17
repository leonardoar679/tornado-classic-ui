import { createChainIdState } from '@/utils/index.js'

export const initialUiState = {
  addresses: {
    backup: '-',
    connect: '-',
    encrypt: '-'
  },
  isExistAccount: false,
  encryptedPublicKey: '',
  encryptedPrivateKey: '',
  isEnabledSaveFile: true,
  statistic: [],
  isHighlightedNoteAccount: false
}

export const ui = createChainIdState(initialUiState)
