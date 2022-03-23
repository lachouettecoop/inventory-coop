import datetime
import os

import jwt
import ldap
from eve.auth import TokenAuth
from flask import Blueprint, abort, jsonify, request

blueprint = Blueprint("login", __name__)

NO_AUTH = os.environ.get("NO_AUTH", "False").lower() in ["true", "1"]
ADMIN_USERS = os.environ.get("ADMIN_USERS", "papanowel@gmail.com")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_SECRET = os.environ.get("JWT_SECRET")
JWT_EXPIRE_OFFSET = os.environ.get("JWT_EXPIRE_OFFSET", 60 * 60 * 12)  # 12H
LDAP_SERVER = os.environ.get("LDAP_SERVER", "ldap://ldap.lachouettecoop.fr:389")
LDAP_BASE_DN = os.environ.get("LDAP_BASE_DN", "cn=admin,dc=lachouettecoop,dc=fr")
LDAP_SEARCH_DN = os.environ.get("LDAP_SEARCH_DN", "dc=lachouettecoop,dc=fr")
LDAP_USER_DN = os.environ.get(
    "LDAP_USER_DN", "cn={},ou=membres,o=lachouettecoop,dc=lachouettecoop,dc=fr"
)
LDAP_ADMIN_PASS = os.environ.get("LDAP_ADMIN_PASS")
LDAP_SCOPE_SUBTREE = 2


class AuthorizationError(Exception):
    """A base class for exceptions used by bottle."""

    pass


def role(user):
    if user in [admin.strip() for admin in ADMIN_USERS.split(",")]:
        return "admin"
    return "chouettos"


def build_profile(user):
    exp = int(datetime.datetime.now().timestamp()) + JWT_EXPIRE_OFFSET
    if NO_AUTH:
        return {
            "user": user,
            "name": user,
            "lastname": user,
            "role": "admin",
            "exp": exp,
        }
    try:
        ldap_connection = ldap.initialize(LDAP_SERVER)
        ldap_connection.simple_bind_s(LDAP_BASE_DN, LDAP_ADMIN_PASS)
        result = ldap_connection.search_s(LDAP_SEARCH_DN, LDAP_SCOPE_SUBTREE, "cn={}".format(user))
        ldap_connection.unbind_s()

        return {
            "user": user,
            "name": result[0][1]["sn"][0].decode("utf-8"),
            "lastname": result[0][1]["description"][0].decode("utf-8"),
            "role": role(user),
            "exp": exp,
        }
    except Exception as e:
        abort(403, f"Authentication failed for {user}: {str(e)}")


@blueprint.route("/api/v1/login", methods=["POST"])
def login():
    credentials = request.json
    # extract credentials from the request
    if not credentials or "email" not in credentials or "password" not in credentials:
        abort(400, "Missing or bad credentials")
    user = credentials["email"]
    password = credentials["password"]

    if not NO_AUTH:
        # authenticate against some identity source, such as LDAP or a database
        try:
            ldap_connection = ldap.initialize(LDAP_SERVER)
            ldap_connection.simple_bind_s(LDAP_USER_DN.format(user), password)
            ldap_connection.unbind_s()
        except Exception as e:
            abort(403, f"Authentication failed for {user}: {str(e)}")

    profile = build_profile(user)
    token = jwt.encode(profile, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return jsonify({"token": token})


def jwt_token_from_header():
    auth = request.headers.get("Authorization", None)
    if not auth:
        raise AuthorizationError(
            {
                "code": "authorization_header_missing",
                "description": "Authorization header is expected",
            }
        )

    parts = auth.split()

    if parts[0].lower() != "bearer":
        raise AuthorizationError(
            {
                "code": "invalid_header",
                "description": "Authorization header must start with Bearer",
            }
        )
    elif len(parts) == 1:
        raise AuthorizationError({"code": "invalid_header", "description": "Token not found"})
    elif len(parts) > 2:
        raise AuthorizationError(
            {
                "code": "invalid_header",
                "description": "Authorization header must be Bearer + \\s + token",
            }
        )

    return parts[1]


def requires_auth(f):
    def decorated(*args, **kwargs):
        try:
            token = jwt_token_from_header()
            jwt.decode(token, JWT_SECRET)  # throw away value
        except AuthorizationError as e:
            abort(400, e)
        except jwt.PyJWTError as e:
            abort(401, {"code": "token_invalid", "description": str(e)})

        return f(*args, **kwargs)

    return decorated


@blueprint.route("/api/v1/login/refresh", methods=["POST"])
@requires_auth
def refresh_token():
    """refresh the current JWT"""
    # get and decode the current token
    token = jwt_token_from_header()
    payload = jwt.decode(token, JWT_SECRET)
    # create a new token with a new exp time
    token = jwt.encode(build_profile(payload["user"]), JWT_SECRET, algorithm=JWT_ALGORITHM)

    return jsonify({"token": token})


class JwtTokenAuth(TokenAuth):
    def check_auth(self, token, allowed_roles, resource, method):
        """For the purpose of this example the implementation is as simple as
        possible. A 'real' token should probably contain a hash of the
        username/password combo, which sould then validated against the account
        data stored on the DB.
        """
        try:
            jwt_decoded = jwt.decode(token, JWT_SECRET, algorithms="HS256")  # throw away value
            if (
                resource in ["inventories"]
                and method in ["POST", "DELETE"]
                and jwt_decoded["role"] != "admin"
            ):
                abort(
                    403,
                    {
                        "code": "forbidden",
                        "description": "this action requires admin rights",
                    },
                )
            return jwt_decoded
        except jwt.PyJWTError as e:
            abort(401, {"code": "token_invalid", "description": str(e)})
