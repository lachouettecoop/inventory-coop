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
              <v-layout v-if="user.role==='admin'"
                        align-center justify-end row fill-height>
                <v-btn small
                       v-if="inventory.state===1"
                       :disabled="someErrorInCounts"
                       @click="changeState(2)">
                  Arreter
                </v-btn>
                <v-btn small
                       v-if="inventory.state===2"
                       @click="changeState(1)">
                  Reactiver
                </v-btn>
              </v-layout>
            </v-layout>
          </v-container>
        </v-card-text>
      </v-card>
    </v-flex>
    <v-flex>
      <v-card>
        <v-card-text>
          <v-container fluid>
            <v-layout raw>
              <v-layout align-left justify-end row fill-height>
                <v-btn v-if="inventory.state===1"
                       color="primary"
                       @click="loadCounts()">
                  Rafraichir
                </v-btn>
                <v-spacer/>
                <v-text-field label="Nom du produit ou Code barre"
                              prepend-icon="fas fa-search"
                              clearable
                              v-model="productFilter">
                </v-text-field>
                <v-spacer/>
                <span>Binôme(s):</span>
                <v-checkbox v-for="(zone, index) in zones"
                            :key="index"
                            :label="zone.name"
                            v-model="zone.show">
                </v-checkbox>
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
               v-if="user.role==='admin' && inventory.state===0"
               @click="$refs.file.click()">
          <v-icon>fas fa-file-import</v-icon>
        </v-btn>
        <v-btn fab small right absolute
               v-if="user.role==='admin' && inventory.state===2"
               @click="saveFile()">
          <v-icon>fas fa-file-export</v-icon>
        </v-btn>
        <v-card-title class="title">
          <span>Liste des produits</span>
        </v-card-title>
        <v-card-text>
          <v-progress-circular v-if="isLoading" indeterminate color="primary"/>
          <v-data-table
            v-else
            :items="filtredProductsAndCounts"
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
              <td :class="errorOdooClass(props.item)">{{ props.item.errOdoo }}</td>
              <td v-for="(counterAtZone, index) in valuesToDisplay()"
                  :key="index"
                  :class="productClass(props.item, counterAtZone)">
                <span v-if="isThisAnError(counterAtZone)"
                      class="font-weight-bold">
                  {{ props.item[counterAtZone] }}
                </span>
                <v-text-field v-else
                              background-color="blue-grey lighten-5"
                              :disabled="inventory.state>=2"
                              @input="changeCounts(props.item)"
                              v-model="props.item[counterAtZone]">
                </v-text-field>
              </td>
              <td>
                <v-btn color="success"
                       :disabled="!props.item.modified || inventory.state>=2"
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
import { clone, includes, isEmpty, find, findIndex, get, sortBy, trim } from 'lodash';
import moment from 'moment';

const ODOO_ID_COLUMN = 'line_ids/product_id/id';
const ODOO_ID_COLUMN_RE = '.*product_variant_ids/?.id';
const NAME_COLUMN = 'name';
const BARCODE_COLUMN = 'barcode';
const QTY_COLUMN = 'line_ids/product_qty';
const QTY_COLUMN_RE = '.*qty_available';
const LOCATION_COLUMN = 'location_id/id';
const LOCATION_VALUE = 'stock.stock_location_stock';
const PRODUCT_UOM_COLUMN = 'line_ids/product_uom_id/id';
const PRODUCT_UOM_VALUE = 'product.product_uom_unit';
const LINE_LOCATION_COLUMN = 'line_ids/location_id/id';
const LINE_LOCATION_VALUE = 'stock.stock_location_stock';


const SEPARATOR = ' - ';
const ERROR = 'Erreur';

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
      someErrorInCounts: false,
      zones: [],
      interval: null,
      filtredProductsAndCounts: [],
      productFilter: '',
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
    products() {
      this.initProductAndCounts();
      this.updateProductsAndCounts();
      this.applyFilter();
    },
    counts() {
      if (isEmpty(this.productsAndCounts)) {
        this.initProductAndCounts();
      }
      this.updateProductsAndCounts();
    },
    productFilter() {
      this.applyFilter();
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
    user() {
      return this.$store.getters['authentication/user'];
    },
    headers() {
      const headers = [
        { text: 'Nom', value: 'name', class: 'column sortable text-xs-left' },
        { text: 'Barcode', value: 'barcode', class: 'column sortable text-xs-left' },
        { text: 'Quantité théorique', value: 'qty_in_odoo', class: 'column sortable verticalTableHeader' },
        { text: 'Ecart avec Odoo', value: 'errOdoo', class: 'column sortable verticalTableHeader' },
      ];
      this.valuesToDisplay().forEach((value) => {
        headers.push({
          text: value,
          value,
          class: 'column sortable verticalTableHeader',
        });
      });
      return headers;
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
    changeState(state) {
      this.$store.dispatch({
        type: 'inventories/updateResource',
        resource: this.inventory,
        payload: { state },
      });
    },
    errorOdooClass(product) {
      if (product.errOdoo > 0) {
        return 'text-xs-center font-weight-bold amber lighten-4';
      }
      return 'text-xs-center font-weight-bold';
    },
    productClass(product, counterAtZone) {
      const zone = this.unjoinCounterAtZone(counterAtZone).zone;
      const zoneIndex = findIndex(product.zones, { name: zone });
      if (zoneIndex >= 0) {
        if (product.zones[zoneIndex].errCount > 0) {
          return 'text-xs-center red lighten-3';
        }
      }
      if (!isEmpty(product.zones)) {
        return 'text-xs-center green lighten-4';
      }
      return 'text-xs-center';
    },
    changeSort(column) {
      if (this.pagination.sortBy === column) {
        this.pagination.descending = !this.pagination.descending;
      } else {
        this.pagination.sortBy = column;
        this.pagination.descending = true;
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
      this.zones.forEach((zone) => {
        zone.counters.forEach((counter) => {
          const counterAtZone = `${zone.name}${SEPARATOR}${counter.name}`;
          const zoneIndex = findIndex(productAndCounts.zones, { name: zone.name });
          const qty = +get(productAndCounts, counterAtZone, 0);
          if (zoneIndex < 0) {
            modified = modified || (qty !== 0);
          } else {
            const countIndex = findIndex(productAndCounts.zones[zoneIndex].counts,
              { counter: counter.name });
            if (countIndex < 0) {
              modified = modified || (qty !== 0);
            } else if (qty !== productAndCounts.zones[zoneIndex].counts[countIndex].qty) {
              modified = true;
            }
          }
        });
      });
      this.updateErrors(productAndCounts);
      productAndCounts.modified = modified; // eslint-disable-line no-param-reassign
    },
    saveCount(productAndCounts) {
      const counts = [];
      this.zones.forEach((zone) => {
        zone.counters.forEach((counter) => {
          const counterAtZone = `${zone.name}${SEPARATOR}${counter.name}`;
          const qty = +get(productAndCounts, counterAtZone, 0);
          const zoneIndex = findIndex(productAndCounts.zones, { name: zone.name });
          if (zoneIndex < 0 && qty > 0) {
            counts.push({ counter: counter.name, zone: zone.name, qty });
          } else if (zoneIndex >= 0) {
            const countIndex = findIndex(productAndCounts.zones[zoneIndex].counts,
              { counter: counter.name });
            if (countIndex < 0 && qty > 0) {
              counts.push({ counter: counter.name, zone: zone.name, qty });
            } else if (countIndex >= 0) {
              const count = productAndCounts.zones[zoneIndex].counts[countIndex];
              if (qty !== count.qty) {
                counts.push({ counter: counter.name, zone: zone.name, qty: qty - count.qty });
              }
            }
          }
        });
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
      this.zones = [];
      this.productsAndCounts = [];
      this.lastUpdatedCount = '';
      this.products.forEach((product) => {
        const productAndCounts = clone(product);
        productAndCounts.zones = [];
        productAndCounts.errOdoo = null;
        productAndCounts.modified = false;
        this.productsAndCounts.push(productAndCounts);
      });
    },
    round(value, precision) {
      if (Number.isInteger(precision)) {
        const shift = 10 ** precision;
        return Math.round(value * shift) / shift;
      }
      return Math.round(value);
    },
    updateErrors(productAndCounts) {
      let totalQty = 0;
      productAndCounts.zones.forEach((zone) => {
        zone.errCount = null; // eslint-disable-line no-param-reassign
        let zoneQty = 0;
        let firstLoop = true;

        const expectedCounterCount = find(this.zones, { name: zone.name }).counters.length;
        const actualCounterCount = zone.counts.length;

        zone.counts.forEach((count) => {
          if (firstLoop) {
            zoneQty = count.qty;
            firstLoop = false;
          } else if (zoneQty !== count.qty) {
            zone.errCount = // eslint-disable-line no-param-reassign
                this.round(Math.max(zone.errCount, Math.abs(zoneQty - count.qty)), 3);
          }
          if (expectedCounterCount !== actualCounterCount) {
            zone.errCount = // eslint-disable-line no-param-reassign
                this.round(Math.max(zone.errCount, count.qty), 3);
          }
        });

        productAndCounts[`${zone.name}${SEPARATOR}${ERROR}`] = zone.errCount; // eslint-disable-line no-param-reassign
        totalQty += zoneQty;
      });
      if (totalQty !== productAndCounts.qty_in_odoo) {
        productAndCounts.errOdoo = // eslint-disable-line no-param-reassign
          this.round(Math.abs(totalQty - productAndCounts.qty_in_odoo), 3);
      }
    },
    updateProductsAndCounts() {
      const updatedProductsAndCounts = [];
      let lastUpdatedCount = this.lastUpdatedCount;
      this.counts.forEach((count) => {
        if (count.updated > this.lastUpdatedCount) {
          const productIndex = findIndex(this.productsAndCounts, { id: count.product });
          // productsAndCounts update
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
          } else {
            // TODO ERROR
          }
          this.updateZones(count);
        }
      });
      this.lastUpdatedCount = lastUpdatedCount;

      updatedProductsAndCounts.forEach((productAndCounts) => {
        this.updateErrors(productAndCounts);
      });

      this.someErrorInCounts = findIndex(
        this.productsAndCounts,
        product => findIndex(
          product.zones,
          zone => zone.errCount > 0,
        ) >= 0,
      ) >= 0;
    },
    updateZones(count) {
      let zoneIndex = findIndex(this.zones, { name: count.zone });
      if (zoneIndex < 0) {
        zoneIndex = this.zones.push({ name: count.zone, show: true, counters: [] }) - 1;
      }
      const counterIndex = findIndex(this.zones[zoneIndex].counters, { name: count.counter });
      if (counterIndex < 0) {
        this.zones[zoneIndex].counters.push({ name: count.counter });
      }
      this.zones = sortBy(this.zones, ['name']);
      this.zones.forEach((zone) => {
        zone.counters = sortBy(zone.counters, ['name']); // eslint-disable-line no-param-reassign
      });
    },
    valuesToDisplay() {
      const values = [];
      this.zones.forEach((zone) => {
        if (zone.show) {
          zone.counters.forEach((counter) => {
            values.push(`${zone.name}${SEPARATOR}${counter.name}`);
          });
          values.push(`${zone.name}${SEPARATOR}${ERROR}`);
        }
      });
      return values;
    },
    isThisAnError(value) {
      return includes(value, `${SEPARATOR}${ERROR}`);
    },
    applyFilter() {
      this.filtredProductsAndCounts = [];
      if (isEmpty(this.productFilter)) {
        this.filtredProductsAndCounts = this.productsAndCounts;
      } else {
        this.productsAndCounts.forEach((product) => {
          if (product.name.toLowerCase().search(this.productFilter.toLowerCase()) >= 0
            || product.barcode.toLowerCase().search(this.productFilter.toLowerCase()) >= 0) {
            this.filtredProductsAndCounts.push(product);
          }
        });
      }
    },
    parseFile(e) {
      Papa.parse(e.target.files[0], {
        complete: (results) => {
          const nameIndex = findIndex(
            results.data[0],
            x => RegExp(NAME_COLUMN).test(x),
          );
          const barcodeIndex = findIndex(
            results.data[0],
            x => RegExp(BARCODE_COLUMN).test(x),
          );
          const qtyIndex = findIndex(
            results.data[0],
            x => RegExp(QTY_COLUMN_RE).test(x),
          );
          const odooIdIndex = findIndex(
            results.data[0],
            x => RegExp(ODOO_ID_COLUMN_RE).test(x),
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
          }).then(() => {
            this.changeState(1);
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
    saveFile() {
      const m = moment();
      m.locale('fr');
      const filename = `to_odoo_${m.format('YY-MM-DD')}.csv`;
      const data = [];
      this.productsAndCounts.forEach((productAndCounts) => {
        let qty = 0;
        if (!isEmpty(productAndCounts.zones)) {
          productAndCounts.zones.forEach((zone) => {
            if (!isEmpty(zone.counts)) {
              qty += zone.counts[0].qty;
            }
          });
        }
        data.push([
          '',
          '',
          productAndCounts.odoo_id,
          qty,
          PRODUCT_UOM_VALUE,
          LINE_LOCATION_VALUE,
        ]);
      });
      data[0][0] = LOCATION_VALUE;
      data[0][1] = `'${m.format('LLLL')}'`;
      const csvData = Papa.unparse({
        fields: [
          LOCATION_COLUMN,
          NAME_COLUMN,
          ODOO_ID_COLUMN,
          QTY_COLUMN,
          PRODUCT_UOM_COLUMN,
          LINE_LOCATION_COLUMN,
        ],
        data,
      });
      const file = new Blob([csvData], { type: 'text/plain;charset=utf-8' });
      if (window.navigator.msSaveOrOpenBlob) { // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
      } else { // Others
        const a = document.createElement('a');
        const url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 0);
      }
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
