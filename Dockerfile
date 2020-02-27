FROM tiangolo/uwsgi-nginx-flask:python3.7

RUN apt update
RUN apt install -y libsasl2-dev python-dev libldap2-dev libssl-dev

RUN pip install --upgrade pip

ARG NODE_VERSION=v10.18.1

RUN curl -o /tmp/node-${NODE_VERSION}-linux-x64.tar.xz https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.xz
RUN cd /tmp && tar xvf node-${NODE_VERSION}-linux-x64.tar.xz

COPY ./requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY . /app/

RUN cd /app/client; \
    export PATH=/tmp/node-${NODE_VERSION}-linux-x64/bin:$PATH; \
    npm install; \
    npm run build
