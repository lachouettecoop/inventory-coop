import axios from 'axios';
import { forEach, isArray } from 'lodash';

import { apiUrl } from '@/mixin/url';
import authHeader from '@/mixin/authHeader';

const addCount = (count, state) => {
  // eslint-disable-next-line no-param-reassign,no-underscore-dangle
  count.id = count._id;
  const existingItem = state.dataMap.get(count.id);
  if (existingItem) {
    forEach(Object.keys(count), (propertyName) => {
      existingItem[propertyName] = count[propertyName];
    });
  } else {
    state.dataMap.set(count.id, count);
    state.data.push(count);
  }
};

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
    isLoading: false,
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
      commit('setDataLoading', true);
      return new Promise((resolve, reject) => {
        axios.post(
          `${apiUrl()}/counts`,
          resource,
          { headers: authHeader() },
        ).then(({ data }) => {
          commit('setResources', data);
          commit('setDataLoading', false);
          resolve(data);
        }).catch((error) => {
          onError(commit, error, reject);
        });
      });
    },
  },
  mutations: {
    setDataLoading(state, value) {
      state.loading = value;
    },
    setResources(state, data) {
      if (isArray(data.items)) {
        state.dataMap.clear();
        forEach(data.items, (count) => {
          // eslint-disable-next-line no-param-reassign,no-underscore-dangle
          count.id = count._id;
          state.dataMap.set(count.id, count);
        });
        state.data = Array.from(state.dataMap.values());
      } else {
        addCount(data, state);
      }
    },
    setError(state, payload) {
      state.error = payload;
    },
  },
};

export default counts;
