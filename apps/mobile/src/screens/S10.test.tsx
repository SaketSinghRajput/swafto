/**
 * S10 YOUR PLAN - the §B.6 bar, and the R4 §5 dark-pattern list as assertions.
 *
 * WHAT IS WORTH MORE THAN THE REST OF THE FILE:
 *
 *   - IT NEVER PRETENDS TO SELL. While buying is not open, no buy button is
 *     enabled, in any language or state, and the reason is on screen in words.
 *   - THE PRICE IS THE WHOLE PRICE. Both tiles carry "GST included" and both
 *     buttons are drawn identically - neither pre-selected, neither marigold.
 *   - THE WAY OUT IS REAL. Cancel calls the host's URL opener with Play's own
 *     subscription page, and it is never disabled.
 *   - A LAPSED PLAN SAYS NOTHING WAS DELETED.
 *   - THE "14 DAYS" IN THE COPY IS THE SERVER'S PREVIEW_DAYS, in all three
 *     languages - the same binding S7 makes for the deletion grace period.
 */
import { describe, it, expect } from 'vitest';
import { YourPlan, planStatus } from './S10.tsx';
import {
  canonicalStore,
  adversarialStore,
  planAnswer,
  READY_OFFER,
  CLOSED_OFFER,
  PREMIUM_RENEWING,
  itemsStore,
} from './registry.tsx';
import { Session, type PlanNotice } from '../app/session.tsx';
import { App, type PlanActions } from '../app/App.tsx';
import { playSubscriptionsUrl, PREMIUM_PRICES, type BasePlan, type PlanAnswer } from '../app/plan.ts';
import type { ProductsResult } from '../net/billing.ts';
import { render, all, byTestId, byType, text, type Node } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { tokens } from '../theme/tokens.ts';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { formatPaise, type Entry } from '@swafto/formula-engine';
import { CANONICAL_DATE } from '@swafto/fixtures';
import { phrase, strings, type Language, type StringKey } from '../i18n/strings.ts';
import { PREVIEW_DAYS } from '../../../api/src/billing/entitlement.ts';
import type { Store } from '../store/index.ts';

const LANGUAGES: readonly Language[] = ['en', 'hi', 'or'];
const T0 = '2026-10-26T12:00:00.000Z';

const sessionOn = (store: Store): Session => {
  let n = 0;
  return new Session(store, { now: () => T0, newId: () => 'n' + String(++n) });
};

const ids = (tree: Node): string[] => all(tree).map((n) => String(n.props?.testID ?? ''));
const has = (tree: Node, id: string): boolean => ids(tree).includes(id);
const buyButtons = (tree: Node): Node[] =>
  all(tree).filter((n) => /^s10-buy-/.test(String(n.props?.testID ?? '')));

/** A host double that records what was asked of it, and does nothing else. */
const recorder = () => {
  const calls: string[] = [];
  const plan: PlanActions = {
    refreshPlan: () => calls.push('refresh'),
    startPreview: () => calls.push('preview'),
    buyPremium: (b: BasePlan) => calls.push('buy:' + b),
  };
  return { calls, plan };
};

const cashSale = (id: string): Entry =>
  ({
    id,
    dayId: CANONICAL_DATE,
    section: 'cash_sales',
    amount: 25000,
    mode: 'cash',
    source: 'manual',
    createdAt: `${CANONICAL_DATE}T11:00:00.000Z`,
  }) as Entry;

describe('S10 renders all four states', () => {
  it('loading', () => {
    const tree = render(<YourPlan store={canonicalStore()} status="loading" />);
    expect(byTestId(tree, 's10-loading')).toBeTruthy();
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(3); // v2 3.12: three static skeleton rows replace the spinner
  });

  it('error offers a way back', () => {
    const tree = render(<YourPlan store={canonicalStore()} status="error" />);
    expect(byTestId(tree, 's10-error')).toBeTruthy();
    expect(byTestId(tree, 's10-retry')).toBeTruthy();
  });

  it('empty: the server never asked - he is on Free, and nothing is for sale', () => {
    /*
     * No answer yet is the empty state of this screen, and it is not blank:
     * the free promise and the price are structural. What it must not do is
     * offer a preview it cannot know is available, or a purchase it cannot make.
     */
    const tree = render(<YourPlan store={canonicalStore()} />);
    expect(has(tree, 's10-empty')).toBe(false);
    expect(text(byTestId(tree, 's10-status'))).toBe(phrase('s10.status.free', 'en'));
    expect(has(tree, 's10-preview')).toBe(false);
    expect(buyButtons(tree)).toHaveLength(2);
    for (const b of buyButtons(tree)) expect(b.props.disabled).toBe(true);
    expect(text(byTestId(tree, 's10-not-open'))).toBe(phrase('s10.notOpen', 'en'));
  });

  it('loaded: status, the free list, the Premium list and both prices', () => {
    const tree = render(
      <YourPlan store={canonicalStore()} answer={planAnswer({}, true)} offer={READY_OFFER} />,
    );
    for (const id of [
      's10-status',
      's10-free-group',
      's10-premium-group',
      's10-price-monthly',
      's10-price-yearly',
    ]) {
      expect(has(tree, id), id).toBe(true);
    }
    expect(ids(tree).filter((id) => /^s10-free-\d$/.test(id))).toHaveLength(6);
    expect(ids(tree).filter((id) => /^s10-premium-\d$/.test(id))).toHaveLength(6);
  });
});

describe('S10 never pretends to sell', () => {
  const closed: readonly [string, PlanAnswer | null, ProductsResult | null][] = [
    ['no answer, no offer', null, null],
    ['offer unavailable', planAnswer({}, true), CLOSED_OFFER],
    ['offer ready but the server has buying closed', planAnswer({}, false), READY_OFFER],
  ];
  for (const [name, answer, offer] of closed) {
    it(name + ': no buy button is enabled, and the reason is in words', () => {
      for (const language of LANGUAGES) {
        const tree = render(
          <YourPlan store={canonicalStore()} language={language} answer={answer} offer={offer} />,
        );
        const buttons = buyButtons(tree);
        expect(buttons).toHaveLength(2);
        for (const b of buttons) {
          expect(b.props.disabled).toBe(true);
          expect(b.props.accessibilityState?.disabled).toBe(true);
        }
        expect(text(byTestId(tree, 's10-not-open'))).toBe(phrase('s10.notOpen', language));
      }
    });
  }

  it('open: both buttons enabled, no reason shown, and each buys its own plan', () => {
    const bought: BasePlan[] = [];
    const tree = render(
      <YourPlan
        store={canonicalStore()}
        answer={planAnswer({}, true)}
        offer={READY_OFFER}
        onBuy={(b) => bought.push(b)}
      />,
    );
    for (const b of buyButtons(tree)) expect(b.props.disabled).toBe(false);
    expect(has(tree, 's10-not-open')).toBe(false);
    byTestId(tree, 's10-buy-monthly').props.onPress();
    byTestId(tree, 's10-buy-yearly').props.onPress();
    expect(bought).toEqual(['monthly', 'yearly']);
  });

  it('busy: nothing can be pressed twice while a purchase is in flight', () => {
    const tree = render(
      <YourPlan store={canonicalStore()} answer={planAnswer({}, true)} offer={READY_OFFER} busy />,
    );
    for (const b of buyButtons(tree)) expect(b.props.disabled).toBe(true);
    expect(byTestId(tree, 's10-preview').props.disabled).toBe(true);
  });

  it('a purchase is the source: the buy buttons are gone, Cancel is there', () => {
    const tree = render(
      <YourPlan store={canonicalStore()} plan="premium" answer={PREMIUM_RENEWING} offer={READY_OFFER} />,
    );
    expect(buyButtons(tree)).toEqual([]);
    expect(has(tree, 's10-price-group')).toBe(false);
    expect(byTestId(tree, 's10-cancel')).toBeTruthy();
  });
});

describe('S10 shows the whole price, with equal weight', () => {
  it('both prices carry the GST-included words, in every language', () => {
    for (const language of LANGUAGES) {
      const tree = render(
        <YourPlan store={canonicalStore()} language={language} answer={planAnswer()} />,
      );
      const monthly = text(byTestId(tree, 's10-price-monthly'));
      const yearly = text(byTestId(tree, 's10-price-yearly'));
      expect(monthly).toContain(phrase('s10.price.perMonth', language));
      expect(yearly).toContain(phrase('s10.price.perYear', language));
      expect(monthly).toContain('GST');
      expect(yearly).toContain('GST');
      // The renewal terms and the way to cancel sit beside the price, not behind Play's sheet.
      expect(monthly).toContain(phrase('s10.renew.monthly', language));
      expect(yearly).toContain(phrase('s10.renew.yearly', language));
      expect(text(byTestId(tree, 's10-terms'))).toBe(phrase('s10.cancelTerms', language));
    }
  });

  it("R5's prices until Play answers, and Play's own price once it does", () => {
    const fallback = render(<YourPlan store={canonicalStore()} offer={CLOSED_OFFER} />);
    expect(text(byTestId(fallback, 's10-price-monthly-amount'))).toBe(
      formatPaise(PREMIUM_PRICES.monthly),
    );
    expect(text(byTestId(fallback, 's10-price-yearly-amount'))).toBe(
      formatPaise(PREMIUM_PRICES.yearly),
    );

    const play = render(
      <YourPlan
        store={canonicalStore()}
        answer={planAnswer({}, true)}
        offer={{
          kind: 'ready',
          plans: [
            { basePlanId: 'monthly', offerToken: 'm', pricePaise: 12900, formattedPrice: '', billingPeriod: 'P1M' },
            { basePlanId: 'yearly', offerToken: 'y', pricePaise: 99900, formattedPrice: '', billingPeriod: 'P1Y' },
          ],
        }}
      />,
    );
    expect(text(byTestId(play, 's10-price-monthly-amount'))).toBe(formatPaise(12900));
    expect(text(byTestId(play, 's10-price-yearly-amount'))).toBe(formatPaise(99900));
  });

  it('monthly and yearly are drawn identically: no pre-selection, no marigold', () => {
    for (const display of ['comfort', 'focus'] as const) {
      const t = tokens(display);
      const tree = render(
        <YourPlan
          store={canonicalStore()}
          display={display}
          answer={planAnswer({}, true)}
          offer={READY_OFFER}
        />,
      );
      const m = byTestId(tree, 's10-buy-monthly');
      const y = byTestId(tree, 's10-buy-yearly');
      expect(m.props.style).toEqual(y.props.style);
      expect(m.props.accessibilityState).toEqual(y.props.accessibilityState);
      expect(m.props.style.backgroundColor).not.toBe(t.color.accent);
      expect(byTestId(tree, 's10-price-monthly').props.style).toEqual(
        byTestId(tree, 's10-price-yearly').props.style,
      );
      expect(all(tree).some((n) => n.props?.accessibilityState?.selected === true)).toBe(false);
    }
  });
});

describe('S10 status: a fact with a date, never a countdown', () => {
  const s = strings('en');

  it('a preview running says when it ends', () => {
    const answer = planAnswer({
      plan: 'premium',
      source: 'preview',
      until: '2026-11-09T12:00:00.000Z',
      previewAvailable: false,
      previewEndsAt: '2026-11-09T12:00:00.000Z',
      everPremium: true,
    });
    expect(planStatus('premium', answer, s)).toBe('Premium preview ends on Monday 9 November 2026.');
  });

  it('a purchase that renews says when; a cancelled one says when it ends', () => {
    expect(planStatus('premium', PREMIUM_RENEWING, s)).toBe(
      'Premium renews on Thursday 26 November 2026.',
    );
    const cancelled = planAnswer(
      { ...PREMIUM_RENEWING.entitlement, renews: false, state: 'SUBSCRIPTION_STATE_CANCELED' },
      true,
    );
    expect(planStatus('premium', cancelled, s)).toBe(
      'Premium ends on Thursday 26 November 2026. It will not renew.',
    );
  });

  it('on hold, the plain fact - and Cancel is still offered there', () => {
    const answer = planAnswer(
      { state: 'SUBSCRIPTION_STATE_ON_HOLD', previewAvailable: false, everPremium: true },
      true,
    );
    const tree = render(<YourPlan store={canonicalStore()} answer={answer} offer={READY_OFFER} />);
    expect(text(byTestId(tree, 's10-status'))).toBe(phrase('s10.status.onHold', 'en'));
    expect(byTestId(tree, 's10-cancel')).toBeTruthy();
  });

  it('the lapse copy appears when everPremium and free: nothing was deleted', () => {
    for (const language of LANGUAGES) {
      const tree = render(
        <YourPlan
          store={canonicalStore()}
          language={language}
          answer={planAnswer({ previewAvailable: false, everPremium: true })}
        />,
      );
      expect(text(byTestId(tree, 's10-status'))).toBe(phrase('s10.status.lapsed', language));
    }
    expect(phrase('s10.status.lapsed', 'en')).toContain('Nothing was deleted');
  });

  it('a premium answer past its own until reads as lapsed, not as Premium', () => {
    // `plan` is planOf(answer, now): the session ends it, and the screen follows the plan.
    expect(planStatus('free', PREMIUM_RENEWING, s)).toBe(phrase('s10.status.lapsed', 'en'));
  });

  it('never had it: "You are on Free."', () => {
    expect(planStatus('free', planAnswer(), s)).toBe('You are on Free.');
  });

  it('no status line is a countdown: a date, and no number of days left', () => {
    for (const key of ['s10.status.preview', 's10.status.renews', 's10.status.ends'] as const) {
      for (const language of LANGUAGES) expect(phrase(key, language)).toContain('{date}');
      expect(phrase(key, 'en')).not.toMatch(/left|only|hurry|\d/i);
    }
  });
});

describe('S10 preview: no payment details, and it simply ends', () => {
  it('the preview button is absent when previewAvailable is false', () => {
    const tree = render(
      <YourPlan store={canonicalStore()} answer={planAnswer({ previewAvailable: false })} />,
    );
    expect(has(tree, 's10-preview')).toBe(false);
  });

  it('absent on Premium even if the server still offers it', () => {
    const tree = render(
      <YourPlan
        store={canonicalStore()}
        plan="premium"
        answer={planAnswer({ plan: 'premium', source: 'preview', until: '2026-11-09T12:00:00.000Z' })}
      />,
    );
    expect(has(tree, 's10-preview')).toBe(false);
  });

  it('present when available, says it ends and charges nothing, and reports the press', () => {
    let pressed = 0;
    const tree = render(
      <YourPlan store={canonicalStore()} answer={planAnswer()} onStartPreview={() => (pressed += 1)} />,
    );
    const button = byTestId(tree, 's10-preview');
    expect(button.props.disabled).toBe(false);
    expect(text(byTestId(tree, 's10-preview-note'))).toBe(phrase('s10.preview.note', 'en'));
    button.props.onPress();
    expect(pressed).toBe(1);
  });

  it('the "14" in every preview line is the server PREVIEW_DAYS, in all three languages', () => {
    expect(PREVIEW_DAYS).toBe(14);
    for (const language of LANGUAGES) {
      for (const key of ['s10.preview', 's10.preview.note', 's10.notice.previewStarted'] as const) {
        expect(phrase(key, language), key + '/' + language).toContain(String(PREVIEW_DAYS));
      }
    }
  });
});

describe('S10 cancel: two taps from Settings, never greyed', () => {
  it('Cancel Premium says exactly that, and is enabled', () => {
    const tree = render(<YourPlan store={canonicalStore()} plan="premium" answer={PREMIUM_RENEWING} />);
    const button = byTestId(tree, 's10-cancel');
    expect(text(button)).toBe('Cancel Premium');
    expect(button.props.disabled).toBe(false);
    expect(button.props.accessibilityState?.disabled).toBe(false);
  });

  it('the cancel button calls onOpenUrl with the Play subscriptions URL, through the app', () => {
    const s = sessionOn(canonicalStore());
    s.setPlanAnswer(PREMIUM_RENEWING);
    s.goTo('S10');
    const opened: string[] = [];
    byTestId(render(<App session={s} onOpenUrl={(u) => opened.push(u)} />), 's10-cancel').props.onPress();
    expect(opened).toEqual([playSubscriptionsUrl('swafto_premium')]);
    expect(opened[0]).toMatch(
      /^https:\/\/play\.google\.com\/store\/account\/subscriptions\?sku=swafto_premium&package=/,
    );
  });

  it('Settings row, then Cancel: two taps, and the row asks the server again', () => {
    const s = sessionOn(canonicalStore());
    s.setPlanAnswer(PREMIUM_RENEWING);
    s.goTo('S1');
    const { calls, plan } = recorder();
    byTestId(render(<App session={s} plan={plan} />), 's1-plan').props.onPress();
    expect(s.state.screen).toBe('S10');
    expect(calls).toEqual(['refresh']);
    expect(byTestId(render(<App session={s} plan={plan} />), 's10-cancel')).toBeTruthy();
    byTestId(render(<App session={s} plan={plan} />), 's10-back').props.onPress();
    expect(s.state.screen).toBe('S1');
  });
});

describe('S10 mutates the store and is wired through the real session', () => {
  it('mutates the store: a new sale changes the day and changes nothing here', () => {
    // S10 carries no ledger figure; the day moving under it must leave it identical.
    const store = canonicalStore();
    const before = text(render(<YourPlan store={store} answer={planAnswer()} />));
    store.append(cashSale('s10-m1'));
    expect(store.state.entries.length).toBeGreaterThan(0);
    expect(text(render(<YourPlan store={store} answer={planAnswer()} />))).toBe(before);
  });

  it("the session's answer, offer and notice reach the screen, and presses reach the host", () => {
    const store = canonicalStore();
    const revision = store.revision;
    const s = sessionOn(store);
    s.goTo('S10');
    const { calls, plan } = recorder();
    const draw = () => render(<App session={s} plan={plan} />);

    expect(text(byTestId(draw(), 's10-status'))).toBe(phrase('s10.status.free', 'en'));

    s.setPlanAnswer(planAnswer({}, true));
    s.setPlanOffer(READY_OFFER);
    byTestId(draw(), 's10-preview').props.onPress();
    byTestId(draw(), 's10-buy-yearly').props.onPress();
    expect(calls).toEqual(['preview', 'buy:yearly']);

    s.planWorking(true);
    expect(byTestId(draw(), 's10-buy-monthly').props.disabled).toBe(true);
    s.planSaid('pending');
    expect(text(byTestId(draw(), 's10-notice-pending'))).toBe(
      'Google Play is still processing the payment. Premium starts when it is done.',
    );

    // Premium arrives from the server: the session derives the plan, and the screen follows.
    s.setPlanAnswer(PREMIUM_RENEWING);
    expect(s.state.plan).toBe('premium');
    expect(text(byTestId(draw(), 's10-status'))).toBe('Premium renews on Thursday 26 November 2026.');
    expect(buyButtons(draw())).toEqual([]);

    // The plan screen writes nothing to the ledger.
    expect(store.revision).toBe(revision);
  });
});

describe('S10 says each notice once, in words', () => {
  const NOTICES: readonly PlanNotice[] = [
    'previewStarted',
    'notOpen',
    'offline',
    'failed',
    'pending',
    'verifyLater',
    'purchased',
  ];
  for (const notice of NOTICES) {
    it(notice, () => {
      for (const language of LANGUAGES) {
        const tree = render(<YourPlan store={canonicalStore()} language={language} notice={notice} />);
        const node = byTestId(tree, 's10-notice-' + notice);
        expect(node.props.accessibilityLiveRegion).toBe('polite');
        expect(text(node)).toBe(phrase(('s10.notice.' + notice) as StringKey, language));
        expect(ids(tree).filter((id) => id.startsWith('s10-notice-'))).toHaveLength(1);
      }
    });
  }

  it('the exact words for pending and verifyLater', () => {
    expect(phrase('s10.notice.pending', 'en')).toContain('Google Play is still processing the payment');
    expect(phrase('s10.notice.verifyLater', 'en')).toContain(
      'Google Play took the purchase. It will be confirmed when the phone is online',
    );
  });

  it('no notice, no banner', () => {
    const tree = render(<YourPlan store={canonicalStore()} />);
    expect(ids(tree).some((id) => id.startsWith('s10-notice-'))).toBe(false);
  });
});

describe('S10 in every language, including the adversarial worst case', () => {
  for (const language of LANGUAGES) {
    it(language + ': the title, status and buttons are in that language', () => {
      const tree = render(<YourPlan store={canonicalStore()} language={language} answer={planAnswer()} />);
      expect(text(byTestId(tree, 's10-title'))).toBe(phrase('s10.title', language));
      expect(text(byTestId(tree, 's10-buy-monthly'))).toBe(phrase('s10.buy.monthly', language));
      expect(text(byTestId(tree, 's10-preview'))).toBe(phrase('s10.preview', language));
    });
  }

  it('the adversarial shop renders the whole screen', () => {
    const tree = render(<YourPlan store={adversarialStore()} language="or" answer={planAnswer()} />);
    for (const id of ['s10-status', 's10-price-group', 's10-free-group', 's10-premium-group', 's10-preview']) {
      expect(has(tree, id), id).toBe(true);
    }
  });

  it('longest string mode at the largest type keeps every action reachable', () => {
    const premium = render(
      <YourPlan
        store={adversarialStore()}
        language="longest"
        display="focus"
        plan="premium"
        answer={PREMIUM_RENEWING}
        notice="verifyLater"
      />,
    );
    expect(byTestId(premium, 's10-cancel')).toBeTruthy();
    const free = render(
      <YourPlan store={adversarialStore()} language="longest" display="focus" answer={planAnswer()} />,
    );
    expect(buyButtons(free)).toHaveLength(2);
    expect(byTestId(free, 's10-preview')).toBeTruthy();
  });

  it('chrome is capped', () => {
    const tree = render(<YourPlan store={canonicalStore()} />);
    expect(byTestId(tree, 's10-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 's10-status').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
  });
});

describe('S10 accessibility, and it is not an entry screen', () => {
  const TREES = () => [
    render(<YourPlan store={canonicalStore()} answer={planAnswer()} onBack={() => {}} />),
    render(
      <YourPlan
        store={canonicalStore()}
        answer={planAnswer({}, true)}
        offer={READY_OFFER}
        display="focus"
        language="or"
      />,
    ),
    render(<YourPlan store={canonicalStore()} plan="premium" answer={PREMIUM_RENEWING} notice="purchased" />),
    render(<YourPlan store={canonicalStore()} status="error" />),
    render(<YourPlan store={canonicalStore()} status="loading" />),
    render(
      <YourPlan
        store={adversarialStore()}
        language="longest"
        display="focus"
        answer={planAnswer()}
        busy
        notice="offline"
      />,
    ),
  ];

  it('every target meets TOUCH_TARGET_MIN_DP', () => {
    for (const tree of TREES()) expect(undersizedTargets(tree)).toEqual([]);
    expect(TOUCH_TARGET_MIN_DP).toBeGreaterThan(0);
  });

  it('no text under the floor, no colour under the minimum - disabled buttons included', () => {
    for (const tree of TREES()) {
      expect(undersizedText(tree)).toEqual([]);
      expect(failingContrast(tree)).toEqual([]);
    }
  });

  it('nothing is typed here, so no keypad - and no bottom nav either', () => {
    const tree = render(<YourPlan store={canonicalStore()} answer={planAnswer()} onBack={() => {}} />);
    expect(ids(tree).filter((id) => /^keypad/.test(id))).toEqual([]);
    expect(ids(tree).filter((id) => /nav|tabbar|bottom-bar/i.test(id))).toEqual([]);
    expect(byTestId(tree, 's10-back')).toBeTruthy();
  });

  it('every button announces the words on its face', () => {
    const tree = render(<YourPlan store={canonicalStore()} answer={planAnswer()} />);
    for (const id of ['s10-buy-monthly', 's10-buy-yearly', 's10-preview']) {
      const b = byTestId(tree, id);
      expect(b.props.accessibilityRole).toBe('button');
      expect(b.props.accessibilityLabel).toBe(text(b));
    }
  });
});

describe("the session's plan reaches the Premium screens through the app", () => {
  it('M1: free shows the lock and Upgrade opens S10 asking again; Premium has no lock', () => {
    const s = sessionOn(canonicalStore());
    s.goTo('M1');
    const { calls, plan } = recorder();
    const free = render(<App session={s} plan={plan} />);
    expect(has(free, 'm1-locked')).toBe(true);
    byTestId(free, 'm1-upgrade').props.onPress();
    expect(s.state.screen).toBe('S10');
    expect(calls).toEqual(['refresh']);

    s.setPlanAnswer(PREMIUM_RENEWING);
    s.goTo('M1');
    expect(s.state.plan).toBe('premium');
    expect(has(render(<App session={s} plan={plan} />), 'm1-locked')).toBe(false);
  });

  it("M1: PR-2's item cards fill the dashboard's slot from the shop's own item lines", () => {
    const s = sessionOn(itemsStore(canonicalStore()));
    s.setPlanAnswer(PREMIUM_RENEWING);
    s.goTo('M1');
    expect(has(render(<App session={s} />), 'item-cards')).toBe(true);
  });

  it('C1: a Premium question is refused on free and answered on Premium', () => {
    const s = sessionOn(canonicalStore());
    const premiumLine = phrase('c1.premium', 'en');
    const ask = () => {
      s.openChat('T1');
      s.setChatDraft('which was the best day this month');
      s.askChat();
      return text(render(<App session={s} />));
    };
    expect(ask()).toContain(premiumLine);
    s.back();
    s.setPlanAnswer(PREMIUM_RENEWING);
    expect(ask()).not.toContain(premiumLine);
  });
});

/*
 * BETA: these tests cover the Free/Premium gate as it will stand after beta,
 * so the all-free beta switch is off for this file and restored after it.
 */
import { beforeAll as betaOff, afterAll as betaOn } from 'vitest';
import { BETA } from '../app/plan.ts';
betaOff(() => {
  BETA.allFree = false;
});
betaOn(() => {
  BETA.allFree = true;
});
