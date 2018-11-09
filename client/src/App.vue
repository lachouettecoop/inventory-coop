<template>
  <v-app id="app">
    <v-toolbar app fixed clipped-left height="38" flat color="primary" dark>
      <v-breadcrumbs>
        <v-breadcrumbs-item
          v-for="(breadcrumb, index) in breadcrumbList"
          :key="index"
        >
          <span class="white--text" @click="routeTo(index)">
            {{ breadcrumb.name }}
          </span>
        </v-breadcrumbs-item>
      </v-breadcrumbs>
    </v-toolbar>
    <v-content>
      <v-container grid-list-xl>
        <router-view/>
      </v-container>
    </v-content>
  </v-app>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      breadcrumbList: [],
    };
  },
  mounted() {
    this.updateBreadcrumbList();
  },
  watch: {
    '$route'() { this.updateBreadcrumbList(); }, // eslint-disable-line object-shorthand
  },
  methods: {
    routeTo(index) {
      if (this.breadcrumbList[index].link) this.$router.push(this.breadcrumbList[index].link);
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
  margin-top: 60px;
}
.v-input input {
  min-width: 20px;
  text-align: center;
}
</style>
