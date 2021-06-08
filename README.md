# Inventory COOP API
This is the backend of inventory solution.
The other products are :
- Frontend (./client)
- Android application (https://github.com/lachouettecoop/inventory-coop-android.git)

### Requirement
You will need :
- docker
- docker-compose

It could make your life better:
- Pycharm (Python IDE)
- Postman (test API)
- Robot3t (MongoDb explorer)

### Init mongodb
Fist open a bash on your db instance
```
docker-compose exec db bash
```

Then launch a mongo shell as root
```
mongo -u root -p <root password>
```

Finally execute command :
```
use inventory-coop
db.createUser({
  user: "user",
  pwd: "<user password>",
  roles: [
    { role: "readWrite", db: "inventory-coop" },
  ],
  mechanisms: [ "SCRAM-SHA-1" ],
})
```

### Build

```bash
docker-compose build api
```

### Run
Mongo db docker needs some environment variables defined in file db.env.
```bash
MONGO_INITDB_ROOT_USERNAME=root
MONGO_INITDB_ROOT_PASSWORD=...  # Root password
```

API docker needs some environment variables defined in file api.env.
```bash
MONGO_HOST=db
MONGO_USERNAME=user
MONGO_PASSWORD=...                # User password

JWT_SECRET=...                    # Secret for JSON Web Tokens signature
LDAP_ADMIN_PASS=...               # LDAP admin password

ADMIN_USERS="bill@gate.com"       # List of users with admin rights

ODOO_URL=https://odoo.fr/jsonrpc  # Odoo jsonrc URL
ODOO_LOGIN=...                    # Odoo user login
ODOO_PASSWORD=...                 # Odoo user password
```
Then run
```bash
docker-compose up -d
```

API will be accessible to http://localhost:8000/api/v1
```bash
curl http://localhost:8000/api/v1/ping
```
It shall respond `{"name":"inventory-coop","status":"ok"}`

### Development
This API is based on [python eve](http://docs.python-eve.org/en/latest/).
```bash
poetry install
poetry run python main.py
```
