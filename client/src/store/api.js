import axios from 'axios';
import { filter, find, forEach, isArray, reduce } from 'lodash';

const getters = {
  data: state => state.data,
  getInventoryData: state => (inventoryId) => {
    state.data; // eslint-disable-line no-unused-expressions
    return filter(state.data, { inventory: inventoryId });
  },
  getData: state => (id) => {
    state.data; // eslint-disable-line no-unused-expressions
    return find(state.data, ['id', id]);
  },
  isLoading: state => state.loading,
};

const onError = (key, commit, error, reject) => {
  commit('setDataError', error);
  commit('setDataLoading', false);
  reject(error);
};

const getActions = key => ({
  getResources({ commit }) {
    commit('setDataLoading', true);
    return new Promise((resolve, reject) => {
      axios.get(
        `${process.env.apiBaseUrl}/${key}`,
      ).then(({ data }) => {
        commit('setResources', data);
        commit('setDataLoading', false);
        resolve(data);
      }).catch((error) => {
        onError(key, commit, error, reject);
      });
    });
  },
  getResourcesWhere({ commit }, { where }) {
    commit('setDataLoading', true);
    return new Promise((resolve, reject) => {
      axios.get(`${process.env.apiBaseUrl}/${key}`, {
        params: { where: JSON.stringify(where) },
      }).then(({ data }) => {
        commit('setResources', data);
        commit('setDataLoading', false);
        resolve(data);
      }).catch((error) => {
        onError(key, commit, error, reject);
      });
    });
  },
  fetchResource({ commit }, { id }) {
    commit('setDataLoading', true);
    axios.get(
      `${process.env.apiBaseUrl}/${key}/${id}`,
    ).then(({ data }) => {
      commit('setResource', data);
      commit('setDataLoading', false);
    }).catch((error) => {
      commit('setDataError', error);
      commit('setDataLoading', false);
    });
  },
  createResource({ commit }, { resource }) {
    commit('setDataLoading', true);
    return new Promise((resolve, reject) => {
      axios.post(
        `${process.env.apiBaseUrl}/${key}`,
        resource,
      ).then(({ data }) => {
        commit('addResource', data);
        commit('setDataLoading', false);
        resolve(data);
      }).catch((error) => {
        onError(key, commit, error, reject);
      });
    });
  },
  updateResource({ commit }, { resource, payload }) {
    commit('setDataLoading', true);
    return new Promise((resolve, reject) => {
      axios({
        method: 'patch',
        url: `${process.env.apiBaseUrl}/${key}/${resource.id}`,
        responseType: 'json',
        headers: { 'If-Match': resource.etag },
        data: payload,
      }).then(({ data }) => {
        commit('setDataLoading', false);
        commit('updateResource', data);
        resolve(data);
      }).catch((error) => {
        onError(key, commit, error, reject);
      });
    });
  },
  deleteResource({ commit }, { resource }) {
    commit('setDataLoading', true);
    return new Promise((resolve, reject) => {
      axios({
        method: 'delete',
        url: `${process.env.apiBaseUrl}/${key}/${resource.id}`,
        responseType: 'json',
        headers: { 'If-Match': resource.etag },
      }).then(() => {
        commit('setDataLoading', false);
        commit('removeData', resource.id);
        resolve();
      }).catch((error) => {
        onError(key, commit, error, reject);
      });
    });
  },
});

const mutations = {
  setDataLoading(state, value) {
    state.loading = value;
  },
  setResources(state, data) {
    forEach(data.items, (item) => {
      state.dataMap.set(item.id, item);
    });
    state.data = Array.from(state.dataMap.values());
  },
  setResource(state, data) {
    state.dataMap.set(data.id, data);
    state.data = Array.from(state.dataMap.values());
  },
  addResource(state, data) {
    if (isArray(data.items)) {
      forEach(data.items, (item) => {
        state.dataMap.set(item.id, item);
      });
    } else {
      state.dataMap.set(data.id, data);
    }
    state.data = Array.from(state.dataMap.values());
  },
  updateResource(state, data) {
    state.dataMap.set(data.id, data);
    state.data = Array.from(state.dataMap.values());
  },
  removeData(state, id) {
    state.dataMap.delete(id);
    state.data = Array.from(state.dataMap.values());
  },
  setDataError(state, error) {
    state.error = error;
  },
};

const apiModules = reduce(
  [
    'inventories',
    'products',
    'counts',
  ],
  (result, resourceKey) => {
    result[resourceKey] = { // eslint-disable-line no-param-reassign
      namespaced: true,
      state: {
        loading: false,
        data: [],
        error: null,
        dataMap: new Map(),
      },
      getters,
      actions: getActions(resourceKey),
      mutations,
    };
    return result;
  },
  {},
);

export default apiModules;
