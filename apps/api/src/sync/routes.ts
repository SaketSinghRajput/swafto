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

const entrySchema = {
  type: 'object',
  required: ['id', 'dayId', 'section', 'amount', 'mode', 'createdAt'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1, maxLength: 64 },
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
                  id: { type: 'string', minLength: 1, maxLength: 64 },
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

      /* ---- days first: an entry cannot precede its day ------------------ */
      for (const day of body.days ?? []) {
        try {
          parseIsoDate(day.date);
          // Refuses a float or a negative, and names the field if it refuses.
          if (day.countedCash !== undefined) captureCountedCash(day.countedCash);
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
