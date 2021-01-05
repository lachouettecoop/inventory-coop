FROM node:12 AS frontend
COPY ./client /app/client
RUN cd /app/client; \
    npm install; \
    npm run build

FROM python:3.8
RUN apt update; \
    apt install -y libsasl2-dev python-dev libldap2-dev libssl-dev; \
    pip install --upgrade pip; \
    pip install poetry;
WORKDIR /app
COPY ./pyproject.toml ./poetry.lock /app/
RUN poetry install;
COPY ./main.py /app/
COPY ./api /app/api
COPY --from=frontend /app/client/dist /app/client/dist
CMD ["poetry", "run", "gunicorn", "-w", "4", "-b", "0.0.0.0:80", "main:app"]
