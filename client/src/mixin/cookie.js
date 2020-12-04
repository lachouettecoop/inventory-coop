import Cookies from 'js-cookie';

const COOKIE_NAME = 'InventoryCoopClient';

export function recordTokenInCookie(token) {
  Cookies.set(COOKIE_NAME, token, { sameSite: 'strict' });
}

export function getTokenFromCookie() {
  return Cookies.get(COOKIE_NAME);
}

export function removeCookieToken() {
  Cookies.remove(COOKIE_NAME);
}
