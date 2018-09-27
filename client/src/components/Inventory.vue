<template>
  <v-layout column v-if="inventory">
    <v-flex>
      <v-card raw>
        <v-card-text>
          <span class="grey--text">{{ inventory.date }}</span>
          <span class="indigo--text">{{ inventory.active }}</span>
        </v-card-text>
      </v-card>
    </v-flex>
    <v-flex>
      <v-card>
        <input type="file" ref="file" style="display: none">
        <v-btn fab small right absolute
               @click="$refs.file.click()">
          <v-icon>fas fa-file-import</v-icon>
        </v-btn>
        <v-card-title class="title">
          <span>Liste des produits</span>
        </v-card-title>
        <v-card-text >
          <v-data-table
            :headers="headers"
            :items="products"
            class="elevation-1"
          >
            <template slot="items" slot-scope="props">
              <td>{{ props.item.name }}</td>
              <td>{{ props.item.barecode }}</td>
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
  data() {
    return {
      headers: [
        { text: 'Nom', value: 'name' },
        { text: 'Barecode', value: 'barecode' },
      ],
    };
  },
  mounted() {
    this.$store.dispatch({
      type: 'inventories/fetchResource',
      id: this.inventoryId,
    });
  },
  computed: {
    inventoryId() {
      return this.$route.params.id;
    },
    inventory() {
      return this.$store.getters['inventories/getData'](this.inventoryId);
    },
    products() {
      return this.$store.getters['products/getResources'];
    },
  },
  methods: {
  },
};
</script>

<style scoped>

</style>
