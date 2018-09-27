# Init mongodb
Fist create a database `inventory-coop`
Then execute command :

```shell
db.createUser({
  user: "user",
  pwd: "user",
  roles: [
    { role: "readWrite", db: "inventory-coop" },
  ],
  mechanisms: [ "SCRAM-SHA-1" ],
})
```