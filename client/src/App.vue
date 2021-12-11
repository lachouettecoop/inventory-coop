<template>
  <v-app id="app">
    <v-app-bar
      app
      color="primary"
      dark
      height="38"
    >
      <v-breadcrumbs :items="breadcrumbList">
        <template v-slot:item="{ item }">
          <v-breadcrumbs-item
            id="breadcrumbs-item"
          >
            <a v-if="item.link"
               class="white--text"
               @click="routeTo(item)">
              {{ item.name }}
            </a>
            <span v-else
                  class="grey--text">
              {{ item.name }}
            </span>
          </v-breadcrumbs-item>
        </template>
      </v-breadcrumbs>
      <v-spacer></v-spacer>
      <v-btn v-if="this.$route.name!=='Login'"
             small @click="logout()">
        Logout
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-container grid-list-xl>
        <router-view/>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import { removeCookieToken } from './mixin/cookie';

export default {
  name: 'App',
  data: () => ({
    breadcrumbList: [],
  }),
  mounted() {
    this.updateBreadcrumbList();
  },
  watch: {
    $route() {
      this.updateBreadcrumbList();
    }, // eslint-disable-line object-shorthand
  },
  methods: {
    routeTo(item) {
      if (item.link) this.$router.push(item.link);
    },
    logout() {
      removeCookieToken();
      this.$router.push({ name: 'Login' });
    },
    updateBreadcrumbList() {
      this.breadcrumbList = this.$route.meta.breadcrumb;
    },
  },
};
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 10px;
}
#app .container{
  max-width: 90%
}
.v-input input {
  min-width: 20px;
  text-align: center;
}
</style>
