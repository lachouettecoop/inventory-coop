import axios from 'axios';
import {
  forEach, isArray, isEmpty, reduce,
} from 'lodash';

import { apiUrl } from '@/mixin/url';
import authHeader from '@/mixin/authHeader';

const getters = {
  data: (state) => state.data,
  isLoading: (state) => state.loading,
};

const onError = (key, commit, error, reject) => {
  commit('setDataError', error);
  commit('setDataLoading', false);
  reject(error);
};

const getActions = (key) => ({
  getResources({ commit }) {
    commit('setDataLoading', true);
    return new Promise((resolve, reject) => {
      axios.get(
        `${apiUrl()}/${key}`, {
          headers: authHeader(),
        },
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
      axios.get(`${apiUrl()}/${key}`, {
        headers: authHeader(),
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
    return new Promise((resolve, reject) => {
      axios.get(
        `${apiUrl()}/${key}/${id}`,
        { headers: authHeader() },
      ).then(({ data }) => {
        commit('setResources', data);
        commit('setDataLoading', false);
      }).catch((error) => {
        onError(key, commit, error, reject);
      });
    });
  },
  createResource({ commit }, { resource }) {
    commit('setDataLoading', true);
    return new Promise((resolve, reject) => {
      axios.post(
        `${apiUrl()}/${key}`,
        resource,
        { headers: authHeader() },
      ).then(({ data }) => {
        commit('setResources', data);
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
        url: `${apiUrl()}/${key}/${resource.id}`,
        responseType: 'json',
        headers: { 'If-Match': resource.etag, ...authHeader() },
        data: payload,
      }).then(({ data }) => {
        commit('setResources', data);
        commit('setDataLoading', false);
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
        url: `${apiUrl()}/${key}/${resource.id}`,
        responseType: 'json',
        headers: { 'If-Match': resource.etag, ...authHeader() },
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

const setItem = (item, state, forcePush = false) => {
  // eslint-disable-next-line no-param-reassign,no-underscore-dangle
  item.id = item._id;
  const existingItem = forcePush ? undefined : state.dataMap.get(item.id);
  if (existingItem) {
    forEach(Object.keys(item), (propertyName) => {
      existingItem[propertyName] = item[propertyName];
    });
  } else {
    state.dataMap.set(item.id, item);
    state.data.push(item);
  }
};

const mutations = {
  setDataLoading(state, value) {
    state.loading = value;
  },
  setResources(state, data) {
    if (isArray(data.items)) {
      const forcePush = isEmpty(state.dataMap);
      forEach(data.items, (item) => {
        setItem(item, state, forcePush);
      });
    } else {
      setItem(data, state);
    }
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
