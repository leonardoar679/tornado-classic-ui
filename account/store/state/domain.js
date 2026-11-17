import { createChainIdState } from '@/utils/index.js'

const requestState = {
  isError: false,
  isSuccess: false,
  isFetching: false,
  errorMessage: ''
}

const initialDomainState = {
  setupAccount: Object.assign({}, requestState),
  decryptNotes: Object.assign({}, requestState),
  removeAccount: Object.assign({}, requestState),
  recoverAccountFromKey: Object.assign({}, requestState),
  recoverAccountFromChain: Object.assign({}, requestState)
}

export const domain = createChainIdState(initialDomainState)
