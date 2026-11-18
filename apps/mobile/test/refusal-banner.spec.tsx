/**
 * NO FINANCIAL CONTROL FAILS SILENTLY.
 *
 * Every `session.*` call `App.tsx` makes that can refuse - commit, the cash
 * count's close, the opening figure, a skip, choosing or creating a party - is
 * driven here through the control `<App>` draws, made to refuse, and the
 * "Not saved" banner is required to appear. Before the banner existed every one
 * of these refusals went into `lastRefusal` and nothing drew it, which on a
 * ledger reads as "saved".
 *
 * Two of the refusals are a WRITE FAILING (a port that throws, as SQLite does
 * on a full disk), because that is the refusal a shopkeeper cannot cause and
 * cannot see coming.
 */
import { describe, it, expect } from 'vitest';
import { Session } from '../src/app/session.tsx';
import { App } from '../src/app/App.tsx';
import { Store, memoryPort, type PersistencePort, type StoreState } from '../src/store/index.ts';
import { render, byTestId, all } from './render.tsx';
import { canonicalInput, CANONICAL_PARTIES, CANONICAL_DATE } from '@swafto/fixtures';

const T0 = CANONICAL_DATE + 'T19:00:00.000Z';

function session(patch: (p: PersistencePort) => PersistencePort = (p) => p): Session {
  const base = canonicalInput();
  const state: StoreState = {
    shopId: 'shop-canonical',
    day: { ...base.day, state: 'open', openingCash: 100000 },
    entries: [],
    parties: CANONICAL_PARTIES,
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
    skippedSections: [],
  };
  let n = 0;
  return new Session(new Store(patch(memoryPort(state)), () => T0), {
    now: () => T0,
    newId: () => 'e' + String(++n),
  });
}

const type = (s: Session, digits: string) => {
  for (const d of digits) s.press(d as '0');
};
const tree = (s: Session) => render(<App session={s} />);
const press = (s: Session, id: string) => byTestId(tree(s), id).props.onPress();
const bannerShown = (s: Session) => all(tree(s)).some((n) => n.props?.testID === 'refusal');
const closeTheDay = (s: Session) => {
  s.goTo('T11');
  type(s, '1000');
  s.confirmCount();
  s.closeDay();
};
const diskFull = () => {
  throw new Error('SQLITE_FULL: database or disk is full');
};

describe('every refusal a financial control can produce reaches the banner', () => {
  it('commit on a closed day (D7) - T7 Add', () => {
    const s = session();
    closeTheDay(s);
    // HT-52: the form itself is refused first, and says so.
    expect(s.openSection('cash_sales')).toBe(false);
    expect(bannerShown(s)).toBe(true);
    // A form already up when the day froze still refuses its Add, out loud.
    s.goTo('T7');
    type(s, '50');
    press(s, 't7-commit');
    expect(s.store.state.entries).toHaveLength(0);
    expect(bannerShown(s)).toBe(true);
  });

  it('commit when the write itself fails - the entry is not silently lost', () => {
    const s = session((p) => ({ ...p, appendAtomically: diskFull }));
    s.openSection('cash_sales');
    type(s, '50');
    press(s, 't7-commit');
    expect(s.store.state.entries).toHaveLength(0);
    expect(s.state.draftPaise).toBe(5000); // still there to retry
    expect(bannerShown(s)).toBe(true);
  });

  it('T12 close with a difference and no reason', () => {
    const s = session();
    s.goTo('T11');
    type(s, '999');
    s.confirmCount();
    expect(s.state.screen).toBe('T12');
    press(s, 't12-close');
    expect(s.store.state.day.state).toBe('open');
    expect(bannerShown(s)).toBe(true);
  });

  it('T13 close when the close write fails', () => {
    const s = session((p) => ({ ...p, putDay: diskFull }));
    s.goTo('T11');
    type(s, '1000');
    s.confirmCount();
    press(s, 't13-close');
    expect(s.state.screen).toBe('T13');
    expect(bannerShown(s)).toBe(true);
  });

  it('T6 opening cash when it is already set', () => {
    const s = session();
    s.goTo('T6');
    type(s, '500');
    press(s, 't6-confirm');
    expect(s.store.state.day.openingCash).toBe(100000);
    expect(bannerShown(s)).toBe(true);
  });

  it('T5 skip on a closed day (F-7)', () => {
    const s = session();
    closeTheDay(s);
    s.goTo('T5');
    /*
     * Lead ruling 2026-10-25 (Agent 1 vs Agent 2): a closed day draws NO skip
     * control - a control whose only outcome is a refusal should not exist.
     * Both halves are held: it is not drawn, and if a skip reaches the session
     * anyway, the refusal is still shown rather than thrown.
     */
    const skip = all(tree(s)).find((n) => String(n.props?.testID ?? '').startsWith('t5-skip-'));
    expect(skip).toBeUndefined();
    s.skipSection('withdrawal');
    expect(bannerShown(s)).toBe(true);
  });

  it('choosing a party that is no longer in the book', () => {
    const s = session();
    s.openSection('udhar_sales');
    s.openPartyPicker();
    s.chooseEntryParty('gone');
    expect(s.state.entryPartyId).toBeNull();
    expect(bannerShown(s)).toBe(true);
  });

  it('creating a party when the write fails', () => {
    const s = session((p) => ({ ...p, putParty: diskFull }));
    s.openSection('udhar_sales');
    press(s, 't8-party');
    press(s, 't8-picker-add');
    byTestId(tree(s), 't8-picker-new-name').props.onChangeText('Ramesh');
    press(s, 't8-picker-new-save');
    expect(s.state.entryPartyId).toBeNull();
    expect(bannerShown(s)).toBe(true);
  });
});
