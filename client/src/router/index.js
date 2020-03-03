import Vue from 'vue';
import Router from 'vue-router';

import Inventories from '@/components/Inventories';
import Inventory from '@/components/Inventory';
import Login from '@/components/Login';
import { getTokenFromCookie } from '@/mixin/cookie';
import store from '@/store';

Vue.use(Router);

async function redirectIfNotLogged(to, from, next) {
  const publicPages = ['/login'];
  const authRequired = !publicPages.includes(to.path) && process.env.NODE_ENV === 'production';
  const loggedIn = store.getters['authentication/status'].loggedIn;

  if (authRequired && !loggedIn) {
    const token = getTokenFromCookie();
    if (token) {
      await store.dispatch({
        type: 'authentication/refresh',
      }).then(() => next(),
      ).catch(() => next('/login'));
    } else {
      return next('/login');
    }
  }
  return next();
}

const router = new Router({
  routes: [
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
  ],
});

router.beforeEach(redirectIfNotLogged);

export default router;
