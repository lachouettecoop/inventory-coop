import { getTokenFromCookie } from '@/mixin/cookie';

function authHeader() {
  const token = getTokenFromCookie();

  if (token) {
    return {
      Authorization: `Bearer ${token}`,
      'Cache-Control': 'no-cache, no-store',
    };
  }
  return {};
}

export default authHeader;
