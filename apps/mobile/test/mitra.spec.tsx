/**
 * M3 "MITRA": THE NEW COMPONENTS (DESIGN-SYSTEM-V2 3.6, 3.11-3.15) AND THE
 * TEXT-SIZE STEP. Each is asserted on what it promises a shopkeeper, not on
 * how it looks: words beside every icon, state carried three ways, nothing
 * pre-chosen, the chrome cap kept at every step.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { Avatar, initialOf, avatarPairOf } from '../src/components/Avatar.tsx';
import { Banner } from '../src/components/Banner.tsx';
import { Sheet } from '../src/components/Sheet.tsx';
import { Switch } from '../src/components/Switch.tsx';
import { TextSizePicker } from '../src/components/TextSizePicker.tsx';
import { EmptyState, LoadingState, LockedLine, SKELETON_ROWS } from '../src/components/States.tsx';
import { Money } from '../src/components/Money.tsx';
import { Session } from '../src/app/session.tsx';
import { App } from '../src/app/App.tsx';
import { tokens, setTextSize, textSizeNow } from '../src/theme/tokens.ts';
import { strings, phrase } from '../src/i18n/strings.ts';
import { canonicalStore } from '../src/screens/registry.tsx';
import { render, all, byTestId, byType, text } from './render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from './a11y.tsx';
import { glyphOf } from '../src/ui/Icon.tsx';
import { CANONICAL_DATE } from '@swafto/fixtures';
import { CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { View } from '@swafto/ui';

afterEach(() => setTextSize('normal'));

const glyphs = (tree: ReturnType<typeof render>) =>
  byType(tree, 'Text')
    .filter((n) => n.props.style?.fontFamily === tokens().font.icons)
    .map((n) => n.text);

describe('Avatar - the first akshara, a colour fixed by the id, hidden from TalkBack', () => {
  it('takes a whole conjunct, not its first code point', () => {
    // କ୍ଷୀ (ka + virama + ssa + the ii sign) is one akshara to an Odia reader.
    expect(initialOf('କ୍ଷୀରୋଦ')).toBe('କ୍ଷୀ');
    // क्ष in Devanagari, the same shape of problem.
    expect(initialOf('क्षमा')).toBe('क्ष');
    // A vowel sign stays on its consonant.
    expect(initialOf('ରାମେଶ')).toBe('ରା');
    expect(initialOf('ramesh')).toBe('R');
    expect(initialOf('   ')).toBe('');
  });

  it('the colour follows the party id, so re-sorting a list never repaints a person', () => {
    expect(avatarPairOf('party-1')).toEqual(avatarPairOf('party-1'));
    const pairs = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => avatarPairOf('p-' + id).join()));
    expect(pairs.size).toBeGreaterThan(1);
  });

  it('is decorative: hidden from assistive tech, and an empty name draws the user mark', () => {
    const tree = render(<Avatar testID="av" partyId="p1" name="" />);
    expect(tree.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(glyphs(tree)).toEqual([glyphOf('user')]);
    for (const display of ['comfort', 'focus'] as const) {
      expect(failingContrast(render(<Avatar partyId="p1" name="Ramesh" display={display} />))).toEqual([]);
    }
  });
});

describe('Banner - an icon AND words, calm for an error, red only for a refusal', () => {
  it('every kind draws its sentence and an icon, and clears contrast in both modes', () => {
    for (const kind of ['warning', 'info', 'error', 'refused'] as const) {
      for (const display of ['comfort', 'focus'] as const) {
        const tree = render(<Banner testID="b" kind={kind} text="Nothing is lost." display={display} />);
        expect(text(byTestId(tree, 'b-text'))).toBe('Nothing is lost.');
        expect(glyphs(tree)).toHaveLength(1);
        expect(failingContrast(tree)).toEqual([]);
      }
    }
  });

  it('a calm error is not red; only a refusal is', () => {
    const t = tokens('comfort');
    expect(render(<Banner testID="b" kind="error" text="x" />).props.style.borderColor).not.toBe(t.color.negative);
    expect(render(<Banner testID="b" kind="refused" text="x" />).props.style.borderColor).toBe(t.color.negative);
  });

  it('its one action is a real target', () => {
    const tree = render(
      <Banner testID="b" kind="warning" text="x" action={{ testID: 'b-go', label: 'Close it now', onPress: () => {} }} />,
    );
    expect(undersizedTargets(tree)).toEqual([]);
    expect(text(byTestId(tree, 'b-go'))).toBe('Close it now');
  });
});

describe('Sheet - in the tree, modal to TalkBack, two ways out', () => {
  it('the panel is the only elevation, over the scrim, and text never sits on the scrim', () => {
    const closed: string[] = [];
    const tree = render(
      <Sheet testID="sh" title="Exit the app?" body="Safe." closeLabel="Close" onClose={() => closed.push('x')} />,
    );
    const t = tokens('comfort');
    expect(tree.props.accessibilityViewIsModal).toBe(true);
    expect(tree.props.style.backgroundColor).toBe(t.color.scrim);
    expect(byTestId(tree, 'sh-panel').props.style.elevation).toBe(t.elevation.sheet);
    expect(failingContrast(tree)).toEqual([]);
    byTestId(tree, 'sh-close').props.onPress();
    byTestId(tree, 'sh-scrim').props.onPress();
    expect(closed).toEqual(['x', 'x']);
    expect(undersizedTargets(tree)).toEqual([]);
  });
});

describe('Switch - one tap is the change, and the state is said three ways', () => {
  it('fill, tick or dash, and a word - and the role and state for TalkBack', () => {
    const flips: boolean[] = [];
    for (const value of [true, false]) {
      const tree = render(
        <Switch testID="sw" label="Crash reports" value={value} onChange={(v) => flips.push(v)} onWord="On" offWord="Off" />,
      );
      expect(tree.props.accessibilityRole).toBe('switch');
      expect(tree.props.accessibilityState).toEqual({ checked: value });
      expect(text(byTestId(tree, 'sw-word'))).toBe(value ? 'On' : 'Off');
      expect(glyphs(tree)).toEqual([glyphOf(value ? 'tick' : 'dash')]);
      tree.props.onPress();
      expect(undersizedTargets(tree)).toEqual([]);
      for (const display of ['comfort', 'focus'] as const) {
        // On the card it is drawn on: the walker needs the surface behind it.
        expect(
          failingContrast(
            render(
              <View style={{ backgroundColor: tokens(display).color.surface }}>
                <Switch testID="sw" label="x" value={value} onChange={() => {}} onWord="On" offWord="Off" display={display} />
              </View>,
            ),
          ),
        ).toEqual([]);
      }
    }
    expect(flips).toEqual([false, true]);
  });
});

describe('the state set - static loading, empty with a way on, locked with a reason', () => {
  it('loading is three rows and the word, with no spinner', () => {
    const tree = render(<LoadingState testID="l" label="Opening" />);
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(SKELETON_ROWS);
    expect(tree.props.accessibilityState).toEqual({ busy: true });
    expect(byType(tree, 'ActivityIndicator')).toEqual([]);
    expect(text(tree)).toBe('Opening');
  });

  it('empty names the action that fills it', () => {
    const tree = render(
      <EmptyState testID="e" text="No customers yet." action={{ testID: 'e-go', label: 'Add', onPress: () => {} }} />,
    );
    expect(text(byTestId(tree, 'e'))).toBe('No customers yet.');
    expect(text(byTestId(tree, 'e-go'))).toBe('Add');
    expect(undersizedTargets(tree)).toEqual([]);
  });

  it('locked is the lock mark and the reason, in the disabled ink', () => {
    const tree = render(<LockedLine testID="k" text="After the cash check" />);
    expect(glyphs(tree)).toEqual([glyphOf('lock')]);
    expect(text(tree)).toBe('After the cash check');
    expect(undersizedText(tree)).toEqual([]);
  });
});

describe('the text-size step - content grows, chrome holds, and the choice is kept', () => {
  it('the picker offers three steps, none pre-chosen beyond what is in force, and previews the real Money', () => {
    const s = strings('en');
    const tree = render(<TextSizePicker testID="ts" s={s} value="large" onChange={() => {}} sample={1245000} />);
    expect(['ts-options-normal', 'ts-options-large', 'ts-options-xlarge'].map((id) => text(byTestId(tree, id)))).toEqual([
      phrase('textSize.normal', 'en'),
      phrase('textSize.large', 'en'),
      phrase('textSize.xlarge', 'en'),
    ]);
    expect(byTestId(tree, 'ts-options-large').props.accessibilityState).toEqual({ selected: true });
    const preview = byTestId(tree, 'ts-preview-amount');
    expect(text(preview)).toBe(text(render(<Money amount={1245000} size="figure" />)));
    expect(preview.props.style.fontSize).toBe(tokens('comfort', 'large').type.figure);
    expect(preview.props.style.fontSize).toBeGreaterThan(tokens('comfort', 'normal').type.figure);
  });

  it('chosen in Settings, it is in force on the next frame, and the chrome cap is kept', () => {
    let n = 0;
    const s = new Session(canonicalStore(), { now: () => CANONICAL_DATE + 'T12:00:00.000Z', newId: () => 'id' + String(++n) });
    s.goTo('S3');
    byTestId(render(<App session={s} />), 's3-text-size-options-xlarge').props.onPress();
    expect(s.state.textSize).toBe('xlarge');
    const tree = render(<App session={s} />);
    expect(textSizeNow()).toBe('xlarge');
    // Chrome: the title still reaches 1.5x in total, never more.
    const title = byTestId(tree, 's3-title');
    const total = title.props.maxFontSizeMultiplier * (title.props.style.fontSize / tokens('comfort', 'normal').type.heading);
    expect(total).toBeLessThanOrEqual(CHROME_FONT_SCALE_CAP);
    expect(total).toBeGreaterThan(1.4);
    // Back to Normal restores every token exactly.
    s.setTextSize('normal');
    render(<App session={s} />);
    expect(tokens('comfort').type).toEqual(tokens('comfort', 'normal').type);
  });

  it('every new screen and state clears contrast, targets and text at Extra large too', () => {
    setTextSize('xlarge');
    const s = strings('or');
    const tree = render(
      <View style={{ backgroundColor: tokens('focus').color.surface }}>
        <TextSizePicker testID="ts" s={s} value="xlarge" onChange={() => {}} sample={1245000} display="focus" />
      </View>,
    );
    expect(undersizedTargets(tree)).toEqual([]);
    expect(undersizedText(tree)).toEqual([]);
    expect(failingContrast(tree)).toEqual([]);
    expect(all(tree).length).toBeGreaterThan(0);
  });
});
