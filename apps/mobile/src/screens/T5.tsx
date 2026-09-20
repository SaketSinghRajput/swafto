/**
 * T5 - THE DAY CLOSE LIST. "Nine rows, three states each, per decision 8."
 *
 * THE THREE STATES ARE THE POINT, AND THEY ARE THE EASIEST THING HERE TO GET
 * WRONG. Entered, said-to-be-empty, and not-yet-reached. Skipped and untouched
 * produce exactly the same total - zero - and mean completely different things: a
 * day of eight zeroes cannot tell you whether the shop sold nothing or whether
 * nobody has finished entering it. Only the shopkeeper knows which, so only he
 * can say, and the screen has to ask rather than assume.
 *
 * A row therefore shows its STATE beside its figure, and a row he has not reached
 * offers the one action that resolves it.
 *
 * NO KEYPAD. This is where he checks what he has entered and says what is
 * missing; the entering happens on the forms. And so no bottom nav either.
 */
import { View, Text, Pressable } from '@swafto/ui';
import type { Entry } from '@swafto/formula-engine';
import { Shell, Row, type LoadStatus } from '../components/Shell.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type StringKey } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

/** The eight entry sections of the paper sheet, in its order. Section 9 is the count. */
const SECTIONS: readonly Entry['section'][] = [
  'cash_sales',
  'upi_sales',
  'udhar_sales',
  'purchase',
  'expense',
  'udhar_collection',
  'party_payment',
  'withdrawal',
];

export interface DayCloseListProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onOpenSection?: (section: Entry['section']) => void;
  readonly onSkipSection?: (section: Entry['section']) => void;
  readonly onRetry?: () => void;
}

export function DayCloseList({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onOpenSection = () => {},
  onSkipSection = () => {},
  onRetry = () => {},
}: DayCloseListProps) {
  const t = tokens(display);
  const s = strings(language);

  return (
    <Shell
      id="t5"
      s={s}
      display={display}
      status={status}
      titleKey="t5.title"
      headline={{ labelKey: 't5.total', amount: store.expectedCash().value }}
      onRetry={onRetry}
    >
      {SECTIONS.map((section) => {
        const state = store.sectionState(section);
        return (
          <View key={section} testID={'t5-row-' + section}>
            <Row
              testID={'t5-figure-' + section}
              label={s(('section.' + section) as StringKey)}
              amount={store.sectionTotal(section)}
              display={display}
              onPress={() => onOpenSection(section)}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                paddingHorizontal: t.space.md,
                paddingBottom: t.space.sm,
              }}
            >
              <Text
                testID={'t5-state-' + section}
                maxFontSizeMultiplier={t.maxFontScale}
                style={{
                  fontFamily: t.font.regular,
                  fontSize: t.type.label,
                  lineHeight: t.leading(t.type.label),
                  color: t.color.inkMuted,
                }}
              >
                {s(('state.' + state) as StringKey)}
              </Text>
              {state === 'untouched' ? (
                <Pressable
                  testID={'t5-skip-' + section}
                  accessibilityRole="button"
                  accessibilityLabel={s('state.skipped')}
                  onPress={() => onSkipSection(section)}
                  style={{
                    minHeight: t.touchTarget,
                    minWidth: t.touchTarget,
                    paddingHorizontal: t.space.md,
                    borderRadius: t.radius.md,
                    borderWidth: t.hairline,
                    borderColor: t.color.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    maxFontSizeMultiplier={t.maxFontScale}
                    style={{
                      fontFamily: t.font.medium,
                      fontSize: t.type.body,
                      lineHeight: t.leading(t.type.body),
                      color: t.color.ink,
                    }}
                  >
                    {s('state.skipped')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
    </Shell>
  );
}
