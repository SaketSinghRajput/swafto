/**
 * Runs the REJECTION CORPUS (§5.11) against every layer each case names.
 *
 * §5.11.2: a rejection is tested at EVERY layer that claims to enforce it. A
 * rejection only the API performs is absent in the app; one only the app performs is
 * absent on sync.
 *
 * Cases whose only layer is `api` are reported as PENDING and counted, never skipped
 * silently - an untested rejection that looks green is precisely the failure this
 * corpus exists to prevent.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { migrationUp } from '../src/spec.ts';
import * as engine from '../../formula-engine/src/index.ts';

interface RejectCase {
  name: string;
  violates: string;
  layers: ('engine' | 'schema' | 'api')[];
  engine?: { fn: string; args: unknown[] };
  schema?: { table: string; columns: string; values: string };
  messageMatches?: string;
}

const corpus = JSON.parse(
  readFileSync(new URL('../../formula-engine/rejects.json', import.meta.url), 'utf8'),
) as { count: number; cases: RejectCase[] };

const SHOP = '00000000-0000-7000-8000-000000000001';
const PARTY = '00000000-0000-7000-8000-0000000000c1';
const DUPE = '01890000-0000-7000-8000-000000009999';
const OPEN_DAY = '2026-07-15';
const CLOSED_DAY = '2026-07-12';
const NOW = '2026-07-15T10:00:00.000Z';

let seq = 0;

function seeded(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  for (const s of migrationUp('sqlite')) db.exec(s);
  db.exec(`INSERT INTO shops (id, name, type, language, created_at)
           VALUES ('${SHOP}', 'Test Store', 'kirana', 'en', '${NOW}')`);
  db.exec(`INSERT INTO days (shop_id, date, state, opening_cash, created_at)
           VALUES ('${SHOP}', '${OPEN_DAY}', 'open', 150000, '${NOW}')`);
  db.exec(`INSERT INTO days (shop_id, date, state, opening_cash, counted_cash, closed_at, created_at)
           VALUES ('${SHOP}', '${CLOSED_DAY}', 'closed', 150000, 605000, '${NOW}', '${NOW}')`);
  db.exec(`INSERT INTO parties (id, shop_id, kind, name, created_at)
           VALUES ('${PARTY}', '${SHOP}', 'customer', 'A Customer', '${NOW}')`);
  // Pre-existing row, so the duplicate-id case has something to collide with.
  db.exec(`INSERT INTO entries (id, shop_id, day_id, section, amount, mode, created_at, source)
           VALUES ('${DUPE}', '${SHOP}', '${OPEN_DAY}', 'cash_sales', 1000, 'cash', '${NOW}', 'manual')`);
  return db;
}

const substitute = (s: string) =>
  s
    .split('{{shop}}')
    .join(SHOP)
    .split('{{party}}')
    .join(PARTY)
    .split('{{openDay}}')
    .join(OPEN_DAY)
    .split('{{closedDay}}')
    .join(CLOSED_DAY)
    .split('{{now}}')
    .join(NOW)
    .split('{{dupe}}')
    .join(DUPE)
    .split('{{uuid}}')
    .join(`01890000-0000-7000-8000-${String(++seq).padStart(12, '0')}`);

describe('§5.11 · the rejection corpus is complete and coherent', () => {
  it('every case names at least one layer and the rule it violates', () => {
    for (const c of corpus.cases) {
      expect(c.layers.length, `${c.name} names no layer`).toBeGreaterThan(0);
      expect(c.violates.length, `${c.name} does not say what it violates`).toBeGreaterThan(10);
    }
  });

  it('reports how many cases are still PENDING an unbuilt layer', () => {
    const pending = corpus.cases.filter((c) => c.layers.every((l) => l === 'api'));
    // Recorded, not hidden. These become real when G6-G8 land API validation.
    console.log(
      `\n  [5.11] ${pending.length} of ${corpus.count} cases are PENDING the API layer:\n` +
        pending.map((p) => `        - ${p.name}`).join('\n') +
        '\n',
    );
    expect(pending.length).toBeLessThan(corpus.count);
  });
});

describe('§5.11 · ENGINE layer refuses what it must', () => {
  const engineCases = corpus.cases.filter((c) => c.layers.includes('engine'));

  it('has engine cases to run', () => {
    expect(engineCases.length).toBeGreaterThan(0);
  });

  for (const c of engineCases) {
    it(`${c.name} - ${c.violates}`, () => {
      const fns = engine as unknown as Record<string, (...a: unknown[]) => unknown>;
      const fn = fns[c.engine!.fn];
      expect(fn, `engine exports no function named ${c.engine!.fn}`).toBeTypeOf('function');
      if (typeof fn !== 'function') throw new Error('unreachable: asserted above');
      let threw: Error | null = null;
      try {
        fn(...c.engine!.args);
      } catch (err) {
        threw = err as Error;
      }
      expect(threw, `${c.name} was ACCEPTED by the engine`).not.toBeNull();
      if (c.messageMatches) expect(threw!.message).toContain(c.messageMatches);
    });
  }
});

describe('§5.11 · SCHEMA layer refuses what it must', () => {
  const schemaCases = corpus.cases.filter((c) => c.layers.includes('schema'));

  it('has schema cases to run', () => {
    expect(schemaCases.length).toBeGreaterThan(0);
  });

  for (const c of schemaCases) {
    it(`${c.name} - ${c.violates}`, () => {
      const db = seeded();
      const sql = `INSERT INTO ${c.schema!.table} (${c.schema!.columns}) VALUES (${substitute(
        c.schema!.values,
      )})`;
      let threw: Error | null = null;
      try {
        db.exec(sql);
      } catch (err) {
        threw = err as Error;
      }
      expect(threw, `${c.name} was ACCEPTED by the database`).not.toBeNull();
      if (c.messageMatches) expect(threw!.message).toContain(c.messageMatches);
    });
  }
});
