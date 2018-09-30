import axios from 'axios';
import { reduce, findIndex, find } from 'lodash';

const getters = {
  data: state => state.data,
  getData: state => (id) => {
    state.data; // eslint-disable-line no-unused-expressions
    return find(state.data, ['id', id]);
  },
  pendingEntity: state => state.pendingResource,
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
      axios.get(`${process.env.apiBaseUrl}/${key}`)
        .then(({ data }) => {
          commit('setResources', data);
          commit('setDataLoading', false);
          resolve(data);
        })
        .catch((error) => {
          onError(key, commit, error, reject);
        });
    });
  },
  getResourcesWhere({ commit }, { where }) {
    commit('setDataLoading', true);
    return new Promise((resolve, reject) => {
      axios.get(`${process.env.apiBaseUrl}/${key}?${JSON.stringify(where)}`)
        .then(({ data }) => {
          commit('setResources', data);
          commit('setDataLoading', false);
          resolve(data);
        })
        .catch((error) => {
          onError(key, commit, error, reject);
        });
    });
  },
  fetchResource({ commit }, { id }) {
    commit('setDataLoading', true);
    axios.get(`${process.env.apiBaseUrl}/${key}/${id}`)
      .then(({ data }) => {
        commit('setResource', data);
        commit('setDataLoading', false);
      })
      .catch((error) => {
        commit('setDataError', error);
        commit('setDataLoading', false);
      });
  },
  createResource({ commit }, { resource }) {
    commit('setDataLoading', true);
    commit('setPendingResource', { type: 'create', data: resource || key });
    return new Promise((resolve, reject) => {
      axios.post(`${process.env.apiBaseUrl}/${key}`, resource)
        .then(({ data }) => {
          commit('addResource', { resource, data });
          commit('setDataLoading', false);
          commit('setPendingResource');
          resolve(data);
        })
        .catch((error) => {
          onError(key, commit, error, reject);
          commit('setPendingResource');
        });
    });
  },
  updateResource({ commit }, { resource, payload }) {
    commit('setDataLoading', true);
    commit('setPendingResource', { type: 'update', data: resource });
    return new Promise((resolve, reject) => {
      axios({
        method: 'patch',
        url: `${process.env.apiBaseUrl}/${key}/${resource.id}`,
        responseType: 'json',
        headers: { 'If-Match': resource.etag },
        data: payload,
      })
        .then(({ data }) => {
          commit('setDataLoading', false);
          commit('updateResource', { resource, data, payload });
          commit('setPendingResource');
          resolve(data);
        })
        .catch((error) => {
          onError(key, commit, error, reject);
          commit('setPendingResource');
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
      })
        .then(() => {
          commit('setDataLoading', false);
          commit('removeData', resource.id);
          resolve();
        })
        .catch((error) => {
          onError(key, commit, error, reject);
        });
    });
  },
});

const mapItem = (obj) => {
  const rObj = obj;
  rObj.id = obj._id; // eslint-disable-line no-underscore-dangle
  return rObj;
};

const mutations = {
  setDataLoading(state, value) {
    state.loading = value;
  },
  setResources(state, data) {
    state.data = data.items.map(obj => mapItem(obj));
  },
  setResource(state, data) {
    const item = mapItem(data);
    const index = findIndex(
      state.data,
      x => x.id === item.id,
    );
    if (index !== -1) {
      state.data.splice(index, 1, item);
    } else {
      state.data.splice(0, 0, item);
    }
  },
  addResource(state, data) {
    const item = mapItem({ ...data.resource, ...data.data });
    state.data.unshift(item);
  },
  updateResource(state, data) {
    const item = Object.assign(data.resource, data.data, data.payload);
    const index = findIndex(
      state.data,
      x => x.id === item.id,
    );
    if (index !== -1) {
      state.data.splice(index, 1, item);
    }
  },
  removeData(state, id) {
    const index = findIndex(state.data, ['id', id]);
    if (index !== -1) {
      state.data.splice(index, 1);
    }
  },
  setPendingResource(state, data) {
    state.pendingResource = data;
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
        pendingResource: null,
        error: null,
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
