# Init mongodb
Fist create a database `inventory-coop`
Then execute command :

```bash
db.createUser({
  user: "user",
  pwd: "user",
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
```bash
docker-compose up -d
```