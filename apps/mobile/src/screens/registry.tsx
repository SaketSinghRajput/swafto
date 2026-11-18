/**
 * EVERY SCREEN, IN EVERY STATE WORTH LOOKING AT - ONE LIST, TWO CONSUMERS.
 *
 * B26 says "contrast ratio on every rendered screen", and the honest reading of
 * "every" is a list that a screen joins by existing rather than by somebody
 * remembering to add it to a test. The alternative - repeating the accessibility
 * block in ten screen specs - reaches screen six and starts diverging, which is the
 * failure this build has already named in several other costumes.
 *
 * TWO CONSUMERS, DELIBERATELY. `screens.spec.tsx` asserts over this list, and the
 * contact sheet renders from it. That means the panels a human looks at and the
 * cases the instruments measure cannot drift apart: there is no third place where a
 * state could exist unmeasured, or be measured but never seen.
 *
 * WHY CASES AND NOT SCREENS. A screen is not one thing. T7 loaded against the
 * canonical shop and T7 in Odia against the adversarial shop fail differently, and
 * the second is where the failures live. A case is the smallest unit an instrument
 * can actually be pointed at.
 *
 * `sheet: false` keeps a case out of the contact sheet while still measuring it.
 * The sheet is for a human and a human will not look at forty near-identical
 * panels; the instruments have no such limit and should cover more.
 */
import { cloneElement, type ReactElement } from 'react';
import { FormA } from './T7.tsx';
import { Today } from './T1.tsx';
import { DayCloseList } from './T5.tsx';
import { OpeningCash } from './T6.tsx';
import { FormB } from './T8.tsx';
import { FormC } from './T9.tsx';
import { FormD } from './T10.tsx';
import { CashCheck } from './T11.tsx';
import { CashDifference } from './T12.tsx';
import { DayClosed } from './T14.tsx';
import { Adjustment } from './T19.tsx';
import { ConsentNotice } from './X0.tsx';
import { TodayFirstRun } from './T2.tsx';
import { TodayClosed } from './T3.tsx';
import { CashBalanced } from './T13.tsx';
import { Onboarding } from './X1.tsx';
import { PartiesList } from './P1.tsx';
import { CustomerDetail } from './P2.tsx';
import { SupplierDetail } from './P3.tsx';
import { Settings } from './S1.tsx';
import { About } from './S5.tsx';
import { Help } from './S6.tsx';
import { AppLocked } from './S11.tsx';
import { ShopProfile } from './S2.tsx';
import { LanguageSettings } from './S3.tsx';
import { DeleteAccount } from './S7.tsx';
import { ConfirmDelete } from './S8.tsx';
import { Reports } from './R1.tsx';
import { Dashboard } from './M1.tsx';
import { PrivacySettings } from './S4.tsx';
import { Splash } from './A1.tsx';
import { LanguageChoice } from './A2.tsx';
import { PhoneNumber } from './A3.tsx';
import { CodeEntry } from './A4.tsx';
import { CodeProblem } from './A5.tsx';
import { SessionExpired } from './A6.tsx';
import { NumberChanged } from './A7.tsx';
import { LogoutConfirm } from './A8.tsx';
import { ReturnOrExchange } from './T18.tsx';
import { CorrectDay } from './T16.tsx';
import { Session, type ChatState, type ReturnFlow } from '../app/session.tsx';
import { Ask } from './C1.tsx';
import { YourPlan } from './S10.tsx';
import { PREMIUM_PRICES, type PlanAnswer } from '../app/plan.ts';
import type { ProductsResult } from '../net/billing.ts';
import { ItemsForSale } from './I1.tsx';
import { YourItems } from './S9.tsx';
import { CreditLimit } from './P6.tsx';
import { AccountantExport } from './S12.tsx';
import { YourData } from './S13.tsx';
import { SignedInPhones, type DeviceView, type DevicesState } from './S14.tsx';
import { CONSENT_PURPOSES } from '@swafto/values';
import { WEB_PAGE_URLS } from '../platform/endpoint.ts';
import { Store, memoryPort, type StoreState } from '../store/index.ts';
import type { RenderLanguage } from '../i18n/strings.ts';
import type { Mode as DisplayMode } from '../theme/tokens.ts';
import {
  canonicalInput,
  CANONICAL_PARTIES,
  adversarialInput,
  ADVERSARIAL_PARTIES,
  ADVERSARIAL_SHOP,
  closedCanonical,
  closedAdversarialWithDifference,
  CANONICAL_DATE,
} from '@swafto/fixtures';
import {
  addDays,
  buildReturnEvent,
  divideMoney,
  expectedCashBalance,
  subtract,
  SECTIONS,
  type DayInput,
  type DayRecord,
  type Entry,
  type Party,
} from '@swafto/formula-engine';

const storeOf = (input: DayInput, parties: readonly Party[], shopId: string): Store => {
  const state: StoreState = {
    shopId,
    day: input.day,
    entries: input.entries,
    parties,
    priorCreditOutstanding: input.priorCreditOutstanding,
    priorSupplierOutstanding: input.priorSupplierOutstanding,
    skippedSections: [],
  };
  // A fixture is "the day, now": its clock is pinned to the day, so a stale-day check never depends on when the suite runs.
  return new Store(memoryPort(state), () => state.day.date + 'T12:00:00.000+05:30');
};

export const canonicalStore = (): Store =>
  storeOf(canonicalInput(), CANONICAL_PARTIES, 'shop-canonical');

export const adversarialStore = (): Store =>
  storeOf(adversarialInput(), ADVERSARIAL_PARTIES, 'shop-adversarial');

/** A day with nothing entered - the first morning of a real shop. */
export const emptyStore = (): Store => {
  const base = canonicalInput();
  return storeOf({ ...base, entries: [] }, CANONICAL_PARTIES, 'shop-canonical');
};

/**
 * NOTHING CARRIED AND NOTHING ENTERED - the state T2 exists for, and the one
 * combination none of the three stores above holds.
 *
 * `canonicalStore` opens with cash carried from yesterday; `emptyStore` has no
 * entries but still carries that figure; `adversarialStore` has a null opening
 * but a full day against it. Registering T2 with any of them would render a
 * contact-sheet panel of a screen whose own subject is absent from its data -
 * the panel would show a started day, with the one action disabled.
 */
export const firstRunStore = (): Store => {
  const base = canonicalInput();
  return storeOf(
    { ...base, day: { ...base.day, openingCash: null }, entries: [] },
    CANONICAL_PARTIES,
    'shop-canonical',
  );
};

/**
 * A day that has actually been closed, for T3.
 *
 * `closedCanonical()` carries a FIXED `closedAt`, which matters more than it
 * looks: a store closed at render time would stamp the current clock, and the
 * committed PNG would differ on every machine that regenerated it. A contact
 * sheet nobody can reproduce is a contact sheet nobody can diff.
 */
export const closedStore = (): Store =>
  storeOf(closedCanonical(), CANONICAL_PARTIES, 'shop-canonical');

/**
 * THE ADVERSARIAL DAY, CLOSED - the only state in which R1 has anything to show
 * against the hostile shop.
 *
 * R1 is empty until a day has been closed, which is the honest answer and also
 * the one that would make its adversarial panel useless: rendering the lakh
 * figures and the longest Odia labels is the entire reason that case exists, and
 * against an OPEN day the case would quietly become a second copy of the empty
 * panel. So the case is built in the state the screen is for, exactly as T13's
 * is - a balanced cash check rendered against an unbalanced store shows the
 * disabled state, which is the opposite of the screen's subject.
 *
 * `closedAdversarialWithDifference()` takes its counted figure from the engine
 * and carries a fixed `closedAt`, so the panel is reproducible on any machine.
 */
export const closedAdversarialStore = (): Store =>
  storeOf(closedAdversarialWithDifference(), ADVERSARIAL_PARTIES, 'shop-adversarial');

/**
 * THE CANONICAL SHOP WITH THIRTY CLOSED DAYS BEHIND IT - the only store in which
 * R1's trends and scores are past their gates, so the only one whose panels show
 * them rather than the gate sentence.
 *
 * Each earlier day is the canonical day's entries with one of them left out in
 * turn, so sales move from day to day without a figure being invented. Counted
 * cash is the ENGINE's expected figure, short by 100.00 on every sixth day so
 * the deficit count is not zero. Sections with nothing in them are skipped, as
 * the close requires. Dates are fixed, so the panel is reproducible anywhere.
 */
export const historyStore = (days = 30): Store => {
  const today = closedCanonical();
  const pastDays: DayRecord[] = [];
  const pastEntries: Entry[] = [];
  for (let i = days; i >= 1; i -= 1) {
    const date = addDays(CANONICAL_DATE, -i);
    const entries = today.entries
      .filter((_, k) => k % 12 !== i % 12)
      .map((e) => ({ ...e, id: `h${i}-${e.id}`, dayId: date, createdAt: `${date}T20:00:00.000Z` }));
    const open: DayRecord = { ...today.day, date, state: 'open', countedCash: null, skippedSections: [] };
    const expected = expectedCashBalance({ ...today, day: open, entries }).value;
    pastDays.push({
      ...open,
      state: 'closed',
      countedCash: i % 6 === 0 ? subtract(expected, 10000) : expected,
      ...(i % 6 === 0 ? { differenceReason: 'unknown' } : {}),
      skippedSections: SECTIONS.filter((s) => !entries.some((e) => e.section === s)),
      closedAt: `${date}T21:10:00.000Z`,
    });
    pastEntries.push(...entries);
  }
  const state: StoreState = {
    shopId: 'shop-canonical',
    day: today.day,
    entries: today.entries,
    parties: CANONICAL_PARTIES,
    priorCreditOutstanding: today.priorCreditOutstanding,
    priorSupplierOutstanding: today.priorSupplierOutstanding,
    skippedSections: [],
    pastDays,
    pastEntries,
  };
  // A fixture is "the day, now": its clock is pinned to the day, so a stale-day check never depends on when the suite runs.
  return new Store(memoryPort(state), () => state.day.date + 'T12:00:00.000+05:30');
};

/**
 * A DAY WITH RETURNS IN IT, BUILT THE WAY THE APP BUILDS THEM - through
 * `buildReturnEvent` and `store.appendEvent`, never as hand-typed rows, so a
 * fixture can never hold an event the engine would refuse.
 *
 * Two events on the shop's own sales: part of the first cash sale came back and
 * was refunded in cash (so that sale is offered as "part returned"), and the
 * first credit sale came back in full with nothing paid out yet (so it is the
 * return still to settle - and, being in full, is no longer offered). The
 * figures are per shop, because the adversarial shop's lakh-scale sales are the
 * point of its panels: typed constants, not a fraction computed here.
 */
export const RETURN_IDS = { partial: 'ret-part', pending: 'ret-pending' } as const;
export const returnsStore = (store: Store): Store => {
  const big = store.state.shopId === 'shop-adversarial';
  const at = store.state.day.date + 'T19:00:00.000Z';
  const cash = store.state.entries.find((e) => e.section === 'cash_sales');
  const udhar = store.state.entries.find((e) => e.section === 'udhar_sales');
  const record = (sale: typeof cash, id: string, returned: number, settlement: 'cash' | 'pending') => {
    if (sale === undefined) return;
    store.appendEvent(
      buildReturnEvent({
        sale,
        ledger: store.entriesReferringTo(sale.id),
        dayId: store.state.day.date,
        createdAt: at,
        ids: [id, id + '-1', id + '-2'],
        returned,
        settlement,
      }),
    );
  };
  record(cash, RETURN_IDS.partial, big ? 12345600 : 120000, 'cash');
  if (udhar !== undefined) record(udhar, RETURN_IDS.pending, udhar.amount, 'pending');
  return store;
};

/**
 * PR-1: a store with his item list and two lines on the first cash sale - what
 * I1 and S9 draw. The adversarial shop gets the longest names its list allows.
 */
export const ITEM_IDS = ['item-atta', 'item-dal', 'item-tea'] as const;
export const itemsStore = (store: Store): Store => {
  const big = store.state.shopId === 'shop-adversarial';
  const at = store.state.day.date + 'T19:30:00.000Z';
  const names = big
    ? ['Aashirvaad whole wheat atta 10kg bag', 'Toor dal unpolished 5kg', 'Tata Tea Gold 1kg pack']
    : ['Atta 5kg', 'Dal', 'Tea'];
  ITEM_IDS.forEach((id, i) => store.addItem({ id, name: names[i]!, createdAt: at }));
  // Today's sale: a line on an earlier day's sale is refused, as on the phone.
  const sale = store.state.entries.find((e) => e.section === 'cash_sales' && e.dayId === store.state.day.date);
  if (sale !== undefined) {
    store.addItemLine({ id: 'line-1', dayId: sale.dayId, entryId: sale.id, itemId: ITEM_IDS[0], quantity: 2, amount: divideMoney(sale.amount, 2, 'floor'), createdAt: at });
    store.addItemLine({ id: 'line-2', dayId: sale.dayId, entryId: sale.id, quantity: 1, amount: divideMoney(sale.amount, 4, 'floor'), createdAt: at });
  }
  return store;
};

/** The session's T18 state, as a case wants it: the list, unless a field says otherwise. */
const flowOf = (over: Partial<ReturnFlow>): ReturnFlow => ({
  saleId: null,
  settleId: null,
  settlement: 'cash',
  field: 'returned',
  returned: null,
  replacement: null,
  differenceMode: 'cash',
  settleMode: 'cash',
  recordedId: null,
  ...over,
});

/**
 * The shop name X1 shows once it has been answered. A literal rather than a
 * fixture read: X1 holds no store, because it runs before one exists.
 */
const CANONICAL_SHOP_NAME = 'Sharma Kirana Store';

/**
 * A VERSION STRING FOR THE PANEL, AND NOT A CLAIM ABOUT THE SHIPPED BUILD.
 *
 * S5 takes its version as a prop precisely so no file in the app holds one. The
 * cases still have to render the row, or its layout is the one thing on the
 * screen that `check:layout` never measures - so the fixture carries a value
 * here, in the list of things that exist to be looked at, rather than in the
 * screen. It is a FIXTURE: when the real build string differs from this, the
 * screen is right and this line is merely stale.
 */
const FIXTURE_VERSION = '1.0';

/**
 * The first party of a kind in whichever shop the case is rendering.
 *
 * P2 and P3 need a party id, and the canonical and adversarial shops do not
 * share one - hardcoding `p-ramesh` would make the adversarial case silently
 * render the empty state, which is the case that exists to stress long names.
 */
const firstOf = (store: Store, kind: Party['kind']): string =>
  store.state.parties.find((p) => p.kind === kind)?.id ?? '';

/**
 * S10's PLAN ANSWERS, AS THE SERVER SHAPES THEM - fixtures, not a claim about
 * any account. The stamps sit at 12:00 UTC so the date they render is the same
 * calendar day in every timezone a build agent might run in.
 *
 * The default is THIS BUILD'S TRUE STATE: Free, a preview not yet taken, and
 * buying not open, because Play is not set up (R4-HA1/3/4).
 */
export const planAnswer = (over: Partial<PlanAnswer['entitlement']> = {}, buying = false): PlanAnswer => ({
  entitlement: {
    plan: 'free',
    source: null,
    until: null,
    renews: false,
    basePlanId: null,
    state: null,
    previewAvailable: true,
    previewEndsAt: null,
    everPremium: false,
    asOf: '2026-10-26T12:00:00.000Z',
    ...over,
  },
  buying: buying
    ? { packageName: 'com.swafto', productId: 'swafto_premium', accountId: 'fixture-account' }
    : null,
});

/** Play's offer as `parseProducts` returns it, priced at R5's decision. */
export const READY_OFFER: ProductsResult = {
  kind: 'ready',
  plans: [
    { basePlanId: 'monthly', offerToken: 'fx-m', pricePaise: PREMIUM_PRICES.monthly, formattedPrice: '', billingPeriod: 'P1M' },
    { basePlanId: 'yearly', offerToken: 'fx-y', pricePaise: PREMIUM_PRICES.yearly, formattedPrice: '', billingPeriod: 'P1Y' },
  ],
};
export const CLOSED_OFFER: ProductsResult = { kind: 'unavailable', reason: 'buying is not open' };

export const PREMIUM_RENEWING = planAnswer(
  {
    plan: 'premium',
    source: 'purchase',
    until: '2026-11-26T12:00:00.000Z',
    renews: true,
    basePlanId: 'monthly',
    state: 'SUBSCRIPTION_STATE_ACTIVE',
    previewAvailable: false,
    everPremium: true,
  },
  true,
);
/** R5 FR-6: a limit he set on the first customer, so P6 and the observation have one. */
const withLimit = (store: Store, limit: number): string => {
  const partyId = firstOf(store, 'customer');
  if (store.creditLimit(partyId) === null) {
    store.setCreditLimit({ id: 'limit-' + partyId, partyId, limit, setAt: CANONICAL_DATE + 'T09:00:00.000Z' });
  }
  return partyId;
};

export interface ScreenCase {
  /** Stable: it becomes a PNG filename and a test name. */
  readonly id: string;
  /** Which screen from the build map this case belongs to, for traceability. */
  readonly screen: string;
  readonly caption: string;
  readonly language: RenderLanguage;
  readonly display: DisplayMode;
  /** Whether a human sees this one on the contact sheet. */
  readonly sheet: boolean;
  /** Fresh on every call - a case that shared a store with another would not be one. */
  readonly element: () => ReactElement;
}

/**
 * The four cases every screen must have, produced rather than retyped.
 *
 * `screens.spec.tsx` REQUIRES each screen to have an adversarial case, an Odia
 * case and a Focus case. Writing those by hand for ten screens is forty near
 * identical objects and one screen that quietly ends up with three of them -
 * which the spec would then catch, after somebody spent an afternoon on it.
 * Producing them means a screen cannot be registered incompletely.
 *
 * A screen with states the others do not have - T7's loading panel, T1's first
 * morning - adds those explicitly alongside.
 */
const standardCases = (
  screen: string,
  title: string,
  render: (store: Store, language: RenderLanguage, display: DisplayMode) => ReactElement,
  options: { readonly sheet?: boolean } = {},
): ScreenCase[] => {
  const onSheet = options.sheet ?? true;
  return [
    {
      id: screen + '-canonical',
      screen,
      caption: title + ' - canonical shop, English, Comfort',
      language: 'en',
      display: 'comfort',
      sheet: onSheet,
      element: () => render(canonicalStore(), 'en', 'comfort'),
    },
    {
      id: screen + '-adversarial',
      screen,
      caption: title + ' - adversarial shop, Odia, Comfort',
      language: 'or',
      display: 'comfort',
      sheet: onSheet,
      element: () => render(adversarialStore(), 'or', 'comfort'),
    },
    {
      id: screen + '-adversarial-focus',
      screen,
      caption: title + ' - adversarial shop, Odia, Focus mode',
      language: 'or',
      display: 'focus',
      sheet: false,
      element: () => render(adversarialStore(), 'or', 'focus'),
    },
    {
      id: screen + '-longest',
      screen,
      caption: title + ' - longest strings at the largest type, the worst case',
      language: 'longest',
      display: 'focus',
      sheet: false,
      element: () => render(adversarialStore(), 'longest', 'focus'),
    },
  ];
};

/** The number the reference shows on A3, A4, A6 and A8 (store.js jump). Synthetic. */
const CASE_PHONE = '9876543210';

/** The shop as each store names it: the canonical name, or the adversarial one. */
const shopNameOf = (store: Store): string =>
  store.state.shopId === ADVERSARIAL_SHOP.id ? ADVERSARIAL_SHOP.name : CANONICAL_SHOP_NAME;

/**
 * One extra state of an A-series screen, in English Comfort, on the sheet.
 * `cloneElement` hands it the language and display so the element literal in
 * the list stays the state and nothing else.
 */
const authCase = (screen: string, id: string, caption: string, el: ReactElement): ScreenCase => ({
  id,
  screen,
  caption,
  language: 'en',
  display: 'comfort',
  sheet: true,
  element: () => cloneElement(el, { language: 'en', display: 'comfort' } as never),
});

export const SCREEN_CASES: readonly ScreenCase[] = [
  ...standardCases('T2', 'T2 Today - the first run', (_store, language, display) => (
    <TodayFirstRun store={firstRunStore()} language={language} display={display} />
  )),
  ...standardCases('T3', 'T3 Today - already closed', (_store, language, display) => (
    <TodayClosed store={closedStore()} language={language} display={display} />
  )),
  /*
   * T13 is reached ONLY when counted equals expected, so the case has to be
   * built that way rather than handed an arbitrary figure - a balanced screen
   * rendered against an unbalanced store would show the disabled state, which is
   * the opposite of the moment S03 says this screen is for.
   */
  ...standardCases('T13', 'T13 Cash check - it matches', (store, language, display) => (
    <CashBalanced
      store={store}
      countedPaise={store.expectedCash().value}
      language={language}
      display={display}
    />
  )),
  ...standardCases('X1', 'X1 Onboarding - four questions', (_store, language, display) => (
    <Onboarding
      language={language}
      display={display}
      shopName={CANONICAL_SHOP_NAME}
    />
  )),
  /*
   * X1 WITH THE KEYPAD UP. The standard cases are the reference picture -
   * question 4 untouched, no keypad. These two are the state check:layout must
   * also hold: ten keys plus the CTA in the footer, at the worst case.
   */
  {
    id: 'X1-keypad',
    screen: 'X1',
    caption: 'X1 Onboarding - answering question 4, the keypad up',
    language: 'en',
    display: 'comfort',
    sheet: true,
    element: () => (
      <Onboarding
        language="en"
        display="comfort"
        shopName={CANONICAL_SHOP_NAME}
        openingCashPaise={250000}
        keypadOpen
      />
    ),
  },
  {
    id: 'X1-keypad-longest',
    screen: 'X1',
    caption: 'X1 Onboarding - keypad up, longest strings at the largest type',
    language: 'longest',
    display: 'focus',
    sheet: false,
    element: () => (
      <Onboarding language="longest" display="focus" openingCashPaise={12345678} keypadOpen />
    ),
  },
  {
    id: 'X1-unanswered',
    screen: 'X1',
    caption: 'X1 Onboarding - before any question is answered. The state it is designed around.',
    language: 'or',
    display: 'comfort',
    sheet: true,
    element: () => <Onboarding language="or" display="comfort" />,
  },
  ...standardCases('P1', 'P1 Parties', (store, language, display) => (
    <PartiesList store={store} language={language} display={display} />
  )),
  ...standardCases('P2', 'P2 Customer detail', (store, language, display) => (
    <CustomerDetail
      store={store}
      partyId={firstOf(store, 'customer')}
      language={language}
      display={display}
    />
  )),
  ...standardCases('P3', 'P3 Supplier detail', (store, language, display) => (
    <SupplierDetail
      store={store}
      partyId={firstOf(store, 'supplier')}
      language={language}
      display={display}
    />
  )),
  /*
   * R1 - THE THIRD TAB, WRITTEN OUT RATHER THAN PRODUCED, FOR TWO REASONS.
   *
   * `standardCases` hands the canonical shop to one case and the adversarial
   * shop to the other three, and both of those days are OPEN. R1 is empty until
   * a day has been closed, so every produced case would render the same empty
   * panel - four copies of one state, and the adversarial case, whose whole job
   * is lakh figures under the longest Odia labels, would be measuring nothing.
   * So the loaded cases are built CLOSED, which is the state the screen is for.
   *
   * And the empty state gets a panel of its own. It is not an edge case here: it
   * is what every shop sees until the first close, which S05's activation ladder
   * makes the moment Reports is revealed. A screen whose commonest state is off
   * the contact sheet is a screen nobody has looked at.
   */
  {
    id: 'R1-canonical',
    screen: 'R1',
    caption: 'R1 Reports - canonical shop, one day closed, English, Comfort',
    language: 'en',
    display: 'comfort',
    sheet: true,
    element: () => <Reports store={closedStore()} language="en" display="comfort" />,
  },
  {
    id: 'R1-adversarial',
    screen: 'R1',
    caption: 'R1 Reports - adversarial shop closed short, Odia, Comfort. Lakh figures.',
    language: 'or',
    display: 'comfort',
    sheet: true,
    element: () => <Reports store={closedAdversarialStore()} language="or" display="comfort" />,
  },
  {
    id: 'R1-adversarial-focus',
    screen: 'R1',
    caption: 'R1 Reports - adversarial shop, Odia, Focus mode',
    language: 'or',
    display: 'focus',
    sheet: false,
    element: () => <Reports store={closedAdversarialStore()} language="or" display="focus" />,
  },
  {
    id: 'R1-longest',
    screen: 'R1',
    caption:
      'R1 Reports - longest strings at the largest type. Four long labels beside four uncapped figures, which is the row that overflows first.',
    language: 'longest',
    display: 'focus',
    sheet: true,
    element: () => (
      <Reports store={closedAdversarialStore()} language="longest" display="focus" />
    ),
  },
  {
    id: 'R1-empty',
    screen: 'R1',
    caption:
      'R1 Reports - before the first close. The state every shop starts in, and the one most users see first.',
    language: 'or',
    display: 'comfort',
    sheet: true,
    element: () => <Reports store={canonicalStore()} language="or" display="comfort" />,
  },
  /*
   * R1 PAST ITS GATES. Every case above holds one day, so every trend and score
   * in them shows its gate sentence - the honest answer, and not the layout that
   * overflows first. These three hold thirty-one closed days.
   */
  {
    id: 'R1-history',
    screen: 'R1',
    caption: 'R1 Reports - thirty-one closed days: trends, pressure and both scores past their gates',
    language: 'en',
    display: 'comfort',
    sheet: true,
    element: () => <Reports store={historyStore()} language="en" display="comfort" />,
  },
  {
    id: 'R1-history-or-focus',
    screen: 'R1',
    caption: 'R1 Reports - thirty-one closed days, Odia, Focus mode',
    language: 'or',
    display: 'focus',
    sheet: false,
    element: () => <Reports store={historyStore()} language="or" display="focus" />,
  },
  {
    id: 'R1-history-longest',
    screen: 'R1',
    caption: 'R1 Reports - thirty-one closed days, longest strings at the largest type',
    language: 'longest',
    display: 'focus',
    sheet: false,
    element: () => <Reports store={historyStore()} language="longest" display="focus" />,
  },
  /*
   * M1 - THE PREMIUM DASHBOARD, written out for R1's reason: its subject is
   * closed days, so the loaded cases are built CLOSED. The history store holds
   * thirty-one closed days (seasonal naive shown, the weekday-and-trend gate
   * still counting); the seventy-day one is past the 56-day gate. The free plan
   * gets its own panel, because it is the state every shop sees until it buys.
   */
  {
    id: 'M1-canonical',
    screen: 'M1',
    caption: 'M1 Dashboard - Premium, thirty-one closed days, English, Comfort',
    language: 'en',
    display: 'comfort',
    sheet: true,
    element: () => <Dashboard store={historyStore()} plan="premium" language="en" display="comfort" />,
  },
  {
    id: 'M1-adversarial',
    screen: 'M1',
    caption: 'M1 Dashboard - Premium, adversarial shop closed short, Odia, Comfort. Lakh figures, forecast gated.',
    language: 'or',
    display: 'comfort',
    sheet: true,
    element: () => <Dashboard store={closedAdversarialStore()} plan="premium" language="or" display="comfort" />,
  },
  {
    id: 'M1-adversarial-focus',
    screen: 'M1',
    caption: 'M1 Dashboard - Premium, adversarial shop, Odia, Focus mode',
    language: 'or',
    display: 'focus',
    sheet: false,
    element: () => <Dashboard store={closedAdversarialStore()} plan="premium" language="or" display="focus" />,
  },
  {
    id: 'M1-longest',
    screen: 'M1',
    caption: 'M1 Dashboard - Premium, seventy closed days, longest strings at the largest type',
    language: 'longest',
    display: 'focus',
    sheet: true,
    element: () => <Dashboard store={historyStore(70)} plan="premium" language="longest" display="focus" />,
  },
  {
    id: 'M1-free',
    screen: 'M1',
    caption: 'M1 Dashboard - the free plan: what Premium adds, and no Premium figure',
    language: 'or',
    display: 'comfort',
    sheet: true,
    element: () => <Dashboard store={historyStore()} plan="free" language="or" display="comfort" onUpgrade={() => {}} />,
  },
  {
    id: 'M1-empty',
    screen: 'M1',
    caption: 'M1 Dashboard - Premium before the first close',
    language: 'en',
    display: 'comfort',
    sheet: false,
    element: () => <Dashboard store={canonicalStore()} plan="premium" language="en" display="comfort" />,
  },
  /*
   * S2 AND S3 - the two settings screens reached from the top of S1, written
   * out rather than produced by `standardCases`, for one reason: THE LONGEST
   * PANEL IS ON THE SHEET FOR BOTH.
   *
   * `standardCases` keeps the longest-string case off the sheet, which is right
   * for a ledger screen - a human looking at forty panels will spend his
   * attention on the figures, and the pseudo-locale is measured whether or not
   * he sees it. These two screens have NO figures. Their entire content is
   * labels, three language names in three scripts, and one shop name the app is
   * forbidden to tidy; the longest-string render is therefore the only panel on
   * either screen that tells a human anything he could not have guessed, and it
   * is where a segment label leaving its control would be visible.
   *
   * BOTH CARRY `onBack` IN EVERY CASE. They are reached from S1 and return
   * there, so a panel without a way out would not be the screen - and the back
   * control is a touch target the instruments should be measuring.
   *
   * THE S2 NAME IS A FIXTURE'S, NEVER A PRETTY ONE. The adversarial cases show
   * `ADVERSARIAL_SHOP.name`, which is the longest Odia shop name in the corpus,
   * because the one thing S2 must survive is a name nobody here can shorten.
   */
  {
    id: 'S2-canonical',
    screen: 'S2',
    caption: 'S2 Your shop - canonical shop, English, Comfort',
    language: 'en',
    display: 'comfort',
    sheet: true,
    element: () => (
      <ShopProfile
        store={canonicalStore()}
        language="en"
        display="comfort"
        shopName={CANONICAL_SHOP_NAME}
        onSelectDayStart={() => {}}
        onBack={() => {}}
      />
    ),
  },
  {
    id: 'S2-adversarial',
    screen: 'S2',
    caption: 'S2 Your shop - the longest Odia shop name in the corpus, Comfort',
    language: 'or',
    display: 'comfort',
    sheet: true,
    element: () => (
      <ShopProfile
        store={adversarialStore()}
        language="or"
        display="comfort"
        shopName={ADVERSARIAL_SHOP.name}
        onSelectDayStart={() => {}}
        onBack={() => {}}
      />
    ),
  },
  {
    id: 'S2-adversarial-focus',
    screen: 'S2',
    caption: 'S2 Your shop - adversarial shop, Odia, Focus mode',
    language: 'or',
    display: 'focus',
    sheet: false,
    element: () => (
      <ShopProfile
        store={adversarialStore()}
        language="or"
        display="focus"
        shopName={ADVERSARIAL_SHOP.name}
        onSelectDayStart={() => {}}
        onBack={() => {}}
      />
    ),
  },
  {
    id: 'S2-longest',
    screen: 'S2',
    caption:
      'S2 Your shop - longest strings at the largest type, against the longest name. The worst case, and the panel worth looking at.',
    language: 'longest',
    display: 'focus',
    sheet: true,
    element: () => (
      <ShopProfile
        store={adversarialStore()}
        language="longest"
        display="focus"
        shopName={ADVERSARIAL_SHOP.name}
        onSelectDayStart={() => {}}
        onBack={() => {}}
      />
    ),
  },
  {
    id: 'S3-canonical',
    screen: 'S3',
    caption: 'S3 Language and screen - English, Comfort. Both choices as they stand.',
    language: 'en',
    display: 'comfort',
    sheet: true,
    element: () => (
      <LanguageSettings
        store={canonicalStore()}
        language="en"
        display="comfort"
        onBack={() => {}}
      />
    ),
  },
  {
    id: 'S3-adversarial',
    screen: 'S3',
    caption: 'S3 Language and screen - Odia, Comfort. Three scripts in one control.',
    language: 'or',
    display: 'comfort',
    sheet: true,
    element: () => (
      <LanguageSettings
        store={adversarialStore()}
        language="or"
        display="comfort"
        onBack={() => {}}
      />
    ),
  },
  {
    id: 'S3-adversarial-focus',
    screen: 'S3',
    caption: 'S3 Language and screen - Odia, Focus mode. The mode the screen itself offers.',
    language: 'or',
    display: 'focus',
    sheet: false,
    element: () => (
      <LanguageSettings
        store={adversarialStore()}
        language="or"
        display="focus"
        onBack={() => {}}
      />
    ),
  },
  {
    id: 'S3-longest',
    screen: 'S3',
    caption:
      'S3 Language and screen - longest strings at the largest type. Nothing is shown as chosen, because the pseudo-locale is not a choice.',
    language: 'longest',
    display: 'focus',
    sheet: true,
    element: () => (
      <LanguageSettings
        store={adversarialStore()}
        language="longest"
        display="focus"
        onBack={() => {}}
      />
    ),
  },
  /*
   * S4 - THE CONSENT ROUTE, ON THE SHEET FOR THE SAME REASON S2 AND S3 ARE.
   *
   * It holds no figure either: one row and one sentence, and the sentence is the
   * longest piece of copy in the settings family in all three languages. The
   * longest-string panel is therefore the only one that tells a human anything
   * - it is where a DPDP sentence running off the side of a 360dp screen would
   * be visible, and that sentence is the part of this screen the Act is about.
   *
   * `onBack` IN EVERY CASE. S4 hangs off S1 and returns there; a consent route
   * with no way out is not the screen, and the back control is a touch target
   * the instruments should be measuring.
   */
  {
    id: 'S4-canonical',
    screen: 'S4',
    caption: 'S4 Privacy and consent - English, Comfort. The route to X0 in manage mode.',
    language: 'en',
    display: 'comfort',
    sheet: true,
    element: () => (
      <PrivacySettings store={canonicalStore()} language="en" display="comfort" onBack={() => {}} />
    ),
  },
  {
    id: 'S4-adversarial',
    screen: 'S4',
    caption: 'S4 Privacy and consent - Odia, Comfort. The withdrawal sentence in Odia.',
    language: 'or',
    display: 'comfort',
    sheet: true,
    element: () => (
      <PrivacySettings
        store={adversarialStore()}
        language="or"
        display="comfort"
        onBack={() => {}}
      />
    ),
  },
  {
    id: 'S4-adversarial-focus',
    screen: 'S4',
    caption: 'S4 Privacy and consent - Odia, Focus mode',
    language: 'or',
    display: 'focus',
    sheet: false,
    element: () => (
      <PrivacySettings store={adversarialStore()} language="or" display="focus" onBack={() => {}} />
    ),
  },
  {
    id: 'S4-longest',
    screen: 'S4',
    caption:
      'S4 Privacy and consent - longest strings at the largest type. The withdrawal sentence is the longest copy in the settings family.',
    language: 'longest',
    display: 'focus',
    sheet: true,
    element: () => (
      <PrivacySettings
        store={adversarialStore()}
        language="longest"
        display="focus"
        onBack={() => {}}
      />
    ),
  },
  /*
   * S5 AND S6 - the two settings screens a store or a statute requires. Both
   * are reached from S1, so both get a back affordance in every case: a panel
   * with no way out is not the screen, and the back control is a touch target
   * the instruments should be measuring.
   *
   * S6 renders its UNPUBLISHED state in all four cases, because that is the
   * true state of this build - the officer is human-blocked. A case carrying an
   * invented name would put a fabricated legal contact on the contact sheet,
   * where it is exactly as convincing as a real one.
   */
  /*
   * S1 - THE SETTINGS HUB. Registered like every other screen, because the
   * three rows on it that a store or a statute requires are exactly the rows a
   * redesign drops quietly: nobody uses them, so nobody notices.
   *
   * The adversarial panels pass a long Odia shop name, since the hub's one
   * variable-width element is the name echoed on its first row.
   */
  ...standardCases('S1', 'S1 Settings', (store, language, display) => (
    <Settings
      store={store}
      language={language}
      display={display}
      shopName={ADVERSARIAL_SHOP.name}
      onBack={() => {}}
    />
  )),

  ...standardCases('S5', 'S5 About this app', (store, language, display) => (
    <About
      store={store}
      language={language}
      display={display}
      version={FIXTURE_VERSION}
      // F-23: the address as the build serves it - one unbreakable word to lay out.
      deleteAccountUrl={WEB_PAGE_URLS.deleteAccount}
      onBack={() => {}}
    />
  )),
  ...standardCases('S6', 'S6 Help and contact', (store, language, display) => (
    <Help store={store} language={language} display={display} onBack={() => {}} />
  )),
  /*
   * S11 - THE APP-LOCK COVER (R5 FR-3). Rendered against the adversarial book
   * like everything else, because the one thing it must prove is that nothing
   * from the book reaches it.
   */
  ...standardCases('S11', 'S11 App locked', (store, language, display) => (
    <AppLocked store={store} language={language} display={display} />
  )),
  {
    /*
     * S1 WITH THE "NO SCREEN LOCK" REASON UNDER THE APP-LOCK ROW - the longest
     * sentence on the hub, at the largest type. Measured only.
     */
    id: 'S1-app-lock-unavailable',
    screen: 'S1',
    caption: 'S1 Settings - app lock refused on a phone with no screen lock, longest strings, Focus',
    language: 'longest',
    display: 'focus',
    sheet: false,
    element: () => (
      <Settings
        store={adversarialStore()}
        language="longest"
        display="focus"
        shopName={ADVERSARIAL_SHOP.name}
        appLockUnavailable
        onBack={() => {}}
      />
    ),
  },
  {
    /*
     * THE OFFICER BRANCH, MEASURED AND NEVER SHOWN.
     *
     * An address is one unbreakable word: it has no space to wrap at, so it is
     * the only line on either of these two screens that can run off the side of
     * a 360dp screen at the largest type - exactly what `check:layout` exists to
     * catch. The four standard cases all render the UNPUBLISHED state, because
     * that is the true state of this build, so without this case that line is
     * never laid out by anything.
     *
     * `sheet: false` IS THE POINT, not a convenience. The value below is a
     * fixture on a reserved, unroutable domain (RFC 2606) and it says so in its
     * own name; keeping it off the contact sheet means no panel a human reviews
     * ever shows a fabricated statutory contact, while the instrument still
     * measures the layout. The real officer is human-blocked.
     */
    id: 'S6-officer-measured',
    screen: 'S6',
    caption:
      'S6 Help and contact - the officer branch at the largest type, with a fixture address nobody can write to. Measured only, deliberately not on the sheet.',
    language: 'longest',
    display: 'focus',
    sheet: false,
    element: () => (
      <Help
        store={adversarialStore()}
        language="longest"
        display="focus"
        grievanceOfficer={{
          name: 'NOT A REAL OFFICER - layout fixture',
          email: 'grievance.officer.not.a.real.address@example.invalid',
        }}
        onBack={() => {}}
      />
    ),
  },
  /*
   * S7 AND S8 - the in-app deletion path, which is mandatory rather than chosen
   * (Play User Data policy, Apple 5.1.1(v), LEGAL-AUDIT §4).
   *
   * BOTH ARE RENDERED AGAINST THE REAL SHOPS, and for S8 that is not a formality:
   * the adversarial shop is owed a lakh-scale amount, so its panels carry the
   * `s8.owed` warning with a long Odia sentence above an uncapped figure - which
   * is the combination that overflows if this screen were built with the warning
   * and the amount on one line. A store owed nothing renders without the card at
   * all, and that case lives in `S8.test.tsx` where its ABSENCE can be asserted;
   * a contact-sheet panel can only show what is there.
   *
   * Both carry a back affordance in every case, like S5 and S6: a deletion flow
   * with no way out is the flow in which the only way out is confirming.
   */
  ...standardCases('S7', 'S7 Delete this account', (store, language, display) => (
    <DeleteAccount store={store} language={language} display={display} onBack={() => {}} />
  )),
  ...standardCases('S8', 'S8 Are you sure?', (store, language, display) => (
    <ConfirmDelete store={store} language={language} display={display} onBack={() => {}} />
  )),
  /*
   * F-22: the three things S8 can also say - before the press on a phone with
   * no session, and after a deletion. Longest copy, largest type.
   */
  {
    id: 'S8-local-only',
    screen: 'S8',
    caption: 'S8 Are you sure? - this phone is not signed in, so only its book can be deleted',
    language: 'longest',
    display: 'focus',
    sheet: true,
    element: () => (
      <ConfirmDelete store={adversarialStore()} language="longest" display="focus" signedIn={false} />
    ),
  },
  {
    id: 'S8-scheduled',
    screen: 'S8',
    caption: 'S8 after the server accepted the deletion - the date it erases, and the phone wiped now',
    language: 'longest',
    display: 'focus',
    sheet: true,
    element: () => (
      <ConfirmDelete
        store={emptyStore()}
        language="longest"
        display="focus"
        outcome={{ kind: 'scheduled', erasesAt: '2026-11-24T08:00:00.000Z' }}
      />
    ),
  },
  {
    id: 'S8-local-done',
    screen: 'S8',
    caption: 'S8 after deleting on a phone with no session - the phone only',
    language: 'longest',
    display: 'focus',
    sheet: true,
    element: () => (
      <ConfirmDelete store={emptyStore()} language="longest" display="focus" outcome={{ kind: 'local' }} />
    ),
  },
  /*
   * S10 - YOUR PLAN (PR-7). The standard four render this build's true state:
   * Free, the preview on offer, and buying NOT open - so the disabled buy
   * buttons and the words saying why are what the instruments measure first.
   * The extra cases are every other status line and the cancel button, at the
   * longest copy and largest type, because the status sentences and the Odia
   * renewal lines are the longest things on the screen.
   */
  ...standardCases('S10', 'S10 Your plan - Free, buying not open yet', (store, language, display) => (
    <YourPlan
      store={store}
      language={language}
      display={display}
      answer={planAnswer()}
      offer={CLOSED_OFFER}
      onBack={() => {}}
    />
  )),
  {
    id: 'S10-buying-open',
    screen: 'S10',
    caption: 'S10 Your plan - buying open, preview already taken: two equal prices, GST included',
    language: 'en',
    display: 'comfort',
    sheet: true,
    element: () => (
      <YourPlan
        store={canonicalStore()}
        language="en"
        display="comfort"
        answer={planAnswer({ previewAvailable: false, everPremium: true }, true)}
        offer={READY_OFFER}
        onBack={() => {}}
      />
    ),
  },
  {
    id: 'S10-premium',
    screen: 'S10',
    caption: 'S10 Your plan - Premium bought and renewing: the renewal date and Cancel Premium',
    language: 'longest',
    display: 'focus',
    sheet: true,
    element: () => (
      <YourPlan
        store={adversarialStore()}
        language="longest"
        display="focus"
        plan="premium"
        answer={PREMIUM_RENEWING}
        offer={READY_OFFER}
        notice="purchased"
        onBack={() => {}}
      />
    ),
  },
  {
    id: 'S10-preview-live',
    screen: 'S10',
    caption: 'S10 Your plan - the preview running: when it ends, and the prices beside it',
    language: 'longest',
    display: 'focus',
    sheet: false,
    element: () => (
      <YourPlan
        store={adversarialStore()}
        language="longest"
        display="focus"
        plan="premium"
        answer={planAnswer({
          plan: 'premium',
          source: 'preview',
          until: '2026-11-09T12:00:00.000Z',
          previewAvailable: false,
          previewEndsAt: '2026-11-09T12:00:00.000Z',
          everPremium: true,
        })}
        offer={CLOSED_OFFER}
        notice="previewStarted"
        onBack={() => {}}
      />
    ),
  },
  {
    id: 'S10-lapsed',
    screen: 'S10',
    caption: 'S10 Your plan - Premium ended: nothing deleted, everything readable and exportable',
    language: 'or',
    display: 'comfort',
    sheet: true,
    element: () => (
      <YourPlan
        store={adversarialStore()}
        language="or"
        display="comfort"
        answer={planAnswer({ previewAvailable: false, everPremium: true })}
        offer={CLOSED_OFFER}
        notice="verifyLater"
        onBack={() => {}}
      />
    ),
  },
  {
    id: 'S10-on-hold',
    screen: 'S10',
    caption: 'S10 Your plan - payment on hold in Google Play: paused, and Cancel still offered',
    language: 'longest',
    display: 'focus',
    sheet: false,
    element: () => (
      <YourPlan
        store={adversarialStore()}
        language="longest"
        display="focus"
        answer={planAnswer(
          { state: 'SUBSCRIPTION_STATE_ON_HOLD', previewAvailable: false, everPremium: true },
          true,
        )}
        offer={READY_OFFER}
        onBack={() => {}}
      />
    ),
  },
  ...standardCases('T5', 'T5 Day close list', (store, language, display) => (
    <DayCloseList store={store} language={language} display={display} />
  )),
  ...standardCases('T6', 'T6 Opening cash', (_store, language, display) => (
    <OpeningCash language={language} display={display} draftPaise={250000} />
  )),
  ...standardCases('T8', 'T8 Form B - party and amount', (store, language, display) => (
    <FormB store={store} language={language} display={display} draftPaise={45000} />
  )),
  ...standardCases('T9', 'T9 Form C - expense', (store, language, display) => (
    <FormC store={store} language={language} display={display} draftPaise={12500} />
  )),
  ...standardCases('T10', 'T10 Form D - money you took', (store, language, display) => (
    <FormD store={store} language={language} display={display} draftPaise={500000} />
  )),
  ...standardCases('T11', 'T11 Cash check - counting', (store, language, display) => (
    <CashCheck store={store} language={language} display={display} countedPaise={199237} />
  )),
  ...standardCases('T12', 'T12 Cash check - the difference', (store, language, display) => (
    <CashDifference
      store={store}
      language={language}
      display={display}
      countedPaise={150000}
    />
  )),
  ...standardCases('T14', 'T14 Day closed', (store, language, display) => (
    <DayClosed store={store} language={language} display={display} />
  )),
  /*
   * T19 - a typed adjustment (decision 2): the fixed list with one chosen, its
   * effect line, the amount and the keypad. The longest type name and effect
   * sentence are what this screen has to survive.
   */
  /*
   * R5 FR-6 - P6, a customer's credit limit: one already set (so "Limit now"
   * and "Remove the limit" show), a new one typed, and the keypad.
   */
  ...standardCases('P6', 'P6 Credit limit - one set, a new one typed', (store, language, display) => (
    <CreditLimit
      store={store}
      partyId={withLimit(store, 300000)}
      language={language}
      display={display}
      amountPaise={500000}
      onBack={() => {}}
    />
  )),
  /* R5 FR-4 - S12, the months a CSV can be made for. */
  ...standardCases('S12', 'S12 Entries for your accountant', (store, language, display) => (
    <AccountantExport store={store} language={language} display={display} onBack={() => {}} />
  )),
  {
    id: 'S12-empty',
    screen: 'S12',
    caption: 'S12 with no entries at all - nothing to share, said so',
    language: 'or',
    display: 'focus',
    sheet: false,
    element: () => <AccountantExport store={firstRunStore()} language="or" display="focus" onBack={() => {}} />,
  },
  /*
   * R5 FR-6 - Form B's credit segment with a customer above the limit he set:
   * the observation under the name, measured at the worst case. Not on the
   * sheet; the instruments read it.
   */
  {
    id: 'T8-over-limit',
    screen: 'T8',
    caption: 'T8 credit sale above the customer limit - the observation, worst case',
    language: 'longest',
    display: 'focus',
    sheet: false,
    element: () => {
      const store = adversarialStore();
      const partyId = withLimit(store, 100);
      return (
        <FormB
          store={store}
          language="longest"
          display="focus"
          draftPaise={45000}
          selectedCommit={2}
          entryPartyId={partyId}
        />
      );
    },
  },
  ...standardCases('T19', 'T19 Adjustment - a type chosen, an amount typed', (store, language, display) => (
    <Adjustment
      store={store}
      language={language}
      display={display}
      type="home_use"
      amountPaise={8000}
      onBack={() => {}}
    />
  )),
  /*
   * PR-1 (Premium). S9: his list, the add field with a name typed, and the
   * customer notice. I1: a sale chosen, its lines and "recorded for X of Y",
   * an item chosen, a quantity and an amount typed, and the keypad.
   */
  ...standardCases('S9', 'S9 Your items - the list, a name typed, the customer notice', (store, language, display) => (
    <YourItems
      store={itemsStore(store)}
      plan="premium"
      language={language}
      display={display}
      draftName="Sugar 1kg"
      onBack={() => {}}
    />
  )),
  ...standardCases('I1', 'I1 Items in a sale - a line being typed', (store, language, display) => {
    const s = itemsStore(store);
    const sale = s.state.entries.find((e) => e.section === 'cash_sales');
    return (
      <ItemsForSale
        store={s}
        plan="premium"
        language={language}
        display={display}
        flow={{ saleId: sale?.id ?? null, itemId: ITEM_IDS[2], field: 'amount', quantity: 3, amount: 4500 }}
        onBack={() => {}}
      />
    );
  }),
  {
    id: 'I1-list',
    screen: 'I1',
    caption: "I1 Items in a sale - choosing one of today's sales",
    language: 'en',
    display: 'comfort',
    sheet: true,
    element: () => <ItemsForSale store={itemsStore(canonicalStore())} plan="premium" onBack={() => {}} />,
  },
  {
    // HT-51: two lines saved, three items and Other, none picked yet - the
    // state in which the choices went out of view behind the footer.
    id: 'I1-pick',
    screen: 'I1',
    caption: 'I1 Items in a sale - lines saved, choosing the next item',
    language: 'or',
    display: 'comfort',
    sheet: false,
    element: () => {
      const s = itemsStore(canonicalStore());
      const sale = s.state.entries.find((e) => e.section === 'cash_sales');
      return (
        <ItemsForSale
          store={s}
          plan="premium"
          language="or"
          flow={{ saleId: sale?.id ?? null, itemId: null, field: 'quantity', quantity: null, amount: null }}
          onBack={() => {}}
        />
      );
    },
  },
  {
    // Pass 9: an amount typed and no "How many" - Save is off and says why.
    // Longest strings in Focus, the tightest footer the fold measure sees.
    id: 'I1-need-quantity',
    screen: 'I1',
    caption: 'I1 Items in a sale - an amount but no "How many": why Save is off',
    language: 'longest',
    display: 'focus',
    sheet: false,
    element: () => {
      const s = itemsStore(adversarialStore());
      const sale = s.state.entries.find((e) => e.section === 'cash_sales');
      return (
        <ItemsForSale
          store={s}
          plan="premium"
          language="longest"
          display="focus"
          flow={{ saleId: sale?.id ?? null, itemId: ITEM_IDS[2], field: 'amount', quantity: null, amount: 4500 }}
          onBack={() => {}}
        />
      );
    },
  },
  /*
   * X0 takes no store, and that is the point of it: it is shown before an account
   * exists, so there is no shop, no day and nothing to read. It joins the
   * standard four so the contrast, target-size and Odia instruments cover it like
   * any other screen - the consent notice is the one screen every user must read.
   */
  ...standardCases('X0', 'X0 Consent notice', (_store, language, display) => (
    <ConsentNotice language={language} display={display} />
  )),
  {
    id: 'X0-granted',
    screen: 'X0',
    caption: 'X0 Consent notice - both optional purposes turned on',
    language: 'or',
    display: 'comfort',
    sheet: true,
    element: () => (
      <ConsentNotice
        language="or"
        display="comfort"
        granted={CONSENT_PURPOSES.filter((p) => !p.required).map((p) => p.key)}
      />
    ),
  },
  {
    id: 'T1-canonical',
    screen: 'T1',
    caption: 'T1 Today - canonical shop, English, Comfort. The front door.',
    language: 'en',
    display: 'comfort',
    sheet: true,
    element: () => <Today store={canonicalStore()} language="en" display="comfort" />,
  },
  {
    id: 'T1-adversarial',
    screen: 'T1',
    caption: 'T1 Today - adversarial shop, Odia, Comfort',
    language: 'or',
    display: 'comfort',
    sheet: true,
    element: () => <Today store={adversarialStore()} language="or" display="comfort" />,
  },
  {
    id: 'T1-adversarial-focus',
    screen: 'T1',
    caption: 'T1 Today - adversarial shop, Odia, Focus mode',
    language: 'or',
    display: 'focus',
    sheet: false,
    element: () => <Today store={adversarialStore()} language="or" display="focus" />,
  },
  {
    id: 'T1-empty',
    screen: 'T1',
    caption: 'T1 Today - the first morning, before anything is entered',
    language: 'or',
    display: 'comfort',
    sheet: true,
    element: () => <Today store={emptyStore()} language="or" display="comfort" />,
  },
  {
    id: 'T1-longest',
    screen: 'T1',
    caption: 'T1 Today - longest strings at the largest type',
    language: 'longest',
    display: 'focus',
    sheet: false,
    element: () => <Today store={adversarialStore()} language="longest" display="focus" />,
  },
  {
    id: 'T1-error',
    screen: 'T1',
    caption: 'T1 Today - could not be opened',
    language: 'hi',
    display: 'comfort',
    sheet: false,
    element: () => <Today store={canonicalStore()} status="error" language="hi" display="comfort" />,
  },
  {
    id: 'T7-canonical',
    screen: 'T7',
    caption: 'T7 Form A - canonical shop, English, Comfort',
    language: 'en',
    display: 'comfort',
    sheet: true,
    element: () => (
      <FormA store={canonicalStore()} language="en" display="comfort" draftPaise={4500} />
    ),
  },
  {
    id: 'T7-adversarial',
    screen: 'T7',
    caption:
      'T7 Form A - adversarial shop, Odia, Comfort. The panel the Odia question is answered by.',
    language: 'or',
    display: 'comfort',
    sheet: true,
    element: () => (
      <FormA store={adversarialStore()} language="or" display="comfort" draftPaise={12345678} />
    ),
  },
  {
    id: 'T7-adversarial-focus',
    screen: 'T7',
    caption: 'T7 Form A - adversarial shop, Odia, Focus mode',
    language: 'or',
    display: 'focus',
    sheet: true,
    element: () => (
      <FormA store={adversarialStore()} language="or" display="focus" draftPaise={12345678} />
    ),
  },
  {
    id: 'T7-longest',
    screen: 'T7',
    caption: 'T7 Form A - longest-string pseudo-locale, the layout upper bound',
    language: 'longest',
    display: 'comfort',
    sheet: true,
    element: () => <FormA store={adversarialStore()} language="longest" display="comfort" />,
  },
  {
    id: 'T7-empty',
    screen: 'T7',
    caption: 'T7 Form A - a shop first morning, nothing entered yet',
    language: 'or',
    display: 'comfort',
    sheet: true,
    element: () => <FormA store={emptyStore()} language="or" display="comfort" />,
  },
  {
    id: 'T7-error',
    screen: 'T7',
    caption: 'T7 Form A - the day could not be opened',
    language: 'or',
    display: 'comfort',
    sheet: true,
    element: () => (
      <FormA store={canonicalStore()} status="error" language="or" display="comfort" />
    ),
  },
  {
    id: 'T7-loading',
    screen: 'T7',
    caption: 'T7 Form A - opening the day',
    language: 'or',
    display: 'comfort',
    // Measured but not on the sheet: a spinner and a line of text is not worth a panel.
    sheet: false,
    element: () => (
      <FormA store={canonicalStore()} status="loading" language="or" display="comfort" />
    ),
  },
  {
    id: 'T7-hindi',
    screen: 'T7',
    caption: 'T7 Form A - Hindi, Focus mode',
    language: 'hi',
    display: 'focus',
    sheet: false,
    element: () => <FormA store={canonicalStore()} language="hi" display="focus" />,
  },
  /*
   * HT-51: THE TWO LINKS OFF THE SALES FORM, in front of the fold measure. The
   * standard cases pass no callbacks, so "Add items to a sale" and "Return or
   * exchange a sale" were never laid out by `check:layout`, and the device found
   * the items link below the 603px body at font 2.0.
   */
  {
    id: 'T7-premium-links',
    screen: 'T7',
    caption: 'T7 Form A - Premium, a day with sales: the items and return links',
    language: 'en',
    display: 'comfort',
    sheet: false,
    element: () => (
      <FormA store={itemsStore(canonicalStore())} language="en" display="comfort" plan="premium"
        onOpenItems={() => {}} onOpenReturns={() => {}} />
    ),
  },
  {
    id: 'T7-premium-links-odia',
    screen: 'T7',
    caption: 'T7 Form A - Premium, adversarial shop, Odia: the items and return links',
    language: 'or',
    display: 'comfort',
    sheet: false,
    element: () => (
      <FormA store={itemsStore(adversarialStore())} language="or" display="comfort" plan="premium"
        onOpenItems={() => {}} onOpenReturns={() => {}} />
    ),
  },
  {
    id: 'T7-longest-focus',
    screen: 'T7',
    caption: 'T7 Form A - longest strings at the largest type, the worst case in the set',
    language: 'longest',
    display: 'focus',
    sheet: false,
    element: () => <FormA store={adversarialStore()} language="longest" display="focus" />,
  },
  /*
   * F-10 and F-9 - the controls those fixes added, put in front of the
   * instruments. The standard cases pass no callbacks, so without these the
   * add-party sheet and the back/Done controls would never be measured.
   */
  {
    id: 'T8-picker-new',
    screen: 'T8',
    caption: 'T8 Form B - adding a new customer, longest strings at the largest type',
    language: 'longest',
    display: 'focus',
    sheet: false,
    element: () => (
      <FormB
        store={emptyStore()}
        language="longest"
        display="focus"
        draftPaise={45000}
        selectedCommit={2}
        pickingParty
        newParty={{
          draft: { name: 'Ramesh', phone: '9861042317' },
          onStart: () => {},
          onName: () => {},
          onPhone: () => {},
          onSave: () => {},
          onCancel: () => {},
        }}
      />
    ),
  },
  {
    id: 'T8-picker-new-canonical',
    screen: 'T8',
    caption: 'T8 Form B - adding a new customer, English, Comfort',
    language: 'en',
    display: 'comfort',
    sheet: false,
    element: () => (
      <FormB
        store={emptyStore()}
        language="en"
        display="comfort"
        draftPaise={45000}
        selectedCommit={2}
        pickingParty
        newParty={{
          draft: { name: '', phone: '' },
          onStart: () => {},
          onName: () => {},
          onPhone: () => {},
          onSave: () => {},
          onCancel: () => {},
        }}
      />
    ),
  },
  {
    id: 'T14-exits',
    screen: 'T14',
    caption: 'T14 Day closed - with its back and Done, Odia, Focus',
    language: 'or',
    display: 'focus',
    sheet: false,
    element: () => (
      <DayClosed
        store={closedAdversarialStore()}
        language="or"
        display="focus"
        onBack={() => {}}
        onDone={() => {}}
      />
    ),
  },
  {
    id: 'P2-back',
    screen: 'P2',
    caption: 'P2 Customer detail - with its back, longest strings',
    language: 'longest',
    display: 'focus',
    sheet: false,
    element: () => {
      const store = adversarialStore();
      return (
        <CustomerDetail
          store={store}
          partyId={firstOf(store, 'customer')}
          language="longest"
          display="focus"
          onBack={() => {}}
        />
      );
    },
  },
  {
    id: 'T12-back',
    screen: 'T12',
    caption: 'T12 Cash check - the difference, with its back, longest strings',
    language: 'longest',
    display: 'focus',
    sheet: false,
    element: () => (
      <CashDifference
        store={adversarialStore()}
        language="longest"
        display="focus"
        countedPaise={150000}
        onBack={() => {}}
      />
    ),
  },
  /**
   * THE A-SERIES - sign-in, against docs/design-reference/comfort/A1..A8.png.
   * Every state a screen can be in has a case, because a state with no case is
   * a state `check:layout` never lays out: A3 empty, typed and offline; A4
   * typing, checking and offline; A5 in each of its four problems; A7 on both
   * stages; A8 with and without unsynced entries.
   *
   * The shop name comes from the store the case is rendered against, so the
   * adversarial panels carry the longest Odia shop name in the corpus.
   */
  ...standardCases('A1', 'A1 Splash', (_store, language, display) => (
    <Splash language={language} display={display} />
  )),
  ...standardCases('A2', 'A2 Choose your language', (_store, language, display) => (
    <LanguageChoice language={language} display={display} />
  )),
  ...standardCases('A3', 'A3 Phone number - typed', (_store, language, display) => (
    <PhoneNumber language={language} display={display} phone={CASE_PHONE} onBack={() => {}} />
  )),
  authCase('A3', 'A3-empty', 'A3 Phone number - nothing typed yet', <PhoneNumber onBack={() => {}} />),
  authCase(
    'A3',
    'A3-offline',
    'A3 Phone number - no signal when sending',
    <PhoneNumber phone={CASE_PHONE} problem="offline" onBack={() => {}} />,
  ),
  ...standardCases('A4', 'A4 Enter the code - three digits in', (_store, language, display) => (
    <CodeEntry
      language={language}
      display={display}
      phone={CASE_PHONE}
      code="987"
      onBack={() => {}}
    />
  )),
  authCase(
    'A4',
    'A4-checking',
    'A4 Enter the code - checking, keypad withdrawn',
    <CodeEntry phone={CASE_PHONE} code="987654" busy onBack={() => {}} />,
  ),
  authCase(
    'A4',
    'A4-offline',
    'A4 Enter the code - no signal when checking, after two resends',
    <CodeEntry phone={CASE_PHONE} code="987654" problem="offline" resends={2} onBack={() => {}} />,
  ),
  ...standardCases('A5', 'A5 Code problem - it does not match', (_store, language, display) => (
    <CodeProblem language={language} display={display} problem="mismatch" onBack={() => {}} />
  )),
  authCase('A5', 'A5-expired', 'A5 Code problem - expired', <CodeProblem problem="expired" onBack={() => {}} />),
  authCase(
    'A5',
    'A5-locked',
    'A5 Code problem - too many tries, with the server wait',
    <CodeProblem problem="locked" retryAfterSeconds={598} onBack={() => {}} />,
  ),
  authCase('A5', 'A5-no-code', 'A5 Code problem - still no code', <CodeProblem problem="noCode" onBack={() => {}} />),
  ...standardCases('A6', 'A6 Session expired', (store, language, display) => (
    <SessionExpired
      language={language}
      display={display}
      shopName={shopNameOf(store)}
      phone={CASE_PHONE}
    />
  )),
  ...standardCases('A7', 'A7 Change your number', (_store, language, display) => (
    <NumberChanged language={language} display={display} onBack={() => {}} />
  )),
  authCase(
    'A7',
    'A7-handoff',
    'A7 Change your number - no old number',
    <NumberChanged stage="handoff" onBack={() => {}} />,
  ),
  ...standardCases('A8', 'A8 Log out - two entries not synced', (store, language, display) => (
    <LogoutConfirm
      language={language}
      display={display}
      shopName={shopNameOf(store)}
      phone={CASE_PHONE}
      pendingEntries={2}
    />
  )),
  authCase(
    'A8',
    'A8-saved',
    'A8 Log out - everything synced',
    <LogoutConfirm shopName={CANONICAL_SHOP_NAME} phone={CASE_PHONE} />,
  ),
  ...TODAY_FLOW_CASES(),
  ...MITRA_CASES(),
  ...RETURN_CASES(),
  ...CORRECTION_CASES(),
  ...ASK_CASES(),
];

/**
 * A CONVERSATION, ASKED THROUGH THE REAL SESSION - so a panel holds exactly what
 * typing those questions would hold, follow-ups included, and nothing a test
 * assembled by hand. The clock and ids are fixed; C1 reads neither.
 */
export const askedChat = (store: Store, questions: readonly string[]): ChatState => {
  const session = new Session(store, { now: () => CANONICAL_DATE + 'T20:00:00.000Z', newId: () => 'c1' });
  session.openChat('T1');
  for (const q of questions) {
    session.setChatDraft(q);
    session.askChat();
  }
  return session.state.chat as ChatState;
};

/** A free question, a Premium one on the free plan, and one it cannot place - each language its own. */
export const ASK_QUESTIONS: Readonly<Record<'en' | 'or', readonly string[]>> = {
  en: ["what were today's sales", 'UPI sales last week', 'tell me something'],
  or: ['ଆଜି କେତେ ବିକ୍ରି ହେଲା', 'ଗତ ସପ୍ତାହର UPI ବିକ୍ରି', 'କିଛି କୁହ'],
};

/** Premium against a month of history: a best day, a comparison and a party, then a follow-up. */
export const ASK_PREMIUM = [
  'which day was best this month',
  'compare this week with last week',
  'how much did Ramesh pay this month',
  'and last month?',
] as const;

function ASK_CASES(): ScreenCase[] {
  const q = (language: RenderLanguage) => (language === 'en' ? ASK_QUESTIONS.en : ASK_QUESTIONS.or);
  return [
    ...standardCases('C1', 'C1 Ask - three questions on the free plan', (store, language, display) => (
      <Ask store={store} language={language} display={display} chat={askedChat(store, q(language))} />
    )),
    {
      id: 'C1-empty',
      screen: 'C1',
      caption: 'C1 Ask - nothing asked yet: what it can answer, as taps',
      language: 'en',
      display: 'comfort',
      sheet: true,
      element: () => <Ask store={canonicalStore()} language="en" display="comfort" />,
    },
    {
      id: 'C1-premium',
      screen: 'C1',
      caption: 'C1 Ask - Premium, thirty-one days of history: best day, a comparison, a party and a follow-up',
      language: 'en',
      display: 'comfort',
      sheet: true,
      element: () => {
        const store = historyStore();
        return <Ask store={store} plan="premium" language="en" display="comfort" chat={askedChat(store, ASK_PREMIUM)} />;
      },
    },
    {
      id: 'C1-premium-longest',
      screen: 'C1',
      caption: 'C1 Ask - Premium answers, longest strings at the largest type',
      language: 'longest',
      display: 'focus',
      sheet: false,
      element: () => {
        const store = historyStore();
        return (
          <Ask store={store} plan="premium" language="longest" display="focus" chat={askedChat(store, ASK_PREMIUM)} />
        );
      },
    },
  ];
}

/**
 * T18 - RETURN OR EXCHANGE, in each of its three faces. The list against both
 * shops through `standardCases`; the forms written out, because each form is a
 * different footer (one amount, two amounts, a settlement) and the footer is
 * what `check:layout` measures against the fold.
 */
function RETURN_CASES(): ScreenCase[] {
  const firstCash = (store: Store): string =>
    store.state.entries.find((e) => e.section === 'cash_sales')?.id ?? '';
  /* The LAST cash sale: untouched by the fixture's partial return, and naming nobody. */
  const unnamedSale = (store: Store): string =>
    [...store.state.entries].reverse().find((e) => e.section === 'cash_sales')?.id ?? '';
  const back = () => {};
  const c = (
    id: string,
    caption: string,
    language: RenderLanguage,
    display: DisplayMode,
    sheet: boolean,
    element: () => ReactElement,
  ): ScreenCase => ({ id, screen: 'T18', caption, language, display, sheet, element });
  const face =
    (base: () => Store, language: RenderLanguage, display: DisplayMode, flow: (store: Store) => ReturnFlow) =>
    () => {
      const store = returnsStore(base());
      return (
        <ReturnOrExchange store={store} language={language} display={display} onBack={back} flow={flow(store)} />
      );
    };
  const returnFlow = (store: Store) => flowOf({ saleId: firstCash(store), returned: 50000 });
  const exchangeFlow = (store: Store) =>
    flowOf({
      saleId: unnamedSale(store),
      settlement: 'exchange',
      field: 'replacement',
      returned: 50000,
      replacement: 80000,
      differenceMode: 'udhar',
    });
  const settleFlow = () => flowOf({ settleId: RETURN_IDS.pending, returned: 30000 });

  return [
    ...standardCases('T18', 'T18 Return or exchange - the list', (store, language, display) => (
      <ReturnOrExchange
        store={returnsStore(store)}
        language={language}
        display={display}
        onBack={back}
        flow={flowOf({ recordedId: RETURN_IDS.pending })}
      />
    )),
    c('T18-empty', 'T18 Return or exchange - no sale to return yet', 'or', 'comfort', false, () => (
      <ReturnOrExchange store={emptyStore()} language="or" display="comfort" onBack={back} />
    )),
    c('T18-return', 'T18 Return - a cash refund, typed', 'en', 'comfort', true,
      face(canonicalStore, 'en', 'comfort', returnFlow)),
    c('T18-return-longest', 'T18 Return - longest strings, Focus', 'longest', 'focus', false,
      face(adversarialStore, 'longest', 'focus', returnFlow)),
    c('T18-exchange', 'T18 Exchange - a dearer replacement, difference on udhar', 'en', 'comfort', true,
      face(canonicalStore, 'en', 'comfort', exchangeFlow)),
    c('T18-exchange-adversarial', 'T18 Exchange - Odia, lakh figures', 'or', 'comfort', true,
      face(adversarialStore, 'or', 'comfort', exchangeFlow)),
    c('T18-exchange-longest', 'T18 Exchange - two amounts, longest strings, Focus', 'longest', 'focus', false,
      face(adversarialStore, 'longest', 'focus', exchangeFlow)),
    c('T18-settle', 'T18 Settle - a pending return paid back in part, Odia', 'or', 'comfort', true,
      face(adversarialStore, 'or', 'comfort', settleFlow)),
    c('T18-settle-longest', 'T18 Settle - longest strings, Focus', 'longest', 'focus', false,
      face(adversarialStore, 'longest', 'focus', settleFlow)),
    /* The one way in, on Form A: measured with the sales lines and without them. */
    {
      id: 'T7-returns-link',
      screen: 'T7',
      caption: 'T7 Form A - with "Return or exchange a sale", longest strings, Focus',
      language: 'longest',
      display: 'focus',
      sheet: false,
      element: () => (
        <FormA store={adversarialStore()} language="longest" display="focus" onOpenReturns={back} />
      ),
    },
    {
      id: 'T7-returns-link-empty',
      screen: 'T7',
      caption: 'T7 Form A - nothing sold yet today, the return link still offered, Odia',
      language: 'or',
      display: 'comfort',
      sheet: false,
      element: () => <FormA store={emptyStore()} language="or" display="comfort" onOpenReturns={back} />,
    },
  ];
}

/**
 * T16 - POST A CORRECTION, written out like R1's cases rather than produced:
 * the screen is about a CLOSED day, and both standard stores are open, so every
 * produced case would be the empty panel.
 */
function CORRECTION_CASES(): ScreenCase[] {
  const back = () => {};
  const c = (
    id: string,
    caption: string,
    language: RenderLanguage,
    display: DisplayMode,
    sheet: boolean,
    element: () => ReactElement,
  ): ScreenCase => ({ id, screen: 'T16', caption, language, display, sheet, element });
  const first = (store: Store): string => store.state.entries[0]?.id ?? '';
  const chosen = (base: () => Store, language: RenderLanguage, display: DisplayMode, draft: number) => () => {
    const store = base();
    return (
      <CorrectDay
        store={store}
        language={language}
        display={display}
        onBack={back}
        correction={{ originalId: first(store), outcome: null }}
        draftPaise={draft}
      />
    );
  };
  /* A correction typed while the closed day is still the business day: held, through the store. */
  const held = () => {
    const store = closedAdversarialStore();
    store.postCorrection({ id: 'cor-held', originalId: first(store), amount: 50000 });
    return (
      <CorrectDay
        store={store}
        language="or"
        display="comfort"
        onBack={back}
        correction={{ originalId: null, outcome: 'held' }}
      />
    );
  };

  return [
    c('T16-canonical', 'T16 Post a correction - a closed day, English, Comfort', 'en', 'comfort', true,
      () => <CorrectDay store={closedStore()} language="en" display="comfort" onBack={back} />),
    c('T16-adversarial', 'T16 Post a correction - closed adversarial day, Odia, Comfort', 'or', 'comfort', true,
      () => <CorrectDay store={closedAdversarialStore()} language="or" display="comfort" onBack={back} />),
    c('T16-adversarial-focus', 'T16 Post a correction - Odia, Focus', 'or', 'focus', false,
      () => <CorrectDay store={closedAdversarialStore()} language="or" display="focus" onBack={back} />),
    c('T16-longest', 'T16 Post a correction - longest strings, Focus', 'longest', 'focus', false,
      () => <CorrectDay store={closedAdversarialStore()} language="longest" display="focus" onBack={back} />),
    c('T16-target', 'T16 Post a correction - an entry chosen, amount typed', 'en', 'comfort', true,
      chosen(closedStore, 'en', 'comfort', 50000)),
    c('T16-target-longest', 'T16 Post a correction - keypad up, longest strings, Focus', 'longest', 'focus', false,
      chosen(closedAdversarialStore, 'longest', 'focus', 12345678)),
    c('T16-held', 'T16 Post a correction - held for the next day, Odia', 'or', 'comfort', true, held),
    c('T16-empty', 'T16 Post a correction - no closed day, Hindi', 'hi', 'comfort', false,
      () => <CorrectDay store={canonicalStore()} language="hi" display="comfort" onBack={back} />),
  ];
}

/**
 * THE TODAY FLOW AS THE REFERENCE DRAWS IT (2026-10-25) - every state T1, T2,
 * T3, T5 and T6 now render, with the shop name the brand bar shows. The cases
 * above predate the eyebrow and render without one; these carry it, so the
 * longest shop name in the fixtures (the adversarial Odia one) is measured in
 * the bar at every font scale.
 */
function TODAY_FLOW_CASES(): ScreenCase[] {
  const named = (store: Store): Store => {
    store.setShopName(
      store.state.shopId === 'shop-adversarial' ? ADVERSARIAL_SHOP.name : CANONICAL_SHOP_NAME,
    );
    return store;
  };
  /** A day where more cash went out than came in - the one observation T1 can derive. */
  const observationStore = (): Store => {
    const base = canonicalInput();
    const extra = {
      id: 'obs-1',
      dayId: base.day.date,
      section: 'purchase',
      amount: 200000,
      mode: 'cash',
      source: 'manual',
      createdAt: base.day.date + 'T19:00:00.000Z',
    } as DayInput['entries'][number];
    return storeOf({ ...base, entries: [...base.entries, extra] }, CANONICAL_PARTIES, 'shop-canonical');
  };
  /** Every untouched section skipped, so the count is unlocked on the list. */
  const allAnswered = (store: Store): Store => {
    for (const section of ['cash_sales', 'upi_sales', 'udhar_sales', 'purchase', 'expense',
      'udhar_collection', 'party_payment', 'withdrawal'] as const) {
      if (store.sectionState(section) === 'untouched') store.skip(section);
    }
    return store;
  };
  const back = () => {};
  /** One counterfeit note on the open day, so the adjustments card has a row. */
  const withAdjustment = (store: Store): Store => {
    store.addAdjustment({
      id: '01890000-0000-7000-8000-a00000000001',
      dayId: store.state.day.date,
      type: 'counterfeit_note',
      amount: 50000,
      createdAt: '2026-07-15T20:00:00.000Z',
    });
    return store;
  };
  const c = (
    id: string,
    screen: string,
    caption: string,
    language: RenderLanguage,
    display: DisplayMode,
    sheet: boolean,
    element: () => ReactElement,
  ): ScreenCase => ({ id, screen, caption, language, display, sheet, element });

  return [
    c('T1-named', 'T1', 'T1 Today - the reference layout, shop named, English', 'en', 'comfort', true,
      () => <Today store={named(canonicalStore())} language="en" display="comfort" />),
    c('T1-named-adversarial', 'T1', 'T1 Today - longest shop name, lakh figures, Odia', 'or', 'comfort', true,
      () => <Today store={named(adversarialStore())} language="or" display="comfort" />),
    c('T1-named-longest', 'T1', 'T1 Today - longest strings, Focus, the worst case', 'longest', 'focus', false,
      () => <Today store={named(adversarialStore())} language="longest" display="focus" />),
    c('T1-observation', 'T1', 'T1 Today - more cash out than in, the observation card', 'en', 'comfort', true,
      () => <Today store={named(observationStore())} language="en" display="comfort" />),
    c('T1-observation-odia', 'T1', 'T1 Today - the observation card in Odia', 'or', 'comfort', false,
      () => <Today store={named(observationStore())} language="or" display="comfort" />),
    c('T1-empty-named', 'T1', 'T1 Today - first entry not made yet, Hindi', 'hi', 'comfort', false,
      () => <Today store={named(emptyStore())} language="hi" display="comfort" />),
    c('T2-named', 'T2', 'T2 Today - first run, shop named', 'en', 'comfort', true,
      () => <TodayFirstRun store={named(firstRunStore())} language="en" display="comfort" />),
    c('T2-started', 'T2', 'T2 Today - opening cash given, the action spent', 'or', 'comfort', false,
      () => {
        const store = named(firstRunStore());
        store.setOpeningCash(150000);
        return <TodayFirstRun store={store} language="or" display="comfort" />;
      }),
    c('T3-named', 'T3', 'T3 Today - closed, shop named', 'en', 'comfort', true,
      () => <TodayClosed store={named(closedStore())} language="en" display="comfort" />),
    c('T3-named-adversarial', 'T3', 'T3 Today - closed with a difference, Odia', 'or', 'comfort', false,
      () => <TodayClosed store={named(closedAdversarialStore())} language="or" display="comfort" />),
    c('T3-named-longest', 'T3', 'T3 Today - closed, longest strings, Focus', 'longest', 'focus', false,
      () => <TodayClosed store={named(closedAdversarialStore())} language="longest" display="focus" />),
    c('T5-named', 'T5', 'T5 Day close list - with back, shop named', 'en', 'comfort', true,
      () => <DayCloseList store={named(canonicalStore())} language="en" display="comfort" onBack={back} />),
    c('T5-first-morning', 'T5', 'T5 Day close list - nothing answered, every skip offered, Odia', 'or', 'comfort', true,
      () => <DayCloseList store={named(emptyStore())} language="or" display="comfort" onBack={back} />),
    c('T5-first-morning-longest', 'T5', 'T5 Day close list - every skip, longest strings, Focus', 'longest', 'focus', false,
      () => <DayCloseList store={named(emptyStore())} language="longest" display="focus" onBack={back} />),
    c('T5-unlocked', 'T5', 'T5 Day close list - all answered, the count unlocked', 'en', 'comfort', false,
      () => <DayCloseList store={allAnswered(named(emptyStore()))} language="en" display="comfort" onBack={back} />),
    c('T5-closed', 'T5', 'T5 Day close list - a closed day: no skip, no next step', 'hi', 'comfort', false,
      () => <DayCloseList store={named(closedStore())} language="hi" display="comfort" onBack={back} />),
    /*
     * DECISIONS 2 AND 3 ON T5: the UPI check answerable (bulk and per payment)
     * and an adjustment already on the day. Without these the two cards would be
     * measured only in their read-only form.
     */
    c('T5-upi-open', 'T5', 'T5 Day close list - UPI check to answer, one adjustment', 'en', 'comfort', true,
      () => (
        <DayCloseList
          store={withAdjustment(named(canonicalStore()))}
          language="en"
          display="comfort"
          onBack={back}
          onConfirmUpi={() => {}}
          onAddAdjustment={() => {}}
        />
      )),
    c('T5-upi-open-longest', 'T5', 'T5 Day close list - UPI check to answer, longest strings, Focus', 'longest', 'focus', false,
      () => (
        <DayCloseList
          store={withAdjustment(named(adversarialStore()))}
          language="longest"
          display="focus"
          onBack={back}
          onConfirmUpi={() => {}}
          onAddAdjustment={() => {}}
        />
      )),
    /*
     * USABILITY PASS (wave 5, §4). Each state the redesign added, and the
     * Hindi panels: the device found the Hindi skip label cut, and until now
     * no case laid Hindi out on the day close list at all, so check:layout had
     * never measured the screen where it happened.
     */
    c('T5-first-morning-hindi', 'T5', 'T5 Day close list - every "Nothing today" link, Hindi', 'hi', 'comfort', true,
      () => <DayCloseList store={named(emptyStore())} language="hi" display="comfort" onBack={back} />),
    c('T5-first-morning-hindi-focus', 'T5', 'T5 Day close list - every link, Hindi, Focus', 'hi', 'focus', false,
      () => <DayCloseList store={named(emptyStore())} language="hi" display="focus" onBack={back} />),
    c('T5-skipped', 'T5', 'T5 Day close list - two skipped, each with its undo, and the count', 'en', 'comfort', true,
      () => {
        const store = named(emptyStore());
        store.skip('purchase');
        store.skip('withdrawal');
        return <DayCloseList store={store} language="en" display="comfort" onBack={back} />;
      }),
    c('T5-skipped-odia', 'T5', 'T5 Day close list - skipped with undo, Odia', 'or', 'comfort', false,
      () => {
        const store = named(adversarialStore());
        store.skip('withdrawal');
        return <DayCloseList store={store} language="or" display="comfort" onBack={back} />;
      }),
    c('T1-hindi', 'T1', 'T1 Today - sale first, the box, Hindi', 'hi', 'comfort', true,
      () => <Today store={named(canonicalStore())} language="hi" display="comfort" />),
    c('T1-closing-time', 'T1', 'T1 Today - past closing time: the close is the one marigold button', 'en', 'comfort', true,
      () => {
        const state = named(canonicalStore()).state;
        const store = new Store(memoryPort(state), () => state.day.date + 'T20:30:00.000+05:30');
        return <Today store={store} language="en" display="comfort" />;
      }),
    c('T1-waiting', 'T1', 'T1 Today - one entry waiting to sync, Odia', 'or', 'comfort', false,
      () => {
        const store = named(adversarialStore());
        store.append({
          id: '01890000-0000-7000-8000-c00000000001',
          dayId: store.state.day.date,
          section: 'cash_sales',
          amount: 5000,
          mode: 'cash',
          source: 'manual',
          createdAt: store.state.day.date + 'T11:00:00.000+05:30',
        } as Entry);
        return <Today store={store} language="or" display="comfort" />;
      }),
    c('T8-pay', 'T8', 'T8 Pay supplier - its own title and what you owe suppliers', 'en', 'comfort', true,
      () => <FormB store={canonicalStore()} language="en" display="comfort" selectedCommit={1} entryPartyId="p-wholesale" />),
    c('T8-collect-chosen-hindi', 'T8', 'T8 Collect - customer chosen, balance above the pad, Hindi', 'hi', 'comfort', true,
      () => <FormB store={canonicalStore()} language="hi" display="comfort" entryPartyId="p-ramesh" />),
    c('T8-picker-balances-hindi', 'T8', 'T8 Collect - the picker with each balance, Hindi', 'hi', 'comfort', false,
      () => <FormB store={canonicalStore()} language="hi" display="comfort" pickingParty />),
    c('T7-saved', 'T7', 'T7 Sales - just saved: "Saved ₹50 · Cash", newest row first', 'en', 'comfort', true,
      () => {
        const store = canonicalStore();
        const id = '01890000-0000-7000-8000-c00000000002';
        store.append({
          id,
          dayId: store.state.day.date,
          section: 'cash_sales',
          amount: 5000,
          mode: 'cash',
          source: 'manual',
          createdAt: store.state.day.date + 'T14:32:00.000+05:30',
        } as Entry);
        return <FormA store={store} language="en" display="comfort" savedId={id} />;
      }),
    c('T7-saved-longest', 'T7', 'T7 Sales - just saved, longest strings, Focus', 'longest', 'focus', false,
      () => {
        const store = adversarialStore();
        const id = '01890000-0000-7000-8000-c00000000003';
        store.append({
          id,
          dayId: store.state.day.date,
          section: 'cash_sales',
          amount: 12345678,
          mode: 'cash',
          source: 'manual',
          createdAt: store.state.day.date + 'T14:32:00.000+05:30',
        } as Entry);
        return <FormA store={store} language="longest" display="focus" savedId={id} />;
      }),
    c('T11-folded-hindi', 'T11', 'T11 Cash check - large text: the pad folded, the working list whole, Hindi', 'hi', 'comfort', true,
      () => <CashCheck store={canonicalStore()} language="hi" display="comfort" keypadOpen={false} />),
    c('P1-hindi', 'P1', 'P1 Ledger - sorted by what is owed, Hindi', 'hi', 'comfort', true,
      () => <PartiesList store={canonicalStore()} language="hi" display="comfort" />),
    c('T6-back', 'T6', 'T6 Opening cash - with back, nothing typed yet', 'en', 'comfort', true,
      () => <OpeningCash language="en" display="comfort" onBack={back} />),
    c('T6-back-longest', 'T6', 'T6 Opening cash - with back, longest strings, Focus', 'longest', 'focus', false,
      () => <OpeningCash language="longest" display="focus" draftPaise={12345678} onBack={back} />),
  ];
}

/** The screens the build map committed to, as the registry actually covers them. */
/* ══════════════════════════════════════════════════════════════════════════
 * M3 "MITRA" (DESIGN-SYSTEM-V2 5.5): the states the redesign added, so the
 * instruments and the contact sheet see them - the stale and future banners,
 * the skeleton, "Exit the app?", a withdrawal taking effect, the text-size
 * preview, and the two new settings screens.
 * ══════════════════════════════════════════════════════════════════════════ */

/** The same book, with the clock moved - a stale day is a fact about "now", not about the data. */
const atClock = (store: Store, iso: string): Store => new Store(memoryPort(store.state), () => iso);

/** Synthetic devices, dated from the canonical day. No real phone, no real person. */
export const DEVICE_FIXTURE: readonly DeviceView[] = [
  { id: 'dev-this', platform: 'android', lastSeenAt: CANONICAL_DATE + 'T06:00:00.000Z', revokedAt: null, current: true },
  { id: 'dev-old', platform: 'android', lastSeenAt: addDays(CANONICAL_DATE, -12) + 'T06:00:00.000Z', revokedAt: null, current: false },
  {
    id: 'dev-lost',
    platform: 'android',
    lastSeenAt: addDays(CANONICAL_DATE, -40) + 'T06:00:00.000Z',
    revokedAt: addDays(CANONICAL_DATE, -3) + 'T06:00:00.000Z',
    current: false,
  },
];
const devicesReady = (over: Partial<DevicesState> = {}): DevicesState => ({
  status: 'ready',
  list: DEVICE_FIXTURE,
  confirm: null,
  done: false,
  ...over,
});
const EXIT = { onStay: () => {}, onExit: () => {} };

function MITRA_CASES(): ScreenCase[] {
  const c = (
    id: string,
    screen: string,
    caption: string,
    language: RenderLanguage,
    display: DisplayMode,
    sheet: boolean,
    element: () => ReactElement,
  ): ScreenCase => ({ id, screen, caption, language, display, sheet, element });
  const nextDay = addDays(CANONICAL_DATE, 1) + 'T12:00:00.000+05:30';
  const dayBefore = addDays(CANONICAL_DATE, -1) + 'T12:00:00.000+05:30';
  return [
    c('T1-stale', 'T1', 'T1 Today - the book is still open for yesterday: a warning banner, "Close it now"', 'en', 'comfort', true,
      () => <Today store={atClock(canonicalStore(), nextDay)} language="en" display="comfort" />),
    c('T1-stale-longest', 'T1', 'T1 Today - stale day, longest strings, Focus', 'longest', 'focus', false,
      () => <Today store={atClock(adversarialStore(), nextDay)} language="longest" display="focus" />),
    c('T1-future', 'T1', 'T1 Today - phone date behind the book, with "Open date settings"', 'or', 'comfort', true,
      () => (
        <Today store={atClock(canonicalStore(), dayBefore)} language="or" display="comfort" onOpenDateSettings={() => {}} />
      )),
    c('T1-future-words', 'T1', 'T1 Today - phone date behind the book, an older binary: the words, no button', 'hi', 'focus', false,
      () => <Today store={atClock(adversarialStore(), dayBefore)} language="hi" display="focus" />),
    c('T1-loading', 'T1', 'T1 Today - opening the book: three static rows, no spinner', 'en', 'comfort', true,
      () => <Today store={canonicalStore()} status="loading" language="en" display="comfort" />),
    c('T1-exit', 'T1', 'T1 Today - hardware Back: "Exit the app?", two equal answers', 'or', 'comfort', true,
      () => <Today store={canonicalStore()} language="or" display="comfort" exitPrompt={EXIT} />),
    c('T1-exit-longest', 'T1', 'T1 Today - "Exit the app?", longest strings, Focus', 'longest', 'focus', false,
      () => <Today store={adversarialStore()} language="longest" display="focus" exitPrompt={EXIT} />),
    c('T3-exit', 'T3', 'T3 Today closed - "Exit the app?"', 'hi', 'comfort', false,
      () => <TodayClosed store={closedStore()} language="hi" display="comfort" exitPrompt={EXIT} />),
    c('X0-manage-withdrawn', 'X0', 'X0 What you agreed to - one switch turned off, in effect now, no Save', 'or', 'comfort', true,
      () => (
        <ConsentNotice mode="manage" language="or" display="comfort" granted={[]} justWithdrawn="sms_reminders" onBack={() => {}} />
      )),
    c('X0-manage-longest', 'X0', 'X0 What you agreed to - withdrawn, longest strings, Focus', 'longest', 'focus', false,
      () => (
        <ConsentNotice mode="manage" language="longest" display="focus" granted={[]} justWithdrawn="crash_diagnostics" onBack={() => {}} />
      )),
    c('S3-large', 'S3', 'S3 Language and screen - text size Large, the live preview', 'or', 'comfort', true,
      () => <LanguageSettings store={canonicalStore()} language="or" display="comfort" textSize="large" onBack={() => {}} />),
    c('S3-xlarge-longest', 'S3', 'S3 - text size Extra large, longest strings, Focus', 'longest', 'focus', false,
      () => <LanguageSettings store={adversarialStore()} language="longest" display="focus" textSize="xlarge" onBack={() => {}} />),
    ...standardCases('S13', 'S13 Your data', (store, language, display) => (
      <YourData store={store} language={language} display={display} onDownload={() => {}} onBack={() => {}} />
    )),
    c('S13-offline', 'S13', 'S13 Your data - no signal, nothing downloaded', 'hi', 'comfort', true,
      () => <YourData store={canonicalStore()} language="hi" display="comfort" phase="offline" onDownload={() => {}} onBack={() => {}} />),
    c('S13-signed-out', 'S13', 'S13 Your data - this phone holds no session: the button is disabled', 'en', 'focus', false,
      () => <YourData store={canonicalStore()} language="en" display="focus" onBack={() => {}} />),
    ...standardCases('S14', 'S14 Signed-in phones', (store, language, display) => (
      <SignedInPhones store={store} language={language} display={display} devices={devicesReady()} today={CANONICAL_DATE} onBack={() => {}} />
    )),
    c('S14-confirm', 'S14', 'S14 Signed-in phones - "Sign out that phone?"', 'or', 'comfort', true,
      () => (
        <SignedInPhones store={canonicalStore()} language="or" display="comfort" devices={devicesReady({ confirm: 'dev-old' })} today={CANONICAL_DATE} onBack={() => {}} />
      )),
    c('S14-confirm-longest', 'S14', 'S14 - sign-out question, longest strings, Focus', 'longest', 'focus', false,
      () => (
        <SignedInPhones store={adversarialStore()} language="longest" display="focus" devices={devicesReady({ confirm: 'dev-old' })} today={CANONICAL_DATE} onBack={() => {}} />
      )),
    c('S14-done', 'S14', 'S14 Signed-in phones - that phone is signed out', 'hi', 'comfort', false,
      () => (
        <SignedInPhones store={canonicalStore()} language="hi" display="comfort" devices={devicesReady({ done: true })} today={CANONICAL_DATE} onBack={() => {}} />
      )),
    c('S14-error', 'S14', 'S14 Signed-in phones - the list could not be loaded', 'en', 'comfort', true,
      () => (
        <SignedInPhones store={canonicalStore()} language="en" display="comfort" devices={{ status: 'error', list: [], confirm: null, done: false }} today={CANONICAL_DATE} onBack={() => {}} />
      )),
    c('S14-loading', 'S14', 'S14 Signed-in phones - asking the server', 'or', 'focus', false,
      () => <SignedInPhones store={canonicalStore()} language="or" display="focus" today={CANONICAL_DATE} onBack={() => {}} />),
  ];
}

export const COVERED_SCREENS: readonly string[] = [...new Set(SCREEN_CASES.map((c) => c.screen))];
