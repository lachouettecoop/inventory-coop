import '@fortawesome/fontawesome-free/css/all.css';
import Vue from 'vue';
import Vuetify from 'vuetify/lib';
import fr from 'vuetify/es5/locale/fr';

Vue.use(Vuetify);

export default new Vuetify({
  icons: {
    iconfont: 'fa',
  },
  lang: {
    locales: { fr },
    current: 'fr',
  },
  theme: {
    themes: {
      light: {
        primary: '#445448',
      },
    },
  },
});
