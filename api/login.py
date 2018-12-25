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

JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRE_OFFSET = os.environ.get('JWT_EXPIRE_OFFSET', 60 * 60 * 12)  # 12H
JWT_SECRET = os.environ.get('JWT_SECRET')
LDAP_SERVER = os.environ.get('LDAP_SERVER', 'ldap://ldap.lachouettecoop.fr:389')
LDAP_BASE_DN = os.environ.get('LDAP_BASE_DN', 'cn=admin,dc=lachouettecoop,dc=fr')
LDAP_SEARCH_DN = os.environ.get('LDAP_SEARCH_DN', 'dc=lachouettecoop,dc=fr')
LDAP_USER_DN = os.environ.get('LDAP_USER_DN', 'cn={},ou=membres,o=lachouettecoop,dc=lachouettecoop,dc=fr')
LDAP_ADMIN_PASS = os.environ.get('LDAP_ADMIN_PASS')


def build_profile(user):
    try:
        ldap_connection = ldap.initialize(LDAP_SERVER)
        ldap_connection.simple_bind_s(LDAP_BASE_DN, LDAP_ADMIN_PASS)
        result = ldap_connection.search_s(LDAP_SEARCH_DN, ldap.SCOPE_SUBTREE, 'cn={}'.format(user))
        ldap_connection.unbind_s()

        return {'user': user,
                'name': result[0][1]['sn'][0].decode('utf-8'),
                'lastname': result[0][1]['description'][0].decode('utf-8'),
                'exp': time.time() + JWT_EXPIRE_OFFSET}
    except Exception as e:
        abort(403, 'Authentication failed for %s: %s' % (user, str(e)))


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
        abort(403, 'Authentication failed for %s: %s' % (credentials['user'], str(e)))
    token = jwt.encode(build_profile(user), JWT_SECRET, algorithm=JWT_ALGORITHM)

    return jsonify({'token': token})


class JwtTokenAuth(TokenAuth):
    def check_auth(self, token, allowed_roles, resource, method):
        """For the purpose of this example the implementation is as simple as
        possible. A 'real' token should probably contain a hash of the
        username/password combo, which sould then validated against the account
        data stored on the DB.
        """
        try:
            return jwt.decode(token, JWT_SECRET)  # throw away value
        except jwt.ExpiredSignature:
            abort(401, {'code': 'token_expired', 'description': 'token is expired'})
        except jwt.DecodeError as e:
            abort(401, {'code': 'token_invalid', 'description': str(e)})
