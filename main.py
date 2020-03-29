import os

from bson import ObjectId
from eve import Eve
from flask import abort
from flask import jsonify
from flask import send_file

from api.login import blueprint as login_blueprint
from api.login import JwtTokenAuth
from api.settings import CLOSED
from api.settings import DATE_FORMAT
from api.settings import ITEM_METHODS
from api.settings import RESOURCE_METHODS
from api.settings import X_HEADERS


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


NO_AUTH = os.environ.get('NO_AUTH', 'False').lower() in ['true', '1']
if NO_AUTH:
    app = Eve(__name__,
              static_folder='./client/dist/')
else:
    app = Eve(__name__,
              auth=JwtTokenAuth,
              static_folder='./client/dist/')
    app.register_blueprint(login_blueprint)

app.on_insert_inventories += on_insert_inventories_event
app.on_insert_counts += on_insert_counts_event


@app.after_request
def allow_all_origins(response):
    if os.environ.get('ALLOW_ALL_ORIGINS', 'False').lower() in ['true', '1']:
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = ', '.join(X_HEADERS)
        response.headers["Access-Control-Allow-Methods"] = ', '.join(set(ITEM_METHODS + RESOURCE_METHODS))
    return response


@app.route('/api/v1/ping')
def ping():
    return jsonify({
        'name': 'inventory-coop',
        'status': 'ok'
    })


@app.route("/")
def main():
    index_path = os.path.join(app.static_folder, 'index.html')
    return send_file(index_path)


# Everything not declared before (not a Flask route / API endpoint)...
@app.route('/<path:path>')
def route_frontend(path):
    # ...could be a static file needed by the front end that
    # doesn't use the `static` path (like in `<script src="bundle.js">`)
    file_path = os.path.join(app.static_folder, path)
    if os.path.isfile(file_path):
        return send_file(file_path)
    # ...or should be handled by the SPA's "router" in front end
    else:
        index_path = os.path.join(app.static_folder, 'index.html')
        return send_file(index_path)


if __name__ == '__main__':
    app.run(debug=True, port=8000)
