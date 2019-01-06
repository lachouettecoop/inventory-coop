import jwt
import ldap
import os
import time
from eve.auth import TokenAuth
from flask import abort
from flask import Blueprint
from flask import jsonify
from flask import request


blueprint = Blueprint('login', __name__)

ADMIN_USERS = os.environ.get('ADMIN_USERS', 'papanowel@gmail.com')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRE_OFFSET = os.environ.get('JWT_EXPIRE_OFFSET', 60 * 60 * 12)  # 12H
JWT_SECRET = os.environ.get('JWT_SECRET')
LDAP_SERVER = os.environ.get('LDAP_SERVER', 'ldap://ldap.lachouettecoop.fr:389')
LDAP_BASE_DN = os.environ.get('LDAP_BASE_DN', 'cn=admin,dc=lachouettecoop,dc=fr')
LDAP_SEARCH_DN = os.environ.get('LDAP_SEARCH_DN', 'dc=lachouettecoop,dc=fr')
LDAP_USER_DN = os.environ.get('LDAP_USER_DN', 'cn={},ou=membres,o=lachouettecoop,dc=lachouettecoop,dc=fr')
LDAP_ADMIN_PASS = os.environ.get('LDAP_ADMIN_PASS')


class AuthorizationError(Exception):
    """ A base class for exceptions used by bottle. """
    pass


def role(user):
    if user in [admin.strip() for admin in ADMIN_USERS.split(',')]:
        return 'admin'
    return 'chouettos'


def build_profile(user):
    try:
        ldap_connection = ldap.initialize(LDAP_SERVER)
        ldap_connection.simple_bind_s(LDAP_BASE_DN, LDAP_ADMIN_PASS)
        result = ldap_connection.search_s(LDAP_SEARCH_DN, ldap.SCOPE_SUBTREE, 'cn={}'.format(user))
        ldap_connection.unbind_s()

        return {'user': user,
                'name': result[0][1]['sn'][0].decode('utf-8'),
                'lastname': result[0][1]['description'][0].decode('utf-8'),
                'role': role(user),
                'exp': time.time() + JWT_EXPIRE_OFFSET}
    except Exception as e:
        abort(403, f'Authentication failed for {user}: {str(e)}')


@blueprint.route('/api/v1/login', methods=['POST'])
def login():
    # extract credentials from the request
    credentials = request.json
    if not credentials or 'email' not in credentials or 'password' not in credentials:
        abort(400, 'Missing or bad credentials')

    user = credentials['email']
    password = credentials['password']
    # authenticate against some identity source, such as LDAP or a database
    try:
        ldap_connection = ldap.initialize(LDAP_SERVER)
        ldap_connection.simple_bind_s(LDAP_USER_DN.format(user), password)
        ldap_connection.unbind_s()
    except Exception as e:
        abort(403, f'Authentication failed for {user}: {str(e)}')
    token = jwt.encode(build_profile(user), JWT_SECRET, algorithm=JWT_ALGORITHM)

    return jsonify({'token': token})


def jwt_token_from_header():
    auth = request.headers.get('Authorization', None)
    if not auth:
        raise AuthorizationError(
            {'code': 'authorization_header_missing', 'description': 'Authorization header is expected'})

    parts = auth.split()

    if parts[0].lower() != 'bearer':
        raise AuthorizationError(
            {'code': 'invalid_header', 'description': 'Authorization header must start with Bearer'})
    elif len(parts) == 1:
        raise AuthorizationError({'code': 'invalid_header', 'description': 'Token not found'})
    elif len(parts) > 2:
        raise AuthorizationError(
            {'code': 'invalid_header', 'description': 'Authorization header must be Bearer + \s + token'})

    return parts[1]


def requires_admin(f):
    def decorated(*args, **kwargs):
        try:
            token = jwt_token_from_header()
        except AuthorizationError as e:
            abort(400, e)

        try:
            jwt.decode(token, JWT_SECRET)  # throw away value
        except jwt.ExpiredSignature:
            abort(401, {'code': 'token_expired', 'description': 'token is expired'})
        except jwt.DecodeError as e:
            abort(401, {'code': 'token_invalid', 'description': str(e)})

        return f(*args, **kwargs)

    return decorated


def requires_auth(f):
    def decorated(*args, **kwargs):
        try:
            token = jwt_token_from_header()
        except AuthorizationError as e:
            abort(400, e)

        try:
            jwt.decode(token, JWT_SECRET)  # throw away value
        except jwt.ExpiredSignature:
            abort(401, {'code': 'token_expired', 'description': 'token is expired'})
        except jwt.DecodeError as e:
            abort(401, {'code': 'token_invalid', 'description': str(e)})

        return f(*args, **kwargs)

    return decorated


@blueprint.route('/api/v1/login/refresh', methods=['POST'])
@requires_auth
def refresh_token():
    """refresh the current JWT"""
    # get and decode the current token
    token = jwt_token_from_header()
    payload = jwt.decode(token, JWT_SECRET)
    # create a new token with a new exp time
    token = jwt.encode(build_profile(payload['user']), JWT_SECRET, algorithm=JWT_ALGORITHM)

    return jsonify({'token': token})


class JwtTokenAuth(TokenAuth):
    def check_auth(self, token, allowed_roles, resource, method):
        """For the purpose of this example the implementation is as simple as
        possible. A 'real' token should probably contain a hash of the
        username/password combo, which sould then validated against the account
        data stored on the DB.
        """
        try:
            jwt_decoded =  jwt.decode(token, JWT_SECRET)  # throw away value
        except jwt.ExpiredSignature:
            abort(401, {'code': 'token_expired', 'description': 'token is expired'})
        except jwt.DecodeError as e:
            abort(401, {'code': 'token_invalid', 'description': str(e)})

        if resource in ['inventories'] and method in ['POST', 'DELETE'] and jwt_decoded['role'] != 'admin':
            abort(403, {'code': 'forbidden', 'description': 'this action requires admin rights'})
        return jwt_decoded
