import axios from 'axios';
import jwt_decode from 'jwt-decode'; // eslint-disable-line camelcase

import router from '@/router/index';
import authHeader from '@/mixin/authHeader';
import { recordTokenInCookie, removeCookieToken } from '@/mixin/cookie';
import serverUrl from '@/mixin/url';

const initialState = { status: {}, token: null, user: (process.env.NODE_ENV === 'production') ? null : { role: 'admin' } };

const getters = {
  status: state => state.status,
  token: state => state.token,
  user: state => state.user,
};

const authentication = {
  namespaced: true,
  state: initialState,
  getters,
  actions: {
    login({ commit }, { email, password }) {
      commit('loginRequest', email);
      return new Promise((resolve, reject) => {
        axios({
          method: 'post',
          url: `${serverUrl()}/login`,
          data: { email, password },
        }).then(({ data }) => {
          commit('loginSuccess', data);
          resolve(data);
          router.push({ name: 'Inventories' });
        }).catch((error) => {
          commit('loginFailure', error);
          reject(error);
        });
      });
    },
    refresh({ commit }) {
      return new Promise((resolve, reject) => {
        axios({
          method: 'post',
          url: `${serverUrl()}/login/refresh`,
          headers: authHeader(),
        }).then(({ data }) => {
          commit('loginSuccess', data);
          resolve(data);
          router.push({ name: 'Inventories' });
        }).catch((error) => {
          commit('loginFailure', error);
          reject(error);
        });
      });
    },
    logout({ commit }) {
      commit('logout');
    },
  },
  mutations: {
    loginRequest(state, email) {
      state.status = { loggingIn: true };
      state.user = { email };
    },
    loginSuccess(state, data) {
      if (data.token) {
        recordTokenInCookie(data.token);
        const user = jwt_decode(data.token);
        state.status = { loggedIn: true };
        state.token = data.token;
        state.user = user;
      }
    },
    loginFailure(state) {
      removeCookieToken();
      state.status = {};
      state.token = null;
      state.user = null;
    },
    logout(state) {
      removeCookieToken();
      state.status = {};
      state.token = null;
      state.user = null;
    },
  },
};

export default authentication;
