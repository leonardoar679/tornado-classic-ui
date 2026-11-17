export const enabledSaveFile = {
  ENABLED_SAVE_FILE(state, { netId, isEnabled }) {
    state.ui[`netId${netId}`]['isEnabledSaveFile'] = isEnabled
  }
}
