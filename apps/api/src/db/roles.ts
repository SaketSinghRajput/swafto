/**
 * C-01 · BOOT-TIME PROOF THAT ROW-LEVEL SECURITY CAN ACTUALLY BIND THE API.
 *
 * RLS is silently void for a superuser and for any role with BYPASSRLS: the
 * policies are still there, `FORCE ROW LEVEL SECURITY` is still set, and every
 * query sees every shop. That is how the layer sat "inert" before (SEC-01) with
 * nothing to say so. This check turns that into a refusal to start.
 *
 * TWO ROLES, AND WHY. The API's own role (DATABASE_URL) must be restricted: that
 * is the one every ledger read and write runs on, scoped by `swafto.shop_id`.
 * The SYSTEM role (SYSTEM_DATABASE_URL) is the deliberate exception for the five
 * lookups that have no shop yet (see `PgRepoOptions.system`); it must be able to
 * read across shops or sign-in cannot work, and it must not be the same role, or
 * one of the two statements above is false.
 *
 * Outside production the same findings are returned as warnings, because a
 * developer's local database is normally one superuser and refusing there would
 * only teach people to turn the check off.
 */
export interface RoleInfo {
  readonly name: string;
  readonly superuser: boolean;
  readonly bypassRls: boolean;
}

interface Queryable {
  query(text: string, params?: readonly unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

export async function describeRole(db: Queryable): Promise<RoleInfo> {
  const { rows } = await db.query(
    `SELECT current_user::text AS name, r.rolsuper, r.rolbypassrls
       FROM pg_roles r WHERE r.rolname = current_user`,
  );
  const r = rows[0];
  if (!r) throw new Error('could not read the connecting role from pg_roles');
  return { name: String(r.name), superuser: r.rolsuper === true, bypassRls: r.rolbypassrls === true };
}

/** What is wrong with this pair of roles. Empty means row-level security can bind. */
export function roleProblems(app: RoleInfo, system: RoleInfo | null): string[] {
  const problems: string[] = [];
  if (app.superuser) {
    problems.push('the API role "' + app.name + '" is a superuser, so row-level security does not apply to it');
  }
  if (app.bypassRls) {
    problems.push('the API role "' + app.name + '" has BYPASSRLS, so row-level security does not apply to it');
  }
  if (system === null) {
    problems.push('no SYSTEM_DATABASE_URL: sign-in, device checks and consent have no role that may read across shops');
  } else {
    if (system.name === app.name) {
      problems.push('SYSTEM_DATABASE_URL connects as the same role as DATABASE_URL ("' + app.name + '")');
    }
    if (!system.superuser && !system.bypassRls) {
      problems.push(
        'the system role "' + system.name + '" has neither BYPASSRLS nor superuser, so sign-in could not find a user',
      );
    }
  }
  return problems;
}

/**
 * Refuse (production) or warn (anywhere else). Never prints a connection string,
 * only role names.
 */
export function enforceRoles(
  app: RoleInfo,
  system: RoleInfo | null,
  production: boolean,
  warn: (line: string) => void,
): void {
  const problems = roleProblems(app, system);
  if (problems.length === 0) return;
  if (production) {
    throw new Error('refusing to start: ' + problems.join('; ') + '.');
  }
  for (const p of problems) warn('swafto-api: WARNING (not production, so not fatal): ' + p + '\n');
}
