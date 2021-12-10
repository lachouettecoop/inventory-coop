<template>
  <v-layout column>
    <v-flex>
      <img src="@/assets/logo.png" center>
      <v-card style="max-width: 90%; margin: auto;">
        <v-card-title primary-title>
          <div class="headline">Gestion des inventaires</div>
          <v-btn v-if="user && user.role==='admin'"
                 fab absolute right color="teal darken-3" class="white--text"
                 @click="addInventory">
            <v-icon small>fa-plus</v-icon>
          </v-btn>
          <v-dialog v-if="user && user.role==='admin'"
                    v-model="addDialog"
                    persistent max-width="290">
            <template v-slot:activator="{ on }">
              <v-btn fab
                     absolute
                     right
                     color="teal darken-3"
                     class="white--text"
                     v-on="on"
                     slot="activator">
                <v-icon small>fa-plus</v-icon>
              </v-btn>
            </template>
            <v-card v-if="addInProgress">
              <v-card-text>
                Veuillez patienter, cette requette peut prendre un certain temps.
              </v-card-text>
              <v-card-actions class="justify-center">
                <v-progress-circular indeterminate color="primary"/>
              </v-card-actions>
            </v-card>
            <v-card v-else>
              <v-card-text>
                Ceci créera un l'inventaire  à partir des données contenues dans Odoo.
                Êtes-vous sur de vouloir continuer ?
              </v-card-text>
              <v-card-actions>
                <v-btn color="grey"
                       @click.native="addDialog=false">
                  Annuler
                </v-btn>
                <v-spacer/>
                <v-btn color="red lighten-2"
                       @click="addInventory">
                  Confirmer
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
          <v-dialog v-if="user && user.role==='admin'"
                    v-model="delDialog"
                    persistent max-width="290">
            <v-card>
              <v-card-text>
                Ceci supprimera l'inventaire et tous les comptes associés.
                Êtes-vous sur de vouloir continuer ?
              </v-card-text>
              <v-card-actions>
                <v-btn color="grey"
                       @click.native="delDialog=false">
                  Annuler
                </v-btn>
                <v-spacer/>
                <v-btn color="red lighten-2"
                       @click="removeInventory()">
                  Confirmer
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </v-card-title>
        <v-list>
          <template v-for="inventory in inventories">
            <v-list-item
              :key="inventory.id"
            >
              <v-list-item-avatar>
                <v-icon v-if="inventory.state===0" color="teal">fa-hourglass-start</v-icon>
                <v-icon v-else-if="inventory.state===1" color="green darken-1">fa-play</v-icon>
                <v-icon v-else>fa-stop-circle</v-icon>
              </v-list-item-avatar>

              <v-list-item-content>
                <v-list-item-title v-html="inventory.date"></v-list-item-title>
              </v-list-item-content>
              <div>
                <v-btn fab small
                       @click="jumpToInventoryDetails(inventory)">
                  <v-icon v-if="inventory.state<2"
                          color="indigo darken-1"
                          small>
                    fa-edit
                  </v-icon>
                  <v-icon v-else
                          color="green darken-1"
                          small>
                    fa-eye
                  </v-icon>
                </v-btn>
                <v-btn fab small @click="delInventory=inventory;delDialog=true">
                  <v-icon color="red lighten-2"
                          small>
                    fas fa-trash
                  </v-icon>
                </v-btn>
              </div>
            </v-list-item>
          </template>
        </v-list>
      </v-card>
    </v-flex>
  </v-layout>
</template>

<script>
import { orderBy } from 'lodash';
import { removeCookieToken } from '../mixin/cookie';

export default {
  name: 'Inventories',
  data() {
    return {
      addDialog: false,
      addInProgress: false,
      delDialog: false,
      delInventory: null,
      serverUrl: '',
    };
  },
  beforeMount() {
    this.$store.dispatch({
      type: 'inventories/getResources',
    }).catch((error) => {
      if (error.response?.status === 401) {
        removeCookieToken();
        this.$router.push({ name: 'Login' });
      }
    });
  },
  computed: {
    inventories() {
      const inventories = this.$store.getters['inventories/data'];
      return orderBy(inventories, ['created']);
    },
    loading() {
      return this.$store.getters['inventories/isLoading'];
    },
    user() {
      return this.$store.getters['authentication/user'];
    },
  },
  methods: {
    jumpToInventoryDetails(inventory) {
      this.$router.push({ name: 'Inventory', params: { id: inventory.id } });
    },
    addInventory() {
      this.addInProgress = true;
      this.$store.dispatch({
        type: 'inventories/createResource',
        resource: {},
      }).finally(() => {
        this.addDialog = false;
        this.addInProgress = false;
      });
    },
    removeInventory() {
      this.$store.dispatch({
        type: 'inventories/deleteResource',
        resource: this.delInventory,
      });
      this.delInventory = null;
      this.delDialog = false;
    },
  },
};
</script>

<style scoped>
</style>
