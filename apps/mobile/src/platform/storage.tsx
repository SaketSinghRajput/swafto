/**
 * `SecureStorage` ON THE LEDGER'S OWN DATABASE - candidate 2 from the note that
 * used to live here, and the reason a restart no longer signs him out.
 *
 * WHAT WAS HERE BEFORE. An in-memory store, because `react-native-mmkv` v4 - the
 * only mainstream key-value store with a SYNCHRONOUS api - crashed the app on
 * launch: MMKV v4 is a Nitro module, mmkv 4.3.2 ships C++ generated against
 * `react-native-nitro-modules` 0.35.9, npm hoisted 0.37.1 (peer range `"*"`) and
 * declined an `overrides` pin across three reinstalls, and Nitro's
 * `getHybridObjectConstructor` read `.prototype` of an undefined constructor
 * (`TypeError: Cannot read property 'prototype' of undefined at mmkvSecureStorage`).
 * The cost of the in-memory store was that closing the app signed him out.
 *
 * WHY SQLITE. `@op-engineering/op-sqlite` is already installed, already compiled
 * into the APK and already holds the ledger (`store/sqlite.ts`), and its
 * `executeSync` keeps this interface synchronous - which `SecureStorage` requires
 * (host.tsx): the session is read while the first screen decides whether to ask
 * for a phone number, and an await there is a frame where the app does not know
 * who it is. No new dependency, no new native module.
 *
 * WHAT ACTUALLY PROTECTS THE TOKENS, STATED PLAINLY: THIS IS NOT ENCRYPTED.
 * The value sits in a row of an ordinary SQLite file. What keeps it from another
 * app is the Android application sandbox (the file is in this app's private data
 * directory) and `android:allowBackup="false"` (S-02, in the manifest), which
 * keeps it out of adb and cloud backups; full-disk encryption covers a powered-off
 * phone. An encryption key stored on the same device as the data it encrypts
 * would be obfuscation described as encryption, so none is pretended here. A
 * rooted handset can read this row - and the ledger beside it.
 */
import type { SecureStorage } from '../host.tsx';
import type { Db } from '../store/sqlite.ts';

/**
 * One value under one key in the `meta` table.
 *
 * The table is created here as well as in `sqlitePort`, so the two can be opened
 * in either order - `CREATE TABLE IF NOT EXISTS` is the same statement both use.
 */
export function sqliteSecureStorage(db: Db, key: string): SecureStorage {
  db.executeSync('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)');

  return {
    read(): string | null {
      const v = db.executeSync('SELECT v FROM meta WHERE k = ?', [key]).rows[0]?.v;
      return v === undefined || v === null ? null : String(v);
    },

    write(next: string | null): void {
      /*
       * A null write is a sign-out and DELETES the row, never stores an empty
       * string. An empty string is a value, and a value is something a later
       * reader can mistake for a session.
       */
      if (next === null) db.executeSync('DELETE FROM meta WHERE k = ?', [key]);
      else db.executeSync('INSERT OR REPLACE INTO meta (k, v) VALUES (?, ?)', [key, next]);
    },
  };
}
