export const domain = {
  CLEAR_STATE(state, { netId, key }) {
    state.domain[`netId${netId}`][key] = {
      isError: false,
      isSuccess: false,
      isFetching: false,
      errorMessage: ''
    }
  },
  SET_DOMAIN_REQUEST(state, { netId, key }) {
    state.domain[`netId${netId}`][key] = {
      isError: false,
      isSuccess: false,
      isFetching: true,
      errorMessage: ''
    }
  },
  SET_DOMAIN_FAILED(state, { netId, key, errorMessage }) {
    state.domain[`netId${netId}`][key] = {
      errorMessage,
      isError: true,
      isSuccess: false,
      isFetching: false
    }
  },
  SET_DOMAIN_SUCCESS(state, { netId, key }) {
    state.domain[`netId${netId}`][key] = {
      isError: false,
      isSuccess: true,
      isFetching: false,
      errorMessage: ''
    }
  }
}
