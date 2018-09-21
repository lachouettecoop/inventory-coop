import Vue from 'vue';
import Vuetify from 'vuetify';
import 'vuetify/dist/vuetify.min.css';
import colors from 'vuetify/es5/util/colors';
import App from './App.vue';
import router from './router';
import store from './store';

Vue.config.productionTip = false;
Vue.use(Vuetify, {
  theme: {
    primary: colors.grey.darken4,
    secondary: colors.yellow.accent4,
    accent: colors.purple.base,
    error: colors.red.darken1,
    warning: colors.orange.darken1,
    info: colors.blue.darken1,
    success: colors.green.darken1,
  },
});

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  store,
  render: h => h(App),
});
