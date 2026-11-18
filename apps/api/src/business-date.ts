/**
 * C-11 · "TODAY" ON THE SERVER, FOR ONE SHOP. The only place it is decided.
 *
 * The formula engine is clock-free (ADR-012) and stays so: it takes "today" as an
 * argument. Somebody has to supply it, and that somebody used to be
 * `deps.now().slice(0, 10)` - the UTC date. In India that is the wrong day from
 * 00:00 to 05:30 IST, which is exactly when a shop trading past midnight is still
 * on yesterday's business day (decision 1).
 *
 * THE RULE. Read the instant on the Asia/Kolkata wall clock (a fixed UTC+05:30,
 * India has no daylight saving), then apply the engine's own `businessDate` with
 * the day start the shop is currently using - the start recorded on its newest
 * day, or midnight for a shop with no days yet.
 *
 * Pure: the instant is an argument, so a test holds it still.
 */
import { businessDate, MIDNIGHT } from '@swafto/formula-engine';
import type { IsoDate } from '@swafto/formula-engine';

const IST_OFFSET_MS = (5 * 60 + 30) * 60_000;

/** The instant as written on a wall clock in India: 'YYYY-MM-DDTHH:MM'. */
export function istWallClock(nowIso: string): string {
  const ms = Date.parse(nowIso);
  if (!Number.isFinite(ms)) throw new Error('not an ISO instant: ' + nowIso);
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 16);
}

/** The calendar date in India right now, ignoring any shop day start. */
export function istCalendarDate(nowIso: string): IsoDate {
  return istWallClock(nowIso).slice(0, 10);
}

/** The shop's business date at `nowIso`, given the day start it is using ('HH:MM'). */
export function shopToday(nowIso: string, startsAt: string | null | undefined): IsoDate {
  return businessDate(istWallClock(nowIso), startsAt ?? MIDNIGHT);
}
