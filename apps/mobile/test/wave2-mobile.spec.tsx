/**
 * PRODUCTIONIZE WAVE 2 - MOBILE. One file per wave keeps the evidence for each
 * finding together: C-17, C-19, C-18, C-16, C-09 and the sync-robustness set
 * (FE-5, FE-10, FE-11). Every case is written to FAIL without its fix.
 *
 * Clocks are injected everywhere. Nothing here reads the real time except the
 * transport timeout case, which uses a few real milliseconds.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonicalInput, CANONICAL_PARTIES } from '@swafto/fixtures';
import type { DayRecord, Entry } from '@swafto/formula-engine';
import {
  Store,
  memoryPort,
  DayClosedViolation,
  type OutboxRow,
  type StoreState,
} from '../src/store/index.ts';
import { sqlitePort, type Db } from '../src/store/sqlite.ts';
import { Session } from '../src/app/session.tsx';
import { Today } from '../src/screens/T1.tsx';
import { TodayClosed } from '../src/screens/T3.tsx';
import { syncLine } from '../src/components/DayParts.tsx';
import { strings } from '../src/i18n/strings.ts';
import {
  ApiClient,
  ApiError,
  Offline,
  Unauthenticated,
  type HttpRequest,
  type HttpResponse,
  type Transport,
} from '../src/net/client.ts';
import { Host, fetchTransport, parseRetryAfter, secureTokenStore, type FetchLike } from '../src/host.tsx';
import { SyncBackoff, BACKOFF_BASE_MS, BACKOFF_MAX_MS, RETRY_AFTER_CAP_MS } from '../src/net/backoff.ts';
import { resolveApiBaseUrl, DEV_API_BASE_URL } from '../src/platform/endpoint.ts';
import { render, byTestId, all, text } from './render.tsx';

/* ---- shared fixtures ---------------------------------------------------- */

const open = (file: string): Db => {
  const db = new DatabaseSync(file);
  return {
    executeSync(sql, params = []) {
      const st = db.prepare(sql);
      if (/^\s*select/i.test(sql)) return { rows: st.all(...(params as never[])) };
      st.run(...(params as never[]));
      return { rows: [] };
    },
  };
};

const at = (date: string, hhmm = '12:00') => `${date}T${hhmm}:00.000+05:30`;

const TOKENS = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  deviceId: '33333333-3333-4333-8333-000000000001',
  shopId: '11111111-1111-4111-8111-000000000001',
};

function memoryStorage(initial: string | null = null) {
  let held = initial;
  return {
    read: () => held,
    write: (value: string | null) => {
      held = value;
    },
  };
}

const openBook = (date: string, now: string): Store => {
  const base = canonicalInput();
  const state: StoreState = {
    shopId: TOKENS.shopId,
    shopName: 'Test shop',
    day: { ...base.day, date, state: 'open', openingCash: 100000 },
    entries: [],
    parties: CANONICAL_PARTIES,
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
    skippedSections: [],
  };
  return new Store(memoryPort(state), () => now);
};

const sale = (id: string, dayId: string, createdAt: string): Entry =>
  ({ id, dayId, section: 'cash_sales', amount: 1000, mode: 'cash', source: 'manual', createdAt }) as Entry;

/* ---- C-17: an OPEN day that has ended ----------------------------------- */

describe('C-17 - an open book for a day that has ended is shown, never silently used', () => {
  it('Store.dayStatus: open + earlier business date = stale; same date = current', () => {
    expect(openBook('2026-10-26', at('2026-11-17')).dayStatus()).toEqual({
      kind: 'stale',
      date: '2026-10-26',
      today: '2026-11-17',
    });
    expect(openBook('2026-11-17', at('2026-11-17')).dayStatus()).toEqual({ kind: 'current' });
  });

  it("decision 1: with a 05:00 start, 02:00 on the 18th is still the 17th's business day - NOT stale", () => {
    const base = canonicalInput();
    const state: StoreState = {
      shopId: TOKENS.shopId,
      day: { ...base.day, date: '2026-11-17', startsAt: '05:00', state: 'open', openingCash: 0 },
      entries: [],
      parties: [],
      priorCreditOutstanding: 0,
      priorSupplierOutstanding: 0,
      skippedSections: [],
    };
    const store = (now: string) => new Store(memoryPort(state), () => now);
    expect(store(at('2026-11-18', '02:00')).dayStatus().kind).toBe('current');
    expect(store(at('2026-11-18', '05:00')).dayStatus().kind).toBe('stale');
  });

  it('Today shows the calm notice with the date, and its action goes to day close', () => {
    const store = openBook('2026-10-26', at('2026-11-17'));
    let closed = 0;
    const tree = render(<Today store={store} onCloseDay={() => (closed += 1)} />);
    const body = text(byTestId(tree, 't1-stale-body'));
    expect(body).toContain('Monday 26 October');
    expect(body).toContain('Close it to start today');
    byTestId(tree, 't1-stale-close').props.onPress();
    expect(closed).toBe(1);
  });

  it('Today withholds the entry rails while the book is stale, and shows them when current', () => {
    const stale = render(<Today store={openBook('2026-10-26', at('2026-11-17'))} />);
    expect(all(stale).some((n) => String(n.props?.testID).startsWith('t1-act-'))).toBe(false);
    const fine = render(<Today store={openBook('2026-11-17', at('2026-11-17'))} />);
    expect(all(fine).some((n) => String(n.props?.testID).startsWith('t1-act-'))).toBe(true);
    expect(all(fine).some((n) => n.props?.testID === 't1-stale')).toBe(false);
  });

  it('a new entry is refused with that same message - and nothing is written', () => {
    const store = openBook('2026-10-26', at('2026-11-17'));
    const s = new Session(store, { now: () => at('2026-11-17'), newId: () => 'e1' });
    expect(s.openSection('cash_sales')).toBe(false);
    expect(s.state.lastRefusal?.field).toBe('dayStale');
    expect(store.state.entries).toHaveLength(0);
  });

  it("but last night's own figures can still be entered from the day-close list (T5)", () => {
    const store = openBook('2026-10-26', at('2026-11-17'));
    const s = new Session(store, { now: () => at('2026-11-17'), newId: () => 'e1' });
    s.goTo('T5');
    expect(s.openSection('purchase')).toBe(true);
  });

  it('the refusal text exists in en, hi and od, and the three differ', () => {
    for (const key of ['t1.stale.body', 't1.stale.action', 'refusal.dayStale', 't1.future.body', 'refusal.amountTooLarge', 't1.parked'] as const) {
      const copies = (['en', 'hi', 'or'] as const).map((l) => strings(l)(key));
      expect(new Set(copies).size).toBe(3);
      for (const c of copies) expect(c).not.toBe(key);
    }
  });
});

/* ---- C-19: the clock went forward, then was corrected ------------------- */

describe('C-19 - a closed future-dated day does not strand the book', () => {
  let file: string;
  let wall: string;
  beforeEach(() => {
    file = join(mkdtempSync(join(tmpdir(), 'swafto-w2-')), 'ledger.db');
  });
  const boot = () => new Store(sqlitePort(open(file), () => wall), () => wall);
  const row = (date: string) =>
    open(file).executeSync('SELECT json FROM day WHERE date = ?', [date]).rows[0]?.json;

  /** Close a day under a clock a month ahead, then correct the clock. Returns the frozen row. */
  const jumpAndCorrect = () => {
    wall = at('2026-12-10'); // the clock is wrong: a month ahead
    const first = boot();
    first.setOpeningCash(50000);
    first.append(sale('s1', '2026-12-10', wall));
    first.close(51000);
    wall = at('2026-11-17'); // corrected
    return row('2026-12-10');
  };

  it('the book opens on the REAL date, carrying the counted cash; the misdated day is untouched', () => {
    const frozen = jumpAndCorrect();
    const again = boot();
    expect(row('2026-12-10')).toBe(frozen);
    expect(again.state.day).toMatchObject({ date: '2026-11-17', state: 'open', openingCash: 51000 });
    expect(again.dayStatus()).toEqual({ kind: 'current' });
    expect(again.misdatedDate).toBe('2026-12-10');
    again.append(sale('s2', '2026-11-17', wall));
    expect(again.state.entries.map((e) => e.id)).toEqual(['s2']);
    // Persisted: the next launch finds today's day, not a fresh one.
    const third = boot();
    expect(third.state.entries.map((e) => e.id)).toEqual(['s2']);
    expect(third.state.day.date).toBe('2026-11-17');
    expect(row('2026-12-10')).toBe(frozen);
  });

  it("the misdated day's credit still counts toward what carries forward", () => {
    wall = at('2026-12-10');
    const first = boot();
    first.setOpeningCash(0);
    first.addParty({ id: 'p-r', kind: 'customer', name: 'Ramesh' } as never);
    first.append({ ...sale('u1', '2026-12-10', wall), section: 'udhar_sales', mode: 'udhar', amount: 7000, partyId: 'p-r' } as Entry);
    first.close(0);
    wall = at('2026-11-17');
    expect(boot().state.priorCreditOutstanding).toBe(7000);
  });

  it('WITHOUT the recovery the closed future day is the day: every entry refused (the defect)', () => {
    wall = at('2026-12-10');
    const s = boot();
    s.setOpeningCash(0);
    s.close(0);
    expect(() => s.append(sale('late', '2026-12-10', wall))).toThrow(DayClosedViolation);
  });

  it('mid-session: the clock is corrected while the app runs, the tick moves on', () => {
    wall = at('2026-12-10');
    const store = boot();
    store.setOpeningCash(0);
    store.close(0);
    wall = at('2026-11-17');
    expect(store.startNextDayIfDue()).toBe(true);
    expect(store.state.day.date).toBe('2026-11-17');
    expect(store.misdatedDate).toBe('2026-12-10');
  });

  it('Today says one day was saved under a wrong date, and the notice goes once the date has passed', () => {
    jumpAndCorrect();
    const store = boot();
    const tree = render(<Today store={store} />);
    const body = text(byTestId(tree, 't1-misdated-body'));
    expect(body).toContain('One day was saved under a wrong phone date');
    expect(body).toContain('Thursday 10 December');
    expect(body).toContain('kept as recorded');
    wall = at('2026-12-11');
    expect(store.misdatedDate).toBeNull();
  });

  it('an OPEN day dated after the clock is explained on Today (the future-day notice)', () => {
    const store = openBook('2026-12-11', at('2026-11-17'));
    expect(store.dayStatus()).toEqual({ kind: 'future', date: '2026-12-11', today: '2026-11-17' });
    const tree = render(<Today store={store} />);
    expect(text(byTestId(tree, 't1-future-body'))).toContain("This phone's date looks wrong");
  });

  it("VERIFIER ROUND 2: the calendar reaches the misdated, already-closed day - Today says why, entries are refused with the same words", () => {
    wall = at('2026-11-20'); // clock jumps ahead; he closes that "day"
    const a = boot();
    a.setOpeningCash(0);
    a.close(0);
    wall = at('2026-11-17'); // corrected; the app is used (relaunch) and sees the misdated day
    expect(boot().state.day.date).toBe('2026-11-17');
    wall = at('2026-11-20'); // the real calendar arrives
    const b = boot();
    expect(b.state.day).toMatchObject({ date: '2026-11-20', state: 'closed' });
    expect(b.closedUnderWrongDate).toBe(true);
    const tree = render(<TodayClosed store={b} />);
    expect(text(byTestId(tree, 't3-banner'))).toContain("already closed earlier, while the phone's date was wrong");
    const s = new Session(b, { now: () => wall, newId: () => 'e1' });
    expect(s.openSection('cash_sales')).toBe(false);
    expect(s.state.lastRefusal?.field).toBe('dayClosedWrongDate');
    // an ordinary closed day keeps the ordinary banner
    const plain = TodayClosedPlain();
    expect(text(byTestId(render(<TodayClosed store={plain} />), 't3-banner'))).toContain('Today is closed');
  });

  it('SERVER DATE WINDOW: the server refuses a day beyond today+1; the new day goes through, the misdated one parks with its reason', async () => {
    jumpAndCorrect();
    const store = boot();
    store.append(sale('s2', '2026-11-17', wall));
    const refused = (id: string) => ({ id, field: 'dayId', message: 'day is more than a day ahead' });
    const h = new Host({
      baseUrl: 'https://api.example.test',
      fetch: async (url, init) => {
        if (url.endsWith('/v1/me/shop')) return { status: 200, text: async () => '{}' };
        const body = JSON.parse(init.body ?? '{}') as {
          days?: { date: string }[];
          entries?: { id: string; dayId: string }[];
        };
        const limit = '2026-11-18'; // today + 1
        const rejected = [
          ...(body.days ?? []).filter((d) => d.date > limit).map((d) => refused(d.date)),
          ...(body.entries ?? []).filter((e) => e.dayId > limit).map((e) => refused(e.id)),
        ];
        return {
          status: 200,
          text: async () => JSON.stringify({ daysWritten: 0, entriesInserted: 0, entriesAlreadyPresent: 0, rejected }),
        };
      },
      storage: memoryStorage(JSON.stringify(TOKENS)),
      store,
      now: () => wall,
      newId: () => 'id-1',
    });
    await h.sync();
    // Everything queued for the real date was taken (pending is empty); only the misdated rows are parked.
    expect(store.pendingOutbox).toEqual([]);
    const parked = store.parkedOutbox;
    expect(parked.length).toBeGreaterThan(0);
    for (const p of parked) expect(p.reason).toContain('day is more than a day ahead');
    expect(parked.map((p) => p.id)).toContain('ob-s1');
    expect(parked.map((p) => p.id)).not.toContain('ob-s2');
  });
});

/* ---- C-18: only a definitive 401/403 ends the session ------------------- */

describe('C-18 - /auth/refresh: transient failures keep the session', () => {
  /** A transport where the API answers 401 to the first authed call, and `refresh` to the refresh. */
  const clientWith = (refresh: () => HttpResponse | Error) => {
    const storage = memoryStorage(JSON.stringify(TOKENS));
    const tokens = secureTokenStore(storage);
    const transport: Transport = {
      async send(req: HttpRequest) {
        if (req.path === '/v1/auth/refresh') {
          const r = refresh();
          if (r instanceof Error) throw r;
          return r;
        }
        return { status: 401, body: null };
      },
    };
    return { client: new ApiClient(transport, tokens), tokens };
  };

  for (const status of [401, 403]) {
    it(`${status} is definitive: tokens are cleared and the shopkeeper signs in`, async () => {
      const { client, tokens } = clientWith(() => ({ status, body: null }));
      await expect(client.setShopName('x')).rejects.toBeInstanceOf(Unauthenticated);
      expect(tokens.read()).toBeNull();
    });
  }

  for (const status of [500, 502, 503]) {
    it(`${status} is transient: tokens stay, an ApiError is raised`, async () => {
      const { client, tokens } = clientWith(() => ({ status, body: null }));
      await expect(client.setShopName('x')).rejects.toBeInstanceOf(ApiError);
      expect(tokens.read()).toEqual(TOKENS);
    });
  }

  it('429 is transient and carries Retry-After', async () => {
    const { client, tokens } = clientWith(() => ({ status: 429, body: null, retryAfterSeconds: 120 }));
    const failure = await client.setShopName('x').catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).status).toBe(429);
    expect((failure as ApiError).retryAfterSeconds).toBe(120);
    expect(tokens.read()).toEqual(TOKENS);
  });

  it('a timeout on the refresh is Offline, and the tokens stay', async () => {
    const hang: FetchLike = () => new Promise(() => undefined);
    const storage = memoryStorage(JSON.stringify(TOKENS));
    const tokens = secureTokenStore(storage);
    const real = fetchTransport('https://api.example.test', async (url, init) => {
      if (url.endsWith('/v1/auth/refresh')) return hang(url, init);
      return { status: 401, text: async () => '' };
    }, 20);
    const client = new ApiClient(real, tokens);
    await expect(client.setShopName('x')).rejects.toBeInstanceOf(Offline);
    expect(tokens.read()).toEqual(TOKENS);
  });
});

describe('Retry-After on the wire', () => {
  it('parses delta-seconds and an HTTP date; refuses nonsense and the past', () => {
    expect(parseRetryAfter('120')).toBe(120);
    expect(parseRetryAfter(' 7 ')).toBe(7);
    expect(parseRetryAfter('Wed, 21 Oct 2026 07:30:00 GMT', Date.parse('Wed, 21 Oct 2026 07:28:00 GMT'))).toBe(120);
    expect(parseRetryAfter('Wed, 21 Oct 2026 07:28:00 GMT', Date.parse('Wed, 21 Oct 2026 07:30:00 GMT'))).toBeUndefined();
    expect(parseRetryAfter('soon')).toBeUndefined();
    expect(parseRetryAfter(null)).toBeUndefined();
  });

  it('the transport carries the header out of the fetch response', async () => {
    const t = fetchTransport('https://api.example.test', async () => ({
      status: 429,
      text: async () => '',
      headers: { get: (n: string) => (n === 'retry-after' ? '45' : null) },
    }));
    const r = await t.send({ method: 'GET', path: '/v1/x', headers: {} });
    expect(r.retryAfterSeconds).toBe(45);
  });
});

/* ---- FE-10: backoff ------------------------------------------------------ */

describe('FE-10 - SyncBackoff', () => {
  it('doubles from 30 s to a 5 min ceiling, with jitter inside [half, full]', () => {
    let now = 0;
    const lo = new SyncBackoff(() => now, () => 0);
    const hi = new SyncBackoff(() => now, () => 1);
    expect(lo.fail()).toBe(BACKOFF_BASE_MS / 2);
    expect(hi.fail()).toBe(BACKOFF_BASE_MS);
    expect(hi.fail()).toBe(BACKOFF_BASE_MS * 2);
    for (let i = 0; i < 10; i += 1) hi.fail();
    expect(hi.fail()).toBe(BACKOFF_MAX_MS);
    now = BACKOFF_MAX_MS + 1;
    expect(hi.blocked).toBe(false);
  });

  it('Retry-After is a floor, capped at an hour', () => {
    const b = new SyncBackoff(() => 0, () => 0);
    expect(b.fail(600)).toBe(600_000);
    expect(new SyncBackoff(() => 0, () => 0).fail(10 * 3600)).toBe(RETRY_AFTER_CAP_MS);
  });

  it('reset clears it', () => {
    const b = new SyncBackoff(() => 0, () => 1);
    b.fail();
    expect(b.blocked).toBe(true);
    b.reset();
    expect(b.blocked).toBe(false);
    expect(b.failures).toBe(0);
  });
});

/** The shop-name call is answered 200 and not counted: these cases are about /sync/push. */
const pushOnly = (inner: FetchLike, counter: { n: number }): FetchLike => async (url, init) => {
  if (url.endsWith('/v1/me/shop')) return { status: 200, text: async () => '{}' };
  counter.n += 1;
  return inner(url, init);
};

function hostOn(doFetch: FetchLike, clock: { ms: number }, counter: { n: number }) {
  const store = openBook('2026-11-17', at('2026-11-17'));
  const h = new Host({
    baseUrl: 'https://api.example.test',
    fetch: pushOnly(doFetch, counter),
    storage: memoryStorage(JSON.stringify(TOKENS)),
    store,
    now: () => at('2026-11-17'),
    newId: () => 'id-1',
    backoff: new SyncBackoff(() => clock.ms, () => 0),
  });
  return { h, store };
}

describe('FE-10 - the drain waits after a failure', () => {
  it('a 503 is not retried on the next tick, is after the wait, and restart clears it', async () => {
    const clock = { ms: 1_000_000 };
    const counter = { n: 0 };
    const { h, store } = hostOn(async () => {
      return { status: 503, text: async () => '' };
    }, clock, counter);
    store.append(sale('s1', '2026-11-17', at('2026-11-17')));

    await h.syncLatest(true);
    expect(counter.n).toBe(1);
    await h.syncLatest(true); // the 30 s tick, 0 ms later
    expect(counter.n).toBe(1);
    clock.ms += BACKOFF_BASE_MS / 2 - 1;
    await h.syncLatest(true);
    expect(counter.n).toBe(1);
    clock.ms += 2;
    await h.syncLatest(true);
    expect(counter.n).toBe(2);
    await h.syncLatest(true);
    expect(counter.n).toBe(2); // second failure: a longer wait now
    await h.syncLatest(true, true); // foreground
    expect(counter.n).toBe(3);
  });

  it('a 429 with Retry-After: 600 is honoured', async () => {
    const clock = { ms: 0 };
    const counter = { n: 0 };
    const { h, store } = hostOn(async () => {
      return {
        status: 429,
        text: async () => '',
        headers: { get: (n: string) => (n === 'retry-after' ? '600' : null) },
      };
    }, clock, counter);
    store.append(sale('s1', '2026-11-17', at('2026-11-17')));
    await h.syncLatest(true);
    clock.ms = 599_000;
    await h.syncLatest(true);
    expect(counter.n).toBe(1);
    clock.ms = 600_001;
    await h.syncLatest(true);
    expect(counter.n).toBe(2);
  });

  it('offline also backs off, and a success clears the wait', async () => {
    const clock = { ms: 0 };
    const counter = { n: 0 };
    let up = false;
    const { h, store } = hostOn(async () => {
      
      if (!up) throw new Error('no signal');
      return {
        status: 200,
        text: async () =>
          JSON.stringify({ daysWritten: 1, entriesInserted: 1, entriesAlreadyPresent: 0, rejected: [] }),
      };
    }, clock, counter);
    store.append(sale('s1', '2026-11-17', at('2026-11-17')));
    await h.syncLatest(true);
    await h.syncLatest(true);
    expect(counter.n).toBe(1);
    up = true;
    clock.ms = BACKOFF_BASE_MS;
    await h.syncLatest(true);
    expect(counter.n).toBe(2);
    expect(store.pendingOutbox).toEqual([]);
  });
});

/* ---- FE-5: a later batch failing does not un-ack the earlier ones -------- */

describe('FE-5 - multi-batch push acks the batches that succeeded', () => {
  it('batch 1 is acked even though batch 2 never reached the server', async () => {
    const rows: OutboxRow[] = Array.from({ length: 2001 }, (_, i) => ({
      id: 'ob-p' + String(i),
      kind: 'party' as const,
      payload: { id: 'p' + String(i), kind: 'customer', name: 'n' + String(i) },
      queuedAt: at('2026-11-17'),
    }));
    const acked = new Set<string>();
    const base = openBook('2026-11-17', at('2026-11-17'));
    const port = memoryPort(base.state);
    const wrapped = {
      ...port,
      pendingOutbox: () => rows.filter((r) => !acked.has(r.id)),
      ackOutbox: (ids: readonly string[]) => ids.forEach((id) => acked.add(id)),
    };
    const counter = { n: 0 };
    const h = new Host({
      baseUrl: 'https://api.example.test',
      fetch: pushOnly(async () => {
        if (counter.n === 2) throw new Error('link dropped');
        return {
          status: 200,
          text: async () => JSON.stringify({ daysWritten: 0, entriesInserted: 0, entriesAlreadyPresent: 0, rejected: [] }),
        };
      }, counter),
      storage: memoryStorage(JSON.stringify(TOKENS)),
      store: new Store(wrapped, () => at('2026-11-17')),
      now: () => at('2026-11-17'),
      newId: () => 'id-1',
    });
    const outcome = await h.sync();
    expect(outcome.offline).toBe(true);
    expect(counter.n).toBe(2);
    expect(acked.size).toBe(2000); // before the fix: 0
  });
});

/* ---- FE-11: a refused row is parked, visibly ---------------------------- */

describe('FE-11 - rejected rows are parked, not resent for ever', () => {
  const REFUSE = (id: string) => async () => ({
    status: 200,
    text: async () =>
      JSON.stringify({
        daysWritten: 1,
        entriesInserted: 0,
        entriesAlreadyPresent: 0,
        rejected: [{ id, field: 'partyId', message: 'a credit sale has to name somebody' }],
      }),
  });

  it('the second drain does not send the refused row again; Today counts it', async () => {
    const clock = { ms: 0 };
    const bodies: string[] = [];
    const store = openBook('2026-11-17', at('2026-11-17'));
    const h = new Host({
      baseUrl: 'https://api.example.test',
      fetch: async (url, init) => {
        if (url.endsWith('/v1/me/shop')) return { status: 200, text: async () => '{}' };
        bodies.push(init.body ?? '');
        return REFUSE('bad-1')();
      },
      storage: memoryStorage(JSON.stringify(TOKENS)),
      store,
      now: () => at('2026-11-17'),
      newId: () => 'id-1',
      backoff: new SyncBackoff(() => clock.ms, () => 0),
    });
    store.append(sale('bad-1', '2026-11-17', at('2026-11-17')));
    await h.sync();
    const first = bodies.length;
    expect(first).toBe(1);
    expect(store.parkedOutbox.map((r) => r.id)).toEqual(['ob-bad-1']);
    // Only the day row is left to send; the parked entry is not in the next body.
    await h.sync();
    expect(bodies[1] ?? '').not.toContain('bad-1');
    expect(syncLine(store, strings('en'))).toContain('1 could not be sent');
  });

  it('RT-W3-8 · a push_deferred rejection (retryable) is parked, not resent by the next drain, and asked again once on launch', async () => {
    const clock = { ms: 0 };
    const bodies: string[] = [];
    const store = openBook('2026-11-17', at('2026-11-17'));
    const h = new Host({
      baseUrl: 'https://api.example.test',
      fetch: async (url, init) => {
        if (url.endsWith('/v1/me/shop')) return { status: 200, text: async () => '{}' };
        bodies.push(init.body ?? '');
        // The server applied the day row and deferred the entry: 200, with the retryable reason.
        return {
          status: 200,
          text: async () =>
            JSON.stringify({
              daysWritten: 1,
              entriesInserted: 0,
              entriesAlreadyPresent: 0,
              rejected: [{ id: 'late-1', field: 'push_deferred', message: 'this row was not applied because the push held too many refused rows; it will be sent again.' }],
            }),
        };
      },
      storage: memoryStorage(JSON.stringify(TOKENS)),
      store,
      now: () => at('2026-11-17'),
      newId: () => 'id-1',
      backoff: new SyncBackoff(() => clock.ms, () => 0),
    });
    store.append(sale('late-1', '2026-11-17', at('2026-11-17')));
    await h.sync();
    expect(bodies).toHaveLength(1);
    expect(store.parkedOutbox.map((r) => r.id)).toEqual(['ob-late-1']);
    // A plain drain does not resend it: no loop.
    await h.sync();
    expect(bodies.slice(1).join('')).not.toContain('late-1');
    // Launch or foreground asks again, once.
    await h.syncLatest(true, true);
    expect(bodies.filter((b) => b.includes('late-1'))).toHaveLength(2);
  });

  it('on sqlite: parked survives a restart, and a NEWER version of the row is pending again', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'swafto-w2p-')), 'ledger.db');
    const wall = at('2026-11-17');
    const a = new Store(sqlitePort(open(file), () => wall), () => wall);
    a.setOpeningCash(0);
    a.append(sale('bad-1', '2026-11-17', wall));
    expect(a.pendingOutbox.map((r) => r.id)).toContain('ob-bad-1');
    a.parkOutbox([{ id: 'ob-bad-1', reason: 'partyId: nope' }]);
    expect(a.pendingOutbox.map((r) => r.id)).not.toContain('ob-bad-1');

    const b = new Store(sqlitePort(open(file), () => wall), () => wall);
    expect(b.parkedOutbox).toEqual([{ id: 'ob-bad-1', reason: 'partyId: nope' }]);
    expect(b.pendingOutbox.map((r) => r.id)).not.toContain('ob-bad-1');

    // The day row's id is re-queued with new content when the day changes: pending again.
    const dayRow = b.pendingOutbox.find((r) => r.kind === 'day')!;
    b.parkOutbox([{ id: dayRow.id, reason: 'x' }]);
    expect(b.pendingOutbox.map((r) => r.id)).not.toContain(dayRow.id);
    b.close(b.expectedCash().value);
    expect(b.pendingOutbox.map((r) => r.id)).toContain(dayRow.id);
  });
});

/* ---- C-16: the API URL is build config ----------------------------------- */

describe('C-16 - the API base URL', () => {
  it('release: only an https URL, anything else throws', () => {
    expect(resolveApiBaseUrl('https://api.example.test/', false)).toBe('https://api.example.test');
    for (const bad of [undefined, null, '', '   ', 'http://api.example.test', 'http://localhost:8787', 'https://', 'ftp://x']) {
      expect(() => resolveApiBaseUrl(bad, false)).toThrow(/https/);
    }
  });

  it('debug keeps the dev URL, or whatever the build set', () => {
    expect(resolveApiBaseUrl(undefined, true)).toBe(DEV_API_BASE_URL);
    expect(resolveApiBaseUrl('', true)).toBe(DEV_API_BASE_URL);
    expect(resolveApiBaseUrl('http://localhost:8787', true)).toBe('http://localhost:8787');
  });

  it('native build type decides: debug+http ok, release+http refused, release+https ok, missing = release', () => {
    expect(resolveApiBaseUrl('http://localhost:8787', true)).toBe('http://localhost:8787');
    expect(() => resolveApiBaseUrl('http://localhost:8787', false)).toThrow(/https/);
    expect(resolveApiBaseUrl('https://api.example.test', false)).toBe('https://api.example.test');
    expect(() => resolveApiBaseUrl('http://localhost:8787', undefined)).toThrow(/https/);
    expect(() => resolveApiBaseUrl('http://localhost:8787', null)).toThrow(/https/);
    // Fail safe: only a real boolean true is a debug build, never a truthy lookalike.
    expect(() => resolveApiBaseUrl('http://localhost:8787', 'true' as never)).toThrow(/https/);
    expect(() => resolveApiBaseUrl('http://localhost:8787', 1 as never)).toThrow(/https/);
  });

  it('JS reads the native build type, never __DEV__; Kotlin exposes it; init errors are inside the boundary', () => {
    const kt = readFileSync(new URL('../android/app/src/main/java/com/swafto/SwaftoDeviceModule.kt', import.meta.url), 'utf8');
    expect(kt).toContain('"isDebugBuild" to BuildConfig.DEBUG');
    const root = readFileSync(new URL('../src/platform/Root.tsx', import.meta.url), 'utf8');
    expect(root).toContain('native?.isDebugBuild');
    expect(root).not.toContain('__DEV__,');
    // The resolve runs in render (useMemo), not at module load, so ErrorBoundary catches a throw.
    expect(root).not.toMatch(/^setApiBaseUrl\(/m);
    expect(root).toMatch(/useMemo\(\(\) => \{\s*initApiBaseUrl\(\);/);
  });

  it('the Gradle release guard and the empty placeholder are in the tree', () => {
    const gradle = readFileSync(new URL('../android/app/build.gradle', import.meta.url), 'utf8');
    expect(gradle).toContain('generateReleaseBuildConfig');
    expect(gradle).toContain("startsWith('https://')");
    expect(gradle).toContain('buildConfigField "String", "API_BASE_URL", \'"http://localhost:8787"\'');
    const props = readFileSync(new URL('../android/gradle.properties', import.meta.url), 'utf8');
    expect(props).toMatch(/^SWAFTO_API_BASE_URL=\s*$/m);
    const root = readFileSync(new URL('../src/platform/Root.tsx', import.meta.url), 'utf8');
    expect(root).toContain('resolveApiBaseUrl(');
    expect(root).not.toMatch(/baseUrl:\s*['"]http/);
  });
});

/* ---- FE-11 follow-up: a way back, and a column instead of a copy --------- */

describe('FE-11 - parked rows get one more try per launch / foreground', () => {
  const setup = (answer: (body: string) => object) => {
    const clock = { ms: 0 };
    const sent: string[] = [];
    const store = openBook('2026-11-17', at('2026-11-17'));
    const h = new Host({
      baseUrl: 'https://api.example.test',
      fetch: async (url, init) => {
        if (url.endsWith('/v1/me/shop')) return { status: 200, text: async () => '{}' };
        sent.push(init.body ?? '');
        return { status: 200, text: async () => JSON.stringify(answer(init.body ?? '')) };
      },
      storage: memoryStorage(JSON.stringify(TOKENS)),
      store,
      now: () => at('2026-11-17'),
      newId: () => 'id-1',
      backoff: new SyncBackoff(() => clock.ms, () => 0),
    });
    return { h, store, sent };
  };
  const ok = { daysWritten: 1, entriesInserted: 1, entriesAlreadyPresent: 0, rejected: [] };
  const refuse = { ...ok, rejected: [{ id: 'e1', field: 'x', message: 'no' }] };

  it('a row the server refused is re-sent on the next foreground, and accepted once the server agrees', async () => {
    let agree = false;
    const { h, store } = setup(() => (agree ? ok : refuse));
    store.append(sale('e1', '2026-11-17', at('2026-11-17')));
    await h.syncLatest(true);
    expect(store.parkedOutbox).toHaveLength(1);
    await h.syncLatest(true); // the tick: stays parked, nothing sent
    expect(store.parkedOutbox).toHaveLength(1);
    agree = true;
    await h.syncLatest(true, true); // foreground
    expect(store.parkedOutbox).toEqual([]);
    expect(store.pendingOutbox).toEqual([]);
  });

  it('a deterministic refusal re-parks in the same pass and does not loop', async () => {
    let calls = 0;
    const { h, store } = setup(() => {
      calls += 1;
      return refuse;
    });
    store.append(sale('e1', '2026-11-17', at('2026-11-17')));
    await h.syncLatest(true, true);
    const afterLaunch = calls;
    expect(store.parkedOutbox).toHaveLength(1);
    await h.syncLatest(true); // ticks do not unpark
    await h.syncLatest(true);
    expect(calls).toBe(afterLaunch);
    await h.syncLatest(true, true); // one more try on foreground, then parked again
    expect(calls).toBe(afterLaunch + 1);
    expect(store.parkedOutbox).toHaveLength(1);
  });
});

describe('FE-11 - parked_reason column, and a safe migration of an existing install', () => {
  const fileOf = () => join(mkdtempSync(join(tmpdir(), 'swafto-w2m-')), 'ledger.db');

  it('an install from before parking gains the columns and keeps every queued row', () => {
    const file = fileOf();
    const raw = new DatabaseSync(file);
    raw.exec(
      "CREATE TABLE outbox (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, json TEXT NOT NULL);" +
        "INSERT INTO outbox (id, json) VALUES ('ob-a', '{\"id\":\"ob-a\",\"kind\":\"entry\",\"payload\":{},\"queuedAt\":\"t\"}');",
    );
    raw.close();
    const port = sqlitePort(open(file), () => at('2026-11-17'));
    expect(port.pendingOutbox().map((r) => r.id)).toEqual(['ob-a']);
    port.parkOutbox([{ id: 'ob-a', reason: 'r' }]);
    expect(port.parkedOutbox()).toEqual([{ id: 'ob-a', reason: 'r' }]);
  });

  it('rows parked by the first parking build (outbox_parked) are carried over and the copy table dropped', () => {
    const file = fileOf();
    const raw = new DatabaseSync(file);
    const j = '{"id":"ob-a","kind":"entry","payload":{},"queuedAt":"t"}';
    raw.exec(
      "CREATE TABLE outbox (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, json TEXT NOT NULL);" +
        "CREATE TABLE outbox_parked (id TEXT PRIMARY KEY, reason TEXT NOT NULL, json TEXT NOT NULL);" +
        "INSERT INTO outbox (id, json) VALUES ('ob-a', '" + j + "'), ('ob-b', '" + j.replace(/ob-a/g, 'ob-b') + "');" +
        "INSERT INTO outbox_parked VALUES ('ob-a', 'was refused', '" + j + "');",
    );
    raw.close();
    const port = sqlitePort(open(file), () => at('2026-11-17'));
    expect(port.parkedOutbox()).toEqual([{ id: 'ob-a', reason: 'was refused' }]);
    expect(port.pendingOutbox().map((r) => r.id)).toEqual(['ob-b']);
    const check = new DatabaseSync(file);
    expect(check.prepare("SELECT name FROM sqlite_master WHERE name = 'outbox_parked'").all()).toEqual([]);
    check.close();
    // Idempotent: a second launch changes nothing.
    const again = sqlitePort(open(file), () => at('2026-11-17'));
    expect(again.parkedOutbox()).toHaveLength(1);
  });
});

/* ---- RT-3: the server-issued device id rides on the OTP request --------- */

describe('RT-3 - the OTP request carries the server-issued deviceId', () => {
  const otpHost = (account: ReturnType<typeof memoryStorage>) => {
    const bodies: Record<string, unknown>[] = [];
    const h = new Host({
      baseUrl: 'https://api.example.test',
      fetch: async (_url, init) => {
        bodies.push(JSON.parse(init.body ?? '{}') as Record<string, unknown>);
        return { status: 200, text: async () => '{"expiresInSeconds":300}' };
      },
      storage: memoryStorage(null), // signed out / session expired
      account,
      install: memoryStorage('install-id-0001'),
      store: openBook('2026-11-17', at('2026-11-17')),
      now: () => at('2026-11-17'),
      newId: () => 'made-id-0001',
    });
    return { h, bodies };
  };

  it('a device id kept from a previous sign-in is sent, though the session is gone', async () => {
    const phone = '9876543210';
    const { h, bodies } = otpHost(
      memoryStorage(JSON.stringify({ phone, shopId: TOKENS.shopId, deviceId: TOKENS.deviceId })),
    );
    // the account record seeds the number on A3
    await h.sendCode();
    expect(bodies[0]!.deviceId).toBe(TOKENS.deviceId);
  });

  it('with no account record (first sign-in, or after erasure) it is not sent as a server id', async () => {
    const { h, bodies } = otpHost(memoryStorage(null));
    for (const d of '9876543210') h.session.pressPhone(d as '0');
    await h.sendCode();
    expect(bodies[0]!.deviceId).toBe('install-id-0001'); // only the install key, never the server id
  });
});

/** An ordinary closed day, never misdated. */
function TodayClosedPlain(): Store {
  const file = join(mkdtempSync(join(tmpdir(), 'swafto-w2c-')), 'ledger.db');
  const wall = at('2026-11-20');
  const s = new Store(sqlitePort(open(file), () => wall), () => wall);
  s.setOpeningCash(0);
  s.close(0);
  return new Store(sqlitePort(open(file), () => wall), () => wall);
}
