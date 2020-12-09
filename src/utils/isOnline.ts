/**
 * Assumes a browser is online if `undefined`, otherwise makes a best effort
 * @link https://developer.mozilla.org/en-US/docs/Web/API/NavigatorOnLine/onLine
 */
export function isOnline() {
  return navigator.onLine === undefined || navigator.onLine;
}
