/**
 * THE APP'S CLOCK: an ISO timestamp in the PHONE'S OWN OFFSET.
 *
 * `toISOString()` is always UTC, and screens show a stamp's hh:mm as written -
 * so a day closed at 03:33 in Odisha read "Closed 22:03" (DV-8). Writing the
 * offset into the stamp keeps the instant exact for the server and makes the
 * hh:mm the one on the shopkeeper's wall clock, with no screen doing time-zone
 * arithmetic. 29 characters; the push schema allows 20-30.
 */
export function localIso(d: Date = new Date()): string {
  const pad = (n: number, w = 2) => String(Math.abs(n)).padStart(w, '0');
  const off = -d.getTimezoneOffset(); // minutes east of UTC
  return (
    String(d.getFullYear()) + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) +
    '.' + pad(d.getMilliseconds(), 3) +
    (off >= 0 ? '+' : '-') + pad(Math.trunc(off / 60)) + ':' + pad(off % 60)
  );
}
