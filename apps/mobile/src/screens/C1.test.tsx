/**
 * C1 ASK - the §B.6 bar, and the session that drives it.
 *
 * THE CLAIMS WORTH TESTING ARE THE ONES THE SCREEN MAKES ABOUT ITSELF:
 *   - an answer is the engine's figure, worked out on render - so appending a
 *     sale AFTER a question moves that question's answer (the assertion a kept
 *     answer fails);
 *   - it asks back with chips rather than guessing;
 *   - on the free plan a Premium question says so and gives the nearest free
 *     figure;
 *   - it is a question screen: no keypad, and nothing it does writes the ledger.
 */
import { describe, it, expect } from 'vitest';
import { Ask } from './C1.tsx';
import { Today } from './T1.tsx';
import { TodayClosed } from './T3.tsx';
import { Reports } from './R1.tsx';
import {
  canonicalStore,
  adversarialStore,
  closedStore,
  historyStore,
  askedChat,
  ASK_QUESTIONS,
  ASK_PREMIUM,
} from './registry.tsx';
import { Session } from '../app/session.tsx';
import { render, all, byTestId, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { formatPaise, type Entry } from '@swafto/formula-engine';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';
import { CANONICAL_DATE } from '@swafto/fixtures';
import type { Store } from '../store/index.ts';

const money = (paise: number) => formatPaise(paise, { withSign: false });
const ids = (tree: ReturnType<typeof render>) => all(tree).map((n) => String(n.props?.testID ?? ''));

const cashSale = (id: string, amount: number): Entry =>
  ({
    id,
    dayId: CANONICAL_DATE,
    section: 'cash_sales',
    amount,
    mode: 'cash',
    source: 'manual',
    createdAt: `${CANONICAL_DATE}T20:05:00.000Z`,
  }) as Entry;

const sessionOn = (store: Store) =>
  new Session(store, { now: () => CANONICAL_DATE + 'T20:00:00.000Z', newId: () => 'c1-test' });

describe('C1 renders all four states', () => {
  it('loading', () => {
    expect(byTestId(render(<Ask store={canonicalStore()} status="loading" />), 'c1-loading')).toBeTruthy();
  });

  it('error offers a way back', () => {
    const tree = render(<Ask store={canonicalStore()} status="error" />);
    expect(byTestId(tree, 'c1-error')).toBeTruthy();
    expect(byTestId(tree, 'c1-retry')).toBeTruthy();
  });

  it('empty: nothing asked yet - the empty copy, and what can be asked, as taps', () => {
    const tree = render(<Ask store={canonicalStore()} />);
    expect(text(byTestId(tree, 'c1-empty'))).toBe(phrase('c1.empty', 'en'));
    expect(ids(tree).filter((id) => /^c1-suggest-\d+$/.test(id))).toHaveLength(5);
    // The field and the Ask button survive the empty state: they are in the footer.
    expect(byTestId(tree, 'c1-input')).toBeTruthy();
    expect(byTestId(tree, 'c1-ask').props?.accessibilityState?.disabled).toBe(true);
  });

  it('loaded: each question, what it was understood as, and its answer', () => {
    const store = canonicalStore();
    const tree = render(<Ask store={store} chat={askedChat(store, ASK_QUESTIONS.en)} />);
    expect(ids(tree)).not.toContain('c1-empty');
    expect(text(byTestId(tree, 'c1-turn-0-q'))).toBe("what were today's sales");
    expect(text(byTestId(tree, 'c1-turn-0-heard'))).toBe('Understood as: Sales · today');
    expect(byTestId(tree, 'c1-turn-0-answer')).toBeTruthy();
    // The third question is not one it can place: it asks back.
    expect(text(byTestId(tree, 'c1-turn-2-didYouMean'))).toBe(phrase('c1.didYouMean', 'en'));
    expect(ids(tree).filter((id) => /^c1-turn-2-chip-\d+$/.test(id))).toHaveLength(3);
  });
});

describe('C1 mutates the store and every answer follows', () => {
  it("a sale added after the question moves that question's answer", () => {
    /*
     * THE ASSERTION A KEPT ANSWER FAILS. The conversation is asked once; the
     * sale is appended after; the same conversation is drawn again.
     */
    const store = canonicalStore();
    const chat = askedChat(store, ["what were today's sales"]);
    const before = text(byTestId(render(<Ask store={store} chat={chat} />), 'c1-turn-0-c1-fig-sales'));
    store.append(cashSale('c1-t1', 150000));
    const after = text(byTestId(render(<Ask store={store} chat={chat} />), 'c1-turn-0-c1-fig-sales'));
    expect(after).not.toBe(before);
    expect(after).toContain(money(store.primary().p4NetSales.value));
  });

  it('the three free figures are the engine figures the Today tab shows', () => {
    const store = canonicalStore();
    const session = sessionOn(store);
    session.openChat('T1');
    for (const intent of ['sales', 'expected', 'owed'] as const) session.askChatChip({ intent, slots: {} });
    const tree = render(<Ask store={store} chat={session.state.chat ?? null} />);
    const p = store.primary();
    expect(text(byTestId(tree, 'c1-turn-0-c1-fig-sales'))).toContain(money(p.p4NetSales.value));
    expect(text(byTestId(tree, 'c1-turn-1-c1-fig-expected'))).toContain(money(store.expectedCash().value));
    expect(text(byTestId(tree, 'c1-turn-2-c1-fig-owed'))).toContain(money(p.p7CreditOutstanding.value));
    for (const i of [0, 1, 2]) {
      expect(text(byTestId(tree, `c1-turn-${i}-covers`))).toBe(phrase('c1.covers', 'en'));
    }
  });

  it('asking writes nothing to the ledger - not an entry, not a revision', () => {
    const store = historyStore();
    const before = store.revision;
    const entries = store.state.entries.length;
    render(<Ask store={store} plan="premium" chat={askedChat(store, ASK_PREMIUM)} />);
    expect(store.revision).toBe(before);
    expect(store.state.entries.length).toBe(entries);
  });
});

describe('C1 on the free plan and on Premium', () => {
  it('free: a Premium question says so in one line and gives the nearest free figure', () => {
    const store = canonicalStore();
    const tree = render(<Ask store={store} chat={askedChat(store, ASK_QUESTIONS.en)} />);
    expect(text(byTestId(tree, 'c1-turn-1-line-0'))).toBe(phrase('c1.premium', 'en'));
    expect(text(byTestId(tree, 'c1-turn-1-c1-fig-sales'))).toContain(money(store.primary().p4NetSales.value));
    // And no follow-up chips: those are Premium's. Turn 2's chips are its "did you mean".
    expect(ids(tree).filter((id) => /^c1-turn-[01]-chip/.test(id))).toEqual([]);
  });

  it('premium: best day, a comparison, a party and a follow-up, against thirty-one days', () => {
    const store = historyStore();
    const tree = render(<Ask store={store} plan="premium" chat={askedChat(store, ASK_PREMIUM)} />);
    expect(text(byTestId(tree, 'c1-turn-0-heard'))).toBe('Understood as: Best day · this month');
    expect(byTestId(tree, 'c1-turn-0-c1-fig-best')).toBeTruthy();
    expect(text(byTestId(tree, 'c1-turn-1-heard'))).toBe('Understood as: Compare sales · this week');
    expect(byTestId(tree, 'c1-turn-1-c1-fig-difference')).toBeTruthy();
    expect(text(byTestId(tree, 'c1-turn-2-heard'))).toBe('Understood as: Payments · this month · Ramesh');
    // "and last month?" kept the party and the intent and changed the period.
    expect(text(byTestId(tree, 'c1-turn-3-heard'))).toBe('Understood as: Payments · last month · Ramesh');
    expect(text(byTestId(tree, 'c1-turn-3-q'))).toBe('and last month?');
  });

  it('premium adds its suggestions to the free ones', () => {
    const n = (plan: 'free' | 'premium') =>
      ids(render(<Ask store={canonicalStore()} plan={plan} />)).filter((id) => /^c1-suggest-\d+$/.test(id)).length;
    expect(n('free')).toBe(5);
    expect(n('premium')).toBe(8);
  });
});

describe('C1 driven through the session', () => {
  it('Today and Reports each open it in one tap, and Back returns to whichever it was', () => {
    for (const from of ['T1', 'R1'] as const) {
      const session = sessionOn(canonicalStore());
      session.openChat(from);
      expect(session.state.screen).toBe('C1');
      expect(session.back()).toBe(true);
      expect(session.state.screen).toBe(from);
      // The conversation is not kept once he leaves.
      expect(session.state.chat ?? null).toBeNull();
    }
  });

  it('the buttons on T1, T3 and R1 are wired to open it', () => {
    const opened: string[] = [];
    byTestId(render(<Today store={canonicalStore()} onOpenChat={() => opened.push('t1')} />), 't1-ask').props.onPress();
    byTestId(render(<TodayClosed store={closedStore()} onOpenChat={() => opened.push('t3')} />), 't3-ask').props.onPress();
    byTestId(render(<Reports store={closedStore()} onOpenChat={() => opened.push('r1')} />), 'r1-ask').props.onPress();
    // R1's sits in the body header, so it is there before the first close too.
    byTestId(render(<Reports store={canonicalStore()} onOpenChat={() => opened.push('r1-empty')} />), 'r1-ask').props.onPress();
    expect(opened).toEqual(['t1', 't3', 'r1', 'r1-empty']);
  });

  it('typing then asking adds a turn and clears the field; an empty field asks nothing', () => {
    const session = sessionOn(canonicalStore());
    session.openChat('T1');
    session.askChat();
    expect(session.state.chat?.turns).toHaveLength(0);
    session.setChatDraft('  how do i close the day  ');
    expect(session.state.chat?.draft).toBe('  how do i close the day  ');
    session.askChat();
    expect(session.state.chat?.draft).toBe('');
    expect(session.state.chat?.turns[0]?.question).toBe('how do i close the day');
    const r = session.state.chat?.turns[0]?.result;
    expect(r?.kind === 'resolved' && r.resolution.intent).toBe('howClose');
  });

  it('a follow-up through the session keeps the last question', () => {
    const chat = askedChat(historyStore(), ['UPI sales this week', 'and last week?']);
    const r = chat.turns[1]?.result;
    expect(r?.kind === 'resolved' && r.resolution).toEqual({
      intent: 'sales',
      slots: { period: { kind: 'lastWeek' }, mode: 'upi' },
    });
  });

  it('HT-41: as the thread grows, the body scrolls to the newest answer', () => {
    const store = canonicalStore();
    const body = byTestId(render(<Ask store={store} chat={askedChat(store, ASK_QUESTIONS.en)} />), 'c1-body');
    const calls: unknown[] = [];
    body.props.ref({ scrollToEnd: (o: unknown) => calls.push(o) });
    body.props.onContentSizeChange(360, 2400);
    expect(calls).toEqual([{ animated: true }]);
  });

  it('HT-40 through the session: an unrelated question after an item one is its own', () => {
    const chat = askedChat(historyStore(), ['which item sells the most', 'sales yesterday']);
    const r = chat.turns[1]?.result;
    expect(r?.kind === 'resolved' && r.resolution).toEqual({ intent: 'sales', slots: { period: { kind: 'yesterday' } } });
  });

  it('the conversation keeps its last twenty turns, not every turn ever asked', () => {
    const session = sessionOn(canonicalStore());
    session.openChat('T1');
    for (let i = 0; i < 25; i += 1) session.askChatChip({ intent: 'howClose', slots: {} });
    expect(session.state.chat?.turns).toHaveLength(20);
  });
});

describe('C1 in every language, including the adversarial worst case', () => {
  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': title, field, suggestions and the empty copy are in that language', () => {
      const tree = render(<Ask store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 'c1-title'))).toBe(phrase('c1.title', language));
      expect(text(byTestId(tree, 'c1-empty'))).toBe(phrase('c1.empty', language));
      expect(byTestId(tree, 'c1-input').props?.placeholder).toBe(phrase('c1.placeholder', language));
      expect(text(byTestId(tree, 'c1-suggest-0'))).toBe(phrase('c1.i.sales', language));
    });
  }

  it('the adversarial shop, asked in Odia: lakh figures under the longest Odia labels', () => {
    const store = adversarialStore();
    const tree = render(<Ask store={store} language="or" chat={askedChat(store, ASK_QUESTIONS.or)} />);
    expect(text(byTestId(tree, 'c1-turn-0-c1-fig-sales'))).toContain(money(store.primary().p4NetSales.value));
    expect(text(byTestId(tree, 'c1-turn-1-line-0'))).toBe(phrase('c1.premium', 'or'));
  });

  it('longest string mode at the largest type still shows every part of every answer', () => {
    const store = historyStore();
    const tree = render(
      <Ask store={store} plan="premium" language="longest" display="focus" chat={askedChat(store, ASK_PREMIUM)} />,
    );
    for (const id of ['c1-title', 'c1-turn-0-heard', 'c1-turn-1-c1-fig-difference', 'c1-turn-3-covers', 'c1-input']) {
      expect(byTestId(tree, id), id).toBeTruthy();
    }
  });

  it('chrome is capped; the field is capped too', () => {
    const store = canonicalStore();
    const tree = render(<Ask store={store} chat={askedChat(store, ASK_QUESTIONS.en)} />);
    for (const id of ['c1-title', 'c1-turn-0-heard', 'c1-turn-0-q', 'c1-input']) {
      expect(byTestId(tree, id).props?.maxFontSizeMultiplier, id).toBe(CHROME_FONT_SCALE_CAP);
    }
  });
});

describe('C1 accessibility, and it is a question screen rather than an entry screen', () => {
  const TREES = () => {
    const c = canonicalStore();
    const a = adversarialStore();
    const h = historyStore();
    return [
      render(<Ask store={c} />),
      render(<Ask store={c} chat={askedChat(c, ASK_QUESTIONS.en)} />),
      render(<Ask store={a} language="or" display="focus" chat={askedChat(a, ASK_QUESTIONS.or)} />),
      render(<Ask store={h} plan="premium" chat={askedChat(h, ASK_PREMIUM)} />),
      render(<Ask store={h} plan="premium" language="longest" display="focus" chat={askedChat(h, ASK_PREMIUM)} />),
      render(<Ask store={c} status="error" />),
    ];
  };

  it('every target meets TOUCH_TARGET_MIN_DP', () => {
    for (const tree of TREES()) expect(undersizedTargets(tree)).toEqual([]);
    expect(TOUCH_TARGET_MIN_DP).toBeGreaterThan(0);
  });

  it('no text under the floor, no colour under the minimum', () => {
    for (const tree of TREES()) {
      expect(undersizedText(tree)).toEqual([]);
      expect(failingContrast(tree)).toEqual([]);
    }
  });

  it('no keypad - nothing is entered here - and no bottom navigation, because it has a way back', () => {
    for (const tree of TREES()) {
      expect(ids(tree).filter((id) => /^keypad/.test(id))).toEqual([]);
      expect(ids(tree).filter((id) => /^bottom-nav-/.test(id))).toEqual([]);
    }
    expect(byTestId(render(<Ask store={canonicalStore()} />), 'c1-back')).toBeTruthy();
  });

  it('every rupee figure is drawn by Money, never inside a sentence', () => {
    const h = historyStore();
    const tree = render(<Ask store={h} plan="premium" chat={askedChat(h, ASK_PREMIUM)} />);
    const sentences = all(tree).filter((n) => /-(line-\d+|heard|covers|q)$/.test(String(n.props?.testID ?? '')));
    expect(sentences.length).toBeGreaterThan(0);
    for (const n of sentences) expect(n.text, String(n.props?.testID)).not.toContain('₹');
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
