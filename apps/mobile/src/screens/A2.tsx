/**
 * A2 - CHOOSE YOUR LANGUAGE. Three large cards, each label in its own script,
 * before anything else is asked - so the consent notice that follows (X0) is
 * shown in a language he chose rather than one we guessed.
 *
 * THE SUBLINE IS FIXED AT HINDI AND ODIA, and it is a correction of the
 * reference rather than a copy of it. Phone.dc.html:116 reads
 * `भाषा चुनें · ଭାଷା ବା୛ந்து`, where the Odia half ends in a Tamil cluster
 * (U-10a). `ବାଛନ୍ତୁ` ("choose") is a DRAFT reading of what was meant, pending
 * the native review (H13) like every Odia string in this build.
 */
import { View, Text, Pressable } from '@swafto/ui';
import { Shell, type LoadStatus } from '../components/Shell.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type Language, type RenderLanguage } from '../i18n/strings.ts';

/** Each language named in itself - an autonym is not translated copy. */
export const LANGUAGE_NAMES: readonly { readonly key: Language; readonly name: string }[] = [
  { key: 'or', name: 'ଓଡ଼ିଆ' },
  { key: 'hi', name: 'हिन्दी' },
  { key: 'en', name: 'English' },
];

/** The two-script hint under the title. Shown before any language is chosen. */
export const CHOOSE_HINT = 'भाषा चुनें · ଭାଷା ବାଛନ୍ତୁ';

export interface LanguageChoiceProps {
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onChoose?: (language: Language) => void;
  readonly onRetry?: () => void;
}

export function LanguageChoice({
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onChoose = () => {},
  onRetry = () => {},
}: LanguageChoiceProps) {
  const t = tokens(display);
  const s = strings(language);
  return (
    /*
     * `band`: the reference A2 has a thin navy status band and the question on
     * the cream page. On the device the title sat inside the bar instead.
     */
    <Shell
      id="a2"
      s={s}
      display={display}
      status={status}
      titleKey="a2.title"
      bar="band"
      onRetry={onRetry}
    >
      <View style={{ padding: t.space.md }}>
        <Text
          testID="a2-title"
          accessibilityRole="header"
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            paddingTop: t.space.md,
            fontFamily: t.font.bold,
            fontSize: t.type.heading,
            lineHeight: t.leading(t.type.heading),
            color: t.color.ink,
          }}
        >
          {s('a2.title')}
        </Text>
        <Text
          testID="a2-hint"
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            fontFamily: t.font.regular,
            fontSize: t.type.body,
            lineHeight: t.leading(t.type.body),
            color: t.color.inkMuted,
            marginBottom: t.space.md,
          }}
        >
          {CHOOSE_HINT}
        </Text>
        {LANGUAGE_NAMES.map(({ key, name }) => (
          <Pressable
            key={key}
            testID={'a2-' + key}
            accessibilityRole="button"
            accessibilityLabel={name}
            onPress={() => onChoose(key)}
            android_ripple={{ color: t.color.surfaceRaised }}
            style={{
              minHeight: t.control.xl,
              minWidth: t.touchTarget,
              marginBottom: t.space.md,
              paddingHorizontal: t.space.lg,
              borderRadius: t.radius.lg,
              borderWidth: t.hairline,
              borderColor: t.color.inkMuted,
              backgroundColor: t.color.surface,
              elevation: t.elevation.card,
              justifyContent: 'center',
            }}
          >
            <Text
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                fontFamily: t.font.bold,
                fontSize: t.type.figure,
                lineHeight: t.leading(t.type.figure),
                color: t.color.ink,
              }}
            >
              {name}
            </Text>
          </Pressable>
        ))}
      </View>
    </Shell>
  );
}
