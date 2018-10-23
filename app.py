from bson import ObjectId
from eve import Eve
from flask import jsonify, render_template

from settings import DATE_FORMAT


def post_delete_inventories_callback(request, _):
    print('A DELETE request on the inventories endpoint has just been received!')

    db = app.data.driver.db
    query = {"inventory": ObjectId(request.view_args['_id'])}

    col_products = db["products"]
    x = col_products.delete_many(query)
    print(x.deleted_count, " products deleted.")

    col_counts = db["counts"]
    x = col_counts.delete_many(query)
    print(x.deleted_count, " counts deleted.")


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
        item['status'] = 0


app = Eve(__name__,
          static_folder='./client/dist/static',
          template_folder='./client/dist')
app.on_post_DELETE_inventories += post_delete_inventories_callback
app.on_fetched_item += on_fetched_item_event
app.on_fetched_resource += on_fetched_resource_event
app.on_inserted += on_inserted_event
app.on_updated += on_updated_event
app.on_insert_inventories += on_insert_inventories_event


@app.route('/status')
def hello():
    return jsonify({
        'name': 'inventory-coop',
        'status': 'ok'
    })


@app.route('/')
def index():
    return render_template("index.html")


if __name__ == '__main__':
    app.run(debug=True, port=8000)
