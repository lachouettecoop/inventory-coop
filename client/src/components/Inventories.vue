<template>
  <v-layout row>
    <v-flex xs12 sm6 offset-sm3>
      <img src="@/assets/logo.png">
      <v-card>
        <v-card-title primary-title>
          <div class="headline">Gestion des inventaires</div>
          <v-btn fab absolute right color="teal darken-3" class="white--text"
                 @click="addInventory">
            <v-icon>add</v-icon>
          </v-btn>
        </v-card-title>
        <v-list>
          <template v-for="inventory in inventories">
            <v-list-tile
              :key="inventory.id"
              avatar
            >
              <v-list-tile-avatar>
                <v-icon v-if="inventory.active">fas fa-spinner</v-icon>
                <v-icon v-else>fas fa-stop-circle</v-icon>
              </v-list-tile-avatar>

              <v-list-tile-content>
                <v-list-tile-title v-html="inventory.date"></v-list-tile-title>
              </v-list-tile-content>
              <div>
                <v-btn fab small
                       @click="jumpToInventoryDetails(inventory)">
                  <v-icon v-if="inventory.status<2"
                          color="indigo darken-1">
                    fas fa-edit
                  </v-icon>
                  <v-icon v-else
                          color="green darken-1">
                    fas fa-eye
                  </v-icon>
                </v-btn>
                <v-btn fab small
                       @click="removeInventory(inventory)">
                  <v-icon color="red lighten-2">fas fa-trash</v-icon>
                </v-btn>
              </div>
            </v-list-tile>
          </template>
        </v-list>
      </v-card>
    </v-flex>
  </v-layout>
</template>

<script>
export default {
  name: 'Inventories',
  created() {
    this.$store.dispatch('inventories/getResources');
  },
  computed: {
    inventories() {
      return this.$store.getters['inventories/data'];
    },
    loading() {
      return this.$store.getters['inventories/isLoading'];
    },
  },
  methods: {
    jumpToInventoryDetails(inventory) {
      this.$router.push({ name: 'Inventory', params: { id: inventory.id } });
    },
    addInventory() {
      const today = new Date();
      let dd = today.getDate();
      let mm = today.getMonth() + 1;
      const yyyy = today.getFullYear();
      if (dd < 10) { dd = `0${dd}`; }
      if (mm < 10) { mm = `0${mm}`; }
      const date = `${yyyy}-${mm}-${dd}`;
      const resource = {
        date,
        status: 0,
      };
      this.$store.dispatch({
        type: 'inventories/createResource',
        resource,
      });
    },
    removeInventory(inventory) {
      this.$store.dispatch({
        type: 'inventories/deleteResource',
        resource: inventory,
      });
    },
  },
};
</script>

<style scoped>

</style>
