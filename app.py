from bson import ObjectId
from eve import Eve
from flask import abort, jsonify

from settings import CLOSED, DATE_FORMAT


def on_fetched_item_event(_, response):
    response['id'] = response['_id']


def on_fetched_resource_event(_, response):
    for item in response.get('items', []):
        item['id'] = item['_id']


def on_inserted_event(_, items):
    for item in items:
        item['id'] = item['_id']


def on_updated_event(_, updates, original):
    updates['id'] = original['_id']


def on_insert_inventories_event(items):
    import datetime
    date = datetime.datetime.now().strftime(DATE_FORMAT)
    for item in items:
        item['date'] = date
        item['state'] = 0


def on_insert_counts_event(items):
    db = app.data.driver.db
    col_inventories = db["inventories"]
    for item in items:
        inventory = col_inventories.find_one({'_id': ObjectId(item['inventory'])})
        if inventory['state'] >= CLOSED:
            # Do not let count be register if inventory is closed
            abort(403)


app = Eve(__name__,
          static_folder='./client/dist/static',
          template_folder='./client/dist')

app.on_fetched_item += on_fetched_item_event
app.on_fetched_resource += on_fetched_resource_event
app.on_inserted += on_inserted_event
app.on_updated += on_updated_event
app.on_insert_inventories += on_insert_inventories_event
app.on_insert_counts += on_insert_counts_event


@app.route('/api/v1/ping')
def ping():
    return jsonify({
        'name': 'inventory-coop',
        'status': 'ok'
    })


if __name__ == '__main__':
    app.run(debug=True, port=8000)
