/**
 * X1 - ONBOARDING. "Shop name, language, text size, opening cash. Four
 * questions, no more."
 *
 * DRAWN TO `docs/design-reference/comfort/X1.png`: a brand header carrying the
 * eyebrow "SWAFTO" and "Four questions, then your book."; four NUMBERED
 * questions on bare ground - no cards - and one marigold "Start the day" pinned
 * at the foot. The previous build put each question in a card with the keypad
 * permanently under it; on the device that matched the reference on 21.9% of
 * its band signature, which is to say it was a different screen.
 *
 * FOUR IS A CEILING, NOT A COUNT. The pressure on this screen is always upward:
 * a tour, a carousel, a permissions primer, an account form. `X1.test.tsx`
 * counts the questions, so a fifth is a failing test rather than a code review
 * somebody has to remember to do.
 *
 * IT IS NOT X0 AND IT CARRIES NO CONSENT COPY. Consent precedes the account,
 * and there is exactly one place the wording of that notice lives.
 *
 * EACH LANGUAGE IS WRITTEN IN ITS OWN SCRIPT. A man who reads only Odia cannot
 * find "Odia" written in English, so the autonyms are literals, outside
 * `strings.ts`, the same three words in every build. The order is the
 * reference's: Odia first.
 *
 * TEXT SIZE IS UNRESOLVED (chat.md U-2), AND THIS SCREEN DOES NOT RESOLVE IT.
 * The reference offers "Standard / Large", a size axis separate from light and
 * dark. `tokens.ts` today has one axis, Comfort (light) and Focus (dark and
 * larger), so the question keeps its two existing answers and their existing
 * effect - this page re-renders in the chosen mode. Relabelling Focus "Large"
 * would be a label that hides the fact that it also turns the app dark.
 * HT-29: the question and its answers are S3's own keys ("Screen": "Light" /
 * "Dark, bigger text"), so the one setting has one name on both screens and
 * each answer says everything it does.
 *
 * OPENING CASH IS OPTIONAL, AS THE REFERENCE SAYS. `openingCashPaise` is null
 * until he types a digit and null is UNKNOWN, never zero. Left unknown, setup
 * still finishes and Today asks for it (T2, then T6) before the first sale. The
 * field shows "₹ 0" in muted ink as a placeholder - the reference's - and a
 * typed figure in full ink through `Money`. A typed zero is an answer and is
 * shown as one; the placeholder is not, and nothing is saved from it.
 *
 * THE KEYPAD APPEARS ONLY WHILE QUESTION 4 IS BEING ANSWERED. Ten keys under
 * the shop-name field do nothing for it and push the questions off a small
 * screen. Tapping the cash field raises the app's own keypad - never the system
 * keyboard, which offers predictions - and tapping it again, or the name field,
 * lowers it. While it is up the figure is repeated directly above the keys,
 * because the field itself has scrolled under them. Either way: no bottom nav.
 *
 * "START THE DAY" NEEDS ONLY A NAME, AND IS NEVER A DEAD BUTTON. It stays
 * pressable; without a name the session refuses and the app's refusal banner
 * says why. A greyed button that does not say what it is waiting for is the
 * one thing a first screen cannot afford.
 */
import { View, Text, Pressable, TextInput } from '@swafto/ui';
import { Shell, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { Keypad, type KeypadKey } from '../components/Keypad.tsx';
import { Money } from '../components/Money.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type Language, type RenderLanguage } from '../i18n/strings.ts';
import type { Paise } from '@swafto/formula-engine';

/** The product's name, which is not translated in any build. */
const BRAND = 'SWAFTO';

/**
 * The three languages, each in its own script. Not a string key, because a key
 * resolves in the language already chosen - which is the question being asked.
 */
const LANGUAGES = [
  { key: 'or', autonym: 'ଓଡ଼ିଆ' },
  { key: 'hi', autonym: 'हिन्दी' },
  { key: 'en', autonym: 'English' },
] as const satisfies readonly { key: Language; autonym: string }[];

const SIZES = [
  { key: 'comfort', labelKey: 's3.comfort' },
  { key: 'focus', labelKey: 's3.focus' },
] as const satisfies readonly { key: DisplayMode; labelKey: 's3.comfort' | 's3.focus' }[];

export interface OnboardingProps {
  readonly status?: LoadStatus;
  /** What the app is rendering in now. Changing it changes this page, at once. */
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  /** Empty until he types - the field is his, and starts empty. */
  readonly shopName?: string;
  /** Integer paise, or null for UNKNOWN. Null is never shown as a figure. */
  readonly openingCashPaise?: Paise | null;
  /** True while question 4 is being answered: the keypad is up. */
  readonly keypadOpen?: boolean;
  readonly onShopName?: (name: string) => void;
  readonly onLanguage?: (language: Language) => void;
  readonly onDisplay?: (display: DisplayMode) => void;
  readonly onKeypad?: (open: boolean) => void;
  readonly onKey?: (key: KeypadKey) => void;
  readonly onFinish?: () => void;
  readonly onRetry?: () => void;
}

export function Onboarding({
  status = 'ready',
  language = 'en',
  display = 'comfort',
  shopName = '',
  openingCashPaise = null,
  keypadOpen = false,
  onShopName = () => {},
  onLanguage = () => {},
  onDisplay = () => {},
  onKeypad = () => {},
  onKey = () => {},
  onFinish = () => {},
  onRetry = () => {},
}: OnboardingProps) {
  const t = tokens(display);
  const s = strings(language);

  /** "1 · Shop name". The numeral is Latin in every language, like the amounts. */
  const questionLabel = (testID: string, n: number, label: string) => (
    <Text
      testID={testID}
      maxFontSizeMultiplier={t.maxFontScale}
      style={{
        marginBottom: t.space.sm,
        fontFamily: t.font.medium,
        fontSize: t.type.label,
        lineHeight: t.leading(t.type.label),
        color: t.color.inkMuted,
      }}
    >
      {String(n) + ' · ' + label}
    </Text>
  );

  const helper = (testID: string, words: string) => (
    <Text
      testID={testID}
      maxFontSizeMultiplier={t.maxFontScale}
      style={{
        marginTop: t.space.sm,
        fontFamily: t.font.regular,
        fontSize: t.type.label,
        lineHeight: t.leading(t.type.label),
        color: t.color.inkMuted,
      }}
    >
      {words}
    </Text>
  );

  /**
   * A choice, FILLED when it is the one in force - v2's `selected` teal, the
   * fill the CTA uses (it was marigold until "Mitra"). On is filled, not
   * outlined: at arm's length on a cheap panel a border colour is not a
   * state. The ink is `onSelected` (T28), and the selected label is also bold so the state is not
   * carried by colour alone. Unselected edges are `inkMuted`, the control
   * border token - `border` sits under the 3:1 gate.
   */
  const choice = (testID: string, label: string, selected: boolean, onPress: () => void) => (
    <Pressable
      key={testID}
      testID={testID}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      android_ripple={{ color: selected ? t.color.brandPressed : t.color.brandSoft }}
      style={{
        flexBasis: '30%',
        flexGrow: 1,
        minHeight: t.control.lg,
        minWidth: t.touchTarget,
        margin: t.space.xs,
        paddingHorizontal: t.space.sm,
        borderRadius: t.radius.md,
        borderWidth: t.hairline,
        /*
         * Lead ruling 2026-10-25 (X1 agent vs a11y agent): the MARIGOLD fill
         * is the reference's (X1.png). Measured, marigold on the page is
         * 1.95:1 - under WCAG 1.4.11's 3:1 for a selected state - so the
         * selected chip carries an `ink` border, which is what meets 3:1
         * against the page. A one-line deviation from the picture, kept so
         * neither the design nor the contrast rule is given up.
         */
        borderColor: selected ? t.color.ink : t.color.inkMuted,
        backgroundColor: selected ? t.color.selected : t.color.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          fontFamily: selected ? t.font.bold : t.font.regular,
          fontSize: t.type.body,
          lineHeight: t.leading(t.type.body),
          color: selected ? t.color.onSelected : t.color.ink,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );

  /**
   * The figure, or its absence. The placeholder is muted and is not `Money`,
   * because it is not an amount: it is the reference's "₹ 0" placeholder, the
   * thing an empty field looks like, and nothing is ever saved from it.
   */
  const figure = (testID: string) =>
    openingCashPaise === null ? (
      <Text
        testID={testID + '-placeholder'}
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          fontFamily: t.font.medium,
          fontSize: t.type.figure,
          lineHeight: t.leading(t.type.figure),
          color: t.color.inkMuted,
        }}
      >
        {'₹ 0'}
      </Text>
    ) : (
      <Money testID={testID} amount={openingCashPaise} mode={display} size="figure" />
    );

  const question = { marginTop: t.space.lg } as const;

  return (
    <Shell
      id="x1"
      s={s}
      display={display}
      status={status}
      titleKey="x1.heading"
      eyebrow={BRAND}
      onRetry={onRetry}
      footer={
        <View
          testID="x1-footer"
          style={{
            backgroundColor: t.color.bg,
            borderTopWidth: t.hairline,
            borderTopColor: t.color.border,
            paddingHorizontal: t.space.sm,
          }}
        >
          {keypadOpen ? (
            <>
              <View
                testID="x1-opening-draft"
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: t.space.sm,
                  paddingTop: t.space.xs,
                }}
              >
                <Text
                  maxFontSizeMultiplier={t.maxFontScale}
                  style={{
                    flexShrink: 1,
                    fontFamily: t.font.regular,
                    fontSize: t.type.label,
                    lineHeight: t.leading(t.type.label),
                    color: t.color.inkMuted,
                  }}
                >
                  {s('x1.cashNow')}
                </Text>
                {figure('x1-opening-draft-amount')}
              </View>
              <Keypad onKey={onKey} s={s} mode={display} />
            </>
          ) : null}
          <PrimaryButton
            testID="x1-finish"
            label={s('x1.start')}
            onPress={onFinish}
            display={display}
            size="lg"
          />
        </View>
      }
    >
      <View style={{ paddingHorizontal: t.space.md, paddingBottom: t.space.lg }}>
        {/* 1 - Shop name. */}
        <View testID="x1-q1" style={question}>
          {questionLabel('x1-q1-label', 1, s('x1.shopName'))}
          {/*
            AUTOCORRECT OFF. An Odia shop name run through a predictive keyboard
            comes back as the word the keyboard preferred, and the first thing he
            would see is his own shop renamed. Focusing it lowers the keypad: the
            name is typed on the system keyboard, the cash never is.
          */}
          <TextInput
            testID="x1-shopName"
            accessibilityLabel={s('x1.shopNamePrompt')}
            value={shopName}
            onChangeText={onShopName}
            onFocus={() => onKeypad(false)}
            autoCorrect={false}
            spellCheck={false}
            autoComplete="off"
            maxFontSizeMultiplier={t.maxFontScale}
            style={{
              minHeight: t.control.lg,
              paddingHorizontal: t.space.md,
              borderRadius: t.radius.md,
              borderWidth: t.hairline,
              borderColor: t.color.inkMuted,
              fontFamily: t.font.regular,
              fontSize: t.type.body,
              lineHeight: t.leading(t.type.body),
              color: t.color.ink,
              backgroundColor: t.color.surface,
            }}
          />
        </View>

        {/* 2 - Language, each written in itself. */}
        <View testID="x1-q2" style={question}>
          {questionLabel('x1-q2-label', 2, s('x1.language'))}
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={s('x1.language')}
            style={{ flexDirection: 'row', flexWrap: 'wrap' }}
          >
            {LANGUAGES.map(({ key, autonym }) =>
              choice('x1-language-' + key, autonym, language === key, () => onLanguage(key)),
            )}
          </View>
          {helper('x1-language-help', s('x1.languageHelp'))}
        </View>

        {/* 3 - The screen. The answer is applied as it is given, not described. */}
        <View testID="x1-q3" style={question}>
          {questionLabel('x1-q3-label', 3, s('s3.display'))}
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={s('s3.display')}
            style={{ flexDirection: 'row', flexWrap: 'wrap' }}
          >
            {SIZES.map(({ key, labelKey }) =>
              choice('x1-size-' + key, s(labelKey), display === key, () => onDisplay(key)),
            )}
          </View>
        </View>

        {/* 4 - Cash in the box. A field that raises the app's own keypad. */}
        <View testID="x1-q4" style={question}>
          {questionLabel('x1-q4-label', 4, s('x1.cashNow'))}
          <Pressable
            testID="x1-opening-field"
            accessibilityRole="button"
            accessibilityLabel={s('x1.cashNow')}
            accessibilityState={{ expanded: keypadOpen }}
            onPress={() => onKeypad(!keypadOpen)}
            android_ripple={{ color: t.color.brandSoft }}
            style={{
              minHeight: t.control.lg,
              minWidth: t.touchTarget,
              paddingHorizontal: t.space.md,
              justifyContent: 'center',
              borderRadius: t.radius.md,
              // The live field takes the focus edge, as T6's does; `brand` is the
              // ground in focus mode, so there it is the control-border token.
              borderWidth: keypadOpen ? t.glyph.stroke : t.hairline,
              borderColor: keypadOpen && display === 'comfort' ? t.color.brand : t.color.inkMuted,
              backgroundColor: t.color.surface,
            }}
          >
            {figure('x1-opening-amount')}
          </Pressable>
          {helper('x1-cash-help', s('x1.cashHelp'))}
        </View>
      </View>
    </Shell>
  );
}
