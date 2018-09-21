<template>
  <v-card>
    <v-card-title primary-title>
      <div class="headline">Liste des inventaires</div>
    </v-card-title>
    <v-data-table
      :headers="headers"
      :items="inventories"
      hide-actions
      item-key="id"
    >
      <template slot="items" slot-scope="props">
        <tr>
          <td class="text-lg-left">{{ props.item.date }}</td>
          <td class="text-lg-left">{{ props.item.active }}</td>
        </tr>
      </template>
    </v-data-table>
  </v-card>
</template>

<script>
export default {
  name: 'Inventories',
  data: () => ({
    headers: [
      { text: 'Date', value: 'date' },
      { text: 'Actif', value: 'active' },
    ],
    inventories: [
      {
        id: 1,
        active: false,
        date: '2018/09/10',
      },
      {
        id: 2,
        active: true,
        date: '2018/09/09',
      },
    ],
  }),

  methods: {
  },
};
</script>

<style scoped>

</style>
