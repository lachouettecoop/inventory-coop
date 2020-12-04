FROM node:12 AS frontend
COPY ./client /app/client
RUN cd /app/client; \
    npm install; \
    npm run build

FROM tiangolo/uwsgi-nginx-flask:python3.7
RUN apt update; \
    apt install -y libsasl2-dev python-dev libldap2-dev libssl-dev; \
    pip install --upgrade pip;
COPY ./requirements.txt /app
RUN pip install --no-cache-dir -r /app/requirements.txt;
COPY --from=frontend /app/client/dist /app/client/dist
COPY ./api /app/api
COPY ./main.py ./Procfile ./runtime.txt ./uwsgi.ini /app/
