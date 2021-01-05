import httpx
import os

from aio_odoorpc_base.sync.common import login as odoo_login
from aio_odoorpc_base.sync.object import execute_kw
from aio_odoorpc_base.helpers import execute_kwargs


ODOO_URL = os.getenv("ODOO_URL", "https://test.sas.lachouettecoop.fr/jsonrpc")
ODOO_DB = os.getenv("ODOO_DB", "dbsas")
ODOO_LOGIN = os.getenv("ODOO_LOGIN")
ODOO_PASSWORD = os.getenv("ODOO_PASSWORD")


def _consolidate(products):
    for p in products:
        p["odoo_id"] = p["id"]
        p.pop("id")
        p["qty_in_odoo"] = round(p["qty_available"], 3)
        p.pop("qty_available")
        p["cost"] = round(p["theoritical_price"], 2)
        p.pop("theoritical_price")
        if not p["barcode"]:
            p["barcode"] = ""
    return products


def odoo_products():
    with httpx.Client(timeout=120) as client:
        uid = odoo_login(
            http_client=client,
            url=ODOO_URL,
            db=ODOO_DB,
            login=ODOO_LOGIN,
            password=ODOO_PASSWORD,
        )
        kwargs = execute_kwargs(
            fields=[
                "barcode",
                "id",
                "name",
                "qty_available",
                "theoritical_price",
            ]
        )
        products = execute_kw(
            http_client=client,
            url=ODOO_URL,
            db=ODOO_DB,
            uid=uid,
            password=ODOO_PASSWORD,
            obj="product.product",
            method="search_read",
            args=[
                ['active', '=', True],
                ['purchase_ok', '=', True],
                ['sale_ok', '=', True],
                ['theoritical_price', '>', 0],
            ],
            kw=kwargs,
        )
        return _consolidate(products)
