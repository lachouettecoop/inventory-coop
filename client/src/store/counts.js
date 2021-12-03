import Vue from 'vue';

const initialState = {
  count: null,
  connected: false,
  error: null,
  starting_sid: null,
  current_sid: null,
};

const getters = {
  count: (state) => state.count,
  connected: (state) => state.connected,
  error: (state) => state.error,
};

const counts = {
  namespaced: true,
  state: initialState,
  getters,
  actions: {
    WS_connect(context) {
      context.commit('setConnected', true);
      // set sids
      if (!context.state.starting_sid) {
        context.commit('set_starting_sid', Vue.prototype.$socket.id);
      }
      context.commit('set_current_sid', Vue.prototype.$socket.id);
    },
    WS_disconnect(context) {
      context.commit('setConnected', false);
    },
    WS_new_count(context, count) {
      context.commit('resetError');
      context.commit('setScaleStatus', count);
    },
    WS_error(context, message) {
      context.commit('setError', message.error);
    },
  },
  mutations: {
    setScaleStatus(state, scaleStatus) {
      state.healthy = scaleStatus.healthy;
      state.weight = scaleStatus.weight;
      state.tare = scaleStatus.tare;
    },
    setConnected(state, payload) {
      state.connected = payload;
    },
    set_starting_sid(state, payload) {
      state.starting_sid = payload;
    },
    set_current_sid(state, payload) {
      state.current_sid = payload;
    },
    setError(state, payload) {
      state.error = payload;
      state.count = null;
    },
    resetError(state) {
      state.error = null;
    },
  },
};

export default counts;
