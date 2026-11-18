/**
 * A1 SPLASH - one button, the whole screen, as the reference draws it (U-8).
 */
import { describe, it, expect } from 'vitest';
import { Splash, WORDMARK } from './A1.tsx';
import { render, byTestId, text } from '../../test/render.tsx';
import { undersizedTargets, failingContrast } from '../../test/a11y.tsx';
import { phrase, type Language } from '../i18n/strings.ts';

describe('A1 Splash', () => {
  it('is a single full-screen button labelled Continue, on the brand fill', () => {
    let pressed = 0;
    const tree = render(<Splash onContinue={() => (pressed += 1)} />);
    const button = byTestId(tree, 'a1');
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe('Continue');
    expect(button.props.style.flex).toBe(1);
    expect(text(tree)).toBe(WORDMARK);
    button.props.onPress();
    expect(pressed).toBe(1);
  });

  it('names itself in the language it is shown in', () => {
    for (const language of ['en', 'hi', 'or'] as Language[]) {
      const tree = render(<Splash language={language} />);
      expect(byTestId(tree, 'a1').props.accessibilityLabel).toBe(phrase('a1.continue', language));
    }
  });

  it('clears the contrast and target floors in both displays', () => {
    for (const display of ['comfort', 'focus'] as const) {
      const tree = render(<Splash display={display} />);
      expect(failingContrast(tree), display).toEqual([]);
      expect(undersizedTargets(tree), display).toEqual([]);
    }
  });
});
