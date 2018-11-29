# Inventory COOP API
This is the backend of inventory solution.
The other products are :
- Frontend (https://github.com/lachouettecoop/inventory-coop-client.git)
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
Fistly, as root user, create a database `inventory-coop`
Then execute command :

```
db.createUser({
  user: "user",
  pwd: "...",
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
MONGO_USERNAME=user
MONGO_PASSWORD=...  # User password
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
virtualenv -p /usr/bin/python3.6 .venv
source .venv/bin/activate
pip install -r ./requirements.txt
python app.py
```
