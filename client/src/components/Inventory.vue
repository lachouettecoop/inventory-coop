<template>
  <v-layout column v-if="inventory">
    <v-flex>
      <v-card>
        <v-card-text>
          <v-container fluid>
            <v-layout raw>
              <v-layout align-center justify-start row fill-height>
                <span class="headline">Inventaire du {{ inventory.date }}</span>
              </v-layout>
              <v-layout align-center justify-end row fill-height>
                <v-switch label="Refresh" v-model="refreshCounts" color="blue"></v-switch>
                <v-btn small
                       v-if="inventory.status<2"
                       @click="changeStatus()">
                  <template v-if="inventory.status==0">
                    Activer
                  </template>
                  <template v-else>
                    Arreter
                  </template>
                </v-btn>
              </v-layout>
            </v-layout>
          </v-container>
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
                <th></th>
              </tr>
            </template>
            <template slot="items" slot-scope="props">
              <td class="text-xs-left" width="30%">{{ props.item.name }}</td>
              <td class="text-xs-left">{{ props.item.barcode }}</td>
              <td class="text-xs-center">{{ props.item.qty_in_odoo }}</td>
              <td :class="productClass(props.item)">{{ props.item.errOdoo }}</td>
              <td :class="productClass(props.item)">{{ props.item.errCount }}</td>
              <td v-for="(counterAtZone, index) in countersAtZone"
                  :key="index"
                  :class="productClass(props.item)">
                <v-text-field background-color="blue-grey lighten-5"
                              @input="changeCounts(props.item)"
                              v-model="props.item[counterAtZone]">
                </v-text-field>
              </td>
              <td>
                <v-btn color="success"
                       :disabled="!props.item.modified"
                       @click="saveCount(props.item)">
                  Save
                </v-btn>
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
import { clone, isEmpty, findIndex, get, trim } from 'lodash';

const ODOO_ID_COLUMN = 'product_variant_ids/product_variant_ids/id';
const NAME_COLUMN = 'name';
const BARCODE_COLUMN = 'barcode';
const QTY_COLOMN = 'product_variant_ids/qty_available';
const SEPARATOR = ' - ';

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
      productsAndCounts: [],
      refreshCounts: false,
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
  watch: {
    refreshCounts(status) {
      if (status) {
        this.interval = setInterval(this.loadCounts, 5000);
      } else {
        clearInterval(this.interval);
      }
    },
    products() {
      this.initProductAndCounts();
      this.updateProductsAndCounts();
    },
    counts() {
      if (isEmpty(this.productsAndCounts)) {
        this.initProductAndCounts();
      }
      this.updateProductsAndCounts();
    },
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
        countersAtZone.add(`${count.zone}${SEPARATOR}${count.counter}`);
      });
      return [...countersAtZone].sort();
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
  },
  methods: {
    loadCounts() {
      const where = { inventory: `${this.inventoryId}` };
      if (!isEmpty(this.lastUpdatedCount)) {
        where.updated = { $gte: `${this.lastUpdatedCount}` };
      }
      this.$store.dispatch({
        type: 'counts/getResourcesWhere',
        where,
      }).catch((reason) => {
        this.alert.message = reason;
        this.alert.show = true;
        clearInterval(this.interval);
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
        return 'text-xs-center red lighten-3';
      } else if (product.errOdoo > 0) {
        return 'text-xs-center amber lighten-4';
      } else if (!isEmpty(product.zones)) {
        return 'text-xs-center green lighten-4';
      }
      return 'text-xs-center';
    },
    changeSort(column) {
      if (this.pagination.sortBy === column) {
        this.pagination.descending = !this.pagination.descending;
      } else {
        this.pagination.sortBy = column;
        this.pagination.descending = false;
      }
    },
    unjoinCounterAtZone(counterAtZone) {
      const result = counterAtZone.split(SEPARATOR);
      return {
        zone: result[0],
        counter: result[1],
      };
    },
    changeCounts(productAndCounts) {
      let modified = false;
      this.countersAtZone.forEach((counterAtZone) => {
        const counter = this.unjoinCounterAtZone(counterAtZone).counter;
        const zoneName = this.unjoinCounterAtZone(counterAtZone).zone;
        const zoneIndex = findIndex(productAndCounts.zones, { name: zoneName });
        const qty = +get(productAndCounts, counterAtZone, 0);
        if (zoneIndex < 0) {
          modified = modified || (qty !== 0);
        } else {
          const zone = productAndCounts.zones[zoneIndex];
          const countIndex = findIndex(zone.counts, { counter });
          if (countIndex < 0) {
            modified = modified || (qty !== 0);
          } else if (qty !== zone.counts[countIndex].qty) {
            modified = true;
          }
        }
      });
      this.updateErrors(productAndCounts);
      productAndCounts.modified = modified; // eslint-disable-line no-param-reassign
    },
    saveCount(productAndCounts) {
      const counts = [];
      this.countersAtZone.forEach((counterAtZone) => {
        const qty = +get(productAndCounts, counterAtZone, 0);
        const counter = this.unjoinCounterAtZone(counterAtZone).counter;
        const zoneName = this.unjoinCounterAtZone(counterAtZone).zone;
        const zoneIndex = findIndex(productAndCounts.zones, { name: zoneName });
        if (zoneIndex < 0 && qty > 0) {
          counts.push({ counter, zone: zoneName, qty });
        } else if (zoneIndex >= 0) {
          const zone = productAndCounts.zones[zoneIndex];
          const countIndex = findIndex(zone.counts, { counter });
          if (countIndex < 0 && qty > 0) {
            counts.push({ counter, zone: zoneName, qty });
          } else if (countIndex >= 0) {
            const count = zone.counts[countIndex];
            if (qty !== count.qty) {
              counts.push({ counter, zone: zoneName, qty: qty - count.qty });
            }
          }
        }
      });
      if (!isEmpty(counts)) {
        this.$store.dispatch({
          type: 'counts/createResource',
          resource: counts.map(count => ({
            counter: count.counter,
            zone: count.zone,
            qty: count.qty,
            product: productAndCounts.id,
            inventory: productAndCounts.inventory,
          })),
        }).then(() => {
          this.changeCounts(productAndCounts);
        });
      }
    },
    initProductAndCounts() {
      this.productsAndCounts = [];
      this.lastUpdatedCount = '';
      this.products.forEach((product) => {
        const productAndCounts = clone(product);
        productAndCounts.zones = [];
        productAndCounts.errCount = 0;
        productAndCounts.errOdoo = 0;
        productAndCounts.modified = false;
        this.productsAndCounts.push(productAndCounts);
      });
    },
    updateErrors(productAndCounts) {
      productAndCounts.errCount = 0; // eslint-disable-line no-param-reassign
      let totalQty = 0;
      productAndCounts.zones.forEach((zone) => {
        let zoneQty = 0;
        let firstLoop = true;
        zone.counts.forEach((count) => {
          if (firstLoop) {
            zoneQty = count.qty;
            firstLoop = false;
          } else if (zoneQty !== count.qty) {
            productAndCounts.errCount = // eslint-disable-line no-param-reassign
              Math.max(productAndCounts.errCount, Math.abs(zoneQty - count.qty));
          }
        });
        totalQty += zoneQty;
      });
      if (totalQty !== productAndCounts.qty_in_odoo) {
        productAndCounts.errOdoo = // eslint-disable-line no-param-reassign
          Math.abs(totalQty - productAndCounts.qty_in_odoo);
      }
    },
    updateProductsAndCounts() {
      const updatedProductsAndCounts = [];
      let lastUpdatedCount = this.lastUpdatedCount;
      this.counts.forEach((count) => {
        if (count.updated > this.lastUpdatedCount) {
          const productIndex = findIndex(this.productsAndCounts, { id: count.product });
          if (productIndex >= 0) {
            const productAndCounts = this.productsAndCounts[productIndex];
            let zoneIndex = findIndex(productAndCounts.zones, { name: count.zone });
            if (zoneIndex < 0) {
              zoneIndex = productAndCounts.zones.push({ name: count.zone, counts: [] }) - 1;
            }
            const zone = this.productsAndCounts[productIndex].zones[zoneIndex];
            let countIndex = findIndex(zone.counts, { counter: count.counter });
            if (countIndex < 0) {
              countIndex = zone.counts.push({ counter: count.counter, qty: count.qty }) - 1;
            } else {
              zone.counts[countIndex].qty += count.qty;
            }
            productAndCounts[`${count.zone}${SEPARATOR}${count.counter}`] = zone.counts[countIndex].qty;
            if (count.updated > lastUpdatedCount) {
              // eslint-disable-next-line vue/no-side-effects-in-computed-properties
              lastUpdatedCount = count.updated;
            }
            updatedProductsAndCounts.push(productAndCounts);
          }
        } else {
          // TODO ERROR
        }
      });
      this.lastUpdatedCount = lastUpdatedCount;

      updatedProductsAndCounts.forEach((productAndCounts) => {
        this.updateErrors(productAndCounts);
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
    text-align: center;
    white-space: nowrap;
    transform: rotate(90deg) !important;
  }
  .verticalTableHeader p {
    margin: 0 -999px;/* virtually reduce space needed on width to very little */
    display: inline-block;
  }
  .verticalTableHeader p:before {
    content: '';
    width: 0;
    padding-top: 110%;
    /* takes width as reference, + 10% for faking some extra padding */
    display: inline-block;
    vertical-align: middle;
  }
</style>
