<template>
  <v-layout row>
    <v-flex xs12 sm6 offset-sm3>
      <v-card>
        <v-card-title primary-title>
          <div class="headline">Inventaire</div>
          <v-btn fab absolute right color="teal darken-3" class="white--text">
            <v-icon>present_to_all</v-icon>
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
                <v-btn fab small>
                  <v-icon v-if="inventory.active" color="indigo darken-1">fas fa-edit</v-icon>
                  <v-icon v-else color="green darken-1">fas fa-eye</v-icon>
                </v-btn>
                <v-btn fab small>
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
  name: 'Inventory.vue',
};
</script>

<style scoped>

</style>
