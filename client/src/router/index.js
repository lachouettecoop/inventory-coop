import Vue from 'vue';
import Router from 'vue-router';

import Inventories from '@/components/Inventories';
import Inventory from '@/components/Inventory';

Vue.use(Router);

export default new Router({
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
  ],
});
