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
--   swafto_app     DATABASE_URL.  LOGIN, NOBYPASSRLS, never superuser. Every ledger read
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
--   swafto_backup  BACKUP_DATABASE_URL, used only by swafto-backup (pg_dump).  LOGIN,
--                  BYPASSRLS, and SELECT on every table and sequence - nothing else. A
--                  dump through a role that row-level security binds would silently or
--                  loudly miss every row, so it must bypass RLS; it can write nothing,
--                  so a leaked backup credential reads the data and changes none of it.
--                  Granted per table, not via pg_read_all_data, so it needs nothing the
--                  RDS master lacks. It has no CREATEDB: swafto-restore-drill creates a
--                  scratch database, so it runs as the master (see docs/infra/HOSTING.md).
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
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'swafto_backup') THEN
    CREATE ROLE swafto_backup LOGIN;
  END IF;
END
$roles$;

-- Attributes are re-asserted every run, so a role loosened by hand is tightened again.
--
-- NOSUPERUSER and NOREPLICATION are NOT in these statements. Both are the default of
-- CREATE ROLE, and on Amazon RDS the master (a member of rds_superuser, not a
-- superuser) is refused any ALTER ROLE that names them, even to clear them: "Only roles
-- with the SUPERUSER attribute may change the SUPERUSER attribute" (found 2026-11-18,
-- infra/PHASE-C-LOG.md). Everything else here RDS lets the master set, BYPASSRLS
-- included (checked on the live instance, in a rolled-back transaction).
ALTER ROLE swafto_app    LOGIN NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT;
ALTER ROLE swafto_system LOGIN BYPASSRLS   NOCREATEDB NOCREATEROLE NOINHERIT;
ALTER ROLE swafto_backup LOGIN BYPASSRLS   NOCREATEDB NOCREATEROLE NOINHERIT;

-- A superuser owner can clear the two attributes, so a role someone made superuser by
-- hand is tightened. A non-superuser owner cannot, so it REFUSES instead: the deploy
-- stops, it does not carry on with a superuser in the tenancy path.
DO $attrs$
BEGIN
  IF (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) THEN
    ALTER ROLE swafto_app    NOSUPERUSER NOREPLICATION;
    ALTER ROLE swafto_system NOSUPERUSER NOREPLICATION;
    ALTER ROLE swafto_backup NOSUPERUSER NOREPLICATION;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles
              WHERE rolname IN ('swafto_app', 'swafto_system', 'swafto_backup') AND (rolsuper OR rolreplication)) THEN
    RAISE EXCEPTION 'a swafto role is SUPERUSER or REPLICATION and this owner cannot clear it; fix as a superuser';
  END IF;
END
$attrs$;

DO $grants$
DECLARE
  s text := current_schema();
  t text;
  spec record;
BEGIN
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO swafto_app, swafto_system, swafto_backup', s);
  -- Start from nothing, so a grant removed from this file is removed from the database.
  EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM swafto_app, swafto_system, swafto_backup', s);
  EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA %I FROM swafto_app, swafto_system, swafto_backup', s);

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
    ('otp_pending',         'SELECT, INSERT, UPDATE, DELETE'),
    -- Beta invite codes (migration 0005). The invite CLI connects as this role: INSERT is its audit
    -- write. NO UPDATE. DELETE is the retention purge's alone, and the trigger refuses it unless the
    -- transaction set swafto.invite_audit_purge AND the row is over twelve months old.
    ('invite_audit',        'SELECT, INSERT, DELETE')
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
  -- Skipped until migration 0001 has created them, so the roles and their passwords can
  -- be set up on a database that has no schema yet (the first deploy applies it, then
  -- runs this file again, and the grants land).
  IF to_regclass(format('%I.users', s)) IS NOT NULL
     AND to_regclass(format('%I.devices', s)) IS NOT NULL
     AND to_regclass(format('%I.consents', s)) IS NOT NULL THEN
    EXECUTE format('GRANT SELECT ON %I.users, %I.devices, %I.consents TO swafto_system', s, s, s);
    EXECUTE format('GRANT INSERT ON %I.consents TO swafto_system', s);
    EXECUTE format('GRANT UPDATE (consent_version, consent_at, consent_locale) ON %I.users TO swafto_system', s);
  END IF;

  -- swafto_backup: read everything, so pg_dump has a complete schema and every row.
  EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA %I TO swafto_backup', s);
  EXECUTE format('GRANT SELECT ON ALL SEQUENCES IN SCHEMA %I TO swafto_backup', s);
END
$grants$;
