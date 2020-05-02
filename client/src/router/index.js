import Vue from 'vue';
import VueRouter from 'vue-router';
import Inventories from '../components/Inventories.vue';
import Inventory from '../components/Inventory.vue';
import Login from '../components/Login.vue';
import { getTokenFromCookie } from '../mixin/cookie';
import store from '../store';

Vue.use(VueRouter);

async function redirectIfNotLogged(to, from, next) {
  const publicPages = ['/login'];
  const authRequired = !publicPages.includes(to.path) && process.env.NODE_ENV === 'production';
  const { loggedIn } = store.getters['authentication/status'];

  if (authRequired && !loggedIn) {
    const token = getTokenFromCookie();
    if (token) {
      await store.dispatch({
        type: 'authentication/refresh',
      }).then(() => next()).catch(() => next('/login'));
    } else {
      return next('/login');
    }
  }
  return next();
}

const routes = [
  {
    path: '/',
    name: 'Home',
    redirect: { name: 'Inventories' },
  },
  {
    path: '/inventories',
    name: 'Inventories',
    component: Inventories,
    meta: {
      breadcrumb: [
        { name: 'Inventaires' },
      ],
    },
  },
  {
    path: '/inventories/:id',
    name: 'Inventory',
    component: Inventory,
    meta: {
      breadcrumb: [
        { name: 'Inventaires', link: '/inventories' },
        { name: 'Inventaire détaillé' },
      ],
    },
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
  },
  {
    path: '*',
    redirect: { name: 'Inventaires' },
  },
];

const router = new VueRouter({
  routes,
});

router.beforeEach(redirectIfNotLogged);

export default router;
