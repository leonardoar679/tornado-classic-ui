export const statistic = {
  SET_STATISTIC(state, { netId, statistic }) {
    state.ui[`netId${netId}`]['statistic'] = statistic
  },
  REMOVE_STATISTIC(state, { netId }) {
    state.ui[`netId${netId}`]['statistic'] = {}
  }
}
