/**
 * T1 - TODAY. The front door: what he sees when he opens the app.
 *
 * THE PRODUCT REVIEW ADDED THIS SCREEN AT ITERATION 33, and the reason is worth
 * keeping: the committed set had ten screens and none of them was the one that
 * renders when the app is opened. Every other screen is somewhere you arrive from
 * here.
 *
 * ONE FIGURE IS THE POINT OF THE SCREEN - what should be in the cash box right
 * now. Everything else is context for that number, which is why it is the
 * headline and the rest are rows.
 *
 * EVERY FIGURE IS ASKED FOR ON RENDER. `store.primary()` and
 * `store.expectedCash()`, both recomputed, neither stored. A Today screen holding
 * a cached total is the exact failure derive-on-read exists to prevent: it is the
 * screen he looks at most, so it is where a stale figure does the most damage.
 *
 * NO KEYPAD. Today is not an entry screen - it is where he decides which entry
 * screen to open. And therefore no bottom nav either, since that pair is what the
 * §B.6 keypad assertion is about.
 */
import { View, Text, Pressable } from '@swafto/ui';
import { Shell, Row, type LoadStatus } from '../components/Shell.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type StringKey } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

/** The sections Today summarises, in the order the paper sheet has them. */
const SUMMARY_SECTIONS = [
  'cash_sales',
  'upi_sales',
  'udhar_sales',
  'purchase',
  'expense',
  'udhar_collection',
  'party_payment',
  'withdrawal',
] as const;

export interface TodayProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onCloseDay?: () => void;
  readonly onOpenSection?: (section: string) => void;
  /**
   * The way to the consent screen once the account exists.
   *
   * DPDP §1.2 requires withdrawal to be AS EASY as giving. Giving was one tap
   * on X0 during sign-in; without this there was no way back to that screen at
   * all, so withdrawal was infinitely harder - which is the requirement broken
   * by omission rather than by refusal.
   */
  readonly onOpenPrivacy?: () => void;
  readonly onRetry?: () => void;
}

export function Today({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onCloseDay = () => {},
  onOpenSection = () => {},
  onOpenPrivacy = () => {},
  onRetry = () => {},
}: TodayProps) {
  const t = tokens(display);
  const s = strings(language);

  const entries = store.state.entries;
  const primary = store.primary();

  /*
   * Section totals come from the store, which uses the audited `sum`. Adding
   * these up here with `+` would be a second implementation of a total the
   * day-close sheet also computes - two answers, one of them eventually wrong.
   */
  const totals = SUMMARY_SECTIONS.map((section) => ({
    section,
    amount: store.sectionTotal(section),
    count: entries.filter((e) => e.section === section).length,
  }));

  return (
    <Shell
      id="t1"
      s={s}
      display={display}
      status={status}
      titleKey="t1.title"
      headline={{ labelKey: 't1.cashInHand', amount: store.expectedCash().value }}
      empty={entries.length === 0}
      emptyKey="t1.empty"
      onRetry={onRetry}
      footer={
        <View style={{ padding: t.space.sm }}>
          <Pressable
            testID="t1-close-day"
            accessibilityRole="button"
            accessibilityLabel={s('t1.closeDay')}
            onPress={onCloseDay}
            style={{
              minHeight: t.touchTarget,
              minWidth: t.touchTarget,
              borderRadius: t.radius.md,
              backgroundColor: t.color.accent,
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
                color: t.color.onAccent,
              }}
            >
              {s('t1.closeDay')}
            </Text>
          </Pressable>

          {/*
            Quiet, and present. It is not competing with closing the day - that
            is the one action this screen is for - but it is one tap away, on
            the screen he opens every morning.
          */}
          <Pressable
            testID="t1-privacy"
            accessibilityRole="button"
            accessibilityLabel={s('t1.privacy')}
            onPress={onOpenPrivacy}
            style={{
              minHeight: t.touchTarget,
              minWidth: t.touchTarget,
              marginTop: t.space.xs,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                fontFamily: t.font.regular,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: t.color.inkMuted,
              }}
            >
              {s('t1.privacy')}
            </Text>
          </Pressable>
        </View>
      }
    >
      {totals
        /*
         * A section with nothing in it is not shown. Eight rows of zero on the
         * first morning is a screen that says nothing; this says what happened.
         */
        .filter((row) => row.count > 0)
        .map((row) => (
          <Row
            key={row.section}
            testID={'t1-section-' + row.section}
            label={s(('section.' + row.section) as StringKey)}
            amount={row.amount}
            display={display}
            onPress={() => onOpenSection(row.section)}
          />
        ))}

      <Row
        testID="t1-profit"
        label={s('t1.profit')}
        amount={primary.estimatedProfit.value}
        display={display}
        /*
         * Directional: profit is the one figure here that can be negative. The
         * sign is always rendered and colour is additive, never the only signal -
         * red and green are the hardest pair for the eye this is built for.
         */
        directional
      />
    </Shell>
  );
}
