/**
 * A2 CHOOSE YOUR LANGUAGE - three cards, each in its own script, and the
 * reference's Tamil-cluster defect (U-10a) not copied.
 */
import { describe, it, expect } from 'vitest';
import { LanguageChoice, LANGUAGE_NAMES, CHOOSE_HINT } from './A2.tsx';
import { render, byTestId, text } from '../../test/render.tsx';
import { undersizedTargets, failingContrast } from '../../test/a11y.tsx';
import type { Language } from '../i18n/strings.ts';

describe('A2 Choose your language', () => {
  it('offers Odia, Hindi and English, in that order, each named in itself', () => {
    expect(LANGUAGE_NAMES.map((l) => l.key)).toEqual(['or', 'hi', 'en']);
    const tree = render(<LanguageChoice />);
    for (const { key, name } of LANGUAGE_NAMES) {
      expect(byTestId(tree, 'a2-' + key).props.accessibilityLabel).toBe(name);
    }
  });

  it('a tap reports exactly the language tapped', () => {
    const chosen: Language[] = [];
    const tree = render(<LanguageChoice onChoose={(l) => chosen.push(l)} />);
    byTestId(tree, 'a2-hi').props.onPress();
    byTestId(tree, 'a2-or').props.onPress();
    expect(chosen).toEqual(['hi', 'or']);
  });

  it('the hint carries no Tamil - the reference subline mixed scripts (U-10a)', () => {
    expect(/[஀-௿]/.test(CHOOSE_HINT)).toBe(false);
    expect(text(render(<LanguageChoice />))).toContain(CHOOSE_HINT);
  });

  it('renders the loading and error states through the shell', () => {
    expect(byTestId(render(<LanguageChoice status="loading" />), 'a2-loading')).toBeTruthy();
    expect(byTestId(render(<LanguageChoice status="error" />), 'a2-retry')).toBeTruthy();
  });

  it('clears the contrast and target floors', () => {
    const tree = render(<LanguageChoice language="or" display="focus" />);
    expect(failingContrast(tree)).toEqual([]);
    expect(undersizedTargets(tree)).toEqual([]);
  });
});
