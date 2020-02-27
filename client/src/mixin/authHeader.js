import { getTokenFromCookie } from '@/mixin/cookie';

function authHeader() {
  const token = getTokenFromCookie();

  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export default authHeader;
