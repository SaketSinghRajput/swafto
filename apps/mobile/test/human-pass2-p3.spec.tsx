/**
 * HUMAN-TESTER PASS 2, THE P3 ROWS THAT LIVE ACROSS SCREENS: HT-22 (a tap
 * through a closing sheet), HT-26 (Back from A7), HT-27 (closed-day tiles),
 * HT-30 (a Hindi label cut at font 2.0) and the leading of capped text at a
 * system font scale above the cap. Each test fails with its fix taken out.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { Session } from '../src/app/session.tsx';
import { App } from '../src/app/App.tsx';
import { Store, memoryPort, type StoreState } from '../src/store/index.ts';
import { tokens } from '../src/theme/tokens.ts';
import { ActionTile } from '../src/components/Shell.tsx';
import { glyphOf } from '../src/ui/Icon.tsx';
import { Today } from '../src/screens/T1.tsx';
import { TodayClosed } from '../src/screens/T3.tsx';
import { canonicalStore, closedStore } from '../src/screens/registry.tsx';
import { render, byTestId, byType } from './render.tsx';
import { fontScale } from './ui-double.tsx';
import { canonicalInput, CANONICAL_DATE } from '@swafto/fixtures';
import { CHROME_FONT_SCALE_CAP } from '@swafto/values';

const T0 = Date.parse(CANONICAL_DATE + 'T19:00:00.000Z');

/** A new shop whose clock the test moves by hand. */
function shop(screen: 'T1' | 'A3' = 'T1') {
  const base = canonicalInput();
  const state: StoreState = {
    shopId: 'shop-new',
    day: { ...base.day, state: 'open', openingCash: 100000 },
    entries: [],
    parties: [],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
    skippedSections: [],
  };
  const clock = { ms: T0 };
  let n = 0;
  const s = new Session(new Store(memoryPort(state), () => new Date(clock.ms).toISOString()), {
    now: () => new Date(clock.ms).toISOString(),
    newId: () => '0190a000-0000-7000-8000-00000000000' + String(++n),
    screen,
  });
  return { s, clock };
}

const press = (s: Session, id: string) => byTestId(render(<App session={s} />), id).props.onPress();

describe('HT-22 - the rest of a tap burst on "Save and choose" does not type on the keypad', () => {
  it('a key within the settle window after the sheet closes is ignored; a later one is typed', () => {
    const { s, clock } = shop();
    s.openSection('udhar_sales');
    press(s, 't8-party');
    press(s, 't8-picker-add');
    byTestId(render(<App session={s} />), 't8-picker-new-name').props.onChangeText('Ramesh');
    press(s, 't8-picker-new-save');
    expect(s.state.pickingParty).toBe(false);
    expect(s.store.state.parties).toHaveLength(1);

    // The third tap of the burst, 150 ms later, lands where the button was.
    clock.ms += 150;
    press(s, 'keypad-8');
    expect(s.state.draftPaise).toBeNull();

    // A deliberate key, a second later, is typed as normal.
    clock.ms += 1000;
    press(s, 'keypad-8');
    expect(s.state.draftPaise).toBe(800);
  });
});

describe('HT-26 - Back from A7 returns to the screen it was opened from', () => {
  it('opened from A4, Back is A4; opened from A3, Back is A3', () => {
    const { s } = shop('A3');
    s.goTo('A4');
    press(s, 'a4-trouble');
    expect(s.state.screen).toBe('A7');
    s.back();
    expect(s.state.screen).toBe('A4');

    s.goTo('A3');
    press(s, 'a3-changed');
    expect(s.state.screen).toBe('A7');
    s.back();
    expect(s.state.screen).toBe('A3');
  });
});

describe('HT-27 - a closed-day tile does not look like a live one', () => {
  for (const display of ['comfort', 'focus'] as const) {
    it(display, () => {
      const t = tokens(display);
      const tile = (disabled: boolean) =>
        render(
          <ActionTile
            testID="tile"
            label="Sale"
            kind="sale"
            display={display}
            disabled={disabled}
            onPress={() => {}}
          />,
        );
      const style = (disabled: boolean) => tile(disabled).props.style as Record<string, unknown>;
      const live = style(false);
      const off = style(true);
      /*
       * v2 "Mitra" (DESIGN-SYSTEM-V2 3.3) removed the direction bar from EVERY
       * tile - a tile is identified by its tint, pictogram and word - so the
       * old "the bar is narrower when off" comparison has no bar to measure.
       * What HT-27 asks is unchanged and is still asserted: no control-border
       * outline (neither `inkMuted` nor v2's control rim `edge`), no lift, a
       * different fill - and now the pictogram itself says it is locked.
       */
      expect(off.borderColor).not.toBe(t.color.inkMuted);
      expect(off.borderColor).not.toBe(t.color.edge);
      expect(off.borderLeftColor).not.toBe(t.color.inkMuted);
      expect(off.elevation).toBe(0);
      expect(off.backgroundColor).not.toBe(live.backgroundColor);
      const glyphs = (disabled: boolean) => byType(tile(disabled), 'Text').map((n) => n.text);
      expect(glyphs(true)).toContain(glyphOf('lock'));
      expect(glyphs(false)).not.toContain(glyphOf('lock'));
    });
  }
});

describe('HT-30 - "Today so far" owns the free space in its row', () => {
  /*
   * MOVED FROM T1 TO T3 BY THE USABILITY PASS (item 9, U-67). Today no longer
   * draws "Today so far" beside a sync line - the sync state is a chip in the
   * bar - so the collision cannot happen there. The closed-day face still
   * shares `SoFarHeader`, and the rule is held on it unchanged.
   */
  it('the label sits in a slot that grows, so a mis-measured Hindi word is not cut', () => {
    const tree = render(<TodayClosed store={closedStore()} language="hi" />);
    const slot = byTestId(tree, 't3-so-far-slot');
    expect(slot.props.style.flexGrow).toBe(1);
    expect(byTestId(slot, 't3-so-far')).toBeTruthy();
  });
});

describe('capped text keeps its 1.8 line at a font scale above the cap (pass 4 note, HT-30)', () => {
  afterEach(() => {
    fontScale.value = 1;
  });

  it('at scale 1 the line is the plain ratio', () => {
    expect(tokens().leading(17)).toBe(31);
  });

  it('at scale 2 the requested line is scaled down so the device line is 1.8 x the capped glyph', () => {
    fontScale.value = 2;
    const t = tokens();
    // Android multiplies a capped Text's lineHeight by the full scale (2) and its
    // fontSize by the cap (1.5). What the device draws:
    const drawnLine = t.leading(t.type.body) * 2;
    const drawnSize = t.type.body * CHROME_FONT_SCALE_CAP;
    expect(drawnLine / drawnSize).toBeCloseTo(1.8, 1);
    // Money is not capped: size and line both scale fully, so its ratio is untouched.
    expect(t.leadingUncapped(t.type.body)).toBe(31);
  });
});
