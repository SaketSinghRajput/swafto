/**
 * §2.3 · AN EVENT SYNCS WHOLE OR NOT AT ALL (EX-5), AND THE SERVER RUNS THE
 * PHONE'S SETTLEMENT RULE (EX-12). Against the in-memory repository, which the
 * equivalence run keeps honest with Postgres.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp, type AppDeps } from '../src/app.ts';
import { testDeps } from './_deps.ts';
import { memoryRepo } from '../src/db/memory.ts';
import { StubSmsPort } from '../src/sms/stub.ts';
import { NOTICE_VERSION } from '../src/dpdp/routes.ts';

const KEY = 'test-signing-key-at-least-32-chars!!';
const T0 = '2026-09-19T08:00:00.000Z';
const DAY = '2026-09-19';
const AT = '2026-09-19T10:00:00.000Z';

function harness() {
  const sms = new StubSmsPort();
  const repo = memoryRepo();
  const deps: AppDeps = testDeps({ repo, sms });
  return { repo, sms, app: buildApp(deps) };
}

type H = ReturnType<typeof harness>;

async function signIn(h: H, phone: string): Promise<{ token: string; shopId: string }> {
  await h.app.inject({
    method: 'POST',
    url: '/v1/auth/otp/request',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify({ phone, language: 'en' }),
  });
  const code = h.sms.forPhone(phone).at(-1)!.variables[0]!;
  const res = await h.app.inject({
    method: 'POST',
    url: '/v1/auth/otp/verify',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify({
      phone,
      code,
      device: { platform: 'android' },
      shopName: 'Test Kirana',
      consent: { granted: true, noticeVersion: NOTICE_VERSION, locale: 'en' },
    }),
  });
  const body = JSON.parse(res.body) as { accessToken: string; shopId: string };
  return { token: body.accessToken, shopId: body.shopId };
}

let n = 0;
const uid = () => `01890000-0000-4000-8000-${String((n += 1)).padStart(12, '0')}`;

const push = (h: H, token: string, entries: object[]) =>
  h.app.inject({
    method: 'POST',
    url: '/v1/sync/push',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
    payload: JSON.stringify({ days: [{ date: DAY, state: 'open', openingCash: 0 }], entries }),
  });

const row = (section: string, amount: number, mode: string, refersToEntryId?: string) => ({
  id: uid(),
  dayId: DAY,
  section,
  amount,
  mode,
  createdAt: AT,
  ...(refersToEntryId ? { refersToEntryId } : {}),
});

describe('an event over sync', () => {
  let h: H;
  let me: { token: string; shopId: string };
  beforeEach(async () => {
    h = harness();
    me = await signIn(h, '+919876500011');
  });

  it('a return and its refund, pushed together, both land', async () => {
    const sale = row('cash_sales', 90000, 'cash');
    const ret = row('sales_return', 90000, 'other', sale.id);
    const refund = row('refund_paid', 90000, 'cash', ret.id);
    const res = JSON.parse((await push(h, me.token, [sale, ret, refund])).body);
    expect(res.rejected).toEqual([]);
    expect(res.entriesInserted).toBe(3);
    expect((await h.repo.entriesReferringTo(me.shopId, ret.id)).map((e) => e.id)).toEqual([refund.id]);
  });

  it('half an exchange never lands: one refused leg rejects every leg', async () => {
    const sale = row('cash_sales', 90000, 'cash');
    await push(h, me.token, [sale]);
    const ret = row('sales_return', 90000, 'other', sale.id);
    const out = row('exchange_out', 120000, 'other', ret.id);
    // On udhar with nobody named: the parser refuses this leg.
    const diff = row('exchange_receipt', 30000, 'udhar', ret.id);
    const res = JSON.parse((await push(h, me.token, [ret, out, diff])).body);
    expect(res.rejected.map((r: { id: string }) => r.id).sort()).toEqual([ret.id, out.id, diff.id].sort());
    expect(await h.repo.findEntry(me.shopId, ret.id)).toBeNull();
    expect(await h.repo.findEntry(me.shopId, out.id)).toBeNull();
  });

  it('a second refund of the same return is refused by the server too (EX-12)', async () => {
    const sale = row('cash_sales', 90000, 'cash');
    const ret = row('sales_return', 90000, 'other', sale.id);
    await push(h, me.token, [sale, ret, row('refund_paid', 90000, 'cash', ret.id)]);
    const twice = row('refund_paid', 90000, 'cash', ret.id);
    const res = JSON.parse((await push(h, me.token, [twice])).body);
    expect(res.rejected).toEqual([expect.objectContaining({ id: twice.id, field: 'amount' })]);
    expect(await h.repo.entriesReferringTo(me.shopId, ret.id)).toHaveLength(1);
  });

  it('a replayed event is idempotent, not a second refund', async () => {
    const sale = row('cash_sales', 90000, 'cash');
    const ret = row('sales_return', 90000, 'other', sale.id);
    const batch = [sale, ret, row('refund_paid', 90000, 'cash', ret.id)];
    await push(h, me.token, batch);
    const again = JSON.parse((await push(h, me.token, batch)).body);
    expect(again.rejected).toEqual([]);
    expect(again.entriesInserted).toBe(0);
  });

  it("the repository itself refuses a link into another shop, as the composite FK does (S-11)", async () => {
    const other = await signIn(h, '+919876500013');
    const theirs = row('cash_sales', 90000, 'cash');
    await push(h, other.token, [theirs]);
    await push(h, me.token, []);
    const ret = { ...row('sales_return', 90000, 'other', theirs.id), source: 'manual' } as never;
    await expect(h.repo.appendEntry(me.shopId, ret)).rejects.toMatchObject({ constraintName: 'entries_refers_fk' });
  });

  it("a return cannot point at another shop's sale (S-11)", async () => {
    const theirs = row('cash_sales', 90000, 'cash');
    const other = await signIn(h, '+919876500012');
    await push(h, other.token, [theirs]);
    const ret = row('sales_return', 90000, 'other', theirs.id);
    const res = JSON.parse((await push(h, me.token, [ret])).body);
    expect(res.rejected).toEqual([expect.objectContaining({ id: ret.id, field: 'refersToEntryId' })]);
  });
});
