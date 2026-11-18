/**
 * M3: THE HOST'S NETWORK HALF FOR S13 AND S14, AND THE TEXT SIZE KEPT.
 *
 * Driven through the real Host with a fake `fetch` - the same seam the other
 * host specs use - so what is asserted is the request that leaves the phone
 * and what the session says afterwards, not a mock's opinion of either.
 */
import { describe, it, expect } from 'vitest';
import { Host } from '../src/host.tsx';
import { Store, memoryPort, type StoreState } from '../src/store/index.ts';
import type { DeviceBridge } from '../src/platform/device.ts';
import { canonicalInput, CANONICAL_PARTIES, CANONICAL_DATE } from '@swafto/fixtures';

const T0 = CANONICAL_DATE + 'T12:00:00.000Z';

function memoryStorage(initial: string | null = null) {
  let held = initial;
  return {
    read: () => held,
    write: (value: string | null) => {
      held = value;
    },
  };
}

interface Seen {
  method: string;
  url: string;
}

const TOKENS = JSON.stringify({
  accessToken: 'a',
  refreshToken: 'r',
  deviceId: 'dev-this',
  shopId: '11111111-1111-4111-8111-000000000001',
});

function boot(answer: (req: Seen) => { status: number; body: unknown } | 'offline', opts: { prefs?: string } = {}) {
  const seen: Seen[] = [];
  const shared: { name: string; mime: string; text: string }[] = [];
  const base = canonicalInput();
  const state: StoreState = {
    shopName: 'Test Store',
    shopId: '11111111-1111-4111-8111-000000000001',
    day: { ...base.day, state: 'open', openingCash: 0 },
    entries: [],
    parties: CANONICAL_PARTIES,
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
    skippedSections: [],
  };
  const prefs = memoryStorage(opts.prefs ?? null);
  const host = new Host({
    baseUrl: 'https://api.example.test',
    fetch: async (url: string, init?: { method?: string }) => {
      const req = { method: init?.method ?? 'GET', url };
      seen.push(req);
      const a = answer(req);
      if (a === 'offline') throw new TypeError('Network request failed');
      return { status: a.status, text: async () => JSON.stringify(a.body) };
    },
    storage: memoryStorage(TOKENS),
    store: new Store(memoryPort(state), () => T0),
    now: () => T0,
    newId: () => '5a1e0000-0000-4000-8000-000000000999',
    prefs,
    device: {
      isDeviceSecure: async () => true,
      confirmCredential: async () => 'ok',
      shareTextFile: async (name: string, mime: string, text: string) => {
        shared.push({ name, mime, text });
      },
    } as DeviceBridge,
  });
  return { host, seen, shared, prefs };
}

describe('S13 - the export goes to the share sheet, or says why it did not', () => {
  it('asks /v1/me/export once and hands the answer to the share sheet as a JSON file', async () => {
    const { host, seen, shared } = boot(() => ({ status: 200, body: { phone: '+919876543210', entries: [] } }));
    host.session.openYourData();
    await host.exportMyData();
    expect(seen.map((r) => r.method + ' ' + new URL(r.url).pathname)).toEqual(['GET /v1/me/export']);
    expect(shared).toHaveLength(1);
    expect(shared[0]!.mime).toBe('application/json');
    expect(JSON.parse(shared[0]!.text)).toEqual({ phone: '+919876543210', entries: [] });
    expect(host.session.state.myData).toBe('done');
  });

  it('offline is said as offline, and nothing is shared', async () => {
    const { host, shared } = boot(() => 'offline');
    await host.exportMyData();
    expect(host.session.state.myData).toBe('offline');
    expect(shared).toEqual([]);
  });
});

describe('S14 - the server lists the phones, and a sign-out is sent only for the one he chose', () => {
  const LIST = {
    devices: [
      { id: 'dev-this', platform: 'android', createdAt: T0, lastSeenAt: T0, revokedAt: null, current: true },
      { id: 'dev-old', platform: 'android', createdAt: T0, lastSeenAt: T0, revokedAt: null, current: false },
    ],
  };

  it('loads the list from /v1/devices - no shop id in the request', async () => {
    const { host, seen } = boot(() => ({ status: 200, body: LIST }));
    host.session.openDevices();
    expect(host.session.state.devices?.status).toBe('loading');
    await host.loadDevices();
    expect(seen.map((r) => r.method + ' ' + r.url.replace('https://api.example.test', ''))).toEqual(['GET /v1/devices']);
    expect(host.session.state.devices?.list.map((d) => d.id)).toEqual(['dev-this', 'dev-old']);
  });

  it('a malformed answer is an error, never a list of blanks', async () => {
    const { host } = boot(() => ({ status: 200, body: { devices: [{ platform: 'android' }] } }));
    host.session.openDevices();
    await host.loadDevices();
    expect(host.session.state.devices?.status).toBe('error');
  });

  it('confirming revokes exactly that device, then asks the server again', async () => {
    const { host, seen } = boot(() => ({ status: 200, body: LIST }));
    host.session.openDevices();
    await host.loadDevices();
    host.session.askSignOut('dev-old');
    await host.signOutDevice('dev-old');
    expect(seen.map((r) => r.method + ' ' + r.url.replace('https://api.example.test', ''))).toEqual([
      'GET /v1/devices',
      'POST /v1/auth/devices/dev-old/revoke',
      'GET /v1/devices',
    ]);
    expect(host.session.state.devices?.done).toBe(true);
    expect(host.session.state.devices?.confirm).toBeNull();
  });
});

describe('the text size is kept between launches - and an old prefs string is untouched', () => {
  it('Large is written and read back; Normal writes nothing new', () => {
    const first = boot(() => ({ status: 200, body: {} }));
    first.host.session.setLanguage('or');
    expect(first.prefs.read()).toBe(JSON.stringify({ language: 'or', display: 'comfort' }));
    first.host.session.setTextSize('large');
    expect(JSON.parse(first.prefs.read() as string)).toEqual({ language: 'or', display: 'comfort', textSize: 'large' });

    const again = boot(() => ({ status: 200, body: {} }), { prefs: first.prefs.read() as string });
    expect(again.host.session.state.textSize).toBe('large');

    const junk = boot(() => ({ status: 200, body: {} }), { prefs: JSON.stringify({ textSize: 'huge' }) });
    expect(junk.host.session.state.textSize).toBeUndefined();
  });
});
