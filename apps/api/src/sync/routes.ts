/**
 * G7 - SYNC. The outbox drains here, and it may drain the same batch for ever.
 *
 * IDEMPOTENCY IS THE WHOLE DESIGN, NOT A FEATURE OF IT. A shop on a 2G connection
 * in a market loses the response, not the request. The phone cannot tell a lost
 * reply from a lost request, so it retries - and it is RIGHT to retry, because the
 * alternative is losing a day's takings to a dropped packet. Every entry therefore
 * carries an id minted on the device, and arriving twice with that id is the normal
 * case rather than an error. B8 asks for three replays of a 200-entry batch to be
 * byte-identical, and that is what the test does.
 *
 * THE SHOP COMES FROM THE TOKEN, NEVER FROM THE BODY. This is the most dangerous
 * line in the API: a `shopId` read from the payload would let anybody with a valid
 * session write into anybody else's ledger. It is not read here, it is not in the
 * schema, and `additionalProperties: false` makes sending one a 400 rather than a
 * silent ignore.
 *
 * THE SERVER RE-VALIDATES EVERYTHING, WITH THE SAME PARSERS THE PHONE USES. The
 * client already refused bad input at the keystroke; that refusal protects the
 * shopkeeper from a typo and protects nobody from a crafted request. So every entry
 * goes back through IN1-IN7 here. Constraint 3 taught this build that one layer is
 * not enough, and the database CHECK constraints are the third.
 */
import { errorFields } from '../error-event.ts';
import type { FastifyInstance } from 'fastify';
import {
  ENTRY_PARSERS,
  assertLegFits,
  isEventSection,
  captureCountedCash,
  parseIsoDate,
  parseAdjustment,
  parseUpiConfirmation,
  parseShopItem,
  parseItemLine,
  ITEM_NAME_MAX,
  ITEM_QUANTITY_MAX,
  parseCreditLimit,
  ADJUSTMENT_TYPES,
  MIDNIGHT,
  EntryInputError,
  type Entry,
  type IsoDate,
  type Party,
} from '@swafto/formula-engine';
import { MAX_ENTRY_PAISE } from '@swafto/values';
import type { AppDeps } from '../app.ts';
import { shopOf } from '../app.ts';
import { WriteRefused } from '../db/port.ts';
import { isInfraError } from '../db/errors.ts';
import { istCalendarDate } from '../business-date.ts';
import { addDays } from '@swafto/formula-engine';
import { makeShopLimitHooks, type ShopLimitHooks } from './shop-limit.ts';

/**
 * C-23 · HOW FAR FROM TODAY A DAY MAY BE CREATED. Both are REVERSIBLE DEFAULTS.
 *
 * FUTURE: tomorrow, no further. One day of slack covers a phone whose clock is
 * ahead and a shop whose business day has not rolled yet; nothing real is
 * dated further ahead, and a far-future day (9999-12-31) can be written into
 * for ever because the ledger is append-only.
 *
 * PAST: a year. Offline phones legitimately sync weeks late, so the floor is
 * generous - it is not SEC-109's "older than the newest closed day", which would
 * refuse a day a phone failed to push before a later one closed (a partly
 * rejected batch retried tomorrow). It exists to refuse 0001-01-01, which is
 * never a shop's trading day. It applies to CREATING a day: an entry, a fact or
 * a close for a day the server already holds is not a backdating.
 */
export const FUTURE_DAYS_ALLOWED = 1;
export const PAST_DAYS_ALLOWED = 366;

/**
 * Which parser owns which section. The section decides, never the caller. The
 * engine's own table, so the four event sections (§2.3) cannot be accepted by
 * the phone and refused here, or the reverse.
 */
const PARSER_FOR = ENTRY_PARSERS;

type Section = keyof typeof PARSER_FOR;

/**
 * A UUID, as a PATTERN rather than `format: 'uuid'`.
 *
 * Ajv ignores an unknown format silently unless `ajv-formats` is installed and
 * wired in, which would mean a schema that looks strict and checks nothing. A
 * pattern is built in, so it cannot be quietly inert.
 */
const UUID_PATTERN =
  '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

const entrySchema = {
  type: 'object',
  required: ['id', 'dayId', 'section', 'amount', 'mode', 'createdAt'],
  additionalProperties: false,
  properties: {
    /*
     * A UUID, because the column is one. Without this the schema accepted any
     * 64-character string, the insert then failed with a driver error, and the
     * client got a 500 for something that should have been a clean 400. Found
     * by the repository equivalence run, which is the only test that had ever
     * put a client-minted id in front of a real database.
     */
    id: { type: 'string', pattern: UUID_PATTERN },
    dayId: { type: 'string', minLength: 10, maxLength: 10 },
    section: { type: 'string', enum: Object.keys(PARSER_FOR) },
    /*
     * Integer paise. The parser would refuse a float anyway; the schema refuses it
     * one layer earlier and with a message that names the field.
     */
    amount: { type: 'integer', minimum: 0, maximum: MAX_ENTRY_PAISE },
    mode: { type: 'string', enum: ['cash', 'upi', 'udhar', 'other', 'shop_stock'] },
    partyId: { type: 'string', minLength: 1, maxLength: 64 },
    dueDate: { type: 'string', minLength: 10, maxLength: 10 },
    label: { type: 'string', maxLength: 200 },
    correctsDayId: { type: 'string', minLength: 10, maxLength: 10 },
    // EX-3: the row this one is about - a return's sale, a settlement's return, a correction's original.
    refersToEntryId: { type: 'string', pattern: UUID_PATTERN },
    source: { type: 'string', enum: ['manual', 'imported'] },
    createdAt: { type: 'string', minLength: 20, maxLength: 30 },
  },
} as const;

/**
 * DECISIONS 2 AND 3 - the two day facts. Each is its own row, never part of an
 * entry and never an edit of one. No free-text property exists on either, and
 * `additionalProperties: false` makes sending one a 400 rather than a silent drop.
 */
const upiConfirmationSchema = {
  type: 'object',
  required: ['id', 'dayId', 'entryId', 'confirmedAt'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', pattern: UUID_PATTERN },
    dayId: { type: 'string', minLength: 10, maxLength: 10 },
    entryId: { type: 'string', pattern: UUID_PATTERN },
    batchId: { type: 'string', pattern: UUID_PATTERN },
    confirmedAt: { type: 'string', minLength: 20, maxLength: 30 },
  },
} as const;

const adjustmentSchema = {
  type: 'object',
  required: ['id', 'dayId', 'type', 'amount', 'createdAt'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', pattern: UUID_PATTERN },
    dayId: { type: 'string', minLength: 10, maxLength: 10 },
    type: { type: 'string', enum: [...ADJUSTMENT_TYPES] },
    amount: { type: 'integer', minimum: 1, maximum: MAX_ENTRY_PAISE },
    createdAt: { type: 'string', minLength: 20, maxLength: 30 },
  },
} as const;

/**
 * PR-1 (Premium): a name on the shop's own list, and one item line of a sale.
 * No price property on an item and none can be sent (`additionalProperties`):
 * a stored default price would be a figure offered while he types.
 */
const itemSchema = {
  type: 'object',
  required: ['id', 'name', 'createdAt'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', pattern: UUID_PATTERN },
    name: { type: 'string', minLength: 1, maxLength: ITEM_NAME_MAX },
    createdAt: { type: 'string', minLength: 20, maxLength: 30 },
  },
} as const;

const itemLineSchema = {
  type: 'object',
  required: ['id', 'dayId', 'entryId', 'quantity', 'amount', 'createdAt'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', pattern: UUID_PATTERN },
    dayId: { type: 'string', minLength: 10, maxLength: 10 },
    entryId: { type: 'string', pattern: UUID_PATTERN },
    // Absent is "Other".
    itemId: { type: 'string', pattern: UUID_PATTERN },
    quantity: { type: 'integer', minimum: 1, maximum: ITEM_QUANTITY_MAX },
    amount: { type: 'integer', minimum: 1, maximum: MAX_ENTRY_PAISE },
    createdAt: { type: 'string', minLength: 20, maxLength: 30 },
  },
} as const;

/**
 * R5 FR-6 - a credit limit on a customer, a party fact. A limit in whole paise
 * above zero, or null for "no limit"; nothing else, and no free text.
 */
const creditLimitSchema = {
  type: 'object',
  required: ['id', 'partyId', 'limit', 'setAt'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', pattern: UUID_PATTERN },
    partyId: { type: 'string', pattern: UUID_PATTERN },
    limit: { type: ['integer', 'null'], minimum: 1, maximum: MAX_ENTRY_PAISE },
    setAt: { type: 'string', minLength: 20, maxLength: 30 },
  },
} as const;

/** Per-array caps on one push. The client cuts its outbox to fit (client.ts). */
export const PUSH_MAX_ITEMS = {
  days: 400,
  parties: 2000,
  entries: 1000,
  // One per UPI receipt at most, so the same cap as the entries they name.
  upiConfirmations: 1000,
  adjustments: 1000,
  items: 1000,
  itemLines: 1000,
  // Party facts travel with the parties, under the same cap.
  creditLimits: 2000,
} as const;

/**
 * Refusal names a phone may be told. They are this API's own codes (port.ts and
 * memory.ts raise them identically), not the database's: a raw constraint name
 * or trigger message names the schema (BE-12), so anything else is reported as
 * the generic `refused`.
 */
const PUBLIC_REFUSALS = new Set([
  'parties_tenancy',
  'entries_party_fk',
  'entries_refers_fk',
  'entries_tenancy',
  'entries_append_only',
  'entries_closed_day',
  'entries_day_fk',
  'days_closed_guard',
  'upi_confirmations_entry',
  'day_facts_closed_day',
  'day_facts_day_fk',
  'item_lines_fit_sale',
  'item_lines_item_fk',
  'items_append_only',
  'item_lines_append_only',
  'party_credit_limits_party',
  'party_credit_limits_append_only',
  'adjustments_append_only',
  'plan_purchases_tenancy',
  'tenancy',
  // RT-W3-8: retryable; the phone parks the row and sends it again once per launch.
  'push_deferred',
]);

type Rejection = { field: string; message: string };

/**
 * RT-W3-2 · THE POISON IS STOPPED AT THE DOOR. A control character (NUL above all: Postgres refuses
 * it in text) in a label, or a createdAt that is not a real timestamp, would pass the schema's length
 * checks and then fail inside the database, where one such row used to turn a push into thousands of
 * statements. Refused here as ONE row's rejection, so the phone stops retrying that row and the
 * rest of the batch is untouched. Years are bounded to a phone's plausible clock.
 */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
const TIMESTAMP = /^(\d{4})-(\d{2}-\d{2})T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d{1,9})?(Z|[+-]([01]\d|2[0-3]):[0-5]\d)$/;
function assertWellFormed(raw: Record<string, unknown>): void {
  /*
   * QA-04 (CTO decision, 2026-11-18): AN ENTRY OF RS 0 IS NOT AN ENTRY. The app
   * refuses it at the keypad; the server must never accept what the app refuses,
   * and a phone from before that fix may still send one. A row, not the request,
   * so one old zero never blocks the rest of a push. (The schema's `minimum: 0`
   * stays: it covers every section, and a 400 here would reject the whole batch.)
   */
  if (raw.amount === 0) {
    throw new EntryInputError('amount', 'an entry of Rs 0 records nothing - leave it out, or use "Nothing to enter".');
  }
  if (typeof raw.label === 'string' && CONTROL_CHARS.test(raw.label)) {
    throw new EntryInputError('label', 'a label cannot contain control characters.');
  }
  const m = TIMESTAMP.exec(String(raw.createdAt ?? ''));
  const year = m ? Number(m[1]) : 0;
  if (!m || year < 2000 || year > 2100) {
    throw new EntryInputError('createdAt', 'createdAt must be an ISO-8601 timestamp such as 2026-09-19T10:00:00.000Z.');
  }
  try {
    parseIsoDate(m[1] + '-' + m[2]); // a date that exists: not 31 February
  } catch {
    throw new EntryInputError('createdAt', 'createdAt is not a real date.');
  }
  // RT-W3-8: a crafted date must not reach the INSERT. (refersToEntryId is already a UUID by the schema.)
  for (const field of ['correctsDayId', 'dueDate'] as const) {
    const v = raw[field];
    if (v === undefined) continue;
    try {
      parseIsoDate(String(v));
    } catch {
      throw new EntryInputError(field, field + ' must be a real date, YYYY-MM-DD.');
    }
  }
}

/**
 * One failed row, as the phone may see it - or an outage, which is not a row's
 * fault and must not be reported as one (BE-11, ARCH-04): infrastructure errors
 * are RE-THROWN so the whole request is a 503 with Retry-After and the outbox
 * keeps every row. Unknown errors are logged here and told to the phone generically.
 */
function rowFailure(e: unknown, fallbackField: string, log: { error(o: object, m: string): void }): Rejection {
  if (isInfraError(e)) throw e;
  if (e instanceof EntryInputError) return { field: e.field, message: e.message };
  if (e instanceof WriteRefused) {
    if (PUBLIC_REFUSALS.has(e.constraintName) || /_not_uuid$/.test(e.constraintName)) {
      return { field: e.constraintName, message: e.message };
    }
    log.error({ constraint: e.constraintName }, 'sync row refused by the ledger');
    return { field: 'refused', message: 'the ledger refused this row' };
  }
  if ((e as Error)?.name === 'MoneyError') return { field: 'amount', message: (e as Error).message };
  log.error({ err: errorFields(e) }, 'sync row failed');
  return { field: fallbackField, message: 'this row could not be recorded' };
}

export function registerSyncRoutes(
  app: FastifyInstance,
  deps: AppDeps,
  hooks: ShopLimitHooks = makeShopLimitHooks(deps.shopLimits),
): void {
  // BE-15: a per-shop ceiling on pushes; a 429 keeps the outbox and delays the next drain.
  const limited = hooks.push;
  app.post(
    '/v1/sync/push',
    {
      ...(limited ? { preHandler: limited } : {}),
      schema: {
        // It takes no query parameters. Saying so refuses a forged `shopId`
        // at the schema rather than ignoring it - see `shopOf` and the
        // iteration-35 adversary pass.
        querystring: { type: 'object', additionalProperties: false, properties: {} },
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            days: {
              type: 'array',
              maxItems: PUSH_MAX_ITEMS.days,
              items: {
                type: 'object',
                required: ['date', 'state'],
                additionalProperties: false,
                properties: {
                  date: { type: 'string', minLength: 10, maxLength: 10 },
                  state: {
                    type: 'string',
                    enum: ['not_started', 'open', 'ready', 'closed', 'not_closed'],
                  },
                  openingCash: { type: 'integer', minimum: 0, maximum: MAX_ENTRY_PAISE },
                  countedCash: { type: 'integer', minimum: 0, maximum: MAX_ENTRY_PAISE },
                  differenceReason: { type: 'string', maxLength: 200 },
                  closedAt: { type: 'string', minLength: 20, maxLength: 30 },
                  // Decision 1: when this business day started, 'HH:MM'.
                  startsAt: { type: 'string', pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' },
                },
              },
            },
            parties: {
              type: 'array',
              maxItems: PUSH_MAX_ITEMS.parties,
              items: {
                type: 'object',
                required: ['id', 'kind', 'name'],
                additionalProperties: false,
                properties: {
                  id: { type: 'string', pattern: UUID_PATTERN },
                  kind: { type: 'string', enum: ['customer', 'supplier'] },
                  name: { type: 'string', minLength: 1, maxLength: 120 },
                  phone: { type: 'string', minLength: 8, maxLength: 16 },
                  defaultDueDays: { type: 'integer', minimum: 0, maximum: 365 },
                },
              },
            },
            entries: { type: 'array', maxItems: PUSH_MAX_ITEMS.entries, items: entrySchema },
            upiConfirmations: {
              type: 'array',
              maxItems: PUSH_MAX_ITEMS.upiConfirmations,
              items: upiConfirmationSchema,
            },
            adjustments: {
              type: 'array',
              maxItems: PUSH_MAX_ITEMS.adjustments,
              items: adjustmentSchema,
            },
            items: { type: 'array', maxItems: PUSH_MAX_ITEMS.items, items: itemSchema },
            itemLines: { type: 'array', maxItems: PUSH_MAX_ITEMS.itemLines, items: itemLineSchema },
            creditLimits: {
              type: 'array',
              maxItems: PUSH_MAX_ITEMS.creditLimits,
              items: creditLimitSchema,
            },
          },
        },
      },
    },
    async (req, reply) => {
      const shopId = shopOf(req);
      const body = req.body as {
        days?: readonly {
          date: string;
          state: 'not_started' | 'open' | 'ready' | 'closed' | 'not_closed';
          openingCash?: number;
          countedCash?: number;
          differenceReason?: string;
          closedAt?: string;
          startsAt?: string;
        }[];
        parties?: readonly {
          id: string;
          kind: 'customer' | 'supplier';
          name: string;
          phone?: string;
          defaultDueDays?: number;
        }[];
        entries?: readonly Record<string, unknown>[];
        upiConfirmations?: readonly {
          id: string;
          dayId: string;
          entryId: string;
          batchId?: string;
          confirmedAt: string;
        }[];
        adjustments?: readonly {
          id: string;
          dayId: string;
          type: string;
          amount: number;
          createdAt: string;
        }[];
        items?: readonly { id: string; name: string; createdAt: string }[];
        itemLines?: readonly {
          id: string;
          dayId: string;
          entryId: string;
          itemId?: string;
          quantity: number;
          amount: number;
          createdAt: string;
        }[];
        creditLimits?: readonly { id: string; partyId: string; limit: number | null; setAt: string }[];
      };

      /*
       * RT-W3-10 · ONE CONCISE LINE PER PUSH, NOT A STACK PER ROW. A client can make every row of a push
       * fail the same way; logging each with its stack is a log flood at 2 pushes a second. Failures are
       * counted here and one warn line (count and the first message, no stack) is written at the end.
       */
      const failures = { count: 0, first: '' };
      const rowLog = {
        error(o: object, m: string) {
          failures.count += 1;
          if (failures.first === '') {
            const err = (o as { err?: { message?: unknown } }).err;
            const detail = err ? String(err.message ?? '') : String((o as { constraint?: unknown }).constraint ?? '');
            failures.first = (m + ': ' + detail).slice(0, 200);
          }
        },
      };
      const now = deps.now();
      const rejected: { id: string; field: string; message: string }[] = [];
      // C-23: the window, from the shop's India calendar date. See FUTURE_DAYS_ALLOWED.
      const today = istCalendarDate(now);
      const latest = addDays(today, FUTURE_DAYS_ALLOWED);
      const earliest = addDays(today, -PAST_DAYS_ALLOWED);
      const refuseOutsideWindow = (date: string, creating: boolean) => {
        if (date > latest) {
          throw new EntryInputError('date', 'that date is in the future. Check the phone’s clock.');
        }
        if (creating && date < earliest) {
          throw new EntryInputError('date', 'that date is more than a year ago, which this app does not accept.');
        }
      };
      let daysWritten = 0;
      let inserted = 0;
      let alreadyPresent = 0;

      /*
       * ---- days, IN TWO PASSES, and the reason is the offline case -------
       *
       * An entry cannot precede its day, so days have to be written first. But
       * a day that arrives CLOSED, written first, freezes the day before its
       * own entries land beside it - and every entry in the batch comes back
       * `entries_closed_day`. That is not an edge case: it is the ordinary
       * shape of an offline-first product. A shopkeeper with no signal all day
       * enters twenty rows, closes, and the phone syncs afterwards. The whole
       * day would be refused and the outbox would retry it forever.
       *
       * So a close is applied in two steps: the day is made to EXIST first,
       * open, and the close is applied after its entries. A day the server has
       * ALREADY closed is never reopened - that is D7, it is checked by the
       * repository, and it stays refused.
       *
       * Found by the first test that ever drove the real client against the
       * real API; neither side's own suite could see it.
       */
      const closing = new Set<string>();

      for (const day of body.days ?? []) {
        try {
          try {
            parseIsoDate(day.date);
          } catch (err) {
            throw new EntryInputError('date', (err as Error).message);
          }
          // Refuses a float or a negative, and names the field if it refuses.
          if (day.countedCash !== undefined) captureCountedCash(day.countedCash);

          const existing = await deps.repo.findDay(shopId, day.date as IsoDate);
          if (existing?.state === 'closed') {
            // Already frozen. Re-sending it is a harmless replay; its entries
            // are refused below, which is exactly what D7 requires.
            daysWritten += 1;
            continue;
          }

          // C-23: only the CREATION of a day is windowed; a day the server holds is not backdating.
          refuseOutsideWindow(day.date, existing === null);

          if (day.state === 'closed') {
            closing.add(day.date);
            await deps.repo.upsertDay({
              shopId,
              date: day.date as IsoDate,
              // Provisional: the state this day was in while its entries were
              // typed. The close follows once they are in.
              state: 'open',
              openingCash: day.openingCash ?? null,
              countedCash: null,
              differenceReason: null,
              closedAt: null,
              startsAt: day.startsAt ?? MIDNIGHT,
              createdAt: now,
            });
            continue;
          }

          await deps.repo.upsertDay({
            shopId,
            date: day.date as IsoDate,
            state: day.state,
            openingCash: day.openingCash ?? null,
            countedCash: day.countedCash ?? null,
            differenceReason: day.differenceReason ?? null,
            closedAt: day.closedAt ?? null,
            startsAt: day.startsAt ?? MIDNIGHT,
            createdAt: now,
          });
          daysWritten += 1;
        } catch (e) {
          rejected.push({ id: day.date, ...rowFailure(e, 'date', rowLog) });
        }
      }

      /*
       * PER ROW, LIKE THE ENTRIES. This loop used to have no catch, so one
       * party the repository refused - a foreign id, a database error - threw
       * out of the handler as a 500. The days above were already written, the
       * entries below were never tried, and the phone, seeing a 500, acked
       * nothing and sent the identical batch again: the same 500, for ever.
       * One bad party held the whole outbox hostage.
       */
      for (const party of body.parties ?? []) {
        const row = {
          id: party.id,
          kind: party.kind,
          name: party.name,
          ...(party.phone ? { phone: party.phone } : {}),
          ...(party.defaultDueDays === undefined ? {} : { defaultDueDays: party.defaultDueDays }),
        } as Party;
        try {
          await deps.repo.upsertParty(shopId, row);
        } catch (e) {
          rejected.push({ id: party.id, ...rowFailure(e, 'party', rowLog) });
        }
      }

      /*
       * ---- R5 FR-6: credit limits, after the parties they name. A refused
       * one is reported and the rest of the batch goes on, like a party.
       */
      let limitsInserted = 0;
      let limitsAlreadyPresent = 0;
      for (const raw of body.creditLimits ?? []) {
        try {
          const r = await deps.repo.appendCreditLimit(shopId, parseCreditLimit(raw));
          if (r.inserted) limitsInserted += 1;
          else limitsAlreadyPresent += 1;
        } catch (e) {
          rejected.push({ id: raw.id, ...rowFailure(e, 'credit_limit', rowLog) });
        }
      }

      /* ---- then the entries, each through its own parser ----------------- */
      const events = new Map<string, Entry[]>();
      const poisoned = new Set<string>();
      /*
       * ARCH-08 · THE PLAIN ENTRIES GO TO THE REPOSITORY AS ONE BATCH. Parsing is per row and
       * stays per row; the writes are `repo.appendEntries` (one transaction, O(1) round trips
       * on Postgres). `order` remembers each row's place so the `rejected` list comes out in
       * exactly the order the per-row loop produced.
       */
      const queue: Entry[] = [];
      const order: ({ rej: { id: string; field: string; message: string } } | { slot: number })[] = [];
      for (const raw of body.entries ?? []) {
        const section = raw.section as Section;
        const id = String(raw.id ?? '');
        try {
          assertWellFormed(raw);
          const parse = PARSER_FOR[section];
          /*
           * The parser is chosen by SECTION and handed the raw draft. It refuses a
           * credit sale with no customer, a due date on anything but a credit
           * purchase, a negative amount, a date that does not exist - the same
           * refusals the shopkeeper met at the keypad, applied again to a request
           * that never went near one.
           */
          /*
           * Optional fields are spread in only when PRESENT. Passing an explicit
           * `undefined` is not the same as omitting it: the parsers refuse a due
           * date on anything but a credit purchase, and `dueDate: undefined` is
           * still a dueDate key as far as an exactOptional type is concerned.
           */
          const entry: Entry = parse({
            id,
            dayId: raw.dayId as IsoDate,
            amount: raw.amount,
            mode: raw.mode,
            createdAt: String(raw.createdAt ?? ''),
            ...(raw.partyId === undefined ? {} : { partyId: String(raw.partyId) }),
            ...(raw.dueDate === undefined ? {} : { dueDate: String(raw.dueDate) }),
            ...(raw.label === undefined ? {} : { label: String(raw.label) }),
            ...(raw.source === undefined ? {} : { source: raw.source as 'manual' | 'imported' }),
            ...(raw.correctsDayId === undefined
              ? {}
              : { correctsDayId: raw.correctsDayId as IsoDate }),
            ...(raw.refersToEntryId === undefined ? {} : { refersToEntryId: String(raw.refersToEntryId) }),
          });

          // C-23: a future dayId. (A past one needs its day to exist already, so it cannot be new.)
          refuseOutsideWindow(entry.dayId, false);

          if (entry.section !== section) {
            order.push({
              rej: {
                id,
                field: 'section',
                message:
                  'the mode and the section disagree: ' +
                  section +
                  ' was sent but ' +
                  entry.section +
                  ' is what that mode means.',
              },
            });
            continue;
          }

          if (isEventSection(entry.section)) {
            /*
             * An event's legs wait for their group. A return is its own group's
             * key; every settlement leg is keyed by the return it points at - so
             * legs pushed in one batch commit together, and a leg settling a
             * return already on the server commits alone.
             */
            const root = entry.section === 'sales_return' ? entry.id : String(entry.refersToEntryId);
            events.set(root, [...(events.get(root) ?? []), entry]);
            continue;
          }
          order.push({ slot: queue.length });
          queue.push(entry);
        } catch (e) {
          // A leg its parser refused takes its whole event down with it - never half an exchange.
          if (isEventSection(String(raw.section))) {
            poisoned.add(raw.section === 'sales_return' ? id : String(raw.refersToEntryId));
          }
          order.push({ rej: { id, ...rowFailure(e, 'entry', rowLog) } });
        }
      }
      const outcomes = queue.length > 0 ? await deps.repo.appendEntries(shopId, queue) : [];
      for (const item of order) {
        if ('rej' in item) {
          rejected.push(item.rej);
          continue;
        }
        const entry = queue[item.slot]!;
        const outcome = outcomes[item.slot]!;
        if ('error' in outcome) {
          rejected.push({ id: entry.id, ...rowFailure(outcome.error, 'entry', rowLog) });
        } else if (outcome.inserted) inserted += 1;
        else alreadyPresent += 1;
      }

      /*
       * ---- then each EVENT, all its legs or none (EX-5) --------------------
       *
       * A batch is not a transaction, and for independent rows that is right.
       * An event's legs are not independent: landing the replacement and
       * refusing the return would inflate Net Sales on the server for ever.
       * So each leg is checked by the engine's `assertLegFits` against what the
       * server already holds - the same rule the phone ran, so a crafted push
       * meets the keypad's refusals, including over-settlement (EX-12) - and
       * the group is appended in one transaction. One refusal rejects every
       * leg, with one row each, so the phone knows the whole event went back.
       */
      for (const [root, legs] of events) {
        try {
          if (poisoned.has(root)) {
            throw new EntryInputError('event', 'another part of this return was refused, so none of it was recorded.');
          }
          const accepted: Entry[] = [];
          for (const leg of legs) {
            const targetId = String(leg.refersToEntryId);
            const target = accepted.find((e) => e.id === targetId) ?? (await deps.repo.findEntry(shopId, targetId));
            const siblings = [
              ...(await deps.repo.entriesReferringTo(shopId, targetId)),
              ...accepted.filter((e) => e.refersToEntryId === targetId),
            ];
            assertLegFits(leg, target ?? undefined, siblings);
            accepted.push(leg);
          }
          // ponytail: check-then-insert is not serialised across two concurrent pushes of one
          // shop; one phone per shop (D9) makes that rare. Add SELECT ... FOR UPDATE on the return if not.
          const result = await deps.repo.appendEvent(shopId, accepted);
          inserted += result.inserted;
          alreadyPresent += result.alreadyPresent;
        } catch (e) {
          const failure = rowFailure(e, 'entry', rowLog);
          for (const leg of legs) rejected.push({ id: leg.id, ...failure });
        }
      }

      /*
       * ---- the day facts, after the entries a confirmation names and before
       * the closes, for the same reason the entries go first: a day closed
       * ahead of its own facts would refuse them for ever (D7).
       */
      let factsInserted = 0;
      let factsAlreadyPresent = 0;
      const refuse = (id: string, e: unknown) =>
        rejected.push({ id, ...rowFailure(e, 'day_fact', rowLog) });
      for (const raw of body.upiConfirmations ?? []) {
        try {
          const r = await deps.repo.appendUpiConfirmation(
            shopId,
            parseUpiConfirmation({ ...raw, dayId: raw.dayId as IsoDate }),
          );
          if (r.inserted) factsInserted += 1;
          else factsAlreadyPresent += 1;
        } catch (e) {
          refuse(raw.id, e);
        }
      }
      for (const raw of body.adjustments ?? []) {
        try {
          const r = await deps.repo.appendAdjustment(
            shopId,
            parseAdjustment({ ...raw, dayId: raw.dayId as IsoDate }),
          );
          if (r.inserted) factsInserted += 1;
          else factsAlreadyPresent += 1;
        } catch (e) {
          refuse(raw.id, e);
        }
      }

      /*
       * ---- PR-1: the item list, then the item lines - after the sales they
       * name and before the closes, for the reason the day facts go here. The
       * repository runs the engine's `assertLineFits` (the phone's own rule) and
       * the database's trigger backs it, so a crafted push cannot record items
       * worth more than the sale.
       *
       * ponytail: no Premium check on the server - entitlement is derived
       * elsewhere (R5) and not wired here yet; the phone's `allows()` gate is the
       * only one. A free shop pushing its own lines harms nobody but adds data;
       * add the entitlement check when the purchases table lands.
       */
      for (const raw of body.items ?? []) {
        try {
          const r = await deps.repo.appendItem(shopId, parseShopItem(raw));
          if (r.inserted) factsInserted += 1;
          else factsAlreadyPresent += 1;
        } catch (e) {
          refuse(raw.id, e);
        }
      }
      for (const raw of body.itemLines ?? []) {
        try {
          const r = await deps.repo.appendItemLine(
            shopId,
            parseItemLine({ ...raw, dayId: raw.dayId as IsoDate }),
          );
          if (r.inserted) factsInserted += 1;
          else factsAlreadyPresent += 1;
        } catch (e) {
          refuse(raw.id, e);
        }
      }

      /*
       * 200, NOT 207 OR 400, EVEN WITH REJECTIONS. A batch is not a transaction:
       * one malformed entry must not send back a day's worth of good ones. The
       * phone keeps the rejected ids with their reasons and stops retrying those,
       * which is the only behaviour that terminates.
       *
       * The body is a pure function of what is now stored, so replaying the same
       * batch produces the same bytes - which is what B8 measures.
       */
      /*
       * ---- and now the closes, after the entries they belong with --------
       *
       * A day is only reported as written once this succeeds. If it does not,
       * the day stays open on the server and the row stays queued on the
       * phone, which is the safe direction: a day closed twice is idempotent,
       * a day reported closed and left open is a figure nobody can find.
       */
      for (const day of body.days ?? []) {
        if (!closing.has(day.date)) continue;
        try {
          await deps.repo.upsertDay({
            shopId,
            date: day.date as IsoDate,
            state: 'closed',
            openingCash: day.openingCash ?? null,
            countedCash: day.countedCash ?? null,
            differenceReason: day.differenceReason ?? null,
            closedAt: day.closedAt ?? null,
            startsAt: day.startsAt ?? MIDNIGHT,
            createdAt: now,
          });
          daysWritten += 1;
        } catch (e) {
          rejected.push({ id: day.date, ...rowFailure(e, 'state', rowLog) });
        }
      }

      if (failures.count > 0) req.log.warn({ rows: failures.count, first: failures.first }, 'sync rows failed');
      return reply.code(200).send({
        daysWritten,
        entriesAccepted: inserted + alreadyPresent,
        entriesInserted: inserted,
        entriesAlreadyPresent: alreadyPresent,
        dayFactsInserted: factsInserted,
        dayFactsAlreadyPresent: factsAlreadyPresent,
        creditLimitsInserted: limitsInserted,
        creditLimitsAlreadyPresent: limitsAlreadyPresent,
        rejected,
      });
    },
  );
}
