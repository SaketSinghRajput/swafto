/**
 * C-12 MICRO-BENCHMARK: what one `dayInputFor` costs in CPU as a shop's history grows.
 *
 *   node tools/load/fold-bench.mjs [--api-src DIR] [--out FILE.json]
 *
 * The repository is a fake that hands back pre-built rows, so NO database time and
 * no memory-repository time is in the number: it is the read path's own CPU (group,
 * fold through the engine, memo lookups) and nothing else. Derived from the audit's
 * `fold-bench.ts` (same shapes) so the figures line up with C-12's 230 ms / 1406 ms.
 *
 * `--api-src` picks which copy of apps/api/src to measure (before / after).
 * Each shape is run: one COLD read (empty memo, the first read of a shop after a
 * restart) and then 9 more; the median of those 9 is "warm".
 */
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { addDays } from '@swafto/formula-engine';

const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : undefined; };
const SRC = opt('api-src') ? pathToFileURL(resolve(opt('api-src')) + '/').href : new URL('../../apps/api/src/', import.meta.url).href;
const { dayInputFor } = await import(new URL('read/routes.ts', SRC).href);

const mk = (days, perDay) => {
  const all = [];
  let n = 0;
  for (let d = 0; d < days; d += 1) {
    const dayId = addDays('2026-01-01', d);
    for (let i = 0; i < perDay; i += 1) {
      n += 1;
      const credit = i % 5 === 0;
      all.push({
        id: `00000000-0000-7000-8000-${n.toString(16).padStart(12, '0')}`, dayId,
        section: credit ? 'udhar_sales' : 'cash_sales', amount: 10000 + i, mode: credit ? 'udhar' : 'cash',
        createdAt: dayId + 'T10:00:00.000Z', source: 'manual',
        ...(credit ? { partyId: '11111111-1111-7111-8111-111111111111' } : {}),
      });
    }
  }
  return all;
};

const rows = [];
for (const [days, perDay] of [[30, 50], [90, 40], [365, 50], [730, 50], [365, 150], [1095, 100]]) {
  const entries = mk(days, perDay);
  const target = addDays('2026-01-01', days);
  const dayList = [...new Set(entries.map((e) => e.dayId))].sort().map((date) => ({ date, state: 'closed' }));
  let loads = 0;
  const repo = {
    findDay: async () => null,
    entriesFor: async () => [],
    entriesBefore: async () => ((loads += 1), entries),
    daysBefore: async () => dayList,
    dayFactsFor: async () => ({ upiConfirmations: [], adjustments: [] }),
  };
  const opts = { shadowRate: 0 }; // the 1 % shadow check is a sampled extra, priced separately in the README
  const time = async () => { const s = performance.now(); await dayInputFor(repo, 'shop', target, opts); return performance.now() - s; };
  const cold = await time();
  const warm = [];
  for (let k = 0; k < 9; k += 1) warm.push(await time());
  warm.sort((a, b) => a - b);
  rows.push({ days, perDay, rows: entries.length, coldMs: +cold.toPrecision(3), warmMedianMs: +warm[4].toPrecision(3), warmMaxMs: +warm[8].toPrecision(3), ledgerLoadsInTenReads: loads });
  console.log(JSON.stringify(rows.at(-1)));
}
if (opt('out')) writeFileSync(resolve(opt('out')), JSON.stringify({ node: process.version, src: SRC, rows }, null, 2));
