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
    <v-alert v-model="alert.show" dismissible @type="alert.type">
      {{alert.message}}
    </v-alert>
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
        <v-card-text>
          <v-progress-circular v-if="isLoading" indeterminate color="primary"/>
          <v-data-table
            v-else
            :items="productsAndCounts"
            :headers="headers"
            :pagination.sync="pagination"
            :rows-per-page-items="row_per_page"
          >
            <template slot="headers" slot-scope="props">
              <tr>
                <th
                  v-for="header in props.headers"
                  :key="header.text"
                  :class="[header.class,
                         pagination.descending ? 'desc' : 'asc',
                         header.value === pagination.sortBy ? 'active' : '']"
                  @click="changeSort(header.value)"
                >
                  <p>{{ header.text }}</p>
                </th>
              </tr>
            </template>
            <template slot="items" slot-scope="props">
              <td class="text-xs-left" width="30%">{{ props.item.name }}</td>
              <td class="text-xs-left">{{ props.item.barcode }}</td>
              <td class="text-xs-left">{{ props.item.qty_in_odoo }}</td>
              <td :class="productClass(props.item)">{{ props.item.errOdoo }}</td>
              <td :class="productClass(props.item)">{{ props.item.errCount }}</td>
              <td v-for="(counterAtZone, index) in countersAtZone"
                  :key="index"
                  :class="productClass(props.item)">
                {{ props.item[counterAtZone] }}
              </td>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-flex>
  </v-layout>
</template>

<script>
import Papa from 'papaparse';
import { clone, isEmpty, findIndex, forEach, trim } from 'lodash';

const ODOO_ID_COLUMN = 'product_variant_ids/product_variant_ids/id';
const NAME_COLUMN = 'name';
const BARCODE_COLUMN = 'barcode';
const QTY_COLOMN = 'product_variant_ids/qty_available';

export default {
  name: 'Inventory',
  data() {
    return {
      pagination: {
        sortBy: 'name',
      },
      row_per_page: [
        25, 50, 100,
        {
          text: '$vuetify.dataIterator.rowsPerPageAll',
          value: -1,
        },
      ],
      alert: {
        show: false,
        message: '',
        type: 'error',
      },
      interval: null,
    };
  },
  created() {
    this.$store.dispatch({
      type: 'inventories/fetchResource',
      id: this.inventoryId,
    });
    this.$store.dispatch({
      type: 'products/getResourcesWhere',
      where: { inventory: `${this.inventoryId}` },
    });
    this.loadCounts();
  },
  beforeDestroy() {
    clearInterval(this.interval);
  },
  computed: {
    inventoryId() {
      return this.$route.params.id;
    },
    inventory() {
      return this.$store.getters['inventories/getData'](this.inventoryId);
    },
    products() {
      return this.$store.getters['products/getInventoryData'](this.inventoryId);
    },
    counts() {
      return this.$store.getters['counts/getInventoryData'](this.inventoryId);
    },
    isLoading() {
      return this.$store.getters['products/isLoading'];
    },
    countersAtZone() {
      const countersAtZone = new Set();
      this.counts.forEach((count) => {
        countersAtZone.add(`${count.counter}@${count.zone}`);
      });
      return [...countersAtZone];
    },
    zonesAndCounters() {
      const zonesAndCounters = new Map();
      this.counts.forEach((count) => {
        zonesAndCounters[`${count.zone}@${count.counter}`] = { zone: count.zone, counter: count.counter };
      });
      return [...zonesAndCounters.values()].sort((a, b) => {
        if (a.zone < b.zone || (a.zone === b.zone && a.counter < b.counter)) {
          return -1;
        }
        if (a.zone > b.zone || (a.zone === b.zone && a.counter > b.counter)) {
          return 1;
        }
        return 0;
      });
    },
    headers() {
      const headers = [
        { text: 'Nom', value: 'name', class: 'column sortable text-xs-left' },
        { text: 'Barcode', value: 'barcode', class: 'column sortable text-xs-left' },
        { text: 'Quantité', value: 'qty_in_odoo', class: 'column sortable verticalTableHeader' },
        { text: 'Ecart avec Odoo', value: 'errOdoo', class: 'column sortable verticalTableHeader' },
        { text: 'Ecart entre conteur', value: 'errCount', class: 'column sortable verticalTableHeader' },
      ];
      return headers.concat(
        this.countersAtZone.map(conterAtZone => ({
          text: conterAtZone,
          value: conterAtZone,
          class: 'column sortable verticalTableHeader',
        })),
      );
    },
    productsAndCounts() {
      const productsAndCounts = [];
      this.products.forEach((product) => {
        const productAndCounts = clone(product);
        productAndCounts.zones = [];
        productAndCounts.errCount = 0;
        productAndCounts.errOdoo = 0;
        const counts = this.counts.filter(count => count.product === product.id);
        counts.forEach((count) => {
          let zoneIndex = findIndex(productAndCounts.zones, { name: count.zone });
          if (zoneIndex < 0) {
            zoneIndex = productAndCounts.zones.push({ name: count.zone, counts: [] }) - 1;
          }
          let countIndex = findIndex(productAndCounts.zones[zoneIndex].counts, {
            counter: count.counter,
          });
          if (countIndex < 0) {
            countIndex = productAndCounts.zones[zoneIndex].counts.push({
              counter: count.counter,
              qty: count.qty,
            }) - 1;
          } else {
            productAndCounts.zones[zoneIndex].counts[countIndex].qty += count.qty;
          }
          productAndCounts[`${count.counter}@${count.zone}`] =
            productAndCounts.zones[zoneIndex].counts[countIndex].qty;
        });
        productsAndCounts.push(productAndCounts);
      });
      productsAndCounts.forEach((productAndCounts) => {
        let qty = 0;
        forEach(productAndCounts.zones, (zone) => {
          let qtyByZone = -1;
          forEach(zone.counts, (count) => {
            if (qtyByZone < 0) {
              qtyByZone = count.qty;
            } else if (qtyByZone !== count.qty) {
              productAndCounts.errCount += // eslint-disable-line no-param-reassign
                Math.abs(qtyByZone - count.qty);
            }
          });
          if (qtyByZone >= 0) {
            qty += qtyByZone;
          }
        });
        if (qty !== productAndCounts.qty_in_odoo) {
          productAndCounts.errOdoo = // eslint-disable-line no-param-reassign
            Math.abs(qty - productAndCounts.qty_in_odoo);
        }
      });
      return productsAndCounts;
    },
  },
  methods: {
    loadCounts() {
      this.$store.dispatch({
        type: 'counts/getResourcesWhere',
        where: { inventory: `${this.inventoryId}` },
      });
    },
    changeStatus() {
      this.$store.dispatch({
        type: 'inventories/updateResource',
        resource: this.inventory,
        payload: { status: this.inventory.status + 1 },
      });
    },
    productClass(product) {
      if (product.errCount > 0) {
        return 'text-xs-left red lighten-3';
      } else if (product.errOdoo > 0) {
        return 'text-xs-left amber lighten-4';
      } else if (!isEmpty(product.zones)) {
        return 'text-xs-left green lighten-4';
      }
      return 'text-xs-left';
    },
    getQty(zoneAndCounter, productAndCounts) {
      const zoneIndex = findIndex(
        productAndCounts.zones,
        { name: zoneAndCounter.zone },
      );
      if (zoneIndex >= 0) {
        const countIndex = findIndex(
          productAndCounts.zones[zoneIndex].counts,
          { counter: zoneAndCounter.counter },
        );
        if (countIndex >= 0) {
          return productAndCounts.zones[zoneIndex].counts[countIndex].qty;
        }
      }
      return '';
    },
    changeSort(column) {
      if (this.pagination.sortBy === column) {
        this.pagination.descending = !this.pagination.descending;
      } else {
        this.pagination.sortBy = column;
        this.pagination.descending = false;
      }
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
          const productList = [];
          for (let i = 1; i < results.data.length; i += 1) {
            const name = trim(results.data[i][nameIndex]);
            const barcode = trim(results.data[i][barcodeIndex]);
            let qty = Number(trim(results.data[i][qtyIndex]));
            const odooId = trim(results.data[i][odooIdIndex]);
            if (!isEmpty(name) && !isEmpty(odooId) && !isEmpty(barcode)) {
              if (!qty) {
                qty = 0;
              }
              productList.push({
                name,
                barcode,
                qty_in_odoo: Number(qty),
                odoo_id: odooId,
                inventory: this.inventory.id,
              });
            }
          }
          this.$store.dispatch({
            type: 'products/createResource',
            resource: productList,
          });
        },
        error: (error) => {
          this.alert = {
            show: true,
            message: `Error during CSV parsing: ${error}`,
            type: 'error',
          };
        },
      });
    },
  },
};
</script>

<style scoped>
  .verticalTableHeader {
    text-align:center;
    white-space:nowrap;
    transform: rotate(90deg) !important;
  }
  .verticalTableHeader p {
    margin:0 -999px;/* virtually reduce space needed on width to very little */
    display:inline-block;
  }
  .verticalTableHeader p:before {
    content:'';
    width:0;
    padding-top:110%;
    /* takes width as reference, + 10% for faking some extra padding */
    display:inline-block;
    vertical-align:middle;
  }
  table {
    text-align:center;
  }
</style>
