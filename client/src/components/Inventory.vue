<template>
  <v-layout column v-if="inventory">
    <v-flex>
      <v-card>
        <v-card-text>
          <v-container class="pa-6">
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
                <v-text-field label="Nom du produit ou Code barre"
                              prepend-icon="fas fa-search"
                              clearable
                              v-model="productFilter">
                </v-text-field>
                <v-spacer/>
                <v-btn small
                       style="align-self: center"
                       v-if="inventory.state===1 && !isLoading"
                       @click="init()">
                  Recharger les comptes
                </v-btn>
                <v-spacer/>
                <template v-if="inventory.state<2">
                  <span>Equipe(s):</span>
                  <v-radio-group
                    v-model="radioGroup"
                    row
                    @change="changeZoneShow"
                  >
                    <v-radio
                      v-for="(zone, index) in [{name: 'Toutes'}].concat(zones)"
                      :key="index"
                      :label="zone.name"
                      :value="zone.name"
                    ></v-radio>
                  </v-radio-group>
                </template>
                <template v-else>
                  <span class="title">Valeur de l'inventaire: {{totalCost()}}</span>
                </template>
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
        <v-container class="pa-8" v-if="user.role==='admin' && inventory.state===2">
          <v-layout row>
            <input type="checkbox" id="checkbox" v-model="partialInventory">
            <label for="checkbox" class="pa-lg-2">Inventaire partiel</label>
            <v-spacer/>
            <v-btn fab small @click="saveFile()">
              <v-icon>fas fa-file-export</v-icon>
            </v-btn>
          </v-layout>
        </v-container>
        <v-card-title class="title">
          <span>Liste des produits</span>
        </v-card-title>
        <v-card-text>
          <v-progress-circular v-if="isLoading" indeterminate color="primary"/>
          <v-data-table
            v-else
            :items="filtredProductsAndCounts"
            :headers="headers"
            :items-per-page="15"
            :sort-by="sortBy"
            :footer-props="{'items-per-page-options': [20, 50, 100, -1]}"
          >
            <template v-slot:body="{ items }">
              <tbody>
                <tr v-for="item in items" :key="item.odoo_id">
                  <td class="text-left text-no-wrap">{{ item.name }}</td>
                  <td class="text-left">{{ item.barcode ? item.barcode : "-"}}</td>
                  <td class="text-center">{{ item.qty_in_odoo }}</td>
                  <td :class="errorOdooClass(item)">{{ item.errOdoo }}</td>
                  <template v-if="inventory.state<2">
                    <td v-for="(counterAtZone, index) in valuesToDisplay()"
                        :key="index"
                        :class="productClass(item, counterAtZone)">
                      <span v-if="isThisAnError(counterAtZone)"
                            class="font-weight-bold">
                        {{ item[counterAtZone] }}
                      </span>
                      <v-text-field v-else
                                    dense
                                    hide-details="auto"
                                    background-color="blue-grey lighten-5"
                                    :disabled="inventory.state>=2"
                                    @input="changeCounts(item)"
                                    v-model="item[counterAtZone]">
                      </v-text-field>
                    </td>
                    <td>
                      <v-btn color="success"
                             :disabled="!item.modified"
                             @click="saveCount(item)">
                        Save
                      </v-btn>
                    </td>
                  </template>
                  <template v-else>
                    <td>{{ item.totalQty }}</td>
                    <td>{{ asEuro(item.totalCost) }}</td>
                    <td>{{ asEuro(item.errorCost) }}</td>
                  </template>
                </tr>
              </tbody>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-flex>
  </v-layout>
</template>

<script>
import Papa from 'papaparse';
import {
  clone, deburr, includes, isEmpty, find, findIndex, forEach, get, sortBy, filter,
} from 'lodash';
import moment from 'moment';
import { removeCookieToken } from '../mixin/cookie';

const ODOO_ID_COLUMN = 'line_ids/product_id/.id';
const NAME_COLUMN = 'name';
const QTY_COLUMN = 'line_ids/product_qty';
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
      radioGroup: 'Toutes',
      sortBy: [],
      partialInventory: true,
    };
  },
  beforeMount() {
    this.$store.dispatch({
      type: 'inventories/fetchResource',
      id: this.inventoryId,
    }).catch((error) => {
      if (error.response?.status === 401) {
        removeCookieToken();
        this.$router.push({ name: 'Login' });
      }
    });
    this.$store.dispatch({
      type: 'products/getResourcesWhere',
      where: { inventory: `${this.inventoryId}` },
    }).then(() => {
      this.init();
    });
  },
  watch: {
    products() {
      if (isEmpty(this.productsAndCounts)) {
        this.initProductAndCounts();
      }
      this.updateProductsAndCounts();
      this.applyFilter();
    },
    counts() {
      if (isEmpty(this.productsAndCounts)) {
        this.initProductAndCounts();
      }
      this.updateProductsAndCounts();
      this.applyFilter();
    },
    productFilter() {
      this.applyFilter();
    },
    partialInventory() {
      this.applyFilter();
    },
  },
  computed: {
    inventoryId() {
      return this.$route.params.id;
    },
    inventory() {
      const inventories = this.$store.getters['inventories/data'];
      return find(inventories, ['id', this.inventoryId]);
    },
    products() {
      const products = this.$store.getters['products/data'];
      return filter(products, { inventory: this.inventoryId });
    },
    counts() {
      const counts = this.$store.getters['counts/data'];
      return filter(counts, { inventory: this.inventoryId });
    },
    isLoading() {
      return this.$store.getters['products/isLoading'];
    },
    user() {
      return this.$store.getters['authentication/user'];
    },
    headers() {
      const headers = [
        {
          text: 'Nom',
          value: 'name',
          align: 'start',
          class: 'text-no-wrap ',
        },
        {
          text: 'Barcode',
          value: 'barcode',
          align: 'start',
          class: 'text-no-wrap',
        },
        {
          text: 'Quantité théorique',
          value: 'qty_in_odoo',
          align: 'center',
          class: 'text-no-wrap',
        },
        {
          text: 'Ecart avec Odoo',
          value: 'errOdoo',
          align: 'center',
          class: 'text-no-wrap',
        },
      ];
      if (this.inventory.state >= 2) {
        headers.push({
          text: 'Quantité réelle',
          value: 'totalQty',
          align: 'center',
          class: 'text-no-wrap',
        });
        headers.push({
          text: 'Valeur',
          value: 'totalCost',
          align: 'center',
          class: 'text-no-wrap',
        });
        headers.push({
          text: 'Valeur de l\'écart',
          value: 'errorCost',
          align: 'center',
          class: 'text-no-wrap',
        });
      } else {
        this.valuesToDisplay().forEach((value) => {
          headers.push({
            text: value,
            value,
            align: 'center',
            class: 'text-no-wrap inventoryHeader',
          });
        });
      }
      return headers;
    },
  },
  methods: {
    loadCounts() {
      const where = { inventory: `${this.inventoryId}` };
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
      this.partialInventory = false;
      this.updateProductsAndCounts();
    },
    errorOdooClass(product) {
      if (product.errOdoo !== 0) {
        return 'text-xs-center font-weight-bold amber lighten-4';
      }
      return 'text-xs-center font-weight-bold';
    },
    productClass(product, counterAtZone) {
      const { zone } = this.unjoinCounterAtZone(counterAtZone);
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
    unjoinCounterAtZone(counterAtZone) {
      const result = counterAtZone.split(SEPARATOR);
      return {
        zone: result[0],
        counter: result[1],
      };
    },
    getCount(productAndCounts, counterAtZone) {
      let count = get(productAndCounts, counterAtZone, 0);
      if (typeof count === 'string' || count instanceof String) {
        count = parseFloat(count.replace(',', '.'));
      }
      return count;
    },
    changeCounts(productAndCounts) {
      let modified = false;
      this.zones.forEach((zone) => {
        zone.counters.forEach((counter) => {
          const counterAtZone = `${zone.name}${SEPARATOR}${counter.name}`;
          const zoneIndex = findIndex(productAndCounts.zones, { name: zone.name });
          const qty = +this.getCount(productAndCounts, counterAtZone);
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
    asEuro(number) {
      // Create our number formatter.
      const formatter = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
      });
      return formatter.format(number);
    },
    totalCost() {
      let cost = 0;
      this.productsAndCounts.forEach((product) => {
        cost += product.totalQty * product.cost;
      });
      return this.asEuro(cost);
    },
    saveCount(productAndCounts) {
      const counts = [];
      this.zones.forEach((zone) => {
        zone.counters.forEach((counter) => {
          const counterAtZone = `${zone.name}${SEPARATOR}${counter.name}`;
          const qty = +this.getCount(productAndCounts, counterAtZone);
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
          resource: counts.map((count) => ({
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
    init() {
      this.initProductAndCounts();
      this.updateProductsAndCounts();
      this.applyFilter();
      this.loadCounts();
    },
    initProductAndCounts() {
      this.zones = [];
      this.productsAndCounts = [];
      this.products.forEach((product) => {
        const productAndCounts = clone(product);
        productAndCounts.zones = [];
        productAndCounts.counts = [];
        productAndCounts.errOdoo = 0;
        productAndCounts.totalQty = 0;
        productAndCounts.totalCost = 0;
        productAndCounts.errorCost = 0;
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
            // eslint-disable-next-line no-param-reassign
            zone.errCount = this.round(Math.max(zone.errCount, Math.abs(zoneQty - count.qty)), 3);
          }
          if (expectedCounterCount !== actualCounterCount) {
            // eslint-disable-next-line no-param-reassign
            zone.errCount = this.round(Math.max(zone.errCount, count.qty), 3);
          }
        });

        productAndCounts[`${zone.name}${SEPARATOR}${ERROR}`] = zone.errCount; // eslint-disable-line no-param-reassign
        totalQty += zoneQty;
      });
      // eslint-disable-next-line no-param-reassign
      productAndCounts.errOdoo = this.round(totalQty - productAndCounts.qty_in_odoo, 3);
      // eslint-disable-next-line no-param-reassign
      productAndCounts.totalQty = totalQty;
    },
    updateProductsAndCounts() {
      const updatedProductsAndCounts = [];
      this.counts.forEach((count) => {
        const productIndex = findIndex(this.productsAndCounts, { id: count.product });
        // productsAndCounts update
        if (productIndex >= 0) {
          const productAndCounts = this.productsAndCounts[productIndex];
          const countIndex = findIndex(productAndCounts.counts, { id: count.id });
          if (countIndex < 0) {
            productAndCounts.counts.push(count);

            let zoneIndex = findIndex(productAndCounts.zones, { name: count.zone });
            if (zoneIndex < 0) {
              zoneIndex = productAndCounts.zones.push({ name: count.zone, counts: [] }) - 1;
            }
            const zone = this.productsAndCounts[productIndex].zones[zoneIndex];
            let counterIndex = findIndex(zone.counts, { counter: count.counter });
            if (counterIndex < 0) {
              counterIndex = zone.counts.push({ counter: count.counter, qty: count.qty }) - 1;
            } else {
              zone.counts[counterIndex].qty += count.qty;
            }
            productAndCounts[`${count.zone}${SEPARATOR}${count.counter}`] = zone.counts[counterIndex].qty;
            updatedProductsAndCounts.push(productAndCounts);
          }
        } else {
          // TODO ERROR
        }
        this.updateZones(count);
      });

      updatedProductsAndCounts.forEach((productAndCounts) => {
        this.updateErrors(productAndCounts);
      });

      this.productsAndCounts.forEach((pc) => {
        if (pc.counts.length === 0) {
          // eslint-disable-next-line no-param-reassign
          pc.errOdoo = 0 - pc.qty_in_odoo;
        }
        // eslint-disable-next-line no-param-reassign
        pc.totalCost = pc.totalQty * pc.cost;
        // eslint-disable-next-line no-param-reassign
        pc.errorCost = (pc.totalQty - pc.qty_in_odoo) * pc.cost;
      });

      this.someErrorInCounts = findIndex(
        this.productsAndCounts,
        (product) => findIndex(
          product.zones,
          (zone) => zone.errCount > 0,
        ) >= 0,
      ) >= 0;
    },
    updateZones(count) {
      let zoneIndex = findIndex(this.zones, { name: count.zone });
      if (zoneIndex < 0) {
        zoneIndex = this.zones.push({
          name: count.zone,
          index: parseInt(count.zone, 10),
          show: this.radioGroup === 'Toutes' || count.zone === this.radioGroup,
          counters: [],
        }) - 1;
      }
      const counterIndex = findIndex(this.zones[zoneIndex].counters, { name: count.counter });
      if (counterIndex < 0) {
        this.zones[zoneIndex].counters.push({ name: count.counter });
      }
      this.zones = sortBy(this.zones, ['index']);
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
      if (isEmpty(this.productFilter) && !this.partialInventory) {
        this.filtredProductsAndCounts = this.productsAndCounts;
      } else {
        const filters = this.productFilter
          .split(/(\s+)/)
          .filter((e) => e.trim().length > 0)
          .map((f) => deburr(f.toLowerCase()));
        this.productsAndCounts.forEach((product) => {
          let keepThisProduct = true;
          const normalizedProductName = deburr(product.name.toLowerCase());
          for (let i = 0; i < filters.length; i += 1) {
            const f = filters[i];
            if (normalizedProductName.search(f) < 0
              && product.barcode.search(f) < 0) {
              keepThisProduct = false;
              break;
            }
          }
          if (keepThisProduct && this.partialInventory && product.counts.length === 0) {
            keepThisProduct = false;
          }
          if (keepThisProduct) {
            this.filtredProductsAndCounts.push(product);
          }
        });
      }
    },
    changeZoneShow(selectedZone) {
      this.sortBy = [];
      forEach(this.zones, (zone) => {
        // eslint-disable-next-line no-param-reassign
        zone.show = selectedZone === 'Toutes' || zone.name === selectedZone;
      });
    },
    getIndex(data, columnName) {
      const index = findIndex(data, (x) => RegExp(columnName).test(x));
      if (index < 0) {
        this.alert = {
          show: true,
          message: `Error during CSV parsing: missing "${index}" column`,
          type: 'error',
        };
      }
      return index;
    },
    saveFile() {
      const m = moment();
      m.locale('fr');
      const filename = `to_odoo_${m.format('YY-MM-DD')}.csv`;
      const data = [];
      this.productsAndCounts.forEach((productAndCounts) => {
        if (!this.partialInventory || productAndCounts.counts.length > 0) {
          if (productAndCounts.totalQty !== productAndCounts.qty_in_odoo) {
            // Only push product with disparity
            data.push([
              '',
              '',
              productAndCounts.odoo_id,
              productAndCounts.totalQty,
              PRODUCT_UOM_VALUE,
              LINE_LOCATION_VALUE,
            ]);
          }
        }
      });
      data[0][0] = LOCATION_VALUE;
      data[0][1] = `Inventaire ${m.format('LL')}`;
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

<style>
  th.inventoryHeader {
    text-align: center !important;
  }
</style>
