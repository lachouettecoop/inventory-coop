FROM tiangolo/uwsgi-nginx-flask:python3.6

RUN apt update
RUN apt install -y libsasl2-dev python-dev libldap2-dev libssl-dev

RUN pip install --upgrade pip

RUN curl -o /tmp/node-v10.15.0-linux-x64.tar.xz https://nodejs.org/dist/v10.15.0/node-v10.15.0-linux-x64.tar.xz
RUN cd /tmp && tar xvf node-v10.15.0-linux-x64.tar.xz

COPY ./requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY . /app/

RUN cd /app/client; \
    export PATH=/tmp/node-v10.15.0-linux-x64/bin:$PATH; \
    npm install; \
    npm run build