/**
 * NO TWO CONTROLS ON A KEYPAD SCREEN SHARE A SPOKEN NAME.
 *
 * Found on the device: the header's navigate-back and the keypad's
 * delete-a-digit key were both labelled "Back". TalkBack said the same word for
 * opposite actions - one leaves the form, one edits the figure on it - and the
 * Lead's label-driven device driver could not tell them apart either.
 *
 * Measured on every screen that carries the pad AND a back control, in all
 * three languages, because a translation can collide where English does not.
 */
import { describe, it, expect } from 'vitest';
import { Keypad } from '../src/components/Keypad.tsx';
import { FormA } from '../src/screens/T7.tsx';
import { OpeningCash } from '../src/screens/T6.tsx';
import { CashCheck } from '../src/screens/T11.tsx';
import { PhoneNumber } from '../src/screens/A3.tsx';
import { CodeEntry } from '../src/screens/A4.tsx';
import { canonicalStore } from '../src/screens/registry.tsx';
import { strings, phrase, type Language } from '../src/i18n/strings.ts';
import { render, all, byTestId, type Node } from './render.tsx';

const LANGUAGES: readonly Language[] = ['en', 'hi', 'or'];
const back = () => {};

const labels = (tree: Node): string[] =>
  all(tree)
    .filter((n) => n.props?.accessibilityRole === 'button' && n.props?.onPress !== undefined)
    .map((n) => String(n.props.accessibilityLabel ?? ''))
    .filter((l) => l !== '');

const duplicates = (xs: readonly string[]): string[] => [
  ...new Set(xs.filter((x, i) => xs.indexOf(x) !== i)),
];

describe('the keypad delete key says what it does', () => {
  for (const language of LANGUAGES) {
    it(language + ': it is "delete last digit", not the word the header back uses', () => {
      const key = byTestId(render(<Keypad onKey={() => {}} s={strings(language)} />), 'keypad-back');
      expect(key.props.accessibilityLabel).toBe(phrase('keypad.delete', language));
      expect(key.props.accessibilityLabel).not.toBe(phrase('common.back', language));
    });
  }

  it('it draws the mark, not a word', () => {
    const key = byTestId(render(<Keypad onKey={() => {}} s={strings('en')} />), 'keypad-back');
    expect(byTestId(key, 'keypad-back-mark')).toBeTruthy();
    expect(key.text).toBe('');
  });
});

describe('every keypad screen with a back control: no two buttons share a label', () => {
  for (const language of LANGUAGES) {
    const screens: readonly [string, () => Node][] = [
      ['T6', () => render(<OpeningCash language={language} onBack={back} />)],
      ['T7', () => render(<FormA store={canonicalStore()} language={language} onBack={back} />)],
      ['T11', () => render(<CashCheck store={canonicalStore()} language={language} onBack={back} />)],
      ['A3', () => render(<PhoneNumber language={language} onBack={back} />)],
      ['A4', () => render(<CodeEntry language={language} onBack={back} />)],
    ];
    for (const [id, tree] of screens) {
      it(language + ' ' + id + ': the header back keeps "Back", and nothing else is called it', () => {
        const ls = labels(tree());
        expect(ls.filter((l) => l === phrase('common.back', language))).toHaveLength(1);
        expect(duplicates(ls)).toEqual([]);
      });
    }
  }
});
