/**
 * THE CROSS-SCREEN INSTRUMENTS - B26, B27, B28, B29, B30 and B32.
 *
 * §5.13 makes these due the moment the first screen renders, and they are written
 * ACROSS the registry rather than inside one screen spec for a reason this build
 * keeps re-learning: a rule enforced per-file is a rule that holds for the files
 * somebody remembered. A new screen joins these assertions by existing.
 *
 * WHAT EACH ONE CAN AND CANNOT SEE. Everything here reads the STYLE a screen asked
 * for, because nothing in this harness lays anything out - `measuredOnly()` in the
 * UI double exists so that boundary fails loudly rather than quietly returning a
 * plausible zero. So these answer "did the screen ask for the right thing", which
 * is the half a screen controls. Whether the request survives a real Android
 * surface is B14-B19 on a handset, and those stay blocked.
 *
 * B31 IS NOT HERE, DELIBERATELY. Layout overflow at maximum font scale is a
 * measurement, not a request, and asserting it from this harness would be inventing
 * a reading. It lives in `check:layout`, which measures in a browser.
 */
import { describe, it, expect } from 'vitest';
import { SCREEN_CASES, COVERED_SCREENS } from '../src/screens/registry.tsx';
import { render, all, text, type Node } from './render.tsx';
import { undersizedTargets, undersizedText, failingContrast, contrast } from './a11y.tsx';
import { tokens } from '../src/theme/tokens.ts';
import { STRINGS, phrase, type StringKey, type Language } from '../src/i18n/strings.ts';
import { CONTRAST_MIN_RATIO, TOUCH_TARGET_MIN_DP, BODY_TEXT_MIN_SP } from '@swafto/values';

const LANGUAGES: readonly Language[] = ['en', 'hi', 'or'];

describe('the registry covers what it claims to cover', () => {
  it('every case renders, and no two cases share an id', () => {
    const ids = SCREEN_CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of SCREEN_CASES) expect(render(c.element()), c.id).toBeTruthy();
  });

  it('every screen in the registry has an adversarial, an Odia and a Focus case', () => {
    for (const screen of COVERED_SCREENS) {
      const cases = SCREEN_CASES.filter((c) => c.screen === screen);
      expect(
        cases.some((c) => c.id.includes('adversarial')),
        screen,
      ).toBe(true);
      expect(
        cases.some((c) => c.language === 'or'),
        screen,
      ).toBe(true);
      expect(
        cases.some((c) => c.display === 'focus'),
        screen,
      ).toBe(true);
    }
  });
});

/* ---- B26 · contrast ratio on every rendered screen ---------------------- */
describe('B26 - every text colour clears the contrast minimum, on every case', () => {
  for (const c of SCREEN_CASES) {
    it(c.id, () => {
      expect(failingContrast(render(c.element()))).toEqual([]);
    });
  }

  it('the threshold is the registry value, not a number written here', () => {
    expect(CONTRAST_MIN_RATIO.value).toBeGreaterThan(1);
  });
});

/* ---- B27 · white on marigold, the pair that fails by default ------------ */
describe('B27 - nothing renders white text on the accent, in any mode or case', () => {
  it('no token pair expresses it, so a screen cannot reach for it', () => {
    for (const mode of ['comfort', 'focus'] as const) {
      const c = tokens(mode).color;
      expect(c.onAccent.toUpperCase(), mode).not.toBe('#FFFFFF');
      expect(contrast(c.onAccent, c.accent), mode).toBeGreaterThanOrEqual(CONTRAST_MIN_RATIO.value);
    }
  });

  it('and no rendered node draws white text on an accent background either', () => {
    const accents = new Set(
      (['comfort', 'focus'] as const).map((m) => tokens(m).color.accent.toUpperCase()),
    );
    const offenders: string[] = [];
    for (const c of SCREEN_CASES) {
      const walk = (n: Node, bg: string | null): void => {
        const style = (n.props?.style ?? {}) as Record<string, unknown>;
        const here = typeof style.backgroundColor === 'string' ? style.backgroundColor : bg;
        const colour = typeof style.color === 'string' ? style.color.toUpperCase() : null;
        if (n.type === 'Text' && colour === '#FFFFFF' && here && accents.has(here.toUpperCase())) {
          offenders.push(c.id + ': ' + n.text.slice(0, 20));
        }
        for (const k of n.children) walk(k, here);
      };
      walk(render(c.element()), null);
    }
    expect(offenders).toEqual([]);
  });
});

/* ---- B28 · touch target size -------------------------------------------- */
describe('B28 - every interactive element asks for the registry touch target', () => {
  for (const c of SCREEN_CASES) {
    it(c.id, () => {
      expect(undersizedTargets(render(c.element()))).toEqual([]);
    });
  }

  it('the minimum is the registry value', () => {
    expect(TOUCH_TARGET_MIN_DP).toBeGreaterThan(0);
    for (const mode of ['comfort', 'focus'] as const) {
      expect(tokens(mode).touchTarget).toBe(TOUCH_TARGET_MIN_DP);
    }
  });
});

/* ---- B29 · body text size ------------------------------------------------ */
describe('B29 - no text is smaller than the registry floor, on any case', () => {
  for (const c of SCREEN_CASES) {
    it(c.id, () => {
      expect(undersizedText(render(c.element()))).toEqual([]);
    });
  }

  it('the floor is the registry value and the smallest token IS it', () => {
    expect(Math.min(...Object.values(tokens('comfort').type))).toBe(BODY_TEXT_MIN_SP);
  });
});

/* ---- B30 · missing i18n keys in any of the three languages -------------- */
describe('B30 - every string exists, in all three languages, and none leaks a key', () => {
  it('no phrase is missing, empty or whitespace in any language', () => {
    const missing: string[] = [];
    for (const key of Object.keys(STRINGS) as StringKey[]) {
      for (const language of LANGUAGES) {
        const value = phrase(key, language);
        if (typeof value !== 'string' || value.trim() === '') missing.push(key + '/' + language);
      }
    }
    expect(missing).toEqual([]);
  });

  it('no phrase is the English copied into another column', () => {
    /*
     * An untranslated string is the failure a presence check cannot see: the key
     * exists, the value is a real sentence, and it is the wrong language. Not every
     * duplicate is a bug - UPI is UPI in all three - so this reports only the ones
     * long enough to be a sentence somebody forgot to translate.
     */
    const suspicious = (Object.keys(STRINGS) as StringKey[]).filter((key) => {
      const p = STRINGS[key];
      return [...p.en].length > 4 && (p.hi === p.en || p.or === p.en);
    });
    expect(suspicious).toEqual([]);
  });

  it('no screen renders a raw string key - the sign of a lookup that missed', () => {
    const leaked: string[] = [];
    for (const c of SCREEN_CASES) {
      const rendered = text(render(c.element()));
      for (const key of Object.keys(STRINGS) as StringKey[]) {
        if (rendered.includes(key)) leaked.push(c.id + ': ' + key);
      }
    }
    expect(leaked).toEqual([]);
  });

  it('every case renders SOME text - a silently empty screen would pass everything above', () => {
    for (const c of SCREEN_CASES) {
      expect(text(render(c.element())).trim().length, c.id).toBeGreaterThan(0);
    }
  });
});

/* ---- B32 · non-Latin numerals leaking into a money figure --------------- */
describe('B32 - every digit rendered on every screen is Latin', () => {
  /*
   * Words localise; money does not (ADR-003). Odia and Hindi both have their own
   * digit forms, and a formatter that localised numerals would produce a figure the
   * shopkeeper cannot check against a paper slip or an SMS. The check covers EVERY
   * digit on the screen rather than only the money nodes, because a non-Latin digit
   * anywhere means a localising formatter got in somewhere.
   */
  for (const c of SCREEN_CASES) {
    it(c.id, () => {
      const rendered = text(render(c.element()));
      const nonLatin = [...rendered].filter((ch) => /\p{Nd}/u.test(ch) && !/[0-9]/.test(ch));
      expect(nonLatin).toEqual([]);
    });
  }

  it('a case that shows money shows Latin digits, so the check has a subject', () => {
    const withMoney = SCREEN_CASES.filter((c) => text(render(c.element())).includes('₹'));
    expect(withMoney.length).toBeGreaterThan(0);
    for (const c of withMoney) {
      expect(/[0-9]/.test(text(render(c.element()))), c.id).toBe(true);
    }
  });

  it('the check can see a non-Latin digit - it is not a regex that matches nothing', () => {
    // §5.16: the instrument is shown a subject it must reject.
    const odiaDigits = '୦୧୨';
    const caught = [...odiaDigits].filter((ch) => /\p{Nd}/u.test(ch) && !/[0-9]/.test(ch));
    expect(caught).toHaveLength(3);
  });
});

/* ---- the chrome cap, across every case ---------------------------------- */
describe('chrome is capped and money is not, on every case', () => {
  for (const c of SCREEN_CASES) {
    it(c.id, () => {
      const uncapped = all(render(c.element()))
        .filter((n) => n.type === 'Text')
        .filter((n) => n.props?.allowFontScaling !== true)
        .filter((n) => n.props?.maxFontSizeMultiplier === undefined)
        .map((n) => n.text.slice(0, 24));
      expect(uncapped).toEqual([]);
    });
  }
});
