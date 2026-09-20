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
  creditOutstanding,
  expectedCashBalance,
  supplierOutstanding,
  subtract,
  captureCountedCash,
  parseIsoDate,
  type DayInput,
  type IsoDate,
  type Paise,
} from '@swafto/formula-engine';
import type { AppDeps } from '../app.ts';
import { shopOf } from '../app.ts';
import type { Repo } from '../db/port.ts';

/**
 * Assemble exactly what the engine needs for one day, with the prior balances
 * carried forward from everything before it.
 *
 * The fold is deliberate. Each earlier day is run through the same
 * `creditOutstanding` / `supplierOutstanding` the engine exposes, and its answer
 * becomes the next day's opening position - so a change to how credit is counted
 * moves history and today together and cannot make them disagree.
 *
 * ponytail: O(days) per request, which is fine at a few hundred days and is not a
 * shape that survives ten years. The upgrade is a stored daily closing balance -
 * and that is a CACHE of a derived figure, so it needs its own re-derivation check
 * before it goes anywhere near this file.
 */
export async function dayInputFor(repo: Repo, shopId: string, date: IsoDate): Promise<DayInput> {
  const day = await repo.findDay(shopId, date);
  const today = await repo.entriesFor(shopId, date);
  const earlier = await repo.entriesBefore(shopId, date);

  const dates = [...new Set(earlier.map((e) => e.dayId))].sort();
  let credit: Paise = 0;
  let supplier: Paise = 0;
  for (const d of dates) {
    const partial: DayInput = {
      day: { date: d, state: 'closed', openingCash: 0, countedCash: null } as DayInput['day'],
      entries: earlier.filter((e) => e.dayId === d),
      priorCreditOutstanding: credit,
      priorSupplierOutstanding: supplier,
    };
    credit = creditOutstanding(partial).value;
    supplier = supplierOutstanding(partial).value;
  }

  return {
    day: {
      date,
      state: day?.state ?? 'not_started',
      openingCash: day?.openingCash ?? 0,
      countedCash: day?.countedCash ?? null,
      ...(day?.differenceReason ? { differenceReason: day.differenceReason } : {}),
      ...(day?.closedAt ? { closedAt: day.closedAt } : {}),
    } as DayInput['day'],
    entries: today,
    priorCreditOutstanding: credit,
    priorSupplierOutstanding: supplier,
  };
}

export function registerReadRoutes(app: FastifyInstance, deps: AppDeps): void {
  /**
   * The nine-section day close, as figures rather than as a verdict.
   *
   * The cash check ships its WORKING, not only its answer. A shopkeeper who is
   * short by three hundred rupees needs to see the lines that built the
   * expectation, because the number on its own is an accusation he cannot check.
   */
  app.get('/v1/days/:date/summary', async (req, reply) => {
    const shopId = shopOf(req);
    const { date } = req.params as { date: string };
    try {
      parseIsoDate(date);
    } catch {
      return reply.code(400).send({ error: 'invalid_date' });
    }

    const input = await dayInputFor(deps.repo, shopId, date as IsoDate);
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
      entryCount: input.entries.length,
    });
  });

  /** Who owes the shop, and who the shop owes. */
  app.get('/v1/parties/outstanding', async (req, reply) => {
    const shopId = shopOf(req);
    const { asOf } = req.query as { asOf?: string };
    const date = asOf ?? deps.now().slice(0, 10);
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

  /**
   * L-04 · everything the shop holds about ONE party, for that party.
   *
   * A customer may ask a shopkeeper what is recorded against their name, and under
   * the DPDP Act the shopkeeper has to be able to answer. This is that answer, and
   * it is deliberately narrow: one party's rows, never the ledger.
   */
  app.get('/v1/parties/:id/export', async (req, reply) => {
    const shopId = shopOf(req);
    const { id } = req.params as { id: string };
    const parties = await deps.repo.partiesFor(shopId);
    const party = parties.find((p) => p.id === id);
    if (!party) return reply.code(404).send({ error: 'not_found' });

    const today = deps.now().slice(0, 10) as IsoDate;
    const all = [
      ...(await deps.repo.entriesBefore(shopId, today)),
      ...(await deps.repo.entriesFor(shopId, today)),
    ].filter((e) => e.partyId === id);

    return reply.code(200).send({
      party,
      entries: all,
      /*
       * L-15 and L-16: every export says what it is not. Somebody handed this
       * must not be able to mistake it for a tax document, and the words
       * "invoice", "return" and "filing" never appear in it.
       */
      notice:
        'A record of entries made in this shop book. Not a tax document and not ' +
        'prepared for any government submission.',
      generatedAt: deps.now(),
    });
  });

  /** The operational alerts. A figure with nothing behind it reports null, not zero. */
  app.get('/v1/alerts', async (req, reply) => {
    const shopId = shopOf(req);
    const today = deps.now().slice(0, 10) as IsoDate;
    const input = await dayInputFor(deps.repo, shopId, today);
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
      schema: {
        body: {
          type: 'object',
          required: ['countedCash'],
          additionalProperties: false,
          properties: {
            countedCash: { type: 'integer', minimum: 0 },
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
        differenceReason: body.differenceReason ?? null,
        closedAt,
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
  app.get('/v1/reports', async (req, reply) => {
    const shopId = shopOf(req);
    const { from, to } = req.query as { from?: string; to?: string };
    const end = to ?? deps.now().slice(0, 10);
    try {
      parseIsoDate(end);
      if (from) parseIsoDate(from);
    } catch {
      return reply.code(400).send({ error: 'invalid_date' });
    }

    const input = await dayInputFor(deps.repo, shopId, end as IsoDate);
    const primary = computePrimary(input);
    return reply.code(200).send({
      from: from ?? null,
      to: end,
      netSales: primary.p4NetSales.value,
      netPurchase: primary.p5NetPurchase.value,
      totalExpenses: primary.p6TotalExpenses.value,
      estimatedProfit: primary.estimatedProfit.value,
      creditOutstanding: primary.p7CreditOutstanding.value,
      supplierOutstanding: primary.p8SupplierOutstanding.value,
    });
  });
}
