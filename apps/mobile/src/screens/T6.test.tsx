/**
 * T6 OPENING CASH - the §B.6 bar.
 *
 * THE SCREEN THAT USUALLY DOES NOT APPEAR, and the one rule it must never break:
 * THE APP DOES NOT GUESS. Yesterday's closing cash is today's opening cash, so
 * this is shown only on a first run or after a gap - and after a gap there is no
 * honest figure to carry, so the field starts empty. A helpful default here would
 * put a number into the ledger that the shopkeeper never typed, which is
 * constraint 1 broken at the start of the day instead of in the middle of it.
 *
 * It takes no store, deliberately: it has nothing to derive. It is the one screen
 * in the set whose only content is a question.
 */
import { describe, it, expect } from 'vitest';
import { OpeningCash } from './T6.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { formatPaise } from '@swafto/formula-engine';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';

describe('T6 renders all four states', () => {
  it('loading', () => {
    const tree = render(<OpeningCash status="loading" />);
    expect(byTestId(tree, 't6-loading')).toBeTruthy();
    expect(byType(tree, 'ActivityIndicator')).toHaveLength(1);
  });

  it('error offers a way back', () => {
    const tree = render(<OpeningCash status="error" />);
    expect(byTestId(tree, 't6-error')).toBeTruthy();
    expect(byTestId(tree, 't6-retry')).toBeTruthy();
  });

  it('ready and untouched: the question, and an empty figure', () => {
    const tree = render(<OpeningCash />);
    expect(text(byTestId(tree, 't6-prompt'))).toBe(phrase('t6.prompt', 'en'));
    expect(text(byTestId(tree, 't6-draft-amount'))).toBe(formatPaise(0, { withSign: false }));
  });

  it('ready and typed: the figure is exactly what was typed', () => {
    const tree = render(<OpeningCash draftPaise={250000} />);
    expect(text(byTestId(tree, 't6-draft-amount'))).toBe(formatPaise(250000, { withSign: false }));
  });
});

describe('the app does not guess an opening figure', () => {
  it('nothing is confirmable until he has typed something', () => {
    expect(byTestId(render(<OpeningCash />), 't6-confirm').props?.disabled).toBe(true);
  });

  it('and zero counts as typed - an empty drawer is a real answer', () => {
    /*
     * A shop can genuinely open with nothing in the drawer. Zero is a figure he
     * chose; null is the app not knowing. The two must not be conflated, which is
     * why the draft is `Paise | null` rather than a number defaulting to zero.
     */
    expect(byTestId(render(<OpeningCash draftPaise={0} />), 't6-confirm').props?.disabled).toBe(
      false,
    );
  });

  it('confirming reports the intent, and this screen mutates the store not at all', () => {
    // It holds no store to mutate - it cannot write, even by accident.
    const pressed: string[] = [];
    const tree = render(<OpeningCash draftPaise={1000} onConfirm={() => pressed.push('ok')} />);
    byTestId(tree, 't6-confirm').props.onPress();
    expect(pressed).toEqual(['ok']);
  });

  it('the keypad reports keys and decides nothing', () => {
    const keys: string[] = [];
    const tree = render(<OpeningCash onKey={(k) => keys.push(k)} />);
    byTestId(tree, 'keypad-2').props.onPress();
    byTestId(tree, 'keypad-clear').props.onPress();
    expect(keys).toEqual(['2', 'clear']);
  });
});

describe('T6 in every language, including the adversarial worst case', () => {
  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the title and the question are in that language', () => {
      const tree = render(<OpeningCash language={language} />);
      expect(text(byTestId(tree, 't6-title'))).toBe(phrase('t6.title', language));
      expect(text(byTestId(tree, 't6-prompt'))).toBe(phrase('t6.prompt', language));
    });
  }

  it('longest string mode at the largest type keeps the question and the keypad', () => {
    const tree = render(<OpeningCash language="longest" display="focus" draftPaise={12345678} />);
    expect(byTestId(tree, 't6-prompt')).toBeTruthy();
    expect(byTestId(tree, 'keypad')).toBeTruthy();
  });

  it('chrome is capped; money is not', () => {
    const tree = render(<OpeningCash draftPaise={100} />);
    expect(byTestId(tree, 't6-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    const money = byTestId(tree, 't6-draft-amount');
    expect(money.props?.maxFontSizeMultiplier).toBeUndefined();
    expect(money.props?.allowFontScaling).toBe(true);
  });
});

describe('T6 accessibility and its keypad', () => {
  const TREES = () => [
    render(<OpeningCash />),
    render(<OpeningCash display="focus" draftPaise={9999999} />),
    render(<OpeningCash status="error" />),
    render(<OpeningCash language="or" draftPaise={0} />),
  ];

  it('every target meets TOUCH_TARGET_MIN_DP, including the disabled confirm', () => {
    for (const tree of TREES()) expect(undersizedTargets(tree)).toEqual([]);
    expect(TOUCH_TARGET_MIN_DP).toBeGreaterThan(0);
  });

  it('no text under the floor, no colour under the minimum', () => {
    for (const tree of TREES()) {
      expect(undersizedText(tree)).toEqual([]);
      expect(failingContrast(tree)).toEqual([]);
    }
  });

  it('one input means a keypad, and therefore no bottom nav', () => {
    const tree = render(<OpeningCash />);
    expect(byTestId(tree, 'keypad')).toBeTruthy();
    expect(
      all(tree)
        .map((n) => String(n.props?.testID ?? ''))
        .filter((id) => /nav|tabbar|bottom-bar/i.test(id)),
    ).toEqual([]);
  });

  it('a disabled confirm announces itself as disabled', () => {
    expect(byTestId(render(<OpeningCash />), 't6-confirm').props?.accessibilityState).toEqual({
      disabled: true,
    });
  });
});
