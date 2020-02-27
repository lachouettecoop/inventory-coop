# inventory-coop-client

Web client for inventory solution.
The other products are :
- Backend (https://github.com/lachouettecoop/inventory-coop-api.git)
- Android application (https://github.com/lachouettecoop/inventory-coop-android.git)

### Requirement
You will need :
- docker
- docker-compose
- npm

It could make your life better:
- WebStorm (Web IDE)

### Build Setup

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production with minification
npm run build

# build for production and view the bundle analyzer report
npm run build --report
```

### Docker Setup

``` bash
docker-compose build
docker-compose up -d
```

Web client will be reachable at: http://localhost:8080

For a detailed explanation on how things work, check out the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).
