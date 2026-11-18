/**
 * UUIDv7, AND THE TWO PROPERTIES ANYTHING DEPENDS ON.
 *
 * ADR-004 did not choose v7 for fashion. Two things follow from the format and
 * both are load-bearing:
 *
 *   ORDERING - the first 48 bits are a millisecond timestamp, big-endian, so
 *   ids sort in creation order as plain strings. The outbox drains in that
 *   order, which is the order the shopkeeper typed things, and the Postgres
 *   primary-key index stays local instead of scattering every insert.
 *
 *   DISTINCTNESS - the remaining 74 bits are random. The server inserts with
 *   ON CONFLICT (id) DO NOTHING because D1 is append-only, so a collision
 *   raises no error: the second entry is simply never written, and no part of
 *   the system would ever report a figure the shopkeeper typed and the ledger
 *   does not have.
 *
 * So the tests here are about the format being RIGHT, not about it being
 * produced. A generator that returned a constant would satisfy "is a string".
 */
import { describe, expect, it } from 'vitest';
import { uuidv7 } from './ids.ts';

/** A fixed clock, so every assertion is against a known answer (ADR-012). */
const AT = (ms: number) => () => ms;
const NOON_22_OCT_2026 = Date.UTC(2026, 9, 22, 12, 0, 0);

/** Read the 48-bit big-endian timestamp back out of the id. */
const timestampOf = (id: string): number => {
  const hex = id.replace(/-/g, '').slice(0, 12);
  return parseInt(hex, 16);
};

describe('uuidv7 has the shape the format requires', () => {
  it('is 36 characters, hyphenated 8-4-4-4-12', () => {
    expect(uuidv7(AT(NOON_22_OCT_2026))).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('declares version 7, not 4', () => {
    // The version lives in the high nibble of byte 6, the 13th hex digit.
    const id = uuidv7(AT(NOON_22_OCT_2026));
    expect(id.replace(/-/g, '')[12]).toBe('7');
  });

  it('sets the RFC 4122 variant bits to 10xx', () => {
    // Byte 8 is the 17th hex digit; 10xx in binary is 8, 9, a or b.
    const id = uuidv7(AT(NOON_22_OCT_2026));
    expect('89ab').toContain(id.replace(/-/g, '')[16]);
  });
});

describe('the timestamp is the clock it was given', () => {
  it('encodes the exact millisecond, recoverably', () => {
    expect(timestampOf(uuidv7(AT(NOON_22_OCT_2026)))).toBe(NOON_22_OCT_2026);
  });

  it('encodes a value above 2^32, which a 32-bit shift would corrupt', () => {
    /*
     * THIS IS THE ONE THAT CATCHES THE EASY MISTAKE.
     *
     * A millisecond timestamp today is about 1.79e12, far above 2^32.
     * JavaScript's bitwise operators coerce to 32 bits, so writing
     * `ms >> 40 & 0xff` or `ms / 2 ** 40 & 0xff` without flooring first
     * truncates through a path that happens to look plausible. Any such
     * version fails here, because the value cannot be read back.
     */
    const ms = Date.UTC(2026, 9, 22, 12, 0, 0);
    expect(ms).toBeGreaterThan(2 ** 32);
    expect(timestampOf(uuidv7(AT(ms)))).toBe(ms);
  });

  it('round-trips a timestamp near the 48-bit ceiling', () => {
    const ms = 2 ** 48 - 1;
    expect(timestampOf(uuidv7(AT(ms)))).toBe(ms);
  });
});

describe('ordering and distinctness, the two properties ADR-004 relies on', () => {
  it('sorts lexicographically in the order the ids were minted', () => {
    const times = [1, 2, 3, 1000, 86_400_000, NOON_22_OCT_2026].map(
      (offset) => NOON_22_OCT_2026 + offset,
    );
    const ids = times.map((ms) => uuidv7(AT(ms)));

    expect([...ids].sort()).toEqual(ids);
  });

  it('a later id never sorts before an earlier one, across a byte boundary', () => {
    // 0x...FF -> 0x...00 + carry is where a wrong byte order shows up.
    const before = uuidv7(AT(0x0000_0100_00ff));
    const after = uuidv7(AT(0x0000_0100_0100));
    expect(before < after).toBe(true);
  });

  it('is distinct across 2000 ids minted on the SAME millisecond', () => {
    /*
     * Same clock every time, so distinctness can only come from the random
     * bits. A generator that forgot to fill them - or filled them once and
     * reused the buffer - collapses to a single value and fails here.
     */
    const ids = new Set(Array.from({ length: 2000 }, () => uuidv7(AT(NOON_22_OCT_2026))));
    expect(ids.size).toBe(2000);
  });

  it('varies the random bits, not just the timestamp', () => {
    const a = uuidv7(AT(NOON_22_OCT_2026)).replace(/-/g, '').slice(12);
    const b = uuidv7(AT(NOON_22_OCT_2026)).replace(/-/g, '').slice(12);
    expect(a).not.toBe(b);
  });
});
