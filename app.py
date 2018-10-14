from bson import ObjectId
from eve import Eve
from flask import jsonify, render_template


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


app = Eve(__name__,
          static_folder='./client/dist/static',
          template_folder='./client/dist')
app.on_post_DELETE_inventories += post_delete_inventories_callback


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
