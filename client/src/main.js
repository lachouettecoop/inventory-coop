import Vue from 'vue';
import Vuetify from 'vuetify';
import colors from 'vuetify/es5/util/colors';
import 'vuetify/dist/vuetify.min.css';

import App from './App';
import router from './router';
import store from './store';

Vue.config.productionTip = false;
Vue.use(Vuetify, {
  theme: {
    primary: colors.teal.darken3,
  },
});

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  store,
  components: { App },
  template: '<App/>',
});
