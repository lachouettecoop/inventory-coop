import os

# We want to seamlessy run our API both locally and on Heroku. If running on
# Heroku, sensible DB connection settings are stored in environment variables.
MONGO_URI = os.environ.get('MONGODB_URI', 'mongodb://user:user@localhost:27017/inventory-coop')
HATEOAS = False
PAGINATION = False
URL_PREFIX = 'api'
API_VERSION = 'v1'
X_DOMAINS = '*'
X_HEADERS = ['Authorization', 'Content-type', 'If-Match']

# Enable reads (GET), inserts (POST) and DELETE for resources/collections
# (if you omit this line, the API will default to ['GET'] and provide
# read-only access to the endpoint).
RESOURCE_METHODS = ['GET', 'POST', 'DELETE']

# Enable reads (GET), edits (PATCH) and deletes of individual items
# (defaults to read-only item access).
ITEM_METHODS = ['GET', 'PATCH', 'PUT', 'DELETE']

BANDWIDTH_SAVER = False
DATE_CREATED = 'created'
DATE_FORMAT = '%Y-%m-%d %H:%M:%S'
ETAG = 'etag'
ITEMS = 'items'
META = 'meta'
LAST_UPDATED = 'updated'
STATUS = 'status'

INITIATED = 0
ACTIVE = 1
CLOSED = 2

inventories = {
    'item_title': 'Inventory',
    'schema': {
        'date': {
            'type': 'datetime',
        },
        'state': {
            'type': 'integer',
            'allowed': [
                INITIATED,
                ACTIVE,
                CLOSED,
            ]
        },
    },
}

products = {
    'schema': {
        'name': {
            'type': 'string',
        },
        'barcode': {
            'type': 'string',
        },
        'odoo_id': {
            'type': 'string',
        },
        'qty_in_odoo': {
            'type': 'number',
        },
        'inventory': {
            'type': 'objectid',
            'required': True,
            'data_relation': {
                'resource': 'inventories',
                'embeddable': True
            },
        },
    },
}

counts = {
    'schema': {
        'counter': {
            'type': 'string',
        },
        'zone': {
            'type': 'string',
        },
        'qty': {
            'type': 'number',
        },
        'product': {
            'type': 'objectid',
            'required': True,
            'data_relation': {
                'resource': 'products',
                'embeddable': True,
            },
        },
        'inventory': {
            'type': 'objectid',
            'required': True,
            'data_relation': {
                'resource': 'inventories',
                'embeddable': True,
            },
        },
    },
}

# The DOMAIN dict explains which resources will be available and how they will
# be accessible to the API consumer.
DOMAIN = {
    'inventories': inventories,
    'products': products,
    'counts': counts,
}
