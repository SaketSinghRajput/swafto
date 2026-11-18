/**
 * ARCH-09 · migration 0003, what can be checked without a database: it exists, it is Postgres
 * only, it locks the day row, it changes nothing else, and its down restores 0001 byte for byte.
 * The behaviour (a close waits for an in-flight insert) is the Postgres case in postgres.spec.ts.
 */
import { describe, it, expect } from 'vitest';
import { allMigrationsDown, allMigrationsUp, migration3Down, migration3Up, migration4Down, migration4Up, migrationUp } from '../src/spec.ts';

describe('migration 0003 · the closed-day triggers lock the day they read', () => {
  it('replaces exactly the two closed-day functions, each reading days.state FOR SHARE', () => {
    const up = migration3Up('postgres');
    expect(up).toHaveLength(2);
    expect(up[0]).toMatch(/entries_reject_closed_day/);
    expect(up[1]).toMatch(/day_facts_reject_closed_day/);
    for (const s of up) expect(s).toMatch(/FROM days\s+WHERE shop_id = NEW\.shop_id AND date = NEW\.day_id\s+FOR SHARE;/);
  });

  it('0001 stays unlocked, and 0003 up is 0001 plus the lock and nothing else', () => {
    const base = migrationUp('postgres');
    for (const s of migration3Up('postgres')) {
      const unlocked = s.replace('\n    FOR SHARE', '');
      expect(base, 'the unlocked body is 0001').toContain(unlocked);
      expect(base).not.toContain(s);
    }
  });

  it('down restores 0001 byte for byte', () => {
    const base = migrationUp('postgres');
    for (const s of migration3Down('postgres')) expect(base).toContain(s);
  });

  it('is Postgres only, and sits immediately before 0004 going up and immediately after it going down', () => {
    expect(migration3Up('sqlite')).toEqual([]);
    expect(migration3Down('sqlite')).toEqual([]);
    // 0004 (RT-10) is now the last thing up and the first thing down; 0003 is right behind it.
    const tail = migration4Up('postgres').length;
    expect(allMigrationsUp('postgres').slice(-2 - tail, -tail)).toEqual(migration3Up('postgres'));
    expect(allMigrationsDown('postgres').slice(tail, tail + 2)).toEqual(migration3Down('postgres'));
  });
});
