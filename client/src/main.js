import Vue from 'vue';
import VueSocketIO from 'vue-socket.io';
import App from './App.vue';
import router from './router';
import store from './store';
import vuetify from './plugins/vuetify';

import serverUrl from './mixin/url';

Vue.config.productionTip = false;

Vue.use(new VueSocketIO({
  debug: false,
  connection: serverUrl(),
  vuex: {
    store,
    actionPrefix: 'WS_',
    mutationPrefix: 'WS_',
  },
}));

new Vue({
  router,
  store,
  vuetify,
  render: (h) => h(App),
}).$mount('#app');
