import Vue from 'vue';
import Vuex from 'vuex';
import apiModules from './api';
import authentication from './authentication';

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    ...apiModules,
    authentication,
  },
  strict: process.env.NODE_ENV !== 'production',
});
