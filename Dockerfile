FROM tiangolo/uwsgi-nginx-flask:python3.6

RUN apt update
RUN apt install -y libsasl2-dev python-dev libldap2-dev libssl-dev

RUN pip install --upgrade pip

COPY ./requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY ./api /app/api
COPY ./main.py /app/

COPY ./client/dist /app/client/dist