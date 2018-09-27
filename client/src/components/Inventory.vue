<template>
  <v-layout row wrap v-if="inventory">
    <v-flex xs12 lg8 offset-lg2>
      <v-card>
        <v-card-title class="title">
          General Information
        </v-card-title>
        <v-card-text>
          <span class="grey--text">{{ inventory.date }}</span>
          <br/>
          <span class="indigo--text">{{ inventory.active }}</span>
        </v-card-text>
        <v-card-actions>
          <v-btn color="white" class="purple--text" :href="inventory.link"  target="_blank">
            {{
            inventory.importType === 'config' ?
            'mirror config file' :
            'Gitlab group'
            }}
            <v-icon color="accent" small>open_in_new</v-icon>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-flex>
    <v-flex xs12 lg8 offset-lg2>
      <v-card>
        <v-card-title class="title">Liste des produits</v-card-title>
        <v-card-text >
          <v-data-table
            :headers="headers"
            :items="products"
            class="elevation-1"
          >
            <template slot="items" slot-scope="props">
              <td>
                <a :href="getExternalRepositoryLink(props.item)"
                   class="accent--text"
                >
                  {{ props.item.name }}
                </a>
              </td>
              <td>{{ props.item.path }}</td>
              <td>{{ props.item.branch }}</td>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-flex>
  </v-layout>
</template>

<script>
export default {
  name: 'Inventory',
  created() {
    this.$store.dispatch('inventories/fetchResource')(this.inventoryId);
  },
  computed: {
    inventoryId() {
      return +this.$route.params.id;
    },
    inventory() {
      return this.$store.getters['inventories/getData'](this.inventoryId);
    },
    products() {
      return this.$store.getters['products/getData'](this.inventoryId);
    },
  },
};
</script>

<style scoped>

</style>
