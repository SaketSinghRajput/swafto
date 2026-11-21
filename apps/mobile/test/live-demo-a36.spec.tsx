/**
 * LIVE DEMO ON A GALAXY A36 (2026-11-20) - THE UI DEFECTS IT FOUND, REPRODUCED.
 *
 * `qa/swafto-retail-desk/LIVE-DEMO-TEST.md` is a real person on a real phone
 * against the live API. Each case below is one defect from that report, driven
 * through the real Session, Store and screens the way the phone drove them, and
 * each failed before its fix. The report's ids are kept so the two can be read
 * side by side.
 */
import { describe, it, expect } from 'vitest';
import { Session } from '../src/app/session.tsx';
import { App } from '../src/app/App.tsx';
import { Host } from '../src/host.tsx';
import { Store, memoryPort, type StoreState } from '../src/store/index.ts';
import { PhoneNumber } from '../src/screens/A3.tsx';
import { CodeProblem } from '../src/screens/A5.tsx';
import { PartiesList } from '../src/screens/P1.tsx';
import { FormA } from '../src/screens/T7.tsx';
import { ConsentNotice } from '../src/screens/X0.tsx';
import { Segmented } from '../src/components/Shell.tsx';
import { canonicalStore, returnsStore, RETURN_IDS } from '../src/screens/registry.tsx';
import { WEB_PAGE_URLS } from '../src/platform/endpoint.ts';
import { tokens } from '../src/theme/tokens.ts';
import { render, byTestId, all, text } from './render.tsx';
import { canonicalInput, CANONICAL_PARTIES, CANONICAL_DATE } from '@swafto/fixtures';
import { FORM_B_COMMITS } from '../src/screens/entryRoutes.ts';
import { OTP_DIGITS, INVITE_CODE_DIGITS } from '@swafto/values';
import { formatPaise, type Entry } from '@swafto/formula-engine';

const T0 = CANONICAL_DATE + 'T19:00:00.000Z';

const freshState = (): StoreState => {
  const base = canonicalInput();
  return {
    shopId: '11111111-1111-4111-8111-000000000001',
    shopName: 'Test Store QA',
    day: { ...base.day, state: 'open', openingCash: 500000 },
    entries: [],
    parties: CANONICAL_PARTIES,
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
    skippedSections: [],
  };
};

function session(options: { screen?: 'A3' | 'A5' | 'T1'; codeMode?: 'sms' | 'invite' } = {}): Session {
  let n = 0;
  return new Session(new Store(memoryPort(freshState()), () => T0), {
    now: () => T0,
    newId: () => '5a1e0000-0000-4000-8000-' + String(++n).padStart(12, '0'),
    ...(options.screen ? { screen: options.screen } : {}),
    ...(options.codeMode ? { codeMode: options.codeMode } : {}),
  });
}

const type = (s: Session, digits: string) => {
  for (const d of digits) s.press(d as '0');
};
const customer = CANONICAL_PARTIES.find((p) => p.kind === 'customer')!;
const PAY = FORM_B_COMMITS.findIndex((c) => c.section === 'party_payment');
const COLLECT = FORM_B_COMMITS.findIndex((c) => c.section === 'udhar_collection');

describe('S2-1 - Pay supplier never keeps a CUSTOMER as the supplier', () => {
  const armed = () => {
    const s = session();
    s.openSection('udhar_sales');
    // Typed first: HT-22 swallows keys for a moment after the picker closes, and this clock stands still.
    type(s, '700');
    s.chooseEntryParty(customer.id);
    return s;
  };

  it('switching the segment to Pay supplier drops the customer, and the slot asks for a supplier', () => {
    const s = armed();
    s.selectCommit(PAY);
    expect(s.state.entryPartyId).toBeNull();
    const tree = render(<App session={s} />);
    expect(text(byTestId(tree, 't8-party-value'))).toBe('Choose the supplier');
    // No "you owe ₹700" against a customer: no balance is drawn for nobody.
    expect(all(tree).some((n) => n.props?.testID === 't8-party-balance')).toBe(false);
    // The amount he typed survives the change of mode, as it always has.
    expect(s.state.draftPaise).toBe(70000);
  });

  it('a customer stays chosen between the two CUSTOMER segments (credit sale and collect)', () => {
    const s = armed();
    s.selectCommit(COLLECT);
    expect(s.state.entryPartyId).toBe(customer.id);
  });

  it('even with the customer forced back in, Add on Pay supplier saves nothing on this phone (DV-7)', () => {
    const s = armed();
    s.selectCommit(PAY);
    s.chooseEntryParty(customer.id); // what the old build left in the slot
    const before = s.store.state.entries.length;
    s.commit(FORM_B_COMMITS[PAY]!, true);
    expect(s.store.state.entries.length).toBe(before);
    expect(s.state.lastRefusal?.field).toBe('partyId');
  });
});

describe('S3-4 - sign-in names no digit count until the server has said which kind of code', () => {
  it('first run, no reply yet: neutral words, no "6-digit", no "8-digit", and the button does not promise an SMS', () => {
    const tree = render(<App session={session({ screen: 'A3' })} />);
    const help = text(byTestId(tree, 'a3-help'));
    expect(help).not.toMatch(/\d/);
    expect(help).not.toMatch(/send/i);
    expect(text(byTestId(tree, 'a3-send'))).toBe('Next');
  });

  it('after an invite reply: the eight-digit count, and after an SMS reply: the six', () => {
    const invite = session({ screen: 'A3' });
    invite.codeSent(false, { mode: 'invite', digits: INVITE_CODE_DIGITS });
    invite.goTo('A3');
    expect(text(byTestId(render(<App session={invite} />), 'a3-help'))).toContain(String(INVITE_CODE_DIGITS) + '-digit');

    const sms = session({ screen: 'A3' });
    sms.codeSent(false, { mode: 'sms', digits: OTP_DIGITS });
    sms.goTo('A3');
    expect(text(byTestId(render(<App session={sms} />), 'a3-help'))).toContain(String(OTP_DIGITS) + '-digit');
  });

  it('an invite mode kept from the last launch is known, so its count is said at once', () => {
    const tree = render(<App session={session({ screen: 'A3', codeMode: 'invite' })} />);
    expect(text(byTestId(tree, 'a3-help'))).toContain(String(INVITE_CODE_DIGITS) + '-digit');
  });

  it('neutral copy in Hindi and Odia carries no digit either', () => {
    for (const language of ['hi', 'or'] as const) {
      const help = text(byTestId(render(<PhoneNumber mode={null} language={language} />), 'a3-help'));
      expect(help).not.toMatch(/[0-9०-९୦-୯]/);
    }
  });
});

describe('S3-4 - a wrong code is not a dead end', () => {
  const wrong = (mode: 'sms' | 'invite') => {
    const s = session({ screen: 'A3', codeMode: mode });
    s.codeSent(false, { mode, digits: mode === 'invite' ? INVITE_CODE_DIGITS : OTP_DIGITS });
    s.authFailed('mismatch');
    return s;
  };

  it('"Try again" goes straight back to an empty code entry', () => {
    const s = wrong('sms');
    expect(s.state.screen).toBe('A5');
    const tree = render(<App session={s} />);
    expect(text(byTestId(tree, 'a5-try-again'))).toBe('Try again');
    byTestId(tree, 'a5-try-again').props.onPress();
    expect(s.state.screen).toBe('A4');
    expect(s.state.auth.code).toBe('');
    expect(s.state.auth.problem).toBeNull();
  });

  it('in invite mode it also says to ask SWAFTO for a new code - the same words for every wrong code', () => {
    const tree = render(<App session={wrong('invite')} />);
    expect(text(byTestId(tree, 'a5-try-again'))).toBe('Try again');
    expect(text(byTestId(tree, 'a5-ask'))).toBe('Ask SWAFTO for a new code.');
  });

  it('the screen is not titled with the word OTP', () => {
    expect(text(render(<CodeProblem problem="mismatch" />))).not.toMatch(/OTP/);
  });

  it('a lock-out offers no Try again: the server would refuse it', () => {
    const tree = render(<CodeProblem problem="locked" retryAfterSeconds={600} onTryAgain={() => {}} />);
    expect(all(tree).some((n) => n.props?.testID === 'a5-try-again')).toBe(false);
  });
});

describe('S3-6 - a supplier paid in advance reads the same on the Ledger as on Today', () => {
  it('a negative "you owe suppliers" is said as an advance to suppliers, with no minus sign', () => {
    const s = session();
    s.openSection('party_payment');
    type(s, '300');
    s.chooseEntryParty('p-wholesale');
    s.commit(FORM_B_COMMITS[PAY]!, true);
    expect(s.store.primary().p8SupplierOutstanding.value).toBe(-30000);
    const row = byTestId(render(<PartiesList store={s.store} />), 'p1-you-owe');
    expect(text(row)).toContain('Advance to suppliers');
    expect(text(row)).toContain('₹300.00');
    expect(text(row)).not.toContain('-');
  });
});

describe('S3-1 - a returned sale is shown as returned, and stays in the book', () => {
  it('the sale that came back in full says so; the one that came back in part says that', () => {
    const store = returnsStore(canonicalStore());
    const back = (id: string) => store.findEntry(id)!.refersToEntryId!;
    const tree = render(<FormA store={store} />);
    const full = text(byTestId(tree, 't7-line-' + back(RETURN_IDS.pending)));
    const part = text(byTestId(tree, 't7-line-' + back(RETURN_IDS.partial)));
    expect(full).toContain('returned');
    expect(full).not.toContain('part returned');
    expect(part).toContain('part returned');
    // Append-only: the original is still listed, at its original figure.
    const original = store.findEntry(back(RETURN_IDS.pending))!;
    expect(full).toContain(formatPaise(original.amount));
  });
});

describe('S3-8 - a correction being typed survives the process being killed', () => {
  const memoryStorage = (initial: string | null = null) => {
    let held = initial;
    return {
      read: () => held,
      write: (v: string | null) => {
        held = v;
      },
      get raw() {
        return held;
      },
    };
  };
  const TOKENS = {
    accessToken: 'a',
    refreshToken: 'r',
    deviceId: '33333333-3333-4333-8333-000000000001',
    shopId: '11111111-1111-4111-8111-000000000001',
  };
  const boot = (store: Store, draft: ReturnType<typeof memoryStorage>) =>
    new Host({
      baseUrl: 'https://api.example.test',
      fetch: async () => ({ status: 200, json: async () => ({}), text: async () => '{}' }) as never,
      storage: memoryStorage(JSON.stringify(TOKENS)),
      store,
      now: () => T0,
      newId: () => '5a1e0000-0000-4000-8000-000000000999',
      draft,
    });
  const sale: Entry = {
    id: '5a1e0000-0000-4000-8000-000000000001',
    dayId: CANONICAL_DATE,
    section: 'cash_sales',
    amount: 500000,
    mode: 'cash',
    source: 'manual',
    createdAt: T0,
  } as Entry;

  for (const closed of [false, true]) {
    it((closed ? 'closed' : 'open') + ' day: the amount and the entry it corrects come back, and nothing is posted', () => {
      const store = new Store(memoryPort(freshState()), () => T0);
      store.append(sale);
      if (closed) store.close(store.expectedCash().value);
      const draft = memoryStorage();
      const first = boot(store, draft);
      first.session.openCorrection();
      first.session.chooseCorrectionTarget(sale.id);
      type(first.session, '123');
      const entries = store.state.entries.length;
      // the process dies here (Home, `am kill`); a new one starts on the same disk
      const again = boot(store, draft);
      expect(again.session.state.screen).toBe('T16');
      expect(again.session.state.correction?.originalId).toBe(sale.id);
      expect(again.session.state.draftPaise).toBe(12300);
      expect(store.state.entries.length).toBe(entries);
    });
  }

  it('is cleared on save and on leaving the screen', () => {
    const store = new Store(memoryPort(freshState()), () => T0);
    store.append(sale);
    // A correction is for a closed day; on an open one the entry is simply typed again.
    store.close(store.expectedCash().value);
    const draft = memoryStorage();
    const h = boot(store, draft);
    h.session.openCorrection();
    h.session.chooseCorrectionTarget(sale.id);
    type(h.session, '5');
    expect(draft.raw).not.toBeNull();
    h.session.back();
    expect(draft.raw).toBeNull();
    h.session.openCorrection();
    h.session.chooseCorrectionTarget(sale.id);
    type(h.session, '5');
    const posted = h.session.commitCorrection();
    expect(h.session.state.lastRefusal).toBeNull();
    expect(posted).toBe(true);
    expect(draft.raw).toBeNull();
  });
});

describe('S4-1 - a segment that wraps to two rows keeps every chip inside its tray', () => {
  /*
   * The tray was a `pill` (radius 999, clamped to half its height). Two rows tall,
   * its corner arc swept further in than a one-row chip's own pill, so the chosen
   * chip in a corner stuck out through the tray's edge (j2-18, j2-26). A chip is
   * at least `touchTarget` tall, so its pill radius is at least half that; a tray
   * whose radius is no larger contains a chip in any corner at any height.
   */
  for (const display of ['comfort', 'focus'] as const) {
    it(display + ': the tray radius never exceeds the smallest chip radius', () => {
      const t = tokens(display);
      const tree = render(
        <Segmented
          testID="seg"
          display={display}
          value="0"
          onChange={() => {}}
          options={['Cash', 'UPI', 'Other', 'Udhar', 'Shop stock'].map((label, i) => ({ key: String(i), label }))}
        />,
      );
      const tray = byTestId(tree, 'seg').props.style.borderRadius as number;
      expect(tray).toBeLessThanOrEqual(t.touchTarget / 2);
    });
  }
});

describe('S4-3 - the consent notice links to the privacy policy', () => {
  it('a link on the notice, and the app opens the policy page the API serves', () => {
    const opened: string[] = [];
    const s = session();
    s.chooseLanguage('en'); // A2 -> X0, as on a first run
    expect(s.state.screen).toBe('X0');
    const tree = render(<App session={s} onOpenUrl={(u) => opened.push(u)} />);
    expect(text(byTestId(tree, 'x0-privacy'))).toContain('Privacy policy');
    byTestId(tree, 'x0-privacy').props.onPress();
    expect(opened).toEqual([WEB_PAGE_URLS.privacy]);
    expect(WEB_PAGE_URLS.privacy.endsWith('/privacy')).toBe(true);
  });

  it('the link is on the manage (withdrawal) screen too, in every language', () => {
    for (const language of ['en', 'hi', 'or'] as const) {
      expect(() => byTestId(render(<ConsentNotice mode="manage" language={language} />), 'x0-privacy')).not.toThrow();
    }
  });
});
