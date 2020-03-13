import axios from 'axios';

import authHeader from '@/mixin/authHeader';
import serverUrl from '@/mixin/url';
import { find, findIndex, forEach } from 'lodash';

const initialState = {
  inventories: [],
  loading: false,
  error: null,
};

const getters = {
  inventories: state => state.inventories,
  inventory: state => (id) => {
    state.inventories; // eslint-disable-line no-unused-expressions
    return find(state.inventories, ['id', id]);
  },
  isInventoriesLoading: state => state.loading,
  inventoriesErrors: state => state.error,
};

const onError = (commit, error, reject) => {
  commit('setInventoriesError', error);
  commit('setInventoriesLoading', false);
  reject(error);
};

const actions = {
  getInventories({ commit }) {
    commit('setInventoriesLoading', true);
    return new Promise((resolve, reject) => {
      axios.get(
        `${serverUrl()}/inventories`, {
          headers: authHeader(),
        },
      ).then(({ data }) => {
        commit('addInventories', data);
        commit('setInventoriesLoading', false);
        resolve(data);
      }).catch((error) => {
        onError(commit, error, reject);
      });
    });
  },
  createInventory({ commit }) {
    commit('setInventoriesLoading', true);
    return new Promise((resolve, reject) => {
      axios.post(
        `${serverUrl()}/inventories`,
        { headers: authHeader() },
      ).then(({ data }) => {
        commit('addInventory', data);
        commit('setInventoriesLoading', false);
        resolve(data);
      }).catch((error) => {
        onError(commit, error, reject);
      });
    });
  },
  updateInventory({ commit }, { resource, payload }) {
    commit('setInventoriesLoading', true);
    return new Promise((resolve, reject) => {
      axios({
        method: 'patch',
        url: `${serverUrl()}/inventories/${resource.id}`,
        responseType: 'json',
        headers: Object.assign({}, { 'If-Match': resource.etag }, authHeader()),
        data: payload,
      }).then(({ data }) => {
        commit('updateInventory', data);
        commit('setInventoriesLoading', false);
        resolve(data);
      }).catch((error) => {
        onError(commit, error, reject);
      });
    });
  },
  deleteInventory({ commit }, { resource }) {
    commit('setInventoriesLoading', true);
    return new Promise((resolve, reject) => {
      axios({
        method: 'delete',
        url: `${serverUrl()}/inventories/${resource.id}`,
        responseType: 'json',
        headers: Object.assign({}, { 'If-Match': resource.etag }, authHeader()),
      }).then(() => {
        commit('deleteInventory', resource.id);
        commit('setInventoriesLoading', false);
        resolve();
      }).catch((error) => {
        onError(commit, error, reject);
      });
    });
  },
};

const mutations = {
  addInventories(state, data) {
    state.inventories.clear();
    forEach(data.items, (item) => {
      state.inventories.push(item);
    });
  },
  addInventory(state, data) {
    const index = findIndex(state.inventories, data.id);
    if (index < 0) {
      state.inventories.push(data);
    } else {
      state.inventories[index] = data;
    }
  },
  updateInventory(state, data) {
    const index = findIndex(state.inventories, data.id);
    if (index < 0) {
      state.inventories.push(data);
    } else {
      state.inventories[index] = data;
    }
  },
  deleteInventory(state, id) {
    state.inventories = Array.from(state.inventoriesMap.values());
  },
  setInventoriesLoading(state, value) {
    state.loading = value;
  },
  setInventoriesError(state, error) {
    state.error = error;
  },
};

const inventories = {
  namespaced: true,
  state: initialState,
  getters,
  actions,
  mutations,
};

export default inventories;
