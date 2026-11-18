/**
 * UUIDv7, BY HAND, BECAUSE THE SHAPE MATTERS MORE THAN THE LIBRARY.
 *
 * ADR-004 chose v7 over v4 deliberately: the first 48 bits are a millisecond
 * timestamp, so ids sort in creation order. That is what lets the outbox drain
 * in the order a shopkeeper entered things, and it is what keeps the Postgres
 * primary-key index local instead of scattering every insert across the btree.
 *
 * WHY THE RANDOMNESS IS NOT Math.random.
 *
 * These ids are not secrets - they are client-generated primary keys. But the
 * server inserts with ON CONFLICT (id) DO NOTHING, because D1 is append-only
 * and an UPDATE would overwrite history. So a collision does not raise an
 * error: the second entry is simply never written. An entry that is absent is
 * a figure the shopkeeper typed and the ledger does not have, and nothing in
 * the system would ever report it. 74 bits from a weak generator is not a risk
 * worth taking against that failure mode, so this uses crypto.getRandomValues,
 * which `react-native-get-random-values` installs from index.js.
 *
 * The clock is a parameter rather than a direct Date.now() call, which is the
 * same discipline ADR-012 imposes on the formula engine, for the same reason:
 * a function that reads a clock cannot be tested against a known answer.
 */
const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));

export function uuidv7(nowMs: () => number = Date.now): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  /*
   * The 48-bit timestamp, big-endian, most significant byte first.
   *
   * DIVIDE, DO NOT SHIFT. `ms >> 40` is wrong: `>>` coerces its operand with
   * ToInt32 first, so a timestamp of ~1.79e12 wraps before the shift happens
   * and the high bytes come out as noise. Dividing by a power of two does the
   * same job in floating point, where the value still fits exactly - a
   * millisecond timestamp is well inside the 53 bits a double holds precisely.
   *
   * The `Math.floor` calls are for the reader, not the arithmetic. `&` also
   * coerces through ToInt32, which truncates toward zero, so for a positive
   * timestamp the floor is already implicit and removing it changes no output.
   * An earlier version of this comment claimed otherwise; a planted defect
   * that removed every `Math.floor` passed all ten tests, which is how the
   * overclaim was found. They stay because the intent should not depend on
   * knowing ToInt32's rounding rule, but they are not load-bearing.
   */
  const ms = nowMs();
  bytes[0] = Math.floor(ms / 2 ** 40) & 0xff;
  bytes[1] = Math.floor(ms / 2 ** 32) & 0xff;
  bytes[2] = Math.floor(ms / 2 ** 24) & 0xff;
  bytes[3] = Math.floor(ms / 2 ** 16) & 0xff;
  bytes[4] = Math.floor(ms / 2 ** 8) & 0xff;
  bytes[5] = ms & 0xff;

  // Version 7 in the high nibble of byte 6; RFC 4122 variant in byte 8.
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  let hex = '';
  for (const b of bytes) hex += HEX[b]!;
  return (
    hex.slice(0, 8) +
    '-' +
    hex.slice(8, 12) +
    '-' +
    hex.slice(12, 16) +
    '-' +
    hex.slice(16, 20) +
    '-' +
    hex.slice(20)
  );
}
