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

/** Section 00 (opening) and 09 (cash check) live on `days`, not `entries`. */
export const MODES = ['cash', 'upi', 'other', 'udhar', 'shop_stock'] as const;
export type Mode = (typeof MODES)[number];

/**
 * Mode validity is per-section (SPEC-DIGEST C-7, from the paper sheet).
 * Shop stock is meaningless for a purchase and for a collection; the sheet says so.
 */
export const SECTION_MODES: Record<Section, readonly Mode[]> = {
  cash_sales: ['cash'],
  upi_sales: ['upi'],
  udhar_sales: ['udhar'],
  expense: ['cash', 'upi', 'other', 'udhar', 'shop_stock'], // five — sheet §4
  purchase: ['cash', 'upi', 'other', 'udhar'], // four — sheet §5, no shop stock
  udhar_collection: ['cash', 'upi', 'other'], // three — sheet §6
  party_payment: ['cash', 'upi', 'other'], // three — sheet §7
  withdrawal: ['cash', 'upi'], // two — sheet §8
};

export const PARTY_KINDS = ['customer', 'supplier'] as const;
export type PartyKind = (typeof PARTY_KINDS)[number];

/** `source` exists so a future UPI import stays reversible without a migration (D1). */
export const SOURCES = ['manual', 'imported'] as const;
export type Source = (typeof SOURCES)[number];

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

/* ------------------------------------------------------------------ *
 * D1-D5 plus the one store the architecture implies but does not name
 * ------------------------------------------------------------------ */

export function tablesDDL(d: Dialect): string[] {
  const uuid = t.uuid(d);
  const ts = t.timestamp(d);
  const date = t.date(d);
  const paise = t.paise(d);

  /** Per-section mode CHECK — encodes SECTION_MODES as SQL so a bad pair cannot land. */
  const sectionModeCheck = SECTIONS.map(
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
  PRIMARY KEY (shop_id, date),
  CONSTRAINT days_state_ck   CHECK (${inList('state', DAY_STATES)}),
  CONSTRAINT days_opening_ck CHECK (opening_cash IS NULL OR ${wholePaise(d, 'opening_cash')}),
  CONSTRAINT days_counted_ck CHECK (counted_cash IS NULL OR ${wholePaise(d, 'counted_cash')}),
  CONSTRAINT days_closed_ck  CHECK (
    state <> 'closed' OR (counted_cash IS NOT NULL AND closed_at IS NOT NULL)
  )
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
  created_at      ${ts} NOT NULL,
  source          ${t.text()} NOT NULL DEFAULT 'manual',
  device_id       ${uuid},
  CONSTRAINT entries_section_ck CHECK (${inList('section', SECTIONS)}),
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
  ),
  FOREIGN KEY (shop_id, day_id) REFERENCES days(shop_id, date)
)`,

    // ---- Section skips -----------------------------------------------
    // D8: "skipped" and "empty" are DIFFERENT WORDS. A day with genuinely zero
    // expenses and a day where expenses were forgotten produce the identical
    // reconciliation number and mean completely different things.
    //
    // This is the one store the architecture document does not name but D8 requires:
    // a skip has no entry to record it, so it needs somewhere to live.
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
    // BI windows walk closed days in date order.
    `CREATE INDEX days_state_idx ON days (shop_id, state, date)`,
    `CREATE INDEX parties_kind_idx ON parties (shop_id, kind)`,
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
    ];
  }
  return [
    `CREATE OR REPLACE FUNCTION entries_append_only() RETURNS TRIGGER AS $$
BEGIN
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql`,
    `CREATE TRIGGER days_no_update_when_closed
BEFORE UPDATE ON days
FOR EACH ROW EXECUTE FUNCTION days_closed_immutable()`,
  ];
}

/**
 * Postgres-only: Row-Level Security as defence in depth for tenancy (S-10).
 * "RLS is the layer that survives an application bug." — SECURITY-AUDIT §2 TB5
 */
export function tenancyDDL(d: Dialect): string[] {
  if (d !== 'postgres') return [];
  const scoped = ['entries', 'days', 'parties', 'section_skips', 'devices', 'users'];
  const out: string[] = [];
  for (const table of scoped) {
    out.push(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    out.push(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    out.push(
      `CREATE POLICY ${table}_tenant_isolation ON ${table}
  USING (shop_id = current_setting('swafto.shop_id', true)::uuid)`,
    );
  }
  // Belt and braces with the trigger — §07.04 says forever.
  out.push(`REVOKE UPDATE, DELETE ON entries FROM PUBLIC`);
  return out;
}

/** The full `up` migration for a dialect, in dependency order. */
export function migrationUp(d: Dialect): string[] {
  return [
    ...tablesDDL(d),
    ...outboxDDL(d),
    ...indexesDDL(d),
    ...appendOnlyDDL(d),
    ...tenancyDDL(d),
  ];
}

/** The `down` migration. Reverse dependency order. */
export function migrationDown(d: Dialect): string[] {
  const drops = [
    'outbox',
    'section_skips',
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
    ];
  }
  // SQLite drops triggers with their table, but be explicit so `down` is total.
  return [
    'DROP TRIGGER IF EXISTS entries_no_update',
    'DROP TRIGGER IF EXISTS entries_no_delete',
    'DROP TRIGGER IF EXISTS days_no_update_when_closed',
    ...drops,
  ];
}

/** Emit a migration as a single SQL script. */
export function renderSQL(statements: string[]): string {
  return statements.map((s) => `${s};`).join('\n\n') + '\n';
}
