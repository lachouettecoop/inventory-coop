FROM node:14-slim AS frontend
COPY ./client /app/client
RUN cd /app/client; \
    npm install; \
    npm run build

FROM python:3.8-slim
WORKDIR /app
COPY --from=frontend /app/client/dist /app/client/dist
COPY ./pyproject.toml ./poetry.lock ./main.py /app/
COPY ./api /app/api
RUN  apt-get update &&\
     apt-get install -y gcc libsasl2-dev libldap2-dev libssl-dev &&\
     pip install poetry &&\
     poetry install &&\
     apt remove -y gcc
CMD ["poetry", "run", "gunicorn", "-w", "4", "-b", "0.0.0.0:80", "main:app"]
