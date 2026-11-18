-- ROLES AND GRANTS FOR ROW-LEVEL SECURITY (C-01). NOT A MIGRATION.
--
-- A migration describes the schema and runs once per database. Roles are a
-- property of the CLUSTER and their passwords are secrets, so this file is run by
-- the deploy, as the schema owner, after every migration - and it is IDEMPOTENT:
-- run it ten times and the end state is the same. Run it in the database and with
-- the search_path of the schema the tables live in (it uses current_schema()).
--
--   psql "$OWNER_URL" -f packages/schema/sql/roles.postgres.sql
--   ALTER ROLE swafto_app    PASSWORD '...';   -- from the secret store, never this file
--   ALTER ROLE swafto_system PASSWORD '...';
--
-- TWO ROLES (see apps/api/src/db/roles.ts and PgRepoOptions.system):
--
--   swafto_app     DATABASE_URL.  LOGIN, NOSUPERUSER, NOBYPASSRLS. Every ledger read
--                  and write runs here, inside a transaction that sets
--                  swafto.shop_id, so row-level security binds it. It owns nothing
--                  and gets only the privileges the repositories use: no UPDATE on
--                  the append-only tables, no DDL, no TRUNCATE.
--   swafto_system  SYSTEM_DATABASE_URL.  LOGIN, BYPASSRLS. For the five lookups that
--                  have no shop yet: findUserByPhone, findDevice, consentsFor,
--                  recordConsent, exportUser (user lookup). It can see across shops,
--                  so it is limited to the three tables those touch - users,
--                  devices, consents - and may WRITE only a consent row and the
--                  three consent columns of a user. It cannot read a ledger.
--
-- The API refuses to boot in production if swafto_app bypasses RLS or if
-- swafto_system cannot (the boot check in server.ts).

DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'swafto_app') THEN
    CREATE ROLE swafto_app LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'swafto_system') THEN
    CREATE ROLE swafto_system LOGIN;
  END IF;
END
$roles$;

-- Attributes are re-asserted every run, so a role loosened by hand is tightened again.
ALTER ROLE swafto_app    LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT;
ALTER ROLE swafto_system LOGIN NOSUPERUSER BYPASSRLS   NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT;

DO $grants$
DECLARE
  s text := current_schema();
  t text;
  spec record;
BEGIN
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO swafto_app, swafto_system', s);
  -- Start from nothing, so a grant removed from this file is removed from the database.
  EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM swafto_app, swafto_system', s);
  EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA %I FROM swafto_app, swafto_system', s);

  -- swafto_app: the privileges the repositories actually use, table by table.
  FOR spec IN SELECT * FROM (VALUES
    ('shops',               'SELECT, INSERT, UPDATE'),
    ('users',               'SELECT, INSERT, UPDATE, DELETE'),
    ('devices',             'SELECT, INSERT, UPDATE, DELETE'),
    ('parties',             'SELECT, INSERT, UPDATE, DELETE'),
    ('days',                'SELECT, INSERT, UPDATE, DELETE'),
    -- Append-only: no UPDATE. DELETE is the erasure job's, behind the swafto.erasure trigger flag.
    ('entries',             'SELECT, INSERT, DELETE'),
    ('consents',            'SELECT, INSERT, DELETE'),
    ('section_skips',       'SELECT, INSERT, DELETE'),
    ('upi_confirmations',   'SELECT, INSERT, DELETE'),
    ('adjustments',         'SELECT, INSERT, DELETE'),
    ('items',               'SELECT, INSERT, DELETE'),
    ('item_lines',          'SELECT, INSERT, DELETE'),
    ('party_credit_limits', 'SELECT, INSERT, DELETE'),
    ('plan_purchases',      'SELECT, INSERT, DELETE'),
    ('plan_purchase_states','SELECT, INSERT, DELETE'),
    ('plan_previews',       'SELECT, INSERT, DELETE'),
    ('rate_events',         'SELECT, INSERT, DELETE'),
    ('otp_pending',         'SELECT, INSERT, UPDATE, DELETE')
  ) AS g(tbl, privs)
  LOOP
    -- otp_pending only exists once migration 0002 has run.
    IF to_regclass(format('%I.%I', s, spec.tbl)) IS NOT NULL THEN
      EXECUTE format('GRANT %s ON %I.%I TO swafto_app', spec.privs, s, spec.tbl);
    END IF;
  END LOOP;

  -- The two BIGSERIAL keys (rate_events, plan_purchase_states).
  FOR t IN SELECT sequencename FROM pg_sequences WHERE schemaname = s LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %I.%I TO swafto_app', s, t);
  END LOOP;

  -- swafto_system: three tables, and the narrowest writes the pre-tenant paths need.
  EXECUTE format('GRANT SELECT ON %I.users, %I.devices, %I.consents TO swafto_system', s, s, s);
  EXECUTE format('GRANT INSERT ON %I.consents TO swafto_system', s);
  EXECUTE format('GRANT UPDATE (consent_version, consent_at, consent_locale) ON %I.users TO swafto_system', s);
END
$grants$;
