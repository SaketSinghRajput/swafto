/**
 * X1 ONBOARDING - the screen whose defects are omissions and additions.
 *
 * Two ways this screen fails, and neither is visible on a contact sheet. It
 * GROWS: a fifth question, a tour, a permissions primer. Or it ANSWERS FOR HIM:
 * an opening cash he never typed, written to the ledger as if he had.
 *
 * And one way it failed on the device: opening cash was compulsory here, so T2
 * (Today, first run) and T6 (opening cash) could never be reached by any path
 * in the installed app (F-16). The last block drives the real `App` through
 * both routes - no figure, and a figure - against a real `Store`.
 */
import { describe, it, expect } from 'vitest';
import { Onboarding } from './X1.tsx';
import { App } from '../app/App.tsx';
import { Session } from '../app/session.tsx';
import { Store, memoryPort, type PersistencePort, type StoreState } from '../store/index.ts';
import { render, all, byTestId, text, type Node } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { CHROME_FONT_SCALE_CAP, TOUCH_TARGET_MIN_DP } from '@swafto/values';
import { ADVERSARIAL_SHOP, canonicalInput, CANONICAL_DATE } from '@swafto/fixtures';
import { phrase, type Language } from '../i18n/strings.ts';

/** `byTestId` throws when a node is absent, so absence needs its own reading. */
const testIDs = (tree: Node): string[] =>
  all(tree)
    .map((n) => String(n.props?.testID ?? ''))
    .filter(Boolean);

/** The three autonyms, repeated here on purpose - see the test that uses them. */
const AUTONYMS: Readonly<Record<Language, string>> = {
  en: 'English',
  hi: 'हिन्दी',
  or: 'ଓଡ଼ିଆ',
};

describe('X1 renders all four states', () => {
  it('loading', () => {
    expect(byTestId(render(<Onboarding status="loading" />), 'x1-loading')).toBeTruthy();
  });

  it('error offers a way back', () => {
    const tree = render(<Onboarding status="error" />);
    expect(byTestId(tree, 'x1-error')).toBeTruthy();
    expect(byTestId(tree, 'x1-retry')).toBeTruthy();
  });

  it('ready: the brand header, the four questions and the one button', () => {
    const tree = render(<Onboarding />);
    expect(text(byTestId(tree, 'x1-eyebrow'))).toBe('SWAFTO');
    expect(text(byTestId(tree, 'x1-title'))).toBe(phrase('x1.heading', 'en'));
    for (const q of ['x1-q1', 'x1-q2', 'x1-q3', 'x1-q4']) expect(byTestId(tree, q)).toBeTruthy();
    expect(text(byTestId(tree, 'x1-finish'))).toBe(phrase('x1.start', 'en'));
  });

  it('there is no empty state: the four questions are constants, not data', () => {
    expect(testIDs(render(<Onboarding />))).not.toContain('x1-empty');
  });
});

describe('FOUR QUESTIONS, NO MORE - the constraint, as an assertion', () => {
  it('exactly four questions, numbered 1 to 4, in this order', () => {
    const tree = render(<Onboarding />);
    expect(testIDs(tree).filter((id) => /^x1-q\d+$/.test(id))).toEqual([
      'x1-q1',
      'x1-q2',
      'x1-q3',
      'x1-q4',
    ]);
    expect(text(byTestId(tree, 'x1-q1-label'))).toBe('1 · ' + phrase('x1.shopName', 'en'));
    expect(text(byTestId(tree, 'x1-q2-label'))).toBe('2 · ' + phrase('x1.language', 'en'));
    expect(text(byTestId(tree, 'x1-q3-label'))).toBe('3 · ' + phrase('s3.display', 'en'));
    expect(text(byTestId(tree, 'x1-q4-label'))).toBe('4 · ' + phrase('x1.cashNow', 'en'));
  });

  it('on bare ground: no question sits in a card', () => {
    // The reference draws the four on the page. Cards were the old build.
    const tree = render(<Onboarding />);
    for (const q of ['x1-q1', 'x1-q2', 'x1-q3', 'x1-q4']) {
      const style = byTestId(tree, q).props.style ?? {};
      expect(style.backgroundColor, q).toBeUndefined();
      expect(style.elevation, q).toBeUndefined();
    }
  });

  it('no consent copy is repeated here - that screen is X0 and there is one of it', () => {
    const body = text(render(<Onboarding />));
    for (const key of ['consent.intro', 'consent.rights', 'consent.agree'] as const) {
      expect(body).not.toContain(phrase(key, 'en'));
    }
  });
});

describe('question 1 - the shop name, typed and never guessed', () => {
  it('the field is empty until he types, and shows exactly what he typed', () => {
    expect(byTestId(render(<Onboarding />), 'x1-shopName').props.value).toBe('');
    expect(byTestId(render(<Onboarding shopName="Ravi " />), 'x1-shopName').props.value).toBe(
      'Ravi ',
    );
  });

  it('a keystroke is reported and nothing else is decided', () => {
    const typed: string[] = [];
    const tree = render(<Onboarding onShopName={(n) => typed.push(n)} />);
    byTestId(tree, 'x1-shopName').props.onChangeText('Ravi Stores');
    expect(typed).toEqual(['Ravi Stores']);
  });

  it('NO AUTOCORRECT, NO SPELLCHECK, NO AUTOFILL - the keyboard may not rename his shop', () => {
    const field = byTestId(render(<Onboarding />), 'x1-shopName').props;
    expect(field.autoCorrect).toBe(false);
    expect(field.spellCheck).toBe(false);
    expect(field.autoComplete).toBe('off');
  });

  it('focusing the name lowers the keypad', () => {
    const asked: boolean[] = [];
    const tree = render(<Onboarding keypadOpen onKeypad={(o) => asked.push(o)} />);
    byTestId(tree, 'x1-shopName').props.onFocus();
    expect(asked).toEqual([false]);
  });
});

describe('question 2 - language, each one written in its own script', () => {
  it('all three autonyms render whatever the app is currently showing, Odia first', () => {
    for (const rendered of ['en', 'hi', 'or'] as readonly Language[]) {
      const tree = render(<Onboarding language={rendered} />);
      for (const [key, autonym] of Object.entries(AUTONYMS)) {
        expect(text(byTestId(tree, 'x1-language-' + key)), rendered + '/' + key).toBe(autonym);
      }
      const order = testIDs(tree).filter(
        (id) => id.startsWith('x1-language-') && id !== 'x1-language-help',
      );
      expect(order).toEqual(['x1-language-or', 'x1-language-hi', 'x1-language-en']);
    }
  });

  it('the one in force is selected, filled with the accent the CTA uses, and only it', () => {
    const tree = render(<Onboarding language="or" />);
    const on = byTestId(tree, 'x1-language-or');
    expect(on.props.accessibilityState).toEqual({ selected: true });
    expect(on.props.style.backgroundColor).toBe(
      byTestId(tree, 'x1-finish').props.style.backgroundColor,
    );
    for (const key of ['en', 'hi']) {
      expect(byTestId(tree, 'x1-language-' + key).props.accessibilityState, key).toEqual({
        selected: false,
      });
    }
  });

  it('says that amounts keep their numerals, in the language shown', () => {
    for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
      const tree = render(<Onboarding language={language} />);
      expect(text(byTestId(tree, 'x1-language-help'))).toBe(phrase('x1.languageHelp', language));
    }
  });

  it('a tap reports the language and changes nothing by itself', () => {
    const chosen: Language[] = [];
    const tree = render(<Onboarding onLanguage={(l) => chosen.push(l)} />);
    for (const key of ['en', 'hi', 'or']) byTestId(tree, 'x1-language-' + key).props.onPress();
    expect(chosen).toEqual(['en', 'hi', 'or']);
  });
});

describe('question 3 - the screen, kept as it is while U-2 is open', () => {
  it('two answers, still Comfort and Focus - U-2 is not resolved here', () => {
    const tree = render(<Onboarding />);
    expect(text(byTestId(tree, 'x1-size-comfort'))).toBe(phrase('s3.comfort', 'en'));
    expect(text(byTestId(tree, 'x1-size-focus'))).toBe(phrase('s3.focus', 'en'));
    expect(testIDs(tree).filter((id) => id.startsWith('x1-size-'))).toHaveLength(2);
  });

  it('IT IS NOT FRAMED AS AN ACCESSIBILITY SETTING', () => {
    const body = text(render(<Onboarding />)).toLowerCase();
    for (const word of ['accessib', 'eyesight', 'vision', 'large print', 'disab', 'elderly']) {
      expect(body, word).not.toContain(word);
    }
  });

  it('the answer applies to this very page - Focus shows Focus selected, at Focus sizes', () => {
    const tree = render(<Onboarding display="focus" />);
    expect(byTestId(tree, 'x1-size-focus').props.accessibilityState).toEqual({ selected: true });
    expect(byTestId(tree, 'x1-size-comfort').props.accessibilityState).toEqual({ selected: false });
    const comfort = byTestId(render(<Onboarding />), 'x1-cash-help').props.style.fontSize;
    expect(byTestId(tree, 'x1-cash-help').props.style.fontSize).toBeGreaterThan(comfort);
  });

  it('a tap reports the mode', () => {
    const chosen: string[] = [];
    const tree = render(<Onboarding onDisplay={(d) => chosen.push(d)} />);
    byTestId(tree, 'x1-size-focus').props.onPress();
    byTestId(tree, 'x1-size-comfort').props.onPress();
    expect(chosen).toEqual(['focus', 'comfort']);
  });
});

describe('question 4 - cash in the box, optional, where unknown is not zero', () => {
  it('UNKNOWN IS A MUTED PLACEHOLDER, NEVER A FIGURE', () => {
    const tree = render(<Onboarding openingCashPaise={null} />);
    expect(testIDs(tree)).not.toContain('x1-opening-amount');
    const placeholder = byTestId(tree, 'x1-opening-amount-placeholder');
    // inkMuted, the helper's colour - not the ink a typed figure is drawn in.
    expect(placeholder.props.style.color).toBe(
      byTestId(tree, 'x1-cash-help').props.style.color,
    );
  });

  it('a typed zero IS an answer, and is shown through Money', () => {
    const tree = render(<Onboarding openingCashPaise={0} />);
    expect(text(byTestId(tree, 'x1-opening-amount'))).toBe('₹0.00');
    expect(testIDs(tree)).not.toContain('x1-opening-amount-placeholder');
  });

  it('the figure shown is the figure given', () => {
    const tree = render(<Onboarding openingCashPaise={250000} />);
    expect(text(byTestId(tree, 'x1-opening-amount'))).toContain('2,500');
  });

  it('it says it is optional, and what happens if it is left', () => {
    for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
      const tree = render(<Onboarding language={language} />);
      expect(text(byTestId(tree, 'x1-cash-help'))).toBe(phrase('x1.cashHelp', language));
    }
  });

  it('"Start the day" is never a dead button - the session refuses, and says why', () => {
    for (const el of [
      <Onboarding key="a" />,
      <Onboarding key="b" shopName="Ravi Stores" />,
      <Onboarding key="c" openingCashPaise={250000} />,
    ]) {
      expect(byTestId(render(el), 'x1-finish').props.disabled).toBe(false);
    }
  });

  it('finishing reports once, and invents no answer on the way out', () => {
    const finished: number[] = [];
    const typed: string[] = [];
    const tree = render(
      <Onboarding
        shopName="Ravi Stores"
        onFinish={() => finished.push(1)}
        onShopName={(n) => typed.push(n)}
      />,
    );
    byTestId(tree, 'x1-finish').props.onPress();
    expect(finished).toHaveLength(1);
    expect(typed).toEqual([]);
  });
});

describe('the keypad - absent until question 4 is answered, and then no bottom nav', () => {
  it('NO KEYPAD on arrival, as the reference draws it', () => {
    expect(testIDs(render(<Onboarding />))).not.toContain('keypad');
    expect(testIDs(render(<Onboarding shopName="Ravi Stores" />))).not.toContain('keypad');
  });

  it('tapping the cash field asks for the keypad, and tapping it again lowers it', () => {
    const asked: boolean[] = [];
    const closed = render(<Onboarding onKeypad={(o) => asked.push(o)} />);
    byTestId(closed, 'x1-opening-field').props.onPress();
    const open = render(<Onboarding keypadOpen onKeypad={(o) => asked.push(o)} />);
    byTestId(open, 'x1-opening-field').props.onPress();
    expect(asked).toEqual([true, false]);
  });

  it('the keypad is present while open, with the figure repeated above the keys', () => {
    const tree = render(<Onboarding keypadOpen openingCashPaise={250000} />);
    expect(byTestId(tree, 'keypad')).toBeTruthy();
    expect(text(byTestId(tree, 'x1-opening-draft-amount'))).toContain('2,500');
    expect(byTestId(tree, 'x1-opening-field').props.accessibilityState).toEqual({ expanded: true });
  });

  it('every digit reaches the parent unchanged', () => {
    const keys: string[] = [];
    const tree = render(<Onboarding keypadOpen onKey={(k) => keys.push(k)} />);
    for (const k of ['2', '5', '0', 'back', 'clear']) byTestId(tree, 'keypad-' + k).props.onPress();
    expect(keys).toEqual(['2', '5', '0', 'back', 'clear']);
  });

  it('the cash field is not a text input: the system keyboard never types a figure', () => {
    const field = byTestId(render(<Onboarding />), 'x1-opening-field');
    expect(all(field).filter((n) => n.type === 'TextInput')).toEqual([]);
  });

  it('NO BOTTOM NAV, in any state', () => {
    for (const tree of [
      render(<Onboarding />),
      render(<Onboarding keypadOpen shopName="Ravi Stores" openingCashPaise={250000} />),
      render(<Onboarding language="or" display="focus" keypadOpen />),
    ]) {
      expect(testIDs(tree).filter((id) => /nav|tabbar|bottom-bar/i.test(id))).toEqual([]);
    }
  });
});

describe('X1 in every language, and the adversarial worst case', () => {
  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the heading, the questions and the button are in that language', () => {
      const tree = render(<Onboarding language={language} />);
      expect(text(byTestId(tree, 'x1-title'))).toBe(phrase('x1.heading', language));
      expect(byTestId(tree, 'x1-shopName').props.accessibilityLabel).toBe(
        phrase('x1.shopNamePrompt', language),
      );
      expect(text(byTestId(tree, 'x1-q4-label'))).toBe('4 · ' + phrase('x1.cashNow', language));
      expect(text(byTestId(tree, 'x1-finish'))).toBe(phrase('x1.start', language));
    });
  }

  it('the adversarial shop: the longest real name and a lakh-scale opening figure', () => {
    const tree = render(
      <Onboarding
        language="or"
        display="focus"
        shopName={ADVERSARIAL_SHOP.name}
        openingCashPaise={12345678}
        keypadOpen
      />,
    );
    expect(byTestId(tree, 'x1-shopName').props.value).toBe(ADVERSARIAL_SHOP.name);
    expect(text(byTestId(tree, 'x1-opening-amount'))).toContain('1,23,456');
    for (const q of ['x1-q1', 'x1-q2', 'x1-q3', 'x1-q4']) expect(byTestId(tree, q)).toBeTruthy();
  });

  it('the longest string of each key at the largest type keeps all four questions', () => {
    const tree = render(<Onboarding language="longest" display="focus" keypadOpen />);
    for (const q of ['x1-q1', 'x1-q2', 'x1-q3', 'x1-q4']) expect(byTestId(tree, q)).toBeTruthy();
    expect(byTestId(tree, 'keypad')).toBeTruthy();
    expect(byTestId(tree, 'x1-finish')).toBeTruthy();
  });

  it('chrome is capped so the keypad cannot be pushed off the screen', () => {
    const tree = render(<Onboarding language="longest" display="focus" keypadOpen />);
    expect(byTestId(tree, 'x1-title').props.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 'x1-shopName').props.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 'x1-q4-label').props.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
  });
});

describe('X1 accessibility', () => {
  const TREES = () => [
    render(<Onboarding />),
    render(<Onboarding language="or" display="focus" shopName={ADVERSARIAL_SHOP.name} />),
    render(<Onboarding status="error" />),
    render(<Onboarding language="longest" display="focus" openingCashPaise={12345678} keypadOpen />),
    render(<Onboarding language="hi" keypadOpen />),
  ];

  it('every target meets TOUCH_TARGET_MIN_DP and no text is under the floor', () => {
    expect(TOUCH_TARGET_MIN_DP).toBeGreaterThan(0);
    for (const tree of TREES()) {
      expect(undersizedTargets(tree)).toEqual([]);
      expect(undersizedText(tree)).toEqual([]);
      expect(failingContrast(tree)).toEqual([]);
    }
  });

  it('a choice announces itself as a radio, with its state and a readable label', () => {
    const tree = render(<Onboarding />);
    for (const id of ['x1-language-or', 'x1-size-focus']) {
      const node = byTestId(tree, id);
      expect(node.props.accessibilityRole, id).toBe('radio');
      expect(String(node.props.accessibilityLabel ?? ''), id).not.toBe('');
      expect(node.props.accessibilityState, id).toHaveProperty('selected');
    }
  });

  it('the cash field is labelled by the question it answers', () => {
    expect(byTestId(render(<Onboarding />), 'x1-opening-field').props.accessibilityLabel).toBe(
      phrase('x1.cashNow', 'en'),
    );
  });
});

/* ---- the real App, the real Store: F-16 ------------------------------ */
describe('X1 through the real App - this mutates the store, and T2 and T6 are reachable', () => {
  /** A shop on its first morning: no name, no opening cash, no entries. */
  function firstMorning(patch: (p: PersistencePort) => PersistencePort = (p) => p): Session {
    const base = canonicalInput();
    const state: StoreState = {
      shopId: 'shop-first-morning',
      day: { ...base.day, state: 'open', openingCash: null },
      entries: [],
      parties: [],
      priorCreditOutstanding: 0,
      priorSupplierOutstanding: 0,
      skippedSections: [],
    };
    let n = 0;
    return new Session(new Store(patch(memoryPort(state))), {
      now: () => CANONICAL_DATE + 'T03:00:00.000Z',
      newId: () => 'e' + String(++n),
      screen: 'X1',
    });
  }
  const tree = (s: Session) => render(<App session={s} />);
  const press = (s: Session, id: string) => byTestId(tree(s), id).props.onPress();
  const shows = (s: Session, id: string) => testIDs(tree(s)).includes(id);

  it('no amount: X1 -> T2 -> T6 -> T1, and the figure is the one typed on T6', () => {
    const s = firstMorning();
    byTestId(tree(s), 'x1-shopName').props.onChangeText('Ravi Stores');
    press(s, 'x1-finish');

    // The name is saved; the opening is still UNKNOWN, not zero.
    expect(s.store.state.shopName).toBe('Ravi Stores');
    expect(s.store.state.day.openingCash).toBeNull();
    expect(shows(s, 'refusal')).toBe(false);
    expect(shows(s, 't2')).toBe(true);

    press(s, 't2-enter-opening');
    expect(shows(s, 't6')).toBe(true);
    for (const k of ['1', '5', '0', '0']) press(s, 'keypad-' + k);
    press(s, 't6-confirm');

    expect(s.store.state.day.openingCash).toBe(150000);
    expect(shows(s, 't1')).toBe(true);
    expect(shows(s, 't2')).toBe(false);
  });

  it('with an amount: X1 -> T1, opening cash saved from the in-app keypad', () => {
    const s = firstMorning();
    byTestId(tree(s), 'x1-shopName').props.onChangeText('Ravi Stores');
    expect(shows(s, 'keypad')).toBe(false);
    press(s, 'x1-opening-field');
    expect(shows(s, 'keypad')).toBe(true);
    for (const k of ['2', '5', '0', '0']) press(s, 'keypad-' + k);
    expect(text(byTestId(tree(s), 'x1-opening-draft-amount'))).toContain('2,500');
    press(s, 'x1-finish');

    expect(s.store.state.shopName).toBe('Ravi Stores');
    expect(s.store.state.day.openingCash).toBe(250000);
    expect(shows(s, 't1')).toBe(true);
    expect(shows(s, 't2')).toBe(false);
  });

  it('a typed zero is an answer: X1 -> T1 with an opening of zero, not T2', () => {
    const s = firstMorning();
    s.setShopName('Ravi Stores');
    press(s, 'x1-opening-field');
    press(s, 'keypad-0');
    press(s, 'x1-finish');
    expect(s.store.state.day.openingCash).toBe(0);
    expect(shows(s, 't1')).toBe(true);
  });

  it('no name: refused, nothing written, and the banner says what is missing', () => {
    const s = firstMorning();
    press(s, 'x1-opening-field');
    for (const k of ['5', '0']) press(s, 'keypad-' + k);
    press(s, 'x1-finish');

    expect(s.store.state.shopName).toBeUndefined();
    expect(s.store.state.day.openingCash).toBeNull();
    expect(s.state.screen).toBe('X1');
    expect(text(byTestId(tree(s), 'refusal'))).toContain(phrase('x1.refusal.shopName', 'en'));
    // The figure he typed survives the refusal, so he only has to add the name.
    expect(s.state.draftPaise).toBe(5000);
  });

  it('the name is written BEFORE the opening cash: a failed name write leaves no opening', () => {
    /*
     * The order is the session's own rule: a saved name is what tells the next
     * launch onboarding is done, so an opening written without one would reopen
     * on X1 with an opening already set - which it then refuses, forever.
     */
    // The name write fails, as SQLite does on a full disk.
    const s = firstMorning((p) => ({
      ...p,
      putShopName: () => {
        throw new Error('SQLITE_FULL: database or disk is full');
      },
    }));
    s.setShopName('Ravi Stores');
    press(s, 'x1-opening-field');
    press(s, 'keypad-9');
    press(s, 'x1-finish');

    expect(s.store.state.day.openingCash).toBeNull();
    expect(s.state.screen).toBe('X1');
    expect(s.state.draftPaise).toBe(900);
    expect(shows(s, 'refusal')).toBe(true);
  });

  it('a refused opening write after the name is saved stays on X1 and says so', () => {
    const s = firstMorning();
    s.store.setOpeningCash(100); // an opening already set: the second write refuses (D1)
    s.setShopName('Ravi Stores');
    press(s, 'x1-opening-field');
    press(s, 'keypad-9');
    press(s, 'x1-finish');

    expect(s.store.state.shopName).toBe('Ravi Stores');
    expect(s.store.state.day.openingCash).toBe(100);
    expect(s.state.screen).toBe('X1');
    expect(shows(s, 'refusal')).toBe(true);
  });

  it('leaving X1 lowers the keypad, with a figure or without one', () => {
    for (const digits of [[], ['7']]) {
      const s = firstMorning();
      s.setShopName('Ravi Stores');
      press(s, 'x1-opening-field');
      for (const k of digits) press(s, 'keypad-' + k);
      expect(s.state.onboardingKeypad).toBe(true);
      press(s, 'x1-finish');
      expect(s.state.onboardingKeypad, String(digits)).toBe(false);
    }
  });
});
