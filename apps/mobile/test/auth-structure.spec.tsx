/**
 * THE OPENING SCENES HAVE THE REFERENCE'S STRUCTURE, measured on the tree.
 *
 * Found on the device: A2's "Choose your language" sat inside the navy bar,
 * where docs/design-reference/comfort/A2.png draws a thin navy band and the
 * question on the cream page. A6 and A8 are drawn the same way. A3, A4 and A7
 * put their step line UNDER the title in the bar, not opposite it. A5 tints its
 * card by state (store.js `problemStates`); it drew the neutral raised fill for
 * every one.
 */
import { describe, it, expect } from 'vitest';
import { LanguageChoice } from '../src/screens/A2.tsx';
import { PhoneNumber } from '../src/screens/A3.tsx';
import { CodeEntry } from '../src/screens/A4.tsx';
import { CodeProblem } from '../src/screens/A5.tsx';
import { SessionExpired } from '../src/screens/A6.tsx';
import { NumberChanged } from '../src/screens/A7.tsx';
import { LogoutConfirm } from '../src/screens/A8.tsx';
import { tokens } from '../src/theme/tokens.ts';
import { phrase } from '../src/i18n/strings.ts';
import { render, all, byTestId, text, type Node } from './render.tsx';

const ids = (tree: Node) => all(tree).map((n) => String(n.props?.testID ?? ''));

describe('A2, A6, A8: a navy band, and the heading on the page', () => {
  const bands: readonly [string, () => Node][] = [
    ['a2', () => render(<LanguageChoice />)],
    ['a6', () => render(<SessionExpired shopName="Sharma Kirana Store" />)],
    ['a8', () => render(<LogoutConfirm shopName="Sharma Kirana Store" />)],
  ];
  for (const [id, tree] of bands) {
    it(id + ': the bar is a band with nothing written in it', () => {
      const t = tree();
      const band = byTestId(t, id + '-band');
      expect(band.props.style.backgroundColor).toBe(tokens('comfort').color.brand);
      expect(text(band)).toBe('');
      // The Shell draws no title in the bar (A2's own title is in its body).
      expect(ids(band)).not.toContain(id + '-title');
    });
  }

  it('a2: "Choose your language" is the first heading of the body, in ink', () => {
    const t = render(<LanguageChoice />);
    const title = byTestId(t, 'a2-title');
    expect(text(title)).toBe(phrase('a2.title', 'en'));
    expect(title.props.style.color).toBe(tokens('comfort').color.ink);
    expect(all(byTestId(t, 'a2-body'))).toContain(title);
  });
});

describe('A3, A4, A7: the step line sits under the title, as a subtitle', () => {
  const cases: readonly [string, () => Node, string][] = [
    ['a3', () => render(<PhoneNumber />), phrase('a3.step', 'en')],
    ['a4', () => render(<CodeEntry />), phrase('a4.step', 'en')],
    ['a7', () => render(<NumberChanged />), phrase('a7.sub', 'en')],
  ];
  for (const [id, tree, line] of cases) {
    it(id + ': "' + line + '" is the subtitle, not the meta opposite the title', () => {
      const t = tree();
      expect(text(byTestId(t, id + '-subtitle'))).toBe(line);
      expect(ids(t)).not.toContain(id + '-meta');
    });
  }

  it('a3: the question is repeated on the page as a heading, as the reference draws it', () => {
    expect(text(byTestId(render(<PhoneNumber />), 'a3-heading'))).toBe(phrase('a3.bar', 'en'));
  });
});

describe('A5: the problem card is tinted by state', () => {
  for (const display of ['comfort', 'focus'] as const) {
    const c = tokens(display).color;
    const fill = (p: 'mismatch' | 'expired' | 'locked' | 'noCode') =>
      byTestId(render(<CodeProblem problem={p} display={display} />), 'a5-' + p).props.style
        .backgroundColor;
    it(display + ': red for a refusal, gold for expired, indigo for no code', () => {
      expect(fill('mismatch')).toBe(c.tintRed);
      expect(fill('locked')).toBe(c.tintRed);
      expect(fill('expired')).toBe(c.tintGold);
      expect(fill('noCode')).toBe(c.tintIndigo);
    });
  }
});
