import Vue from 'vue';
import axios from 'axios';
import { forEach, isArray } from 'lodash';

import { apiUrl } from '@/mixin/url';
import authHeader from '@/mixin/authHeader';

const onError = (commit, error, reject) => {
  commit('setError', error);
  commit('setDataLoading', false);
  reject(error);
};

const counts = {
  namespaced: true,
  state: {
    data: [],
    dataMap: new Map(),
    connected: false,
    loading: false,
    error: null,
    starting_sid: null,
    current_sid: null,
  },
  getters: {
    data: (state) => state.data,
    connected: (state) => state.connected,
    isLoading: (state) => state.loading,
    error: (state) => state.error,
  },
  actions: {
    getResourcesWhere({ commit }, { where }) {
      commit('setDataLoading', true);
      commit('clearResources');
      return new Promise((resolve, reject) => {
        axios.get(`${apiUrl()}/counts`, {
          headers: authHeader(),
          params: { where: JSON.stringify(where) },
        }).then(({ data }) => {
          commit('setResources', data);
          commit('setDataLoading', false);
          resolve(data);
        }).catch((error) => {
          onError(commit, error, reject);
        });
      });
    },
    createResource({ commit }, { resource }) {
      return new Promise((resolve, reject) => {
        axios.post(
          `${apiUrl()}/counts`,
          resource,
          { headers: authHeader() },
        ).then(({ data }) => {
          commit('setResources', data);
          resolve(data);
        }).catch((error) => {
          onError(commit, error, reject);
        });
      });
    },
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
    WS_new_counts(context, data) {
      context.commit('resetError');
      context.commit('setResources', data);
    },
    WS_error(context, message) {
      context.commit('resetError');
      context.commit('setError', message.error);
    },
  },
  mutations: {
    setDataLoading(state, value) {
      state.loading = value;
    },
    clearResources(state) {
      state.data.clear();
      state.dataMap.clear();
    },
    setResources(state, data) {
      let datas = null;
      if (isArray(data)) datas = data;
      else if (isArray(data.items)) datas = data.items;
      else datas = [data];
      const newCounts = [];
      const update = state.data.length > 0;
      forEach(datas, (count) => {
        // eslint-disable-next-line no-param-reassign,no-underscore-dangle
        count.id = count._id;
        const existingItem = update ? state.dataMap.get(count.id) : false;
        if (existingItem) {
          forEach(Object.keys(count), (propertyName) => {
            existingItem[propertyName] = count[propertyName];
          });
        } else {
          state.dataMap.set(count.id, count);
          newCounts.push(count);
        }
      });
      state.data.push(...newCounts);
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
    },
    resetError(state) {
      state.error = null;
    },
  },
};

export default counts;
