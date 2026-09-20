/**
 * T7 - ENTRY FORM A. The build map calls it "repeating lines with running total".
 *
 * It is the first screen built, and deliberately the hardest one in the committed
 * set. A form that adds one row at a time, shows what has been entered, and keeps a
 * total that must agree with the day-close sheet is where every rule in this build
 * meets at once: append-only, derive-on-read, one money path, one keypad, four
 * states, three languages. A screen that passes here has answered most of the
 * questions the other nine will ask.
 *
 * THE RUNNING TOTAL IS P4, ASKED FOR EVERY RENDER. It is not accumulated as lines
 * are added and it is not held anywhere. Adding up the rows on screen would be a
 * second implementation of net sales that agrees with the engine until the day
 * somebody adds a section - and then disagrees on the one screen where the
 * shopkeeper is watching the number grow. `store.primary()` is the only source.
 *
 * FOUR STATES, ALL REAL. loading, error, empty and loaded. Empty is DERIVED - a
 * ready day with no sales lines - rather than a status somebody has to remember to
 * set, because the status nobody sets is the blank panel a shop sees on day one.
 *
 * NO BOTTOM NAV, AND THAT IS AN ASSERTION NOT AN OMISSION. A keypad and a bottom
 * navigation bar on the same screen put a nav target under the thumb that is
 * reaching for a digit. This is an entry screen, so it has the keypad and it has no
 * nav; the test checks both halves of that, because the pair has been specified
 * wrongly before.
 *
 * STATELESS AND HOOK-FREE. Everything variable arrives as a prop and every change
 * leaves as a callback. The draft amount lives in the store with the rest of the
 * state. That is what lets the whole screen be tested without a renderer that
 * supports hooks, and it is also why there is nowhere here for a figure to be
 * cached.
 */
import { View, Text, Pressable, ScrollView, ActivityIndicator } from '@swafto/ui';
import type { Mode as PaymentMode, Paise } from '@swafto/formula-engine';
import { Money } from '../components/Money.tsx';
import { Keypad, type KeypadKey } from '../components/Keypad.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type StringKey } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

/** The three sections Form A can write into, and the only ones it may list. */
const SALES_SECTIONS = ['cash_sales', 'upi_sales', 'udhar_sales'] as const;
type SalesSection = (typeof SALES_SECTIONS)[number];

const MODE_LABEL: Record<SalesSection, StringKey> = {
  cash_sales: 'formA.mode.cash',
  upi_sales: 'formA.mode.upi',
  udhar_sales: 'formA.mode.udhar',
};

export type LoadStatus = 'loading' | 'error' | 'ready';

export interface FormAProps {
  readonly store: Store;
  /** Loading and error are the caller's to report; empty and loaded are derived here. */
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  /** What the keypad has built so far, in paise. Null when nothing is being typed. */
  readonly draftPaise?: Paise | null;
  readonly onKey?: (key: KeypadKey) => void;
  readonly onCommit?: (mode: PaymentMode) => void;
  readonly onRetry?: () => void;
}

export function FormA({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  draftPaise = null,
  onKey = () => {},
  onCommit = () => {},
  onRetry = () => {},
}: FormAProps) {
  const t = tokens(display);
  const s = strings(language);

  if (status === 'loading') {
    return (
      <View
        testID="t7-loading"
        style={{
          flex: 1,
          backgroundColor: t.color.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator accessibilityLabel={s('formA.loading')} color={t.color.accent} />
        <Text
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            fontFamily: t.font.regular,
            fontSize: t.type.body,
            lineHeight: t.leading(t.type.body),
            color: t.color.inkMuted,
            marginTop: t.space.md,
          }}
        >
          {s('formA.loading')}
        </Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View testID="t7-error" style={{ flex: 1, backgroundColor: t.color.bg, padding: t.space.md }}>
        {/*
          The copy says nothing was lost, because on an offline-first ledger that is
          both true and the only thing he wants to know. A bare "something went
          wrong" invites him to type the whole day again.
        */}
        <Text
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            fontFamily: t.font.regular,
            fontSize: t.type.body,
            lineHeight: t.leading(t.type.body),
            color: t.color.negative,
          }}
        >
          {s('formA.error')}
        </Text>
        <Pressable
          testID="t7-retry"
          accessibilityRole="button"
          accessibilityLabel={s('formA.retry')}
          onPress={onRetry}
          style={{
            minHeight: t.touchTarget,
            minWidth: t.touchTarget,
            marginTop: t.space.md,
            paddingHorizontal: t.space.md,
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
            {s('formA.retry')}
          </Text>
        </Pressable>
      </View>
    );
  }

  const parties = new Map(store.state.parties.map((p) => [p.id, p.name]));
  const lines = store.state.entries.filter((e) =>
    (SALES_SECTIONS as readonly string[]).includes(e.section),
  );

  return (
    <View testID="t7" style={{ flex: 1, backgroundColor: t.color.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          // Money is uncapped by design, so at a large system font scale the label and the
          // figure wrap onto two lines rather than running off the side of the screen.
          flexWrap: 'wrap',
          padding: t.space.md,
          borderBottomWidth: t.hairline,
          borderBottomColor: t.color.border,
        }}
      >
        <Text
          testID="t7-title"
          maxFontSizeMultiplier={t.maxFontScale}
          style={{ fontFamily: t.font.bold, fontSize: t.type.heading, color: t.color.ink }}
        >
          {s('formA.title')}
        </Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text
            maxFontSizeMultiplier={t.maxFontScale}
            style={{
              fontFamily: t.font.regular,
              fontSize: t.type.label,
              lineHeight: t.leading(t.type.label),
              color: t.color.inkMuted,
            }}
          >
            {s('formA.runningTotal')}
          </Text>
          {/*
            P4, recomputed on every render. Never a sum of the rows above, which is
            the same figure right up until it is not.
          */}
          <Money
            testID="t7-running-total"
            amount={store.primary().p4NetSales.value}
            mode={display}
            size="figure"
          />
        </View>
      </View>

      <ScrollView testID="t7-lines" style={{ flex: 1, minHeight: 0 }}>
        {lines.length === 0 ? (
          <View testID="t7-empty" style={{ padding: t.space.lg, alignItems: 'center' }}>
            <Text
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                fontFamily: t.font.regular,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: t.color.inkMuted,
                textAlign: 'center',
              }}
            >
              {s('formA.empty')}
            </Text>
          </View>
        ) : (
          lines.map((e) => (
            <View
              key={e.id}
              testID={'t7-line-' + e.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                // Money is uncapped by design, so at a large system font scale the label and the
                // figure wrap onto two lines rather than running off the side of the screen.
                flexWrap: 'wrap',
                minHeight: t.touchTarget,
                paddingHorizontal: t.space.md,
                paddingVertical: t.space.sm,
                borderBottomWidth: t.hairline,
                borderBottomColor: t.color.border,
              }}
            >
              <Text
                maxFontSizeMultiplier={t.maxFontScale}
                /*
                  A party name can be very long in Odia and the adversarial shop
                  carries the longest one allowed. It wraps rather than truncating:
                  a truncated customer name on a credit line is the one field where
                  guessing who it was costs somebody money.
                */
                style={{
                  flex: 1,
                  flexWrap: 'wrap',
                  marginRight: t.space.sm,
                  fontFamily: t.font.regular,
                  fontSize: t.type.body,
                  lineHeight: t.leading(t.type.body),
                  color: t.color.ink,
                }}
              >
                {s(MODE_LABEL[e.section as SalesSection])}
                {e.partyId ? ' - ' + (parties.get(e.partyId) ?? e.partyId) : ''}
              </Text>
              <Money amount={e.amount} mode={display} size="body" />
            </View>
          ))
        )}
      </ScrollView>

      <View
        testID="t7-draft"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          // Money is uncapped by design, so at a large system font scale the label and the
          // figure wrap onto two lines rather than running off the side of the screen.
          flexWrap: 'wrap',
          padding: t.space.md,
          borderTopWidth: t.hairline,
          borderTopColor: t.color.border,
        }}
      >
        <Text
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            fontFamily: t.font.regular,
            fontSize: t.type.label,
            lineHeight: t.leading(t.type.label),
            color: t.color.inkMuted,
          }}
        >
          {s('formA.amount')}
        </Text>
        <Money testID="t7-draft-amount" amount={draftPaise ?? 0} mode={display} size="figure" />
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: t.space.sm }}>
        {SALES_SECTIONS.map((section) => {
          const paymentMode: PaymentMode =
            section === 'cash_sales' ? 'cash' : section === 'upi_sales' ? 'upi' : 'udhar';
          return (
            <Pressable
              key={section}
              testID={'t7-commit-' + paymentMode}
              accessibilityRole="button"
              accessibilityLabel={s(MODE_LABEL[section])}
              onPress={() => onCommit(paymentMode)}
              style={{
                flex: 1,
                minHeight: t.touchTarget,
                minWidth: t.touchTarget,
                margin: t.space.xs,
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
                {s(MODE_LABEL[section])}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* An entry screen, so the keypad is here - and there is no bottom nav beside it. */}
      <Keypad onKey={onKey} s={s} mode={display} />
    </View>
  );
}
