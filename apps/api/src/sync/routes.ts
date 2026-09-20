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
import type { FastifyInstance } from 'fastify';
import {
  parseSalesEntry,
  parsePurchaseEntry,
  parseExpenseEntry,
  parseCollectionEntry,
  parsePartyPaymentEntry,
  parseWithdrawalEntry,
  captureCountedCash,
  parseIsoDate,
  EntryInputError,
  type Entry,
  type IsoDate,
  type Party,
} from '@swafto/formula-engine';
import type { AppDeps } from '../app.ts';
import { shopOf } from '../app.ts';
import { WriteRefused } from '../db/port.ts';

/** Which parser owns which section. The section decides, never the caller. */
const PARSER_FOR = {
  cash_sales: parseSalesEntry,
  upi_sales: parseSalesEntry,
  udhar_sales: parseSalesEntry,
  purchase: parsePurchaseEntry,
  expense: parseExpenseEntry,
  udhar_collection: parseCollectionEntry,
  party_payment: parsePartyPaymentEntry,
  withdrawal: parseWithdrawalEntry,
} as const;

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
    amount: { type: 'integer', minimum: 0 },
    mode: { type: 'string', enum: ['cash', 'upi', 'udhar', 'other', 'shop_stock'] },
    partyId: { type: 'string', minLength: 1, maxLength: 64 },
    dueDate: { type: 'string', minLength: 10, maxLength: 10 },
    label: { type: 'string', maxLength: 200 },
    correctsDayId: { type: 'string', minLength: 10, maxLength: 10 },
    source: { type: 'string', enum: ['manual', 'imported'] },
    createdAt: { type: 'string', minLength: 20, maxLength: 30 },
  },
} as const;

export function registerSyncRoutes(app: FastifyInstance, deps: AppDeps): void {
  app.post(
    '/v1/sync/push',
    {
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
              maxItems: 400,
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
                  openingCash: { type: 'integer', minimum: 0 },
                  countedCash: { type: 'integer', minimum: 0 },
                  differenceReason: { type: 'string', maxLength: 200 },
                  closedAt: { type: 'string', minLength: 20, maxLength: 30 },
                },
              },
            },
            parties: {
              type: 'array',
              maxItems: 2000,
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
            entries: { type: 'array', maxItems: 1000, items: entrySchema },
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
        }[];
        parties?: readonly {
          id: string;
          kind: 'customer' | 'supplier';
          name: string;
          phone?: string;
          defaultDueDays?: number;
        }[];
        entries?: readonly Record<string, unknown>[];
      };

      const now = deps.now();
      const rejected: { id: string; field: string; message: string }[] = [];
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
          parseIsoDate(day.date);
          // Refuses a float or a negative, and names the field if it refuses.
          if (day.countedCash !== undefined) captureCountedCash(day.countedCash);

          const existing = await deps.repo.findDay(shopId, day.date as IsoDate);
          if (existing?.state === 'closed') {
            // Already frozen. Re-sending it is a harmless replay; its entries
            // are refused below, which is exactly what D7 requires.
            daysWritten += 1;
            continue;
          }

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
            createdAt: now,
          });
          daysWritten += 1;
        } catch (e) {
          rejected.push({
            id: day.date,
            field: e instanceof EntryInputError ? e.field : 'date',
            message: (e as Error).message,
          });
        }
      }

      for (const party of body.parties ?? []) {
        const row = {
          id: party.id,
          kind: party.kind,
          name: party.name,
          ...(party.phone ? { phone: party.phone } : {}),
          ...(party.defaultDueDays === undefined ? {} : { defaultDueDays: party.defaultDueDays }),
        } as Party;
        await deps.repo.upsertParty(shopId, row);
      }

      /* ---- then the entries, each through its own parser ----------------- */
      for (const raw of body.entries ?? []) {
        const section = raw.section as Section;
        const id = String(raw.id ?? '');
        try {
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
          });

          if (entry.section !== section) {
            rejected.push({
              id,
              field: 'section',
              message:
                'the mode and the section disagree: ' +
                section +
                ' was sent but ' +
                entry.section +
                ' is what that mode means.',
            });
            continue;
          }

          const result = await deps.repo.appendEntry(shopId, entry);
          if (result.inserted) inserted += 1;
          else alreadyPresent += 1;
        } catch (e) {
          if (e instanceof EntryInputError) {
            rejected.push({ id, field: e.field, message: e.message });
          } else if (e instanceof WriteRefused) {
            rejected.push({ id, field: e.constraintName, message: e.message });
          } else {
            rejected.push({ id, field: 'entry', message: (e as Error).message });
          }
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
            createdAt: now,
          });
          daysWritten += 1;
        } catch (e) {
          rejected.push({ id: day.date, field: 'state', message: (e as Error).message });
        }
      }

      return reply.code(200).send({
        daysWritten,
        entriesAccepted: inserted + alreadyPresent,
        entriesInserted: inserted,
        entriesAlreadyPresent: alreadyPresent,
        rejected,
      });
    },
  );
}
