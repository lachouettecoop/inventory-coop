import os

MONGO_HOST = os.environ.get('MONGO_HOST', 'localhost')
MONGO_PORT = 27017
MONGO_USERNAME = os.environ.get('MONGO_USERNAME')
MONGO_PASSWORD = os.environ.get('MONGO_PASSWORD')
MONGO_DBNAME = 'inventory-coop'

HATEOAS = False
PAGINATION = False
URL_PREFIX = 'api'
API_VERSION = 'v1'
X_HEADERS = ['Authorization', 'Content-type', 'If-Match']

# Enable reads (GET), inserts (POST) and DELETE for resources/collections
# (if you omit this line, the API will default to ['GET'] and provide
# read-only access to the endpoint).
RESOURCE_METHODS = ['GET', 'POST', 'DELETE']

# Enable reads (GET), edits (PATCH) and deletes of individual items
# (defaults to read-only item access).
ITEM_METHODS = ['GET', 'PATCH', 'PUT', 'DELETE']

BANDWIDTH_SAVER = False
SOFT_DELETE = True
DATE_FORMAT = '%Y-%m-%d %H:%M:%S'
DATE_CREATED = 'created'
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
        'cost': {
            'type': 'number',
            'default': 0,
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
