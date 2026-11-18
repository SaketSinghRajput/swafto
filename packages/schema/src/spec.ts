/**
 * SWAFTO schema — THE single source of truth for both engines.
 *
 * One declarative spec, two DDL dialects emitted from it (SQLite on the device,
 * Postgres on the server). G4 requires them to be identical in meaning, and the only
 * way to guarantee that over time is to never write either one by hand.
 *
 * Stores D1-D5 are from SWAFTO-System-Architecture-and-DFD.pdf §06 p.7.
 *
 * Rules this file physically enforces, rather than merely documenting:
 *   - entries is APPEND-ONLY, FOREVER (architecture §07.04) — trigger on both engines,
 *     plus REVOKE UPDATE, DELETE on Postgres. Belt and braces (ADR-006).
 *   - money is an INTEGER number of paise (ADR-003) — every amount column is integral
 *     with a CHECK that it is a whole number.
 *   - NO TOTALS ARE STORED, EVER (architecture §06: "There is no totals table, and
 *     there never will be"). If you are about to add a `total` column, read that page.
 *   - mode validity is PER SECTION, not global (SPEC-DIGEST C-7) — CHECK constraint.
 *   - day state has FIVE values, not four (SPEC-DIGEST C-3 / OD-5).
 */

export type Dialect = 'sqlite' | 'postgres';

/* ------------------------------------------------------------------ *
 * Enumerations — the vocabulary of the domain
 * ------------------------------------------------------------------ */

/**
 * FIVE states. The build prompt says four (not_started|open|ready|closed); the
 * architecture doc says a different four (open|ready|closed|not_closed); the decisions
 * doc state machine (p.8) shows all five and both shorter lists are lossy.
 *
 *   not_started — no opening cash set. Gates T2/T6 first-run.
 *   open        — editable, any order (D8).
 *   ready       — all 8 preceding sections entered or skipped; cash check unlocked.
 *   closed      — frozen forever (D7). The only state that can never be edited.
 *   not_closed  — a GAP. The day ended without closing (D6). Can still be closed late,
 *                 but a late close never rewrites a later day's opening cash.
 */
export const DAY_STATES = ['not_started', 'open', 'ready', 'closed', 'not_closed'] as const;
export type DayState = (typeof DAY_STATES)[number];

/** The eight entry sections, in the paper sheet's order. Do NOT reorder (S4 p.3). */
export const SECTIONS = [
  'cash_sales', // 01
  'upi_sales', // 02
  'udhar_sales', // 03
  'expense', // 04
  'purchase', // 05
  'udhar_collection', // 06
  'party_payment', // 07
  'withdrawal', // 08
] as const;
export type Section = (typeof SECTIONS)[number];

/**
 * The four EVENT sections - a return and what settled it (review §6-§7, EX-2).
 * Valid on `entries`, never on `section_skips`: they are not closing sections and
 * gate nothing (EX-7). Every one carries `refers_to_entry_id` (EX-3).
 */
export const EVENT_SECTIONS = ['sales_return', 'exchange_out', 'exchange_receipt', 'refund_paid'] as const;
export type EventSection = (typeof EVENT_SECTIONS)[number];
export const ENTRY_SECTIONS = [...SECTIONS, ...EVENT_SECTIONS] as const;
export type EntrySection = Section | EventSection;

/** Section 00 (opening) and 09 (cash check) live on `days`, not `entries`. */
export const MODES = ['cash', 'upi', 'other', 'udhar', 'shop_stock'] as const;
export type Mode = (typeof MODES)[number];

/**
 * Mode validity is per-section (SPEC-DIGEST C-7, from the paper sheet).
 * Shop stock is meaningless for a purchase and for a collection; the sheet says so.
 */
export const SECTION_MODES: Record<EntrySection, readonly Mode[]> = {
  cash_sales: ['cash'],
  upi_sales: ['upi'],
  udhar_sales: ['udhar'],
  expense: ['cash', 'upi', 'other', 'udhar', 'shop_stock'], // five — sheet §4
  purchase: ['cash', 'upi', 'other', 'udhar'], // four — sheet §5, no shop stock
  udhar_collection: ['cash', 'upi', 'other'], // three — sheet §6
  party_payment: ['cash', 'upi', 'other'], // three — sheet §7
  withdrawal: ['cash', 'upi'], // two — sheet §8
  // Goods legs move no money, so they are `other` and D2 keeps them out of the drawer.
  sales_return: ['other'],
  exchange_out: ['other'],
  // Money legs: cash moves P1-P3, UPI does not, udhar moves the customer's P7.
  exchange_receipt: ['cash', 'upi', 'udhar'],
  refund_paid: ['cash', 'upi', 'udhar'],
};

export const PARTY_KINDS = ['customer', 'supplier'] as const;
export type PartyKind = (typeof PARTY_KINDS)[number];

/** `source` exists so a future UPI import stays reversible without a migration (D1). */
export const SOURCES = ['manual', 'imported'] as const;
export type Source = (typeof SOURCES)[number];

/**
 * DPDP §1.2 — the purposes a shopkeeper can agree to, separately.
 *
 * SEPARATE PURPOSES ARE THE REQUIREMENT, not a nicety. Consent has to be
 * specific, so "use the app" cannot be one switch covering the ledger, the SMS
 * and the crash reports. Only the first is required for the account to exist;
 * the other two are refusable without losing anything.
 */
export const CONSENT_PURPOSES = [
  'account_and_ledger',
  'sms_reminders',
  'crash_diagnostics',
] as const;
export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

/**
 * DECISION 2 - THE FIXED LIST OF ADJUSTMENTS. Mirrors the engine's
 * `ADJUSTMENT_TYPES`; a test holds the two in lockstep. What each one moves is
 * reasoned in packages/formula-engine/src/adjustments.ts.
 */
export const ADJUSTMENT_TYPES = [
  'counterfeit_note',
  'rounding_given',
  'rounding_kept',
  'home_use',
  'stock_written_off',
] as const;
export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

/**
 * The day facts that are their own rows, append-only like entries (D1) and
 * refused into a closed day like entries (D7). `item_lines` (PR-1, Premium) is
 * one: a line of a sale is a fact of that sale's day.
 */
export const DAY_FACT_TABLES = ['upi_confirmations', 'adjustments', 'item_lines'] as const;

/** The sections an item line may hang off - the engine's ITEM_SALE_SECTIONS. */
export const ITEM_SALE_SECTIONS = ['cash_sales', 'upi_sales', 'udhar_sales'] as const;

/**
 * R5 FR-6: party facts. Append-only like the day facts (D1) - a limit changed or
 * cleared is a new row - but they belong to a party, not a day, so no closed-day
 * guard applies to them.
 */
export const PARTY_FACT_TABLES = ['party_credit_limits'] as const;

/** The three languages, as the shops table already spells them. */
export const LANGUAGES = ['od', 'hi', 'en'] as const;

/* ------------------------------------------------------------------ *
 * Dialect primitives
 * ------------------------------------------------------------------ */

const t = {
  uuid: (d: Dialect) => (d === 'sqlite' ? 'TEXT' : 'UUID'),
  text: () => 'TEXT',
  /** Money. ALWAYS an integer number of paise (ADR-003). Never REAL, never NUMERIC. */
  paise: (d: Dialect) => (d === 'sqlite' ? 'INTEGER' : 'BIGINT'),
  smallint: (d: Dialect) => (d === 'sqlite' ? 'INTEGER' : 'SMALLINT'),
  /** ISO-8601 UTC string on SQLite; real timestamptz on Postgres. */
  timestamp: (d: Dialect) => (d === 'sqlite' ? 'TEXT' : 'TIMESTAMPTZ'),
  /** A calendar date, 'YYYY-MM-DD'. Client-assigned; never rewritten (ADR-004). */
  date: (d: Dialect) => (d === 'sqlite' ? 'TEXT' : 'DATE'),
  /** SQLite has no boolean; 0 and 1 in an INTEGER is how it has always spelled one. */
  bool: (d: Dialect) => (d === 'sqlite' ? 'INTEGER' : 'BOOLEAN'),
};

const inList = (col: string, values: readonly string[]) =>
  `${col} IN (${values.map((v) => `'${v}'`).join(', ')})`;

/**
 * An amount must be a whole number of paise, and never negative. Sign is carried by
 * the section, not by the amount — a purchase is not a negative sale.
 */
const wholePaise = (d: Dialect, col: string) =>
  d === 'sqlite'
    ? `(typeof(${col}) = 'integer' AND ${col} >= 0)`
    : `(${col} >= 0)`; // BIGINT is integral by type on Postgres

/**
 * Decision 1: a business day's start, 'HH:MM' 24-hour. '00:00' is the calendar
 * day, which is what every day recorded before the setting existed is (cutover).
 */
const hhmm = (d: Dialect, col: string) =>
  d === 'sqlite'
    ? `(${col} GLOB '[0-2][0-9]:[0-5][0-9]' AND substr(${col}, 1, 2) <= '23')`
    : `(${col} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')`;

/* ------------------------------------------------------------------ *
 * D1-D5 plus the one store the architecture implies but does not name
 * ------------------------------------------------------------------ */

export function tablesDDL(d: Dialect): string[] {
  const uuid = t.uuid(d);
  const ts = t.timestamp(d);
  const date = t.date(d);
  const paise = t.paise(d);

  /** Per-section mode CHECK — encodes SECTION_MODES as SQL so a bad pair cannot land. */
  const sectionModeCheck = ENTRY_SECTIONS.map(
    (s) => `(section = '${s}' AND ${inList('mode', SECTION_MODES[s])})`,
  ).join('\n      OR ');

  return [
    // ---- Shops -------------------------------------------------------
    `CREATE TABLE shops (
  id                     ${uuid} PRIMARY KEY,
  name                   ${t.text()} NOT NULL,
  type                   ${t.text()} NOT NULL,
  address                ${t.text()},
  gstin                  ${t.text()},
  language               ${t.text()} NOT NULL DEFAULT 'en',
  created_at             ${ts} NOT NULL,
  deletion_requested_at  ${ts},
  deleted_at             ${ts},
  CONSTRAINT shops_language_ck CHECK (${inList('language', ['od', 'hi', 'en'])})
)`,

    // ---- Users -------------------------------------------------------
    // Phone + OTP only. No password, no email anywhere (G15).
    `CREATE TABLE users (
  id               ${uuid} PRIMARY KEY,
  shop_id          ${uuid} NOT NULL REFERENCES shops(id),
  phone            ${t.text()} NOT NULL UNIQUE,
  name             ${t.text()},
  created_at       ${ts} NOT NULL,
  consent_version  ${t.text()},
  consent_at       ${ts},
  consent_locale   ${t.text()},
  CONSTRAINT users_phone_ck CHECK (length(phone) BETWEEN 8 AND 16)
)`,

    // ---- Devices -----------------------------------------------------
    // D5 Session lives in the device KEYSTORE, not here (architecture §06).
    // This table holds only the binding, never a token.
    `CREATE TABLE devices (
  id            ${uuid} PRIMARY KEY,
  user_id       ${uuid} NOT NULL REFERENCES users(id),
  shop_id       ${uuid} NOT NULL REFERENCES shops(id),
  platform      ${t.text()} NOT NULL,
  created_at    ${ts} NOT NULL,
  last_seen_at  ${ts},
  revoked_at    ${ts}
)`,

    // ---- D3 Parties --------------------------------------------------
    // Customers and suppliers in ONE table with a kind flag (architecture §06).
    // Balances are NEVER stored — they derive from D1.
    `CREATE TABLE parties (
  id                ${uuid} PRIMARY KEY,
  shop_id           ${uuid} NOT NULL REFERENCES shops(id),
  kind              ${t.text()} NOT NULL,
  name              ${t.text()} NOT NULL,
  phone             ${t.text()},
  default_due_days  ${t.smallint(d)},
  created_at        ${ts} NOT NULL,
  CONSTRAINT parties_kind_ck CHECK (${inList('kind', PARTY_KINDS)}),
  CONSTRAINT parties_due_ck  CHECK (default_due_days IS NULL OR default_due_days BETWEEN 0 AND 365)
)`,

    // ---- D2 Days -----------------------------------------------------
    // One row per shop per date. Immutable once closed. NO TOTALS STORED —
    // only the two figures a human supplied and the reason.
    `CREATE TABLE days (
  shop_id            ${uuid} NOT NULL REFERENCES shops(id),
  date               ${date} NOT NULL,
  state              ${t.text()} NOT NULL DEFAULT 'not_started',
  opening_cash       ${paise},
  counted_cash       ${paise},
  difference_reason  ${t.text()},
  closed_at          ${ts},
  created_at         ${ts} NOT NULL,
  starts_at          ${t.text()} NOT NULL DEFAULT '00:00',
  PRIMARY KEY (shop_id, date),
  CONSTRAINT days_state_ck   CHECK (${inList('state', DAY_STATES)}),
  CONSTRAINT days_opening_ck CHECK (opening_cash IS NULL OR ${wholePaise(d, 'opening_cash')}),
  CONSTRAINT days_counted_ck CHECK (counted_cash IS NULL OR ${wholePaise(d, 'counted_cash')}),
  CONSTRAINT days_closed_ck  CHECK (
    state <> 'closed' OR (counted_cash IS NOT NULL AND closed_at IS NOT NULL)
  ),
  CONSTRAINT days_starts_at_ck CHECK (${hhmm(d, 'starts_at')})
)`,

    // ---- D1 Entries --------------------------------------------------
    // APPEND-ONLY, FOREVER. id is CLIENT-generated so the server upsert is idempotent
    // and a retried outbox can never duplicate a sale (architecture §06, §07.02).
    `CREATE TABLE entries (
  id              ${uuid} PRIMARY KEY,
  shop_id         ${uuid} NOT NULL REFERENCES shops(id),
  day_id          ${date} NOT NULL,
  section         ${t.text()} NOT NULL,
  amount          ${paise} NOT NULL,
  mode            ${t.text()} NOT NULL,
  party_id        ${uuid} REFERENCES parties(id),
  due_date        ${date},
  label           ${t.text()},
  corrects_day_id ${date},
  refers_to_entry_id ${uuid},
  created_at      ${ts} NOT NULL,
  source          ${t.text()} NOT NULL DEFAULT 'manual',
  device_id       ${uuid},
  CONSTRAINT entries_section_ck CHECK (${inList('section', ENTRY_SECTIONS)}),
  CONSTRAINT entries_source_ck  CHECK (${inList('source', SOURCES)}),
  CONSTRAINT entries_amount_ck  CHECK (${wholePaise(d, 'amount')}),
  CONSTRAINT entries_mode_ck CHECK (
      ${sectionModeCheck}
  ),
  CONSTRAINT entries_due_ck CHECK (
    due_date IS NULL OR (section = 'purchase' AND mode = 'udhar')
  ),
  CONSTRAINT entries_party_ck CHECK (
    (section IN ('udhar_sales', 'udhar_collection', 'party_payment') AND party_id IS NOT NULL)
    OR (section = 'purchase')
    OR (section IN ('cash_sales', 'upi_sales', 'expense', 'withdrawal') AND party_id IS NULL)
    OR (section IN ('sales_return', 'exchange_out'))
    OR (section IN ('exchange_receipt', 'refund_paid') AND (mode <> 'udhar' OR party_id IS NOT NULL))
  ),
  -- EX-3: an event leg always points at its row; a closing-section row only as a correction.
  CONSTRAINT entries_refers_ck CHECK (
    (${inList('section', EVENT_SECTIONS)} AND refers_to_entry_id IS NOT NULL)
    OR (${inList('section', SECTIONS)} AND (refers_to_entry_id IS NULL OR corrects_day_id IS NOT NULL))
  ),
  CONSTRAINT entries_shop_id_uq UNIQUE (shop_id, id),
  -- Same shop, by construction: a link can never reach another shop's ledger (S-11).
  CONSTRAINT entries_refers_fk FOREIGN KEY (shop_id, refers_to_entry_id) REFERENCES entries(shop_id, id),
  FOREIGN KEY (shop_id, day_id) REFERENCES days(shop_id, date)
)`,

    // ---- Section skips -----------------------------------------------
    // D8: "skipped" and "empty" are DIFFERENT WORDS. A day with genuinely zero
    // expenses and a day where expenses were forgotten produce the identical
    // reconciliation number and mean completely different things.
    //
    // This is the one store the architecture document does not name but D8 requires:
    // a skip has no entry to record it, so it needs somewhere to live.

    /*
     * DPDP §1.2 — CONSENT, AND EVERY CHANGE OF IT.
     *
     * APPEND-ONLY, AND THAT IS THE ENTIRE DESIGN. A withdrawal is a NEW ROW, not
     * an update of the grant. A consents table that can be overwritten cannot
     * answer "what did he agree to, in which language, on which day" - which is
     * the only question a consent record exists to answer, and the one an auditor
     * will ask. Updating in place would leave a fiduciary able to say only what
     * the current state is, which is not what the Act asks for.
     *
     * The notice VERSION is stored on every row so that changing the notice and
     * re-asking is something the data can express, rather than something that has
     * to be reconstructed from deployment dates.
     */
    `CREATE TABLE consents (
  id             ${uuid} PRIMARY KEY,
  user_id        ${uuid} NOT NULL REFERENCES users(id),
  purpose        ${t.text()} NOT NULL,
  granted        ${t.bool(d)} NOT NULL,
  notice_version ${t.text()} NOT NULL,
  locale         ${t.text()} NOT NULL,
  at             ${ts} NOT NULL,
  CONSTRAINT consents_purpose_ck CHECK (${inList('purpose', CONSENT_PURPOSES)}),
  CONSTRAINT consents_locale_ck  CHECK (${inList('locale', LANGUAGES)})
)`,
    //
    // Deliberately NOT append-only. A skip is a UI state, not a financial fact, and
    // both E3 (an entry un-skips a section) and E6 (deleting the last line returns a
    // section to untouched, not skipped) require it to be reversible.
    `CREATE TABLE section_skips (
  shop_id     ${uuid} NOT NULL REFERENCES shops(id),
  day_id      ${date} NOT NULL,
  section     ${t.text()} NOT NULL,
  skipped_at  ${ts} NOT NULL,
  PRIMARY KEY (shop_id, day_id, section),
  CONSTRAINT skips_section_ck CHECK (${inList('section', SECTIONS)}),
  FOREIGN KEY (shop_id, day_id) REFERENCES days(shop_id, date)
)`,

    // ---- Decision 3: UPI receipts the shopkeeper confirmed ------------
    // "Actual UPI" is the sum of the receipts he CONFIRMS, never a bank balance.
    // A confirmation is its own row and never an UPDATE of the entry (D1). One
    // per receipt: the bulk "all received" tap writes one row per receipt with a
    // shared batch_id, so a receipt typed after it is never covered by it.
    // No amount column - the amount is the entry's, so it cannot disagree with it.
    `CREATE TABLE upi_confirmations (
  id            ${uuid} PRIMARY KEY,
  shop_id       ${uuid} NOT NULL REFERENCES shops(id),
  day_id        ${date} NOT NULL,
  entry_id      ${uuid} NOT NULL REFERENCES entries(id),
  batch_id      ${uuid},
  confirmed_at  ${ts} NOT NULL,
  CONSTRAINT upi_confirmations_once UNIQUE (shop_id, entry_id),
  FOREIGN KEY (shop_id, day_id) REFERENCES days(shop_id, date)
)`,

    // ---- Decision 2: typed adjustments --------------------------------
    // SEC-05: NOT an entries row. A type from a fixed list and an amount; no
    // section, no mode, no party, and NO free-text column at all - a free-form
    // adjustment can absorb any discrepancy.
    `CREATE TABLE adjustments (
  id          ${uuid} PRIMARY KEY,
  shop_id     ${uuid} NOT NULL REFERENCES shops(id),
  day_id      ${date} NOT NULL,
  type        ${t.text()} NOT NULL,
  amount      ${paise} NOT NULL,
  created_at  ${ts} NOT NULL,
  device_id   ${uuid},
  CONSTRAINT adjustments_type_ck   CHECK (${inList('type', ADJUSTMENT_TYPES)}),
  CONSTRAINT adjustments_amount_ck CHECK (${wholePaise(d, 'amount')} AND amount > 0),
  FOREIGN KEY (shop_id, day_id) REFERENCES days(shop_id, date)
)`,

    // ---- PR-1 (Premium): the shop's own item list -------------------
    // NAMES ONLY. No price column, ever: a stored default price is a figure
    // offered while he types, which is inference (CLAUDE.md). No stock column
    // either (R5 decision 3). Append-only: a list he adds to.
    `CREATE TABLE items (
  id          ${uuid} PRIMARY KEY,
  shop_id     ${uuid} NOT NULL REFERENCES shops(id),
  name        ${t.text()} NOT NULL,
  created_at  ${ts} NOT NULL,
  CONSTRAINT items_name_ck CHECK (length(name) BETWEEN 1 AND 60),
  CONSTRAINT items_shop_id_uq UNIQUE (shop_id, id)
)`,

    // ---- PR-1 (Premium): item lines of a sale -----------------------
    // Its own row pointing at the sale (D1) - never a column on the entry. A
    // NULL item_id is "Other". Quantity and amount are typed, never suggested.
    // The lines of a sale may come to LESS than the sale, never more: the
    // trigger item_lines_fit_sale holds that on both engines.
    `CREATE TABLE item_lines (
  id          ${uuid} PRIMARY KEY,
  shop_id     ${uuid} NOT NULL REFERENCES shops(id),
  day_id      ${date} NOT NULL,
  entry_id    ${uuid} NOT NULL,
  item_id     ${uuid},
  quantity    INTEGER NOT NULL,
  amount      ${paise} NOT NULL,
  created_at  ${ts} NOT NULL,
  device_id   ${uuid},
  CONSTRAINT item_lines_quantity_ck CHECK (${d === 'sqlite' ? "typeof(quantity) = 'integer' AND " : ''}quantity BETWEEN 1 AND 99999),
  CONSTRAINT item_lines_amount_ck CHECK (${wholePaise(d, 'amount')} AND amount > 0),
  -- Same shop, by construction (S-11): a line can never reach another shop's sale or list.
  FOREIGN KEY (shop_id, entry_id) REFERENCES entries(shop_id, id),
  FOREIGN KEY (shop_id, item_id) REFERENCES items(shop_id, id),
  FOREIGN KEY (shop_id, day_id) REFERENCES days(shop_id, date)
)`,

    // ---- R5 FR-6: a credit limit the shopkeeper set on a customer ------
    // A stated fact, not a total: the newest row for a party is the one in
    // force, and NULL is "no limit" (he cleared it). It never blocks a sale and
    // never moves a figure - the app only observes against it.
    `CREATE TABLE party_credit_limits (
  id           ${uuid} PRIMARY KEY,
  shop_id      ${uuid} NOT NULL REFERENCES shops(id),
  party_id     ${uuid} NOT NULL REFERENCES parties(id),
  limit_paise  ${paise},
  set_at       ${ts} NOT NULL,
  CONSTRAINT party_credit_limits_ck CHECK (limit_paise IS NULL OR (${wholePaise(d, 'limit_paise')} AND limit_paise > 0))
)`,
  ];
}

/**
 * D4 Outbox — LOCAL ONLY, NEVER SYNCED (architecture §06).
 * Exists on the device and must NOT exist on the server.
 */
export function outboxDDL(d: Dialect): string[] {
  if (d !== 'sqlite') return [];
  return [
    `CREATE TABLE outbox (
  entry_id    TEXT PRIMARY KEY REFERENCES entries(id),
  attempts    INTEGER NOT NULL DEFAULT 0,
  last_error  TEXT,
  queued_at   TEXT NOT NULL
)`,
  ];
}

/**
 * RATE LIMITING — SERVER ONLY, the mirror image of the outbox (injection 08 B.2).
 *
 * "An in-memory rate limiter is the default an agent reaches for and it is worthless
 * here: it resets on deploy, and it counts per-process. The OTP limits are now the
 * only thing standing between an attacker and your SMS bill, so they are
 * security-critical state."
 *
 * A SLIDING WINDOW, not a fixed one. A fixed window resets on a boundary and lets
 * through 2x the limit across it - for the per-number-per-DAY cap, the one protecting
 * the bill, that is double the money at every midnight. One row per attempt and a
 * count over the trailing window is exact, and at OTP volumes (single digits per
 * number per day) the row count is trivial.
 *
 * NO PERSONAL DATA. `bucket` is an HMAC of the identifier under a server secret, never
 * the phone number itself. Rate limiting is pre-authentication, so this table would
 * otherwise become a list of every phone number that ever tried to sign in - a DPDP
 * liability sitting in the one table designed to be written by unauthenticated
 * callers. The limiter only ever needs equality, so a keyed hash loses it nothing.
 *
 * NOT tenant-scoped, and deliberately outside the RLS set: it is written before any
 * shop is known.
 */
export function rateLimitDDL(d: Dialect): string[] {
  if (d !== 'postgres') return [];
  return [
    `CREATE TABLE rate_events (
  id      BIGSERIAL PRIMARY KEY,
  bucket  TEXT NOT NULL,
  at      TIMESTAMPTZ NOT NULL
)`,
  ];
}

/**
 * Google's `subscriptionState`, as `purchases.subscriptionsv2.get` spells it.
 * Stored as Google said it; what it MEANS for the plan is decided on read
 * (apps/api/src/billing/entitlement.ts), never here.
 */
export const SUBSCRIPTION_STATES = [
  'SUBSCRIPTION_STATE_UNSPECIFIED',
  'SUBSCRIPTION_STATE_PENDING',
  'SUBSCRIPTION_STATE_ACTIVE',
  'SUBSCRIPTION_STATE_PAUSED',
  'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
  'SUBSCRIPTION_STATE_ON_HOLD',
  'SUBSCRIPTION_STATE_CANCELED',
  'SUBSCRIPTION_STATE_EXPIRED',
  'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED',
] as const;
export type SubscriptionState = (typeof SUBSCRIPTION_STATES)[number];

/** The three billing tables, append-only like the ledger (D1). */
export const BILLING_TABLES = ['plan_purchases', 'plan_purchase_states', 'plan_previews'] as const;

/**
 * PR-7 · THE PLAN, AS FACTS. SERVER ONLY, like `rate_events`: the phone holds no
 * entitlement decision and no Google credential (R4 §2).
 *
 * NO PLAN COLUMN, NO PREMIUM FLAG, NO "ENTITLED UNTIL". Whether a shop is on
 * Premium is derived on read from what Google last said about each purchase and
 * from the preview grant - "no stored totals" applied to the plan. A cached
 * `is_premium` would be a second source of truth, and the first time it
 * disagreed with Google a shopkeeper would be charged for something he cannot
 * use, or the reverse.
 *
 *   plan_purchases        a purchase token BOUND to a shop, once, for ever. The
 *                         token is the primary key, so one token can never be
 *                         bound to a second shop - the cross-shop reuse guard is
 *                         the key itself, not a check somebody can forget.
 *   plan_purchase_states  every answer `subscriptionsv2.get` gave for a token,
 *                         appended, never rewritten. The latest one counts.
 *   plan_previews         the 14-day Premium preview: one per shop, ever (the
 *                         shop is the primary key). No payment details, nothing
 *                         converts - it simply ends.
 *
 * NOT UNDER ROW-LEVEL SECURITY, deliberately, as `rate_events` is not. The RTDN
 * webhook (Google's Pub/Sub push) arrives with no shop session; it finds the
 * shop FROM the token. Every authenticated route reads these by `shopOf()`.
 */
export function billingDDL(d: Dialect): string[] {
  if (d !== 'postgres') return [];
  return [
    `CREATE TABLE plan_purchases (
  purchase_token  TEXT PRIMARY KEY,
  shop_id         UUID NOT NULL REFERENCES shops(id),
  account_id      TEXT NOT NULL,
  product_id      TEXT NOT NULL,
  bound_at        TIMESTAMPTZ NOT NULL,
  CONSTRAINT plan_purchases_token_ck CHECK (length(purchase_token) BETWEEN 1 AND 512)
)`,
    `CREATE TABLE plan_purchase_states (
  id              BIGSERIAL PRIMARY KEY,
  purchase_token  TEXT NOT NULL REFERENCES plan_purchases(purchase_token),
  google_state    TEXT NOT NULL,
  expires_at      TIMESTAMPTZ,
  auto_renewing   BOOLEAN NOT NULL,
  base_plan_id    TEXT,
  acknowledged    BOOLEAN NOT NULL,
  snapshot        TEXT NOT NULL,
  fetched_at      TIMESTAMPTZ NOT NULL,
  CONSTRAINT plan_purchase_states_state_ck CHECK (${inList('google_state', SUBSCRIPTION_STATES)})
)`,
    `CREATE TABLE plan_previews (
  shop_id     UUID PRIMARY KEY REFERENCES shops(id),
  started_at  TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ NOT NULL,
  CONSTRAINT plan_previews_span_ck CHECK (ends_at > started_at)
)`,
  ];
}

export function indexesDDL(_d: Dialect): string[] {
  return [
    // The hot path: every derived figure reads one day's entries (derive-on-read).
    `CREATE INDEX entries_day_idx ON entries (shop_id, day_id)`,
    // Party ledgers (P7/P8) and the aging badges.
    `CREATE INDEX entries_party_idx ON entries (shop_id, party_id)`,
    // OP4/OP6 scan forward for supplier dues inside a horizon.
    `CREATE INDEX entries_due_idx ON entries (shop_id, due_date)`,
    // D7 corrections render on BOTH the open day and the closed day they reference.
    `CREATE INDEX entries_corrects_idx ON entries (shop_id, corrects_day_id)`,
    // A return's settlement legs, and a sale's returns, are read by this link.
    `CREATE INDEX entries_refers_idx ON entries (shop_id, refers_to_entry_id)`,
    // BI windows walk closed days in date order.
    `CREATE INDEX days_state_idx ON days (shop_id, state, date)`,
    `CREATE INDEX parties_kind_idx ON parties (shop_id, kind)`,
    // Both day facts are read a day at a time, exactly like entries.
    `CREATE INDEX upi_confirmations_day_idx ON upi_confirmations (shop_id, day_id)`,
    `CREATE INDEX adjustments_day_idx ON adjustments (shop_id, day_id)`,
    `CREATE INDEX item_lines_day_idx ON item_lines (shop_id, day_id)`,
    // A sale's own lines, which the over-the-sale trigger sums on every insert.
    `CREATE INDEX item_lines_entry_idx ON item_lines (shop_id, entry_id)`,
    // The limit in force is read per party.
    `CREATE INDEX party_credit_limits_party_idx ON party_credit_limits (shop_id, party_id)`,
    // Every rate-limit decision is "count rows in this bucket since T", and every
    // prune is "delete rows before T". One composite index serves both.
    ...(_d === 'postgres' ? [`CREATE INDEX rate_events_bucket_idx ON rate_events (bucket, at)`] : []),
    // The entitlement read: a shop's tokens, then each token's latest answer.
    ...(_d === 'postgres'
      ? [
          `CREATE INDEX plan_purchases_shop_idx ON plan_purchases (shop_id)`,
          `CREATE INDEX plan_purchase_states_token_idx ON plan_purchase_states (purchase_token, fetched_at)`,
        ]
      : []),
  ];
}

/**
 * APPEND-ONLY ENFORCEMENT — at the DATABASE level, not only in code (G4).
 *
 * "No UPDATE and no DELETE on D1. Corrections are new rows that reference old days."
 *   — architecture §07.04
 *
 * Both engines get a trigger. Postgres ALSO gets REVOKE, because §07.04 says *forever*
 * and a trigger alone is not the same guarantee as a missing grant (ADR-006).
 */
export function appendOnlyDDL(d: Dialect): string[] {
  if (d === 'sqlite') {
    return [
      `CREATE TRIGGER entries_no_update
BEFORE UPDATE ON entries
BEGIN
  SELECT RAISE(ABORT, 'entries is append-only: post a correction entry, never UPDATE (architecture 07.04)');
END`,
      `CREATE TRIGGER entries_no_delete
BEFORE DELETE ON entries
BEGIN
  SELECT RAISE(ABORT, 'entries is append-only: post a correction entry, never DELETE (architecture 07.04)');
END`,
      // A closed day is frozen forever (D7).
      `CREATE TRIGGER days_no_update_when_closed
BEFORE UPDATE ON days
WHEN OLD.state = 'closed'
BEGIN
  SELECT RAISE(ABORT, 'a closed day is immutable: post a correction on the open day (decision D7)');
END`,
      // Decision 1: a day keeps the boundary it was created under. A later shop
      // setting never re-buckets a day that exists, open or closed.
      `CREATE TRIGGER days_starts_at_fixed
BEFORE UPDATE OF starts_at ON days
WHEN NEW.starts_at IS NOT OLD.starts_at
BEGIN
  SELECT RAISE(ABORT, 'a day keeps the start time it was created under (decision 1)');
END`,
      // CP-4 / AD-014: an entry may never LAND IN a closed day, however it arrives.
      //
      // The scenario that makes this necessary: the lost-phone branch of the number
      // change puts two devices on one shop. The old handset keeps a session that by
      // design never expires and an outbox that may hold days of unsynced entries.
      // Weeks later a repair shop powers it on and it syncs into days that have since
      // been closed. Without this, a closed day's figures could move - a correctness
      // defect at priority 1.
      //
      // A CORRECTION is still allowed, because its own day_id is today (open); only
      // `corrects_day_id` points at the closed day. That is the whole of D7.
      `CREATE TRIGGER entries_no_insert_into_closed_day
BEFORE INSERT ON entries
WHEN (SELECT state FROM days WHERE shop_id = NEW.shop_id AND date = NEW.day_id) = 'closed'
BEGIN
  SELECT RAISE(ABORT, 'that day is closed: post a correction on the open day, never an entry into a closed one (decision D7, CP-4)');
END`,
      // Decisions 2 and 3: the day facts get the entries' two guarantees.
      ...DAY_FACT_TABLES.flatMap((tbl) => [
        `CREATE TRIGGER ${tbl}_no_update
BEFORE UPDATE ON ${tbl}
BEGIN
  SELECT RAISE(ABORT, '${tbl} is append-only: add another, never UPDATE (D1)');
END`,
        `CREATE TRIGGER ${tbl}_no_delete
BEFORE DELETE ON ${tbl}
BEGIN
  SELECT RAISE(ABORT, '${tbl} is append-only: add another, never DELETE (D1)');
END`,
        `CREATE TRIGGER ${tbl}_no_insert_into_closed_day
BEFORE INSERT ON ${tbl}
WHEN (SELECT state FROM days WHERE shop_id = NEW.shop_id AND date = NEW.day_id) = 'closed'
BEGIN
  SELECT RAISE(ABORT, 'that day is closed: a closed day is frozen (decision D7)');
END`,
      ]),
      // PR-1: the item list is append-only too.
      `CREATE TRIGGER items_no_update
BEFORE UPDATE ON items
BEGIN
  SELECT RAISE(ABORT, 'items is append-only: add another, never UPDATE (D1)');
END`,
      `CREATE TRIGGER items_no_delete
BEFORE DELETE ON items
BEGIN
  SELECT RAISE(ABORT, 'items is append-only: add another, never DELETE (D1)');
END`,
      // PR-1: a line hangs off a SALE of its own day, and a sale's lines never
      // come to more than the sale.
      `CREATE TRIGGER item_lines_fit_sale
BEFORE INSERT ON item_lines
WHEN NOT EXISTS (
    SELECT 1 FROM entries e
    WHERE e.shop_id = NEW.shop_id AND e.id = NEW.entry_id AND e.day_id = NEW.day_id
      AND ${inList('e.section', ITEM_SALE_SECTIONS)}
  )
  OR (SELECT COALESCE(SUM(l.amount), 0) FROM item_lines l
      WHERE l.shop_id = NEW.shop_id AND l.entry_id = NEW.entry_id) + NEW.amount
     > (SELECT e.amount FROM entries e WHERE e.shop_id = NEW.shop_id AND e.id = NEW.entry_id)
BEGIN
  SELECT RAISE(ABORT, 'an item line belongs to a sale of its own day, and the lines never come to more than the sale (PR-1)');
END`,
      // R5 FR-6: party facts are append-only too. No day, so no D7 guard.
      ...PARTY_FACT_TABLES.flatMap((tbl) => [
        `CREATE TRIGGER ${tbl}_no_update
BEFORE UPDATE ON ${tbl}
BEGIN
  SELECT RAISE(ABORT, '${tbl} is append-only: add another, never UPDATE (D1)');
END`,
        `CREATE TRIGGER ${tbl}_no_delete
BEFORE DELETE ON ${tbl}
BEGIN
  SELECT RAISE(ABORT, '${tbl} is append-only: add another, never DELETE (D1)');
END`,
      ]),
    ];
  }
  return [
    /*
     * APPEND-ONLY, WITH EXACTLY ONE WAY THROUGH IT: ERASURE.
     *
     * D1 says entries are never updated and never deleted, and that has to stay
     * true - a correction is a new row, for ever. But DPDP §1.6 gives a person
     * the right to have their data erased, and a right that the schema makes
     * impossible is not a right. The two are not in conflict: one governs how a
     * shopkeeper edits his book, the other governs whether the book may go on
     * existing at all.
     *
     * So the trigger permits a DELETE only while `swafto.erasure` is set on the
     * CURRENT TRANSACTION. `SET LOCAL` means it cannot leak past a COMMIT, it
     * cannot be left on, and it cannot be set by a query that only READS. An
     * ordinary delete - the accident this trigger exists to stop - has no such
     * flag and still fails.
     *
     * Found by the repository equivalence run, which tried to erase a shop
     * against a real database and could not: the DPDP endpoint would have
     * returned a 500 in production while passing every test in memory.
     */
    `CREATE OR REPLACE FUNCTION entries_append_only() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('swafto.erasure', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'entries is append-only: post a correction entry, never % (architecture 07.04)', TG_OP;
END;
$$ LANGUAGE plpgsql`,
    `CREATE TRIGGER entries_no_update_or_delete
BEFORE UPDATE OR DELETE ON entries
FOR EACH ROW EXECUTE FUNCTION entries_append_only()`,
    `CREATE OR REPLACE FUNCTION days_closed_immutable() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.state = 'closed' THEN
    RAISE EXCEPTION 'a closed day is immutable: post a correction on the open day (decision D7)';
  END IF;
  -- Decision 1: a day keeps the boundary it was created under.
  IF NEW.starts_at IS DISTINCT FROM OLD.starts_at THEN
    RAISE EXCEPTION 'a day keeps the start time it was created under (decision 1)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql`,
    `CREATE TRIGGER days_no_update_when_closed
BEFORE UPDATE ON days
FOR EACH ROW EXECUTE FUNCTION days_closed_immutable()`,
    // CP-4 / AD-014 - see the SQLite branch above for why this exists.
    `CREATE OR REPLACE FUNCTION entries_reject_closed_day() RETURNS TRIGGER AS $$
DECLARE day_state TEXT;
BEGIN
  SELECT state INTO day_state FROM days
    WHERE shop_id = NEW.shop_id AND date = NEW.day_id;
  IF day_state = 'closed' THEN
    RAISE EXCEPTION 'that day is closed: post a correction on the open day, never an entry into a closed one (decision D7, CP-4)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql`,
    `CREATE TRIGGER entries_no_insert_into_closed_day
BEFORE INSERT ON entries
FOR EACH ROW EXECUTE FUNCTION entries_reject_closed_day()`,
    /*
     * DECISIONS 2 AND 3: the day facts, held to the entries' rules. Append-only
     * with the same single way through (DPDP erasure, SET LOCAL), and never
     * written into a closed day.
     */
    `CREATE OR REPLACE FUNCTION day_facts_append_only() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('swafto.erasure', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION '% is append-only: add another, never % (D1)', TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql`,
    `CREATE OR REPLACE FUNCTION day_facts_reject_closed_day() RETURNS TRIGGER AS $$
DECLARE day_state TEXT;
BEGIN
  SELECT state INTO day_state FROM days
    WHERE shop_id = NEW.shop_id AND date = NEW.day_id;
  IF day_state = 'closed' THEN
    RAISE EXCEPTION 'that day is closed: a closed day is frozen (decision D7)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql`,
    ...DAY_FACT_TABLES.flatMap((tbl) => [
      `CREATE TRIGGER ${tbl}_no_update_or_delete
BEFORE UPDATE OR DELETE ON ${tbl}
FOR EACH ROW EXECUTE FUNCTION day_facts_append_only()`,
      `CREATE TRIGGER ${tbl}_no_insert_into_closed_day
BEFORE INSERT ON ${tbl}
FOR EACH ROW EXECUTE FUNCTION day_facts_reject_closed_day()`,
    ]),
    /*
     * PR-7: the billing facts get the same append-only function. It names the
     * table it refuses, so nothing in it is specific to the day facts.
     */
    ...BILLING_TABLES.map(
      (tbl) => `CREATE TRIGGER ${tbl}_no_update_or_delete
BEFORE UPDATE OR DELETE ON ${tbl}
FOR EACH ROW EXECUTE FUNCTION day_facts_append_only()`,
    ),
    // R5 FR-6: the same append-only function, with erasure its one way through.
    ...PARTY_FACT_TABLES.map(
      (tbl) => `CREATE TRIGGER ${tbl}_no_update_or_delete
BEFORE UPDATE OR DELETE ON ${tbl}
FOR EACH ROW EXECUTE FUNCTION day_facts_append_only()`,
    ),
    // PR-1: the item list, append-only by the same function (it names its table).
    `CREATE TRIGGER items_no_update_or_delete
BEFORE UPDATE OR DELETE ON items
FOR EACH ROW EXECUTE FUNCTION day_facts_append_only()`,
    /*
     * PR-1: a line hangs off a SALE of its own day, and a sale's lines never come
     * to more than the sale. The sale row is locked while its lines are summed,
     * so two concurrent pushes cannot each fit and together overrun it.
     */
    `CREATE OR REPLACE FUNCTION item_lines_fit_sale() RETURNS TRIGGER AS $$
DECLARE sale_amount BIGINT; already BIGINT;
BEGIN
  SELECT amount INTO sale_amount FROM entries
    WHERE shop_id = NEW.shop_id AND id = NEW.entry_id AND day_id = NEW.day_id
      AND ${inList('section', ITEM_SALE_SECTIONS)}
    FOR UPDATE;
  IF sale_amount IS NULL THEN
    RAISE EXCEPTION 'an item line belongs to a sale of its own day (PR-1)';
  END IF;
  SELECT COALESCE(SUM(amount), 0) INTO already FROM item_lines
    WHERE shop_id = NEW.shop_id AND entry_id = NEW.entry_id;
  IF already + NEW.amount > sale_amount THEN
    RAISE EXCEPTION 'the item lines would come to more than the sale (PR-1)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql`,
    `CREATE TRIGGER item_lines_fit_sale
BEFORE INSERT ON item_lines
FOR EACH ROW EXECUTE FUNCTION item_lines_fit_sale()`,
  ];
}

/**
 * Postgres-only: Row-Level Security as defence in depth for tenancy (S-10).
 * "RLS is the layer that survives an application bug." — SECURITY-AUDIT §2 TB5
 */
export function tenancyDDL(d: Dialect): string[] {
  if (d !== 'postgres') return [];

  /*
   * HOW EACH TABLE REACHES ITS SHOP, WHICH IS NOT ALWAYS A `shop_id` COLUMN.
   *
   * Most of these carry the shop directly. `consents` does not - it hangs off a
   * user - and the first version of this generated `shop_id = ...` for it
   * anyway, which is a migration that fails on a column that does not exist.
   * Expressing the relationship per table means adding a table forces somebody
   * to say how it is scoped, rather than inheriting an assumption.
   */
  const scopedBy: Record<string, string> = {
    entries: `shop_id = current_setting('swafto.shop_id', true)::uuid`,
    days: `shop_id = current_setting('swafto.shop_id', true)::uuid`,
    parties: `shop_id = current_setting('swafto.shop_id', true)::uuid`,
    section_skips: `shop_id = current_setting('swafto.shop_id', true)::uuid`,
    upi_confirmations: `shop_id = current_setting('swafto.shop_id', true)::uuid`,
    adjustments: `shop_id = current_setting('swafto.shop_id', true)::uuid`,
    items: `shop_id = current_setting('swafto.shop_id', true)::uuid`,
    item_lines: `shop_id = current_setting('swafto.shop_id', true)::uuid`,
    party_credit_limits: `shop_id = current_setting('swafto.shop_id', true)::uuid`,
    devices: `shop_id = current_setting('swafto.shop_id', true)::uuid`,
    users: `shop_id = current_setting('swafto.shop_id', true)::uuid`,
    consents: `user_id IN (SELECT id FROM users WHERE shop_id = current_setting('swafto.shop_id', true)::uuid)`,
  };

  const out: string[] = [];
  for (const [table, predicate] of Object.entries(scopedBy)) {
    out.push(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    out.push(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    out.push(`CREATE POLICY ${table}_tenant_isolation ON ${table}
  USING (${predicate})`);
  }
  // Belt and braces with the trigger - §07.04 says forever.
  out.push(`REVOKE UPDATE, DELETE ON entries FROM PUBLIC`);
  /*
   * Consents are append-only for the same reason entries are: a withdrawal that
   * overwrote the grant would destroy the only record of what he agreed to, and
   * that record is what DPDP §1.2 exists to require.
   */
  out.push(`REVOKE UPDATE, DELETE ON consents FROM PUBLIC`);
  for (const tbl of BILLING_TABLES) out.push(`REVOKE UPDATE, DELETE ON ${tbl} FROM PUBLIC`);
  out.push(`REVOKE UPDATE, DELETE ON items FROM PUBLIC`);
  for (const tbl of [...DAY_FACT_TABLES, ...PARTY_FACT_TABLES]) out.push(`REVOKE UPDATE, DELETE ON ${tbl} FROM PUBLIC`);
  return out;
}

/** The full `up` migration for a dialect, in dependency order. */
export function migrationUp(d: Dialect): string[] {
  return [
    ...tablesDDL(d),
    ...outboxDDL(d),
    ...rateLimitDDL(d),
    ...billingDDL(d),
    ...indexesDDL(d),
    ...appendOnlyDDL(d),
    ...tenancyDDL(d),
  ];
}

/** The `down` migration. Reverse dependency order. */
export function migrationDown(d: Dialect): string[] {
  const drops = [
    // Children first: a state references its purchase.
    'plan_purchase_states',
    'plan_purchases',
    'plan_previews',
    'rate_events',
    'outbox',
    'section_skips',
    // Before entries and days: they reference both.
    'upi_confirmations',
    'adjustments',
    // A line references an entry and an item.
    'item_lines',
    'items',
    // Before parties: it references them.
    'party_credit_limits',
    // Before users: it references them. Reverse dependency order is the rule here.
    'consents',
    'entries',
    'days',
    'parties',
    'devices',
    'users',
    'shops',
  ].map((tbl) => `DROP TABLE IF EXISTS ${tbl}${d === 'postgres' ? ' CASCADE' : ''}`);

  if (d === 'postgres') {
    return [
      ...drops,
      'DROP FUNCTION IF EXISTS entries_append_only() CASCADE',
      'DROP FUNCTION IF EXISTS days_closed_immutable() CASCADE',
      'DROP FUNCTION IF EXISTS entries_reject_closed_day() CASCADE',
      'DROP FUNCTION IF EXISTS day_facts_append_only() CASCADE',
      'DROP FUNCTION IF EXISTS day_facts_reject_closed_day() CASCADE',
      'DROP FUNCTION IF EXISTS item_lines_fit_sale() CASCADE',
    ];
  }
  // SQLite drops triggers with their table, but be explicit so `down` is total.
  return [
    'DROP TRIGGER IF EXISTS entries_no_update',
    'DROP TRIGGER IF EXISTS entries_no_delete',
    'DROP TRIGGER IF EXISTS days_no_update_when_closed',
    'DROP TRIGGER IF EXISTS entries_no_insert_into_closed_day',
    ...DAY_FACT_TABLES.flatMap((tbl) => [
      `DROP TRIGGER IF EXISTS ${tbl}_no_update`,
      `DROP TRIGGER IF EXISTS ${tbl}_no_delete`,
      `DROP TRIGGER IF EXISTS ${tbl}_no_insert_into_closed_day`,
    ]),
    'DROP TRIGGER IF EXISTS items_no_update',
    'DROP TRIGGER IF EXISTS items_no_delete',
    'DROP TRIGGER IF EXISTS item_lines_fit_sale',
    ...PARTY_FACT_TABLES.flatMap((tbl) => [
      `DROP TRIGGER IF EXISTS ${tbl}_no_update`,
      `DROP TRIGGER IF EXISTS ${tbl}_no_delete`,
    ]),
    ...drops,
  ];
}

/*
 * ---- MIGRATION 0002 · otp_pending (C-02) -------------------------------------
 *
 * The sign-in code store, so a second API instance or a restart does not strand a
 * code minted on another (it was per-process memory). SERVER-ONLY, like
 * `rate_events`: the phone never holds one, so there is no SQLite twin and
 * `migration2Up('sqlite')` is empty.
 *
 * `phone` holds the sign-in number or `delete:<number>` (the web deletion path's
 * own namespace). `code_hash` is the keyed HMAC of the code, never the code. NOT
 * tenant-scoped and outside the RLS set: it is written before any shop exists.
 * Expired rows are swept by the store on every send.
 */
export function otpDDL(d: Dialect): string[] {
  if (d !== 'postgres') return [];
  return [
    `CREATE TABLE otp_pending (
  phone       TEXT PRIMARY KEY,
  code_hash   TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
  ];
}

/** Migration 0002, up. Applied AFTER `migrationUp`. */
export function migration2Up(d: Dialect): string[] {
  return [...otpDDL(d)];
}

/** Migration 0002, down. Applied BEFORE `migrationDown`. */
export function migration2Down(d: Dialect): string[] {
  return d === 'postgres' ? ['DROP TABLE IF EXISTS otp_pending'] : [];
}

/*
 * ---- MIGRATION 0003 · the closed-day triggers lock the day they read (ARCH-09) --------
 *
 * `entries_reject_closed_day` and `day_facts_reject_closed_day` read `days.state` and then let
 * the insert proceed. Under READ COMMITTED that is a check-then-act: an insert could read
 * 'open', a close could commit, and the entry would land in a day that is now closed. That
 * breaks D7 and the one condition the read fold's closed-day memo rests on.
 *
 * `FOR SHARE` on that one `days` row makes the two serialise: the close (an UPDATE of the row)
 * waits for every in-flight insert into the day to commit, and an insert that starts after the
 * close commits reads 'closed'. Bodies are otherwise exactly 0001's. A locking read needs UPDATE
 * privilege on `days`, which the app role already holds for `upsertDay`.
 * UNVERIFIED-LOCAL: no Postgres here; `packages/schema/test/postgres.spec.ts` proves it in CI.
 *
 * The down migration restores 0001's bodies byte for byte (a test pins that).
 */
const closedDayFunction = (name: string, message: string, lock: boolean): string =>
  `CREATE OR REPLACE FUNCTION ${name}() RETURNS TRIGGER AS $$
DECLARE day_state TEXT;
BEGIN
  SELECT state INTO day_state FROM days
    WHERE shop_id = NEW.shop_id AND date = NEW.day_id${lock ? '\n    FOR SHARE' : ''};
  IF day_state = 'closed' THEN
    RAISE EXCEPTION '${message}';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql`;

const ENTRY_CLOSED_MESSAGE =
  'that day is closed: post a correction on the open day, never an entry into a closed one (decision D7, CP-4)';
const FACT_CLOSED_MESSAGE = 'that day is closed: a closed day is frozen (decision D7)';

/** Migration 0003, up. Postgres only: SQLite is one writer and needs no lock. */
export function migration3Up(d: Dialect): string[] {
  if (d !== 'postgres') return [];
  return [
    closedDayFunction('entries_reject_closed_day', ENTRY_CLOSED_MESSAGE, true),
    closedDayFunction('day_facts_reject_closed_day', FACT_CLOSED_MESSAGE, true),
  ];
}

/** Migration 0003, down: 0001's unlocked bodies. Applied BEFORE `migration2Down`. */
export function migration3Down(d: Dialect): string[] {
  if (d !== 'postgres') return [];
  return [
    closedDayFunction('entries_reject_closed_day', ENTRY_CLOSED_MESSAGE, false),
    closedDayFunction('day_facts_reject_closed_day', FACT_CLOSED_MESSAGE, false),
  ];
}

/*
 * ---- MIGRATION 0004 · refresh-token rotation (RT-10) ------------------------------------
 *
 * `devices.refresh_gen` is the generation of the one refresh token that is currently valid
 * for the device. `/v1/auth/refresh` bumps it with a compare-and-set, so a refresh token can
 * be used exactly once; presenting an older generation is a replay and revokes the device.
 * Default 0 = the generation of every refresh token minted before this migration (they carry
 * no `gen` claim, which is read as 0), so existing sessions keep working until their next
 * refresh. Server-only: the phone's SQLite has no use for it, so Postgres only.
 */
export function migration4Up(d: Dialect): string[] {
  if (d !== 'postgres') return [];
  return [
    'ALTER TABLE devices ADD COLUMN refresh_gen INTEGER NOT NULL DEFAULT 0 CHECK (refresh_gen >= 0)',
    // Grace window for a lost refresh response: when the last rotation happened, and whether it was itself a grace retry.
    `ALTER TABLE devices ADD COLUMN refresh_rotated_at ${d === 'postgres' ? 'TIMESTAMPTZ' : 'TEXT'}`,
    'ALTER TABLE devices ADD COLUMN refresh_graced BOOLEAN NOT NULL DEFAULT FALSE',
  ];
}

/** Migration 0004, down. Applied BEFORE `migration3Down`. */
export function migration4Down(d: Dialect): string[] {
  if (d !== 'postgres') return [];
  return [
    'ALTER TABLE IF EXISTS devices DROP COLUMN IF EXISTS refresh_graced',
    'ALTER TABLE IF EXISTS devices DROP COLUMN IF EXISTS refresh_rotated_at',
    'ALTER TABLE IF EXISTS devices DROP COLUMN IF EXISTS refresh_gen',
  ];
}

/** Every migration, in order: what a database needs to be at the current schema. */
export function allMigrationsUp(d: Dialect): string[] {
  return [...migrationUp(d), ...migration2Up(d), ...migration3Up(d), ...migration4Up(d)];
}

/** Every migration undone, newest first: a clean slate. */
export function allMigrationsDown(d: Dialect): string[] {
  return [...migration4Down(d), ...migration3Down(d), ...migration2Down(d), ...migrationDown(d)];
}

/** Emit a migration as a single SQL script. */
export function renderSQL(statements: string[]): string {
  return statements.map((s) => `${s};`).join('\n\n') + '\n';
}
