import Vue from 'vue';
import Vuex from 'vuex';
import apiModules from './api';

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    ...apiModules,
  },
  strict: process.env.NODE_ENV !== 'production',
});
