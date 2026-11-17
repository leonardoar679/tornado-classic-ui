import { initialUiState } from '../state/ui.js'

export const addresses = {
  SET_ADDRESSES(state, { netId, addresses }) {
    state.ui[`netId${netId}`]['addresses'] = addresses
  },
  REMOVE_ADDRESSES(state, { netId }) {
    state.ui[`netId${netId}`]['addresses'] = initialUiState.addresses
  }
}
