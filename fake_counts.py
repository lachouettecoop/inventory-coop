import jwt
import requests

from api.login import JWT_ALGORITHM, JWT_SECRET, build_profile

URL_BASE = "http://localhost:8000/api/v1"
ZONES_NB = 5
COUNTERS_NB = 2


def token():
    profile = build_profile(
        {
            "user": "foo",
            "name": "foo",
            "lastname": "bar",
            "role": "admin",
        }
    )
    return jwt.encode(profile, JWT_SECRET, algorithm=JWT_ALGORITHM)


def post_counts(counts):
    requests.post(f"{URL_BASE}/counts", json=counts, headers={"Authorization": f"Bearer {token()}"})


if __name__ == "__main__":
    inventories = requests.get(
        f"{URL_BASE}/inventories", headers={"Authorization": f"Bearer {token()}"}
    )
    for i in inventories.json()["items"]:
        where = '{"inventory":"' + i["_id"] + '"}'
        products = requests.get(
            f"{URL_BASE}/products?where={where}", headers={"Authorization": f"Bearer {token()}"}
        )
        counts = []
        for p in products.json()["items"]:
            for z in range(ZONES_NB):
                for c in range(COUNTERS_NB):
                    counts.append(
                        {
                            "counter": f"c{c}",
                            "zone": str(z),
                            "qty": c,
                            "product": p["_id"],
                            "inventory": i["_id"],
                        }
                    )
        post_counts(counts)
