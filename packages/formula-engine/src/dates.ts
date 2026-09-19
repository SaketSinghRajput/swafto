/**
 * Date arithmetic on ISO 'YYYY-MM-DD' strings.
 *
 * PURE AND CLOCK-FREE. There is no `new Date()` and no `Date.now()` anywhere in this
 * package - "today" is always PASSED IN (ADR-012). That is what lets the vectors
 * produce identical output on any machine, in any timezone, at any time of day.
 *
 * Deliberately avoids the Date object for parsing too: `new Date('2026-07-15')` is
 * UTC-midnight while `new Date('2026/07/15')` is local-midnight, and that
 * inconsistency has produced off-by-one-day bugs in every ledger app ever written.
 * A shop's day boundary is not a timezone question (ADR-004).
 */

export type IsoDate = string;

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoDate(d: IsoDate): { y: number; m: number; d: number } {
  const m = ISO.exec(d);
  if (!m) throw new Error(`Not an ISO date (YYYY-MM-DD): ${d}`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  if (mo < 1 || mo > 12 || da < 1 || da > 31) throw new Error(`Not a valid date: ${d}`);
  return { y, m: mo, d: da };
}

/**
 * Days since the epoch, by civil-calendar arithmetic (Howard Hinnant's
 * `days_from_civil`). No Date object, no timezone, no DST. Exact for any Gregorian
 * date, and the inverse of `fromEpochDay`.
 */
export function toEpochDay(date: IsoDate): number {
  const { y, m, d } = parseIsoDate(date);
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400; // [0, 399]
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1; // [0, 365]
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy; // [0, 146096]
  return era * 146097 + doe - 719468;
}

export function fromEpochDay(z: number): IsoDate {
  const zz = z + 719468;
  const era = Math.floor(zz / 146097);
  const doe = zz - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  const year = m <= 2 ? y + 1 : y;
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${year}-${pad(m)}-${pad(d)}`;
}

/** `to - from`, in whole days. Negative when `to` is earlier. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return toEpochDay(to) - toEpochDay(from);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromEpochDay(toEpochDay(date) + days);
}

export function compareIsoDate(a: IsoDate, b: IsoDate): number {
  // ISO dates sort correctly as strings, but go through epoch days so an invalid
  // date throws rather than silently mis-sorting.
  return toEpochDay(a) - toEpochDay(b);
}
