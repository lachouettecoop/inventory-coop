import Vue from 'vue'
import Router from 'vue-router'
import Inventories from '@/components/Inventories'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Inventories',
      component: Inventories
    }
  ]
})
