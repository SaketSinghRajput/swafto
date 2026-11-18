/**
 * RT-10 · REFRESH-TOKEN ROTATION WITH REUSE DETECTION.
 *
 * A refresh token lives 180 days on a phone. Before rotation a copy of it - from a
 * backup, a rooted handset, a log - was a 180-day session the owner could never tell
 * about. Now each refresh token works once; presenting a spent one proves two parties
 * hold the credential, and the device is revoked.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { buildApp, type AppDeps } from '../src/app.ts';
import { testDeps } from './_deps.ts';
import { memoryRepo } from '../src/db/memory.ts';
import { StubSmsPort } from '../src/sms/stub.ts';
import { NOTICE_VERSION } from '../src/dpdp/routes.ts';
import { mintToken, verifyToken, TokenInvalid } from '../src/auth/tokens.ts';

const KEY = 'test-signing-key-at-least-32-chars!!';
const PHONE = '+919876500071';
const T0 = '2026-09-19T08:00:00.000Z';
const LATE = '2026-09-19T08:02:01.000Z'; // 121 s after T0
const NOW_S = Math.floor(Date.parse(T0) / 1000);
const JSON_HEADERS = { 'content-type': 'application/json' };

function setup() {
  const clock = { value: T0 };
  const logged: string[] = [];
  const sms = new StubSmsPort();
  const repo = memoryRepo();
  const deps: AppDeps = testDeps({ repo, sms, now: () => clock.value, logStream: { write: (c: string) => void logged.push(c) } });
  const app = buildApp(deps);
  const signIn = async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/auth/otp/request',
      headers: JSON_HEADERS,
      payload: JSON.stringify({ phone: PHONE, language: 'en' }),
    });
    const code = sms.forPhone(PHONE).at(-1)!.variables[0]!;
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/otp/verify',
      headers: JSON_HEADERS,
      payload: JSON.stringify({
        phone: PHONE,
        code,
        device: { platform: 'android' },
        shopName: 'Kirana',
        consent: { granted: true, noticeVersion: NOTICE_VERSION, locale: 'en' },
      }),
    });
    expect(res.statusCode).toBe(200);
    return JSON.parse(res.body) as { accessToken: string; refreshToken: string; deviceId: string; shopId: string };
  };
  const refresh = (refreshToken: string) =>
    app.inject({ method: 'POST', url: '/v1/auth/refresh', headers: JSON_HEADERS, payload: JSON.stringify({ refreshToken }) });
  const authedGet = (token: string) =>
    app.inject({ method: 'GET', url: '/v1/parties/outstanding', headers: { authorization: 'Bearer ' + token } });
  const events = (name: string) =>
    logged.join('').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>).filter((l) => l.event === name);
  return { app, repo, clock, signIn, refresh, authedGet, events, logged };
}

const gen = (token: string): number | undefined => verifyToken(KEY, token, 'refresh', NOW_S + 100).gen;

describe('RT-10 · refresh-token rotation', () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  it('each refresh returns a new refresh token one generation on, and keeps accessToken', async () => {
    const s = await t.signIn();
    expect(gen(s.refreshToken)).toBe(0);

    const first = await t.refresh(s.refreshToken);
    expect(first.statusCode).toBe(200);
    const a = JSON.parse(first.body) as { accessToken: string; refreshToken: string };
    expect(a.accessToken).toBeTruthy(); // the old field shape is intact
    expect(gen(a.refreshToken)).toBe(1);
    expect(a.refreshToken).not.toBe(s.refreshToken);
    expect((await t.authedGet(a.accessToken)).statusCode).toBe(200);

    const second = await t.refresh(a.refreshToken);
    expect(second.statusCode).toBe(200);
    expect(gen(JSON.parse(second.body).refreshToken)).toBe(2);
  });

  it('REUSE of a spent refresh token revokes the device: the thief and the owner are both out', async () => {
    const s = await t.signIn();
    const rotated = JSON.parse((await t.refresh(s.refreshToken)).body) as { accessToken: string; refreshToken: string };
    expect((await t.authedGet(rotated.accessToken)).statusCode).toBe(200);

    // The old token comes back after the grace window (a copy). It is refused AND the device is revoked.
    t.clock.value = LATE;
    const replay = await t.refresh(s.refreshToken);
    expect(replay.statusCode).toBe(401);
    expect(JSON.parse(replay.body).error).toBe('device_revoked');
    expect((await t.repo.findDevice(s.deviceId))?.revokedAt).not.toBeNull();

    // Everything the device held is dead: its access token, and the newest refresh token.
    expect((await t.authedGet(rotated.accessToken)).statusCode).toBe(401);
    expect((await t.refresh(rotated.refreshToken)).statusCode).toBe(401);
  });

  it('a refresh token minted before rotation (no gen claim) works once, then counts as spent', async () => {
    const s = await t.signIn();
    const claims = verifyToken(KEY, s.refreshToken, 'refresh', NOW_S);
    const legacy = mintToken(KEY, {
      sub: claims.sub,
      shop: claims.shop,
      dev: claims.dev,
      typ: 'refresh',
      nowSeconds: NOW_S,
      ttlSeconds: 3600,
    });
    expect(gen(legacy)).toBeUndefined();
    expect((await t.refresh(legacy)).statusCode).toBe(200);
    t.clock.value = LATE; // past the grace window: the legacy token is spent, not a retry
    expect((await t.refresh(legacy)).statusCode).toBe(401);
  });

  it('two simultaneous refreshes of the CURRENT token are indistinguishable from a retry: both are served, nobody is revoked', async () => {
    const s = await t.signIn();
    const [x, y] = await Promise.all([t.refresh(s.refreshToken), t.refresh(s.refreshToken)]);
    expect([x.statusCode, y.statusCode]).toEqual([200, 200]);
    expect((await t.repo.findDevice(s.deviceId))?.revokedAt).toBeNull();
  });

  describe('grace window: a lost response retried is not reuse (CTO decision, 120 s)', () => {
    it('retrying the previous token within 120 s succeeds with a fresh chain and does not revoke', async () => {
      const s = await t.signIn();
      await t.refresh(s.refreshToken); // the response is "lost"
      t.clock.value = '2026-09-19T08:01:59.000Z'; // 119 s later
      const retry = await t.refresh(s.refreshToken);
      expect(retry.statusCode).toBe(200);
      const b = JSON.parse(retry.body) as { accessToken: string; refreshToken: string };
      expect(gen(b.refreshToken)).toBe(2);
      expect((await t.repo.findDevice(s.deviceId))?.revokedAt).toBeNull();
      expect((await t.authedGet(b.accessToken)).statusCode).toBe(200);
      expect((await t.refresh(b.refreshToken)).statusCode).toBe(200);
    });

    it('RT-W4-2 · a grace rotation writes one warn event with the device id and no token; a normal one writes none', async () => {
      const s = await t.signIn();
      const first = JSON.parse((await t.refresh(s.refreshToken)).body) as { refreshToken: string; accessToken: string };
      expect(t.events('refresh_grace_used'), 'a normal rotation is silent').toHaveLength(0);
      t.clock.value = '2026-09-19T08:01:00.000Z';
      const graced = JSON.parse((await t.refresh(s.refreshToken)).body) as { refreshToken: string; accessToken: string };
      const ev = t.events('refresh_grace_used');
      expect(ev).toHaveLength(1);
      expect(ev[0]).toMatchObject({ level: 40, deviceId: s.deviceId });
      const raw = t.logged.join('');
      for (const secret of [s.refreshToken, first.refreshToken, first.accessToken, graced.refreshToken, graced.accessToken]) {
        expect(raw).not.toContain(secret);
      }
    });

    it('RT-W4-2 · a SECOND grace in a row is two parties, not a retry: it revokes', async () => {
      const s = await t.signIn();
      const one = JSON.parse((await t.refresh(s.refreshToken)).body) as { refreshToken: string }; // gen 1 (the thief, say)
      expect((await t.refresh(s.refreshToken)).statusCode).toBe(200); // the owner, by grace: gen 2
      // The thief's token is now one behind AND the last rotation was a grace one: a second grace.
      const second = await t.refresh(one.refreshToken);
      expect(second.statusCode).toBe(401);
      expect(JSON.parse(second.body).error).toBe('device_revoked');
      expect((await t.repo.findDevice(s.deviceId))?.revokedAt).not.toBeNull();
    });

    it('the previous token after 120 s is reuse and revokes', async () => {
      const s = await t.signIn();
      await t.refresh(s.refreshToken);
      t.clock.value = '2026-09-19T08:02:01.000Z'; // 121 s
      expect((await t.refresh(s.refreshToken)).statusCode).toBe(401);
      expect((await t.repo.findDevice(s.deviceId))?.revokedAt).not.toBeNull();
    });

    it('current - 2 revokes even inside the window', async () => {
      const s = await t.signIn();
      const one = JSON.parse((await t.refresh(s.refreshToken)).body) as { refreshToken: string };
      expect((await t.refresh(one.refreshToken)).statusCode).toBe(200); // normal rotation, gen 2
      expect((await t.refresh(s.refreshToken)).statusCode).toBe(401); // gen 0 = current - 2
      expect((await t.repo.findDevice(s.deviceId))?.revokedAt).not.toBeNull();
    });

    it('two concurrent grace retries: exactly one wins, the loser is a 401 and nothing is revoked', async () => {
      const s = await t.signIn();
      await t.refresh(s.refreshToken); // response lost
      const [x, y] = await Promise.all([t.refresh(s.refreshToken), t.refresh(s.refreshToken)]);
      expect([x.statusCode, y.statusCode].sort()).toEqual([200, 401]);
      expect((await t.repo.findDevice(s.deviceId))?.revokedAt).toBeNull();
      const winner = JSON.parse((x.statusCode === 200 ? x : y).body) as { refreshToken: string };
      expect((await t.refresh(winner.refreshToken)).statusCode).toBe(200); // the winner's chain is valid
    });
  });

  it('an already revoked device is refused without rotating anything', async () => {
    const s = await t.signIn();
    await t.repo.revokeDevice(s.shopId, s.deviceId, T0);
    expect((await t.refresh(s.refreshToken)).statusCode).toBe(401);
    expect(await t.repo.rotateRefreshGen(s.shopId, s.deviceId, 0, T0)).toEqual({ kind: 'reuse' });
  });

  it('rotateRefreshGen on the memory twin is shop-scoped and compare-and-set', async () => {
    const s = await t.signIn();
    expect(await t.repo.rotateRefreshGen('other-shop', s.deviceId, 0, T0)).toEqual({ kind: 'reuse' });
    expect(await t.repo.rotateRefreshGen(s.shopId, s.deviceId, 5, T0)).toEqual({ kind: 'reuse' });
    expect(await t.repo.rotateRefreshGen(s.shopId, s.deviceId, 0, T0)).toEqual({ kind: 'rotated', gen: 1 });
    // gen 0 is now current - 1 and inside the window: a retry, rotates again.
    expect(await t.repo.rotateRefreshGen(s.shopId, s.deviceId, 0, T0)).toEqual({ kind: 'rotated', gen: 2 });
    // gen 0 is now current - 2 and the last rotation was a grace one: a lost race, not a replay.
    expect(await t.repo.rotateRefreshGen(s.shopId, s.deviceId, 0, T0)).toEqual({ kind: 'lost_race' });
    // RT-W4-2: gen 1 is current - 1 inside the window, but the last rotation was a grace one: reuse.
    expect(await t.repo.rotateRefreshGen(s.shopId, s.deviceId, 1, T0)).toEqual({ kind: 'reuse' });
  });

  it('a properly signed token with a malformed generation is refused, and one cannot be minted', () => {
    expect(() =>
      mintToken(KEY, { sub: 'a', shop: 'b', dev: 'c', typ: 'refresh', nowSeconds: 1, ttlSeconds: 10, gen: -1 }),
    ).toThrow(/generation/);
    const body = Buffer.from(
      JSON.stringify({ sub: 'a', shop: 'b', dev: 'c', typ: 'refresh', iat: 1, exp: 99, gen: 1.5 }),
    ).toString('base64url');
    const signed = body + '.' + createHmac('sha256', KEY).update(body).digest('base64url');
    expect(() => verifyToken(KEY, signed, 'refresh', 2)).toThrow(TokenInvalid);
  });
});
