import Vue from 'vue';
import Vuex from 'vuex';
import apiModules from './api';
import authentication from './authentication';
import counts from './counts';

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    ...apiModules,
    counts,
    authentication,
  },
  strict: process.env.NODE_ENV !== 'production',
});
