/**
 * S3 - LANGUAGE AND TEXT SIZE. The two questions X1 asked once and then buried.
 *
 * WHY IT EXISTS. X1 asks for a language and a display mode during onboarding and
 * there was no route back to either: a man who tapped Hindi by accident on his
 * first morning was in Hindi for the life of the install, and the mode built for
 * reading a cheap panel in shop daylight could only ever be chosen before he had
 * stood in that daylight with the app. Neither answer is a one-time fact about
 * him, so neither belongs only in onboarding.
 *
 * THE ANSWER IS APPLIED, NOT SAVED. There is no Save button, and that is the one
 * real design decision on this screen. Both choices change what this very page
 * looks like, so he does not read a description of larger type - he sees it, on
 * the screen he is holding, and puts it back with one tap. A Save button would
 * add a step whose only function is to delay the feedback that makes the choice
 * legible, and it would be the only marigold on a screen that has no action.
 *
 * FOCUS IS ABOUT THE SHOP, NOT ABOUT HIS EYES. `s3.focus` reads "Bright
 * sunlight" because Focus mode exists for a cheap screen in daylight - a fact
 * about where he is standing, not about him. `tokens.ts` and `strings.ts` both
 * record the reasoning, and it is not cosmetic: framing this as an accessibility
 * setting is how people are made to refuse the thing that would help them. The
 * words on the control name the light and never the eyesight.
 *
 * NO KEYPAD AND NO BOTTOM NAV. Nothing is typed here, and this is not one of
 * C-5's three destinations - it is reached from S1 and returns there.
 */
import { View, Text } from '@swafto/ui';
import { Shell, Card, Segmented, type LoadStatus } from '../components/Shell.tsx';
import { tokens, type Mode as DisplayMode, type TextSize } from '../theme/tokens.ts';
import { TextSizePicker } from '../components/TextSizePicker.tsx';
import { strings, type Language, type RenderLanguage } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

/**
 * THE THREE LANGUAGES, EACH WRITTEN IN ITSELF - deliberately NOT in strings.ts.
 *
 * A key in `strings.ts` resolves in the language already in force, which is the
 * exact thing being asked about here. A man who reads only Odia cannot find
 * "Odia" written in English, so a translated list hides from him the one label
 * he has to be able to read. These are the same three words in every build of
 * the app, in every language, for ever: a language's own name is not translated.
 *
 * The spellings match `X1.tsx`'s `LANGUAGES` exactly. Two screens offering the
 * same choice must spell it the same way - a shopkeeper comparing them should
 * not have to wonder whether they mean the same thing.
 */
const LANGUAGES = [
  { key: 'en', autonym: 'English' },
  { key: 'hi', autonym: 'हिन्दी' },
  { key: 'or', autonym: 'ଓଡ଼ିଆ' },
] as const satisfies readonly { key: Language; autonym: string }[];

const DISPLAYS = [
  { key: 'comfort', labelKey: 's3.comfort' },
  { key: 'focus', labelKey: 's3.focus' },
] as const satisfies readonly { key: DisplayMode; labelKey: 's3.comfort' | 's3.focus' }[];

/**
 * The preview's figure: a fixed sample, never one of his. Integer paise, like
 * every amount (ADR-003); it is drawn, never added to anything.
 */
const PREVIEW_PAISE = 1245000;

export interface LanguageSettingsProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  /** What the app is rendering in now. Changing it changes this page, at once. */
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onSelectLanguage?: (language: Language) => void;
  readonly onSelectDisplay?: (display: DisplayMode) => void;
  /** M3 (V2 3.15): the text size in force, and the tap that changes it. */
  readonly textSize?: TextSize;
  readonly onSelectTextSize?: (size: TextSize) => void;
  readonly onBack?: (() => void) | undefined;
  readonly onRetry?: () => void;
}

export function LanguageSettings({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onSelectLanguage = () => {},
  onSelectDisplay = () => {},
  onBack,
  onRetry = () => {},
  textSize = 'normal',
  onSelectTextSize = () => {},
}: LanguageSettingsProps) {
  const t = tokens(display);
  const s = strings(language);

  /*
   * Read for nothing, and still required - the same contract S1 and S2 keep. A
   * preference screen that consulted the ledger would be reading something it
   * has no business in, and `S3.test.tsx` mutates the store to prove this
   * render does not move with the day.
   */
  void store;

  /*
   * `longest` IS NOT A CHOICE, SO NOTHING SHOWS AS CHOSEN IN IT.
   *
   * The pseudo-locale returns the longest of the three strings per key and no
   * shop can be set to it - it exists so that one render proves the layout
   * survives the worst case. Mapping it onto any of the three real buttons
   * would draw a selected state that is a lie about what the app is in, so it
   * maps to `null`, which `Segmented` already carries as "nothing chosen yet".
   */
  const chosenLanguage: Language | null = language === 'longest' ? null : language;

  /** The question above a control. Muted, because the answers are the content. */
  const question = (testID: string, label: string) => (
    <Text
      testID={testID}
      maxFontSizeMultiplier={t.maxFontScale}
      style={{
        paddingHorizontal: t.space.md,
        paddingTop: t.space.md,
        fontFamily: t.font.medium,
        fontSize: t.type.label,
        lineHeight: t.leading(t.type.label),
        color: t.color.inkMuted,
      }}
    >
      {label}
    </Text>
  );

  return (
    <Shell
      id="s3"
      s={s}
      display={display}
      status={status}
      titleKey="s3.title"
      /*
       * NEVER EMPTY. Three languages and two display modes are structural -
       * properties of the build, not rows a new shop has yet to enter - so no
       * state of this screen has nothing in it. Saying `false` honestly beats
       * inventing an empty panel to fill a checkbox.
       */
      empty={false}
      onBack={onBack}
      onRetry={onRetry}
    >
      <Card testID="s3-language-card" display={display}>
        {question('s3-language-label', s('s3.language'))}
        {/*
          A wrapping View carries the group's role, so a reader hears "Language"
          once rather than inferring it from three unrelated buttons.
        */}
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={s('s3.language')}
          style={{ paddingBottom: t.space.sm, backgroundColor: t.color.surface }}
        >
          <Segmented
            testID="s3-language"
            options={LANGUAGES.map((l) => ({ key: l.key, label: l.autonym }))}
            value={chosenLanguage}
            onChange={onSelectLanguage}
            display={display}
          />
        </View>
      </Card>

      <Card testID="s3-display-card" display={display}>
        {question('s3-display-label', s('s3.display'))}
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={s('s3.display')}
          style={{ paddingBottom: t.space.sm, backgroundColor: t.color.surface }}
        >
          {/*
            The labels name the SCREEN: "Light" and "Dark, bigger text". Never
            "Large text", never "High contrast", never an accessibility word -
            see the header, and the note in `strings.ts` beside the two keys.
          */}
          <Segmented
            testID="s3-display"
            options={DISPLAYS.map((d) => ({ key: d.key, label: s(d.labelKey) }))}
            value={display}
            onChange={onSelectDisplay}
            display={display}
          />
        </View>
      </Card>

      {/*
        M3 (M2-approved, V2 3.15): TEXT SIZE, SEPARATE FROM THE SCREEN MODE.
        Words and figures grow; the header and buttons stay where the thumb
        learned them. The preview is the real Money at the chosen step, and
        the whole app follows the choice on the next frame.
      */}
      <Card testID="s3-text-size-card" display={display}>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={s('textSize.title')}
          style={{ paddingBottom: t.space.sm, backgroundColor: t.color.surface }}
        >
          <TextSizePicker
            testID="s3-text-size"
            s={s}
            value={textSize}
            onChange={onSelectTextSize}
            display={display}
            sample={PREVIEW_PAISE}
          />
        </View>
      </Card>
    </Shell>
  );
}
