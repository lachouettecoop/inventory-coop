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
  createResource({ commit }, { url, resource }) {
    commit('setDataLoading', true);
    commit('setPendingResource', { type: 'create', data: resource || key });
    return new Promise((resolve, reject) => {
      axios.post(`${process.env.apiBaseUrl}/${key}${url || ''}`, resource)
        .then(({ data }) => {
          commit('addResource', data);
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
  updateResource({ commit }, { id, subpath, resource }) {
    commit('setDataLoading', true);
    commit('setPendingResource', { type: 'update', data: resource || id });
    return new Promise((resolve, reject) => {
      axios.put(`${process.env.apiBaseUrl}/${key}/${id}${subpath || ''}`, resource)
        .then(({ data }) => {
          commit('setDataLoading', false);
          commit('updateResource', data);
          commit('setPendingResource');
          resolve(data);
        })
        .catch((error) => {
          onError(key, commit, error, reject);
          commit('setPendingResource');
        });
    });
  },
  deleteResource({ commit }, { id }) {
    commit('setDataLoading', true);
    return new Promise((resolve, reject) => {
      axios({
        method: 'delete',
        url: `${process.env.apiBaseUrl}/${key}/${id}`,
        responseType: 'json',
      })
        .then(() => {
          commit('setDataLoading', false);
          commit('removeData', id);
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
    state.data = data._items.map(obj => mapItem(obj)); // eslint-disable-line no-underscore-dangle
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
    state.data.unshift(mapItem(data));
  },
  updateResource(state, data) {
    const index = findIndex(
      state.data,
      x => x.id === data.id,
    );
    if (index !== -1) {
      state.data.splice(index, 1, data);
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
