/**
 * RT-10 · migration 0004, what can be checked without a database: it adds exactly one
 * server-only column with a default that keeps pre-existing sessions valid, and its down
 * removes it. The compare-and-set behaviour is the API's (apps/api/test/refresh-rotation.spec.ts).
 */
import { describe, it, expect } from 'vitest';
import { allMigrationsDown, allMigrationsUp, migration4Down, migration4Up, migration5Down, migration5Up, migration6Down, migration6Up } from '../src/spec.ts';

describe('migration 0004 · devices.refresh_gen', () => {
  it('adds one NOT NULL column defaulting to 0 (the generation of every pre-rotation token)', () => {
    expect(migration4Up('postgres')).toEqual([
      'ALTER TABLE devices ADD COLUMN refresh_gen INTEGER NOT NULL DEFAULT 0 CHECK (refresh_gen >= 0)',
      'ALTER TABLE devices ADD COLUMN refresh_rotated_at TIMESTAMPTZ',
      'ALTER TABLE devices ADD COLUMN refresh_graced BOOLEAN NOT NULL DEFAULT FALSE',
    ]);
    // IF EXISTS on the table too: a clean-slate down on a database with no `devices` must not fail (found by the first real Postgres run).
    expect(migration4Down('postgres')).toEqual([
      'ALTER TABLE IF EXISTS devices DROP COLUMN IF EXISTS refresh_graced',
      'ALTER TABLE IF EXISTS devices DROP COLUMN IF EXISTS refresh_rotated_at',
      'ALTER TABLE IF EXISTS devices DROP COLUMN IF EXISTS refresh_gen',
    ]);
  });

  it('is Postgres only, last up and first down', () => {
    expect(migration4Up('sqlite')).toEqual([]);
    expect(migration4Down('sqlite')).toEqual([]);
    // 0005 (invite codes) now follows it going up and precedes it going down.
    const up5 = migration5Up('postgres').length + migration6Up('postgres').length;
    const down5 = migration6Down('postgres').length + migration5Down('postgres').length;
    expect(allMigrationsUp('postgres').slice(-3 - up5, -up5)).toEqual(migration4Up('postgres'));
    expect(allMigrationsDown('postgres').slice(down5, down5 + 3)).toEqual(migration4Down('postgres'));
  });
});
