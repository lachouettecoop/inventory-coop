FROM tiangolo/uwsgi-nginx-flask:python3.7

ARG NODE_VERSION=v12.16.3

RUN apt update; \
    apt install -y libsasl2-dev python-dev libldap2-dev libssl-dev; \
    pip install --upgrade pip; \
    curl -o /tmp/node-${NODE_VERSION}-linux-x64.tar.xz https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.xz; \
    cd /tmp; \
    tar xvf node-${NODE_VERSION}-linux-x64.tar.xz

COPY . /app/

RUN pip install --no-cache-dir -r /app/requirements.txt; \
    cd /app/client; \
    export PATH=/tmp/node-${NODE_VERSION}-linux-x64/bin:$PATH; \
    npm install; \
    npm run build
