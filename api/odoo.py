import logging
import os
import xmlrpc.client

NO_ODOO = os.environ.get("NO_ODOO", "False").lower() in ["true", "1"]
FAKE_PRODUCT_NB = 100

ODOO_URL = os.getenv("ODOO_URL", "https://sas.lachouettecoop.fr")
ODOO_DB = os.getenv("ODOO_DB", "dbsas")
ODOO_LOGIN = os.getenv("ODOO_LOGIN")
ODOO_PASSWORD = os.getenv("ODOO_PASSWORD")


class OdooAPI:
    def __init__(self):
        try:
            if NO_ODOO:
                return
            common_proxy_url = "{}/xmlrpc/2/common".format(ODOO_URL)
            object_proxy_url = "{}/xmlrpc/2/object".format(ODOO_URL)
            self.common = xmlrpc.client.ServerProxy(common_proxy_url)
            self.uid = self.common.authenticate(ODOO_DB, ODOO_LOGIN, ODOO_PASSWORD, {})
            self.models = xmlrpc.client.ServerProxy(object_proxy_url)
        except Exception as e:
            logging.error(f"Odoo API connection impossible: {e}")
            raise

    def search_read(self, entity, cond=None, fields=None, limit=0, offset=0, order="id ASC"):
        """Main api request, retrieving data according search conditions."""
        fields_and_context = {
            "fields": fields if fields else {},
            "context": {"lang": "fr_FR", "tz": "Europe/Paris"},
            "limit": limit,
            "offset": offset,
            "order": order,
        }

        return self.models.execute_kw(
            ODOO_DB,
            self.uid,
            ODOO_PASSWORD,
            entity,
            "search_read",
            [cond if cond else []],
            fields_and_context,
        )

    def authenticate(self, login, password):
        return self.common.authenticate(ODOO_DB, login, password, {})


def _consolidate(products):
    for p in products:
        p["odoo_id"] = p["id"]
        p["name"] = p["name"].strip()
        p.pop("id")
        p["qty_in_odoo"] = round(p["qty_available"], 3)
        p.pop("qty_available")
        p["cost"] = round(p["standard_price"], 2)
        p.pop("standard_price")
        if not p["barcode"]:
            p["barcode"] = ""
    return products


def odoo_products():
    if NO_ODOO:
        return _consolidate(
            [
                {
                    "barcode": f"00000{i:05d}",
                    "id": i,
                    "name": f"p{i:05d}",
                    "qty_available": 10,
                    "standard_price": 1.1,
                }
                for i in range(FAKE_PRODUCT_NB)
            ]
        )
    return _consolidate(
        OdooAPI().search_read(
            "product.product",
            cond=[
                ["standard_price", ">", 0],
            ],
            fields=[
                "barcode",
                "id",
                "name",
                "qty_available",
                "standard_price",
            ],
        )
    )
