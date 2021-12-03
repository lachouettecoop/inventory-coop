import os

from bson import ObjectId
from eve import Eve
from flask import abort, jsonify, send_file
from flask_socketio import SocketIO, emit

from api.login import JwtTokenAuth
from api.login import blueprint as login_blueprint
from api.odoo import odoo_products
from api.settings import ACTIVE, CLOSED, DATE_FORMAT, ITEM_METHODS, RESOURCE_METHODS, X_HEADERS


def on_insert_inventories_event(items):
    import datetime

    date = datetime.datetime.now().strftime(DATE_FORMAT)
    for item in items:
        item["date"] = date
        item["state"] = ACTIVE


def on_inserted_inventories_event(items):
    db = app.data.driver.db
    col_products = db["products"]

    products = odoo_products()
    for item in items:
        inventory_id = item["_id"]
        for p in products:
            p["inventory"] = inventory_id
        col_products.insert_many(products)


def on_insert_counts_event(items):
    db = app.data.driver.db
    col_inventories = db["inventories"]
    for item in items:
        inventory = col_inventories.find_one({"_id": ObjectId(item["inventory"])})
        if inventory["state"] >= CLOSED:
            # Do not let count be register if inventory is closed
            abort(403)


def on_inserted_counts_event(items):
    for item in items:
        emit("new_count", item)


ALLOW_ALL_ORIGINS = os.environ.get("ALLOW_ALL_ORIGINS", "False").lower() in ["true", "1"]
NO_AUTH = os.environ.get("NO_AUTH", "False").lower() in ["true", "1"]
SETTINGS = os.path.abspath("./api/settings.py")
if NO_AUTH:
    app = Eve(__name__, settings=SETTINGS, static_folder="./client/dist/")
else:
    app = Eve(__name__, auth=JwtTokenAuth, settings=SETTINGS, static_folder="./client/dist/")
    app.register_blueprint(login_blueprint)
socket_io = SocketIO(app, cors_allowed_origins="*" if ALLOW_ALL_ORIGINS else None)

app.on_insert_counts += on_insert_counts_event
app.on_insert_inventories += on_insert_inventories_event
app.on_inserted_inventories += on_inserted_inventories_event


@app.after_request
def allow_all_origins(response):
    if ALLOW_ALL_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = ", ".join(X_HEADERS)
        response.headers["Access-Control-Allow-Methods"] = ", ".join(
            set(ITEM_METHODS + RESOURCE_METHODS)
        )
    return response


@app.route("/api/v1/ping")
def ping():
    return jsonify({"name": "inventory-coop", "status": "ok"})


@app.route("/")
def main():
    index_path = os.path.join(app.static_folder, "index.html")
    return send_file(index_path)


# Everything not declared before (not a Flask route / API endpoint)...
@app.route("/<path:path>")
def route_frontend(path):
    # ...could be a static file needed by the front end that
    # doesn't use the `static` path (like in `<script src="bundle.js">`)
    file_path = os.path.join(app.static_folder, path)
    if os.path.isfile(file_path):
        return send_file(file_path)
    # ...or should be handled by the SPA's "router" in front end
    else:
        index_path = os.path.join(app.static_folder, "index.html")
        return send_file(index_path)


if __name__ == "__main__":
    app.run(debug=True, port=8000)
