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
                  <v-icon v-if="inventory.state<2"
                          color="indigo darken-1">
                    fas fa-edit
                  </v-icon>
                  <v-icon v-else
                          color="green darken-1">
                    fas fa-eye
                  </v-icon>
                </v-btn>
                <v-dialog v-model="dialog" persistent max-width="290">
                  <v-btn fab small
                         slot="activator">
                    <v-icon color="red lighten-2">fas fa-trash</v-icon>
                  </v-btn>
                  <v-card>
                    <v-card-text>
                      Ceci supprimera l'inventaire et tous les comptes associés.
                      Êtes-vous sur de vouloir continuer ?
                    </v-card-text>
                    <v-card-actions>
                      <v-btn color="grey" flat
                             @click.native="dialog=false">
                        Annuler
                      </v-btn>
                      <v-spacer/>
                      <v-btn color="red lighten-2" flat
                             @click="removeInventory(inventory)">
                        Confirmer
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-dialog>
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
  data() {
    return {
      dialog: false,
    };
  },
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
      this.$store.dispatch({
        type: 'inventories/createResource',
        resource: {},
      });
    },
    removeInventory(inventory) {
      this.$store.dispatch({
        type: 'inventories/deleteResource',
        resource: inventory,
      });
      this.dialog = false;
    },
  },
};
</script>

<style scoped>
</style>
