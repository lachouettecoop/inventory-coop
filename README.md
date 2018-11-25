# Init mongodb
Fistly, as root user, create a database `inventory-coop`
Then execute command :

```bash
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
