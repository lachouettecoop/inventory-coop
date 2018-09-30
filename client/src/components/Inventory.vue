<template>
  <v-layout column v-if="inventory">
    <v-flex>
      <v-card raw>
        <v-card-text>
          <span class="headline">Inventaire du {{ inventory.date }}</span>
          <div class="right">
            <v-btn small right
                   v-if="inventory.status<2"
                   @click="changeStatus()">
              <template v-if="inventory.status==0">
                Activer
              </template>
              <template v-else>
                Arreter
              </template>
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-flex>
    <v-flex>
      <v-card>
        <input type="file" ref="file" style="display: none" accept=".csv" @change="parseFile">
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
              <td>{{ props.item.barcode }}</td>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-flex>
  </v-layout>
</template>

<script>
import Papa from 'papaparse';
import { isEmpty, findIndex } from 'lodash';

const ODOO_ID_COLUMN = 'product_variant_ids/product_variant_ids/id';
const NAME_COLUMN = 'name';
const BARCODE_COLUMN = 'barcode';
const QTY_COLOMN = 'product_variant_ids/qty_available';
const BULH_SIZE = 100;

export default {
  name: 'Inventory',
  data() {
    return {
      headers: [
        { text: 'Nom', value: 'name' },
        { text: 'Barcode', value: 'barcode' },
      ],
    };
  },
  created() {
    this.$store.dispatch({
      type: 'inventories/fetchResource',
      id: this.inventoryId,
    });
    this.$store.dispatch({
      type: 'products/getResourcesWhere',
      where: { inventory: `"${this.inventoryId}"` },
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
      return this.$store.getters['products/data'];
    },
  },
  methods: {
    changeStatus() {
      this.$store.dispatch({
        type: 'inventories/updateResource',
        resource: this.inventory,
        payload: { status: this.inventory.status + 1 },
      });
    },
    parseFile(e) {
      Papa.parse(e.target.files[0], {
        complete: (results) => {
          const nameIndex = findIndex(
            results.data[0],
            x => x === NAME_COLUMN,
          );
          const barcodeIndex = findIndex(
            results.data[0],
            x => x === BARCODE_COLUMN,
          );
          const qtyIndex = findIndex(
            results.data[0],
            x => x === QTY_COLOMN,
          );
          const odooIdIndex = findIndex(
            results.data[0],
            x => x === ODOO_ID_COLUMN,
          );
          if (nameIndex < 0 || barcodeIndex < 0 || qtyIndex < 0 || odooIdIndex < 0) {
            // TODO raise error
            return;
          }
          let productList = [];
          for (let i = 1; i < results.data.length; i += 1) {
            const name = results.data[i][nameIndex];
            const barcode = results.data[i][barcodeIndex];
            let qty = Number(results.data[i][qtyIndex]);
            const odooId = results.data[i][odooIdIndex];
            if (!isEmpty(name) && !isEmpty(odooId) && !isEmpty(barcode)) {
              if (!qty) {
                qty = 0;
              }
              productList.push({
                name,
                barcode,
                qty: Number(qty),
                odoo_id: odooId,
                inventory: this.inventory.id,
              });
            }
            if (productList.length >= BULH_SIZE || i === results.data.length - 1) {
              this.$store.dispatch({
                type: 'products/createResource',
                resource: productList,
              });
              productList = [];
            }
          }
        },
        error: (error) => {
          // TODO raise error
        },
      });
    },
  },
};
</script>

<style scoped>

</style>
