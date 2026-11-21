/**
 * G8 - THE READ API. It stores nothing derived and it computes nothing new.
 *
 * §07.03, THE RULE THIS FILE EXISTS TO KEEP: nothing derived crosses the wire as
 * authoritative. Every figure below comes out of `@swafto/formula-engine` - the
 * SAME package the phone runs and the golden vectors pin. There is no SQL `SUM()`
 * anywhere in this file and there must never be one, because a `SUM()` here is a
 * second implementation of the cash formula, and the first time it disagrees with
 * the phone the shopkeeper is looking at two numbers with no way to tell which is
 * his.
 *
 * `read.spec.ts` proves that rather than asserting it: the canonical fixture goes
 * in through the sync API, comes back out through these routes, and is compared
 * with the golden vectors. If this file ever starts computing, that test fails.
 *
 * PRIOR BALANCES ARE ROLLED FORWARD THROUGH THE AUDITED HELPERS, one day at a time,
 * rather than summed with a `+` over history. Slower, and the only way that keeps
 * ADR-003 true - the outstanding figure on day 400 is produced by the same function
 * that produced it on day 1.
 *
 * EVERY ROUTE IS SCOPED TO THE SHOP IN THE TOKEN. No route takes a shop id, so
 * there is no parameter to tamper with.
 */
import type { FastifyInstance } from 'fastify';
import {
  computePrimary,
  expectedUpi,
  upiCheck,
  creditOutstanding,
  expectedCashBalance,
  supplierOutstanding,
  subtract,
  add,
  addDays,
  daysBetween,
  captureCountedCash,
  liveEntries,
  parseIsoDate,
  type DayInput,
  type Entry,
  type IsoDate,
  type Paise,
} from '@swafto/formula-engine';
import type { AppDeps } from '../app.ts';
import { shopOf } from '../app.ts';
import { EXPORT_DISCLAIMER, MAX_ENTRY_PAISE } from '@swafto/values';
import type { Repo } from '../db/port.ts';
import { memoFor, type ClosedDayMemo } from '../db/closed-day-memo.ts';
import { shopToday } from '../business-date.ts';
import { makeShopLimitHooks, type ShopLimitHooks } from '../sync/shop-limit.ts';
import { NO_BODY, NO_QUERY } from '../schemas.ts';

/** The longest `from`..`to` span `/v1/reports` will compute. A reversible default. */
export const REPORT_MAX_DAYS = 366;

/** Entries grouped by their day in ONE pass, each group in the order it arrived. */
function groupByDay(entries: readonly Entry[]): Map<IsoDate, Entry[]> {
  const byDay = new Map<IsoDate, Entry[]>();
  for (const e of entries) {
    const group = byDay.get(e.dayId);
    if (group) group.push(e);
    else byDay.set(e.dayId, [e]);
  }
  return byDay;
}

/** One day of the fold: the engine's own answers, which are the next day's opening position. */
function foldStep(
  d: IsoDate,
  entries: readonly Entry[],
  credit: Paise,
  supplier: Paise,
): { credit: Paise; supplier: Paise } {
  const partial: DayInput = {
    day: { date: d, state: 'closed', openingCash: 0, countedCash: null } as DayInput['day'],
    // CANCEL THIS ENTRY: a cancelled entry and its cancel row are both out of every figure, the credit fold included.
    entries: liveEntries(entries),
    priorCreditOutstanding: credit,
    priorSupplierOutstanding: supplier,
  };
  return { credit: creditOutstanding(partial).value, supplier: supplierOutstanding(partial).value };
}

/** Every earlier day folded from its entries: the original algorithm, kept for the one case the chain cannot place. */
async function fullFold(
  repo: Repo,
  shopId: string,
  date: IsoDate,
): Promise<{ credit: Paise; supplier: Paise }> {
  const earlierByDay = groupByDay(await repo.entriesBefore(shopId, date));
  let credit: Paise = 0;
  let supplier: Paise = 0;
  for (const d of [...earlierByDay.keys()].sort()) {
    ({ credit, supplier } = foldStep(d, earlierByDay.get(d)!, credit, supplier));
  }
  return { credit, supplier };
}

/** How many days a warm shop may load one at a time before the fold loads the whole ledger instead. */
const MAX_SINGLE_DAY_LOADS = 3;

/** C-12 · how the fold uses the closed-day memo. Everything defaults; a test injects its own. */
export interface FoldOptions {
  readonly memo?: ClosedDayMemo;
}

/**
 * The shop's credit and supplier balances coming INTO `date`, folded one day at a
 * time through the engine, taking every CLOSED day from the memo when it has it.
 *
 * Why a memo hit is exactly the fold's answer is argued once, in
 * `db/closed-day-memo.ts`: a closed day's entries are frozen (D7, D1), and every
 * other input to the step is in the memo's key. What this function adds is the
 * discipline around it: an OPEN day is never memoised; the entries are loaded
 * only when some day misses (a cold shop pays what it always paid); and a fill is
 * refused if the shop was erased or redacted while this read was in flight.
 */
export async function priorBalances(
  repo: Repo,
  shopId: string,
  date: IsoDate,
  opts: FoldOptions = {},
): Promise<{ credit: Paise; supplier: Paise }> {
  const memo = opts.memo ?? memoFor(repo);
  const days = await repo.daysBefore(shopId, date);

  let byDay: Map<IsoDate, Entry[]> | null = null;
  // A shop the memo already knows misses only the days since it last looked (the one it closed
  // since, today's neighbour that is still open): load those days one by one. A shop it does not
  // know (first read after a restart) goes straight to the one bulk load, as before.
  let singleLoads = memo.size(shopId) > 0 ? MAX_SINGLE_DAY_LOADS : 0;
  let credit: Paise = 0;
  let supplier: Paise = 0;
  const since = memo.erasures;
  for (const d of days) {
    if (d.state === 'closed') {
      const hit = memo.get(shopId, d.date, credit, supplier);
      if (hit) {
        ({ credit, supplier } = hit);
        continue;
      }
    }
    let dayEntries: readonly Entry[];
    if (byDay === null && singleLoads > 0) {
      singleLoads -= 1;
      dayEntries = await repo.entriesFor(shopId, d.date);
    } else {
      if (byDay === null) {
        byDay = groupByDay(await repo.entriesBefore(shopId, date));
        // An entry on a day the day list did not name (a day created between the two reads)
        // cannot be placed in the chain: fall back to the full fold rather than guess.
        const named = new Set<string>(days.map((x) => x.date));
        for (const k of byDay.keys()) if (!named.has(k)) return fullFold(repo, shopId, date);
      }
      dayEntries = byDay.get(d.date) ?? [];
    }
    const next = foldStep(d.date, dayEntries, credit, supplier);
    if (d.state === 'closed') memo.set(shopId, d.date, credit, supplier, next, since);
    ({ credit, supplier } = next);
  }

  return { credit, supplier };
}

/**
 * Assemble exactly what the engine needs for one day, with the prior balances
 * carried forward from everything before it.
 *
 * The fold is deliberate. Each earlier day is run through the same
 * `creditOutstanding` / `supplierOutstanding` the engine exposes, and its answer
 * becomes the next day's opening position - so a change to how credit is counted
 * moves history and today together and cannot make them disagree.
 *
 * C-12: the fold was O(the shop's whole history) on every read (SIMP-02 had already
 * removed the O(days x entries) factor). A closed day's step is now memoised in
 * process (`priorBalances`), so a warm read loads the day list, today's entries and
 * today's facts, not the ledger. It is a cache of a pure function of immutable
 * input, not a stored total: nothing is persisted and nothing is sent.
 */
export async function dayInputFor(
  repo: Repo,
  shopId: string,
  date: IsoDate,
  opts: FoldOptions = {},
): Promise<DayInput> {
  const day = await repo.findDay(shopId, date);
  const today = await repo.entriesFor(shopId, date);
  const { credit, supplier } = await priorBalances(repo, shopId, date, opts);
  // Decisions 2 and 3: the day's own facts, read beside its entries, never folded in.
  const facts = await repo.dayFactsFor(shopId, date);

  return {
    day: {
      date,
      state: day?.state ?? 'not_started',
      openingCash: day?.openingCash ?? 0,
      countedCash: day?.countedCash ?? null,
      ...(day?.differenceReason ? { differenceReason: day.differenceReason } : {}),
      ...(day?.closedAt ? { closedAt: day.closedAt } : {}),
    } as DayInput['day'],
    entries: liveEntries(today),
    adjustments: facts.adjustments,
    upiConfirmations: facts.upiConfirmations,
    priorCreditOutstanding: credit,
    priorSupplierOutstanding: supplier,
  };
}

export function registerReadRoutes(
  app: FastifyInstance,
  deps: AppDeps,
  hooks: ShopLimitHooks = makeShopLimitHooks(deps.shopLimits),
): void {
  // BE-15: one per-shop bucket for every route below that folds the ledger.
  const limited = hooks.read;
  const limit = limited ? { preHandler: limited } : {};
  // RT-W3-1: redaction clears the shop's memo and is rare: it shares the export's small bucket.
  const heavy = hooks.heavy;
  /**
   * C-11 · THE SHOP'S "TODAY": its business date in India, by the day start it is
   * using. Never `now().slice(0, 10)`, which is the UTC date and the wrong day
   * from midnight to 05:30 IST. The engine still takes the date as an input.
   */
  const todayOf = async (shopId: string): Promise<IsoDate> =>
    shopToday(deps.now(), await deps.repo.latestStartsAt(shopId));

  /**
   * The nine-section day close, as figures rather than as a verdict.
   *
   * The cash check ships its WORKING, not only its answer. A shopkeeper who is
   * short by three hundred rupees needs to see the lines that built the
   * expectation, because the number on its own is an accusation he cannot check.
   */
  app.get('/v1/days/:date/summary', {
    ...limit,
    // Takes no query parameters at all, and says so rather than ignoring them.
    schema: { querystring: { type: 'object', additionalProperties: false, properties: {} } },
  }, async (req, reply) => {
    const shopId = shopOf(req);
    const { date } = req.params as { date: string };
    try {
      parseIsoDate(date);
    } catch {
      return reply.code(400).send({ error: 'invalid_date' });
    }

    // ARCH-06: every repo call of this request shares ONE scoped transaction (3 round trips, not 3 per call).
    const input = await deps.repo.inScope(shopId, () => dayInputFor(deps.repo, shopId, date as IsoDate));
    const primary = computePrimary(input);
    const cash = expectedCashBalance(input);

    return reply.code(200).send({
      date,
      state: input.day.state,
      figures: {
        p1TotalCashReceived: primary.p1TotalCashReceived.value,
        p2TotalCashPaid: primary.p2TotalCashPaid.value,
        p3ExpectedCashBalance: primary.p3ExpectedCashBalance.value,
        p4NetSales: primary.p4NetSales.value,
        p5NetPurchase: primary.p5NetPurchase.value,
        p6TotalExpenses: primary.p6TotalExpenses.value,
        p7CreditOutstanding: primary.p7CreditOutstanding.value,
        p8SupplierOutstanding: primary.p8SupplierOutstanding.value,
        estimatedProfit: primary.estimatedProfit.value,
      },
      countedCash: input.day.countedCash,
      cashCheck: { expected: cash.value, working: cash.working },
      // The second equation (D2), and what of it he has confirmed (decision 3).
      upi: (() => {
        const check = upiCheck(input);
        return {
          expected: expectedUpi(input).value,
          expectedReceived: check.expectedReceived,
          confirmedReceived: check.confirmedReceived,
          status: check.status,
        };
      })(),
      entryCount: input.entries.length,
    });
  });

  /**
   * Who owes the shop, and who the shop owes.
   *
   * THE QUERY IS SCHEMA'D FOR THE SAME REASON THE BODY IS. The adversary pass
   * at iteration 35 planted a `shopOf` that preferred a `shopId` from the query
   * string, and the whole suite passed. The claims were always what decided, so
   * nothing was ever exploitable - but a forged parameter being silently
   * IGNORED and a forged parameter being REFUSED are different postures, and
   * only the second one tells a client it is wrong. `additionalProperties:
   * false` makes it the second.
   */
  app.get('/v1/parties/outstanding', {
    ...limit,
    schema: {
      querystring: {
        type: 'object',
        additionalProperties: false,
        properties: { asOf: { type: 'string', minLength: 10, maxLength: 10 } },
      },
    },
  }, async (req, reply) => {
    const shopId = shopOf(req);
    const { asOf } = req.query as { asOf?: string };
    // ARCH-06: one scoped transaction for the whole request.
    return deps.repo.inScope(shopId, async () => {
      const date = asOf ?? (await todayOf(shopId));
      try {
        parseIsoDate(date);
      } catch {
        return reply.code(400).send({ error: 'invalid_date' });
      }

      const input = await dayInputFor(deps.repo, shopId, date as IsoDate);
      return reply.code(200).send({
        asOf: date,
        creditOutstanding: creditOutstanding(input).value,
        supplierOutstanding: supplierOutstanding(input).value,
        parties: await deps.repo.partiesFor(shopId),
      });
    });
  });

  /**
   * L-04 · everything the shop holds about ONE party, for that party.
   *
   * A customer may ask a shopkeeper what is recorded against their name, and under
   * the DPDP Act the shopkeeper has to be able to answer. This is that answer, and
   * it is deliberately narrow: one party's rows, never the ledger.
   */
  /**
   * L-04 · the other half of the party right: REMOVE the details.
   *
   * A shopkeeper's customer can ask him to stop holding their name. He must be
   * able to do that without losing his own financial record - what they owe him
   * is his fact about his business, and a ledger with a hole in it is not a
   * ledger. So the party row keeps its id and every entry keeps pointing at it;
   * the name and the phone number go.
   *
   * NOT REVERSIBLE, AND NOT CONFIRMED HERE. The screen that calls this asks
   * first. A route that demanded a confirmation word AND a screen that asked
   * would be two confirmations, and the second one teaches him to tap through
   * the first.
   */
  app.post('/v1/parties/:id/redact', { schema: { body: NO_BODY }, ...(heavy ? { preHandler: heavy } : {}) }, async (req, reply) => {
    const shopId = shopOf(req);
    const { id } = req.params as { id: string };

    const { redacted } = await deps.repo.redactParty(shopId, id);
    // 404 for a party of another shop as well as for one that does not exist:
    // the two answers must be the same or the difference is an oracle.
    if (!redacted) return reply.code(404).send({ error: 'not_found' });

    return reply.code(200).send({
      redacted: true,
      message:
        'The name and phone number are gone. The entries stay, because what you are ' +
        'owed is your own record.',
    });
  });

  app.get('/v1/parties/:id/export', { ...limit, schema: { querystring: NO_QUERY } }, async (req, reply) => {
    const shopId = shopOf(req);
    const { id } = req.params as { id: string };
    const parties = await deps.repo.partiesFor(shopId);
    const party = parties.find((p) => p.id === id);
    if (!party) return reply.code(404).send({ error: 'not_found' });

    const today = await todayOf(shopId);
    const all = [
      ...(await deps.repo.entriesBefore(shopId, today)),
      ...(await deps.repo.entriesFor(shopId, today)),
    ].filter((e) => e.partyId === id);
    /*
     * PR-1: what he bought on those sales, if items were recorded. DPDP s.11:
     * the customer's access request covers it, because it is about him.
     */
    const ids = new Set(all.map((e) => e.id));
    const itemLines = (await deps.repo.itemLinesFor(shopId)).filter((l) => ids.has(l.entryId));
    const named = new Set(itemLines.map((l) => l.itemId));
    const items = (await deps.repo.itemsFor(shopId)).filter((i) => named.has(i.id));

    return reply.code(200).send({
      party,
      entries: all,
      itemLines,
      items,
      // R5 FR-6: the limits he set on this customer are about this customer too.
      creditLimits: (await deps.repo.creditLimitsFor(shopId)).filter((l) => l.partyId === id),
      /*
       * L-15 and L-16: every export says what it is not. Somebody handed this
       * must not be able to mistake it for a tax document, and the words
       * "invoice", "return" and "filing" never appear in it.
       */
      notice: EXPORT_DISCLAIMER,
      generatedAt: deps.now(),
    });
  });

  /** The operational alerts. A figure with nothing behind it reports null, not zero. */
  app.get('/v1/alerts', {
    ...limit,
    schema: { querystring: { type: 'object', additionalProperties: false, properties: {} } },
  }, async (req, reply) => {
    const shopId = shopOf(req);
    // ARCH-06: one scoped transaction for the reads of this request.
    const { today, input } = await deps.repo.inScope(shopId, async () => {
      const t = await todayOf(shopId);
      return { today: t, input: await dayInputFor(deps.repo, shopId, t) };
    });
    const expected = expectedCashBalance(input).value;
    const counted = input.day.countedCash;

    return reply.code(200).send({
      asOf: today,
      expectedCash: expected,
      counted: counted ?? null,
      /*
       * Null until it has been counted. A zero difference on a day nobody has
       * counted reads as "balanced", which is the most confident kind of wrong.
       * ADR-003: the subtraction goes through the audited helper even here.
       */
      difference: counted === null || counted === undefined ? null : subtract(counted, expected),
      creditOutstanding: creditOutstanding(input).value,
    });
  });


  /**
   * CLOSE THE DAY. The one write that makes a day's figures permanent.
   *
   * A DIFFERENCE REQUIRES A REASON, and that is the product's position rather than
   * a validation detail: an unexplained gap let through is a gap nobody will ever
   * explain, and the figures stop meaning anything the first time one passes. The
   * expected figure is the ENGINE's, computed here from the stored entries - the
   * client does not get to tell the server what it expected.
   *
   * CLOSING IS IDEMPOTENT IN THE SAME WAY SYNC IS. Closing an already-closed day
   * with the same count is a no-op and a 200, because the phone will retry. With a
   * DIFFERENT count it is a 409: that is not a retry, it is an attempt to move a
   * figure that is supposed to be permanent.
   */
  app.post(
    '/v1/days/:date/close',
    {
      ...limit,
      schema: {
        body: {
          type: 'object',
          required: ['countedCash'],
          additionalProperties: false,
          properties: {
            countedCash: { type: 'integer', minimum: 0, maximum: MAX_ENTRY_PAISE },
            differenceReason: { type: 'string', minLength: 1, maxLength: 200 },
          },
        },
      },
    },
    async (req, reply) => {
      const shopId = shopOf(req);
      const { date } = req.params as { date: string };
      const body = req.body as { countedCash: number; differenceReason?: string };

      try {
        parseIsoDate(date);
        // Refuses a float or a negative, and names the field if it refuses.
        captureCountedCash(body.countedCash);
      } catch (e) {
        return reply.code(400).send({ error: 'invalid_close', message: (e as Error).message });
      }

      const existing = await deps.repo.findDay(shopId, date as IsoDate);
      if (!existing) return reply.code(404).send({ error: 'no_such_day' });

      if (existing.state === 'closed') {
        if (existing.countedCash === body.countedCash) {
          return reply.code(200).send({
            date,
            state: 'closed',
            countedCash: existing.countedCash,
            alreadyClosed: true,
          });
        }
        return reply.code(409).send({
          error: 'day_already_closed',
          message:
            date +
            ' is closed and its figures never move again. Post a correction against ' +
            'today that references this day.',
        });
      }

      const input = await dayInputFor(deps.repo, shopId, date as IsoDate);
      const expected = expectedCashBalance(input).value;
      const difference = subtract(body.countedCash, expected);

      if (difference !== 0 && !body.differenceReason) {
        return reply.code(422).send({
          error: 'reason_required',
          expected,
          counted: body.countedCash,
          difference,
          message:
            'the count does not match the expected figure, and closing without a ' +
            'reason would record a difference nobody can account for later.',
        });
      }

      const closedAt = deps.now();
      await deps.repo.upsertDay({
        shopId,
        date: date as IsoDate,
        state: 'closed',
        openingCash: existing.openingCash,
        countedCash: body.countedCash,
        // HT-49: a matched count carries no reason, whatever the client sent.
        differenceReason: difference === 0 ? null : (body.differenceReason ?? null),
        closedAt,
        startsAt: existing.startsAt,
        createdAt: existing.createdAt,
      });

      return reply.code(200).send({
        date,
        state: 'closed',
        expected,
        counted: body.countedCash,
        difference,
        closedAt,
      });
    },
  );
  /** The reports screen's data. Figures only; the phone decides how to draw them. */
  app.get('/v1/reports', {
    ...limit,
    schema: {
      querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
          from: { type: 'string', minLength: 10, maxLength: 10 },
          to: { type: 'string', minLength: 10, maxLength: 10 },
        },
      },
    },
  }, async (req, reply) => {
    const shopId = shopOf(req);
    const { from, to } = req.query as { from?: string; to?: string };
    const end = to ?? (await todayOf(shopId));
    try {
      parseIsoDate(end);
      if (from) parseIsoDate(from);
    } catch {
      return reply.code(400).send({ error: 'invalid_date' });
    }
    const start = from ?? end;
    /*
     * C-08 · A RANGE IS COMPUTED OR REFUSED, NEVER LABELLED AND IGNORED.
     *
     * This used to read `from`, echo it back, and compute the single day `to`:
     * a figure that said "1 to 30 June" and meant "30 June". The flow figures
     * (sales, purchases, expenses, profit) are now the engine's own per-day
     * answers added up through the audited helper; the outstanding figures are
     * the position at the END of the range, as they always were. A range that
     * ends before it starts, or runs past REPORT_MAX_DAYS, is a 400.
     */
    if (daysBetween(start, end) < 0) return reply.code(400).send({ error: 'invalid_range' });
    if (daysBetween(start, end) >= REPORT_MAX_DAYS) {
      return reply.code(400).send({ error: 'range_too_long', maxDays: REPORT_MAX_DAYS });
    }

    // Everything up to and including `end`, read once and grouped once.
    const byDay = groupByDay(await deps.repo.entriesBefore(shopId, addDays(end, 1)));
    let credit: Paise = 0;
    let supplier: Paise = 0;
    let netSales: Paise = 0;
    let netPurchase: Paise = 0;
    let totalExpenses: Paise = 0;
    let estimatedProfit: Paise = 0;
    for (const d of [...byDay.keys()].sort()) {
      const input: DayInput = {
        day: { date: d, state: 'closed', openingCash: 0, countedCash: null } as DayInput['day'],
        entries: liveEntries(byDay.get(d)!),
        priorCreditOutstanding: credit,
        priorSupplierOutstanding: supplier,
      };
      if (d >= start) {
        const facts = await deps.repo.dayFactsFor(shopId, d);
        const primary = computePrimary({
          ...input,
          adjustments: facts.adjustments,
          upiConfirmations: facts.upiConfirmations,
        });
        netSales = add(netSales, primary.p4NetSales.value);
        netPurchase = add(netPurchase, primary.p5NetPurchase.value);
        totalExpenses = add(totalExpenses, primary.p6TotalExpenses.value);
        estimatedProfit = add(estimatedProfit, primary.estimatedProfit.value);
      }
      credit = creditOutstanding(input).value;
      supplier = supplierOutstanding(input).value;
    }
    return reply.code(200).send({
      from: from ?? null,
      to: end,
      netSales,
      netPurchase,
      totalExpenses,
      estimatedProfit,
      creditOutstanding: credit,
      supplierOutstanding: supplier,
    });
  });
}
