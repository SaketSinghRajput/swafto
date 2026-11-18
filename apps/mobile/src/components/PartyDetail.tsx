/**
 * ONE PARTY'S PAGE, FOR BOTH KINDS OF PARTY.
 *
 * P2 is a customer and P3 is a supplier, and they are the same screen: a name, a
 * figure, the day's lines against that name, and the one or two things you can do
 * about it. Acceptance criterion 3 says the entry form is one component
 * instantiated twice and that no forked implementation exists; the same reasoning
 * applies here with more force, because the two party screens differ only in
 * which direction the money runs. Two files would diverge on the third change.
 *
 * WHAT DIFFERS, AND IT IS ONLY THIS:
 *   - which word names the figure: "Owed to you" against "You owe";
 *   - which actions sit in the footer.
 * The ledger, the signs, the empty state and the layout are shared, which is the
 * point.
 *
 * THE LEDGER IS SIGNED, AND THE SIGNS COME FROM THE STORE.
 *
 * Every amount in this product is non-negative - the sign is carried by the
 * section - so a party line has to be given its direction by something. That
 * something is `partyEffect`, exported by the store, which is also what
 * `partyMovementToday` sums. A screen that decided the direction for itself
 * would be a second opinion about the same question, and the day the two
 * disagreed the ledger would stop adding up to its own figure while every line
 * on it still looked right.
 *
 * TODAY ONLY. The figure is this day's movement, not a carried balance, because
 * no carried per-party balance exists anywhere in this app yet (W4, and the long
 * note on `Store.partyMovementToday`). The screen says so rather than implying a
 * history it does not have.
 *
 * NO KEYPAD. Nothing is typed here; the actions open the forms that do the
 * typing. Therefore no bottom nav either.
 */
import type { ReactNode } from 'react';
import { View, Text, Pressable } from '@swafto/ui';
import { Shell, Card, PrimaryButton, type ButtonVariant, type LoadStatus } from './Shell.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type StringKey } from '../i18n/strings.ts';
import { partyEffect, type Store } from '../store/index.ts';
import { formatPaise, type Paise } from '@swafto/formula-engine';
// The line's words are shared with the statement FR-2 shares, so the two read alike.
import { lineLabel } from '../app/share.ts';
import { syncOf } from './DayParts.tsx';

/** One thing the shopkeeper can do about this party, from this screen. */
export interface PartyAction {
  readonly key: string;
  readonly labelKey: StringKey;
  readonly onPress: () => void;
  /**
   * USABILITY item 5: ONE PRIMARY. Two identical full-width marigold buttons
   * competed on the customer page (U-19); a page has one marigold action and
   * the rest are quieter. Defaults to primary for a page with one action.
   */
  readonly variant?: ButtonVariant;
}

export interface PartyDetailProps {
  /** `p2` or `p3`. Becomes the testID root. */
  readonly id: string;
  readonly store: Store;
  readonly partyId: string;
  readonly titleKey: StringKey;
  /** What the figure is called from this side: owed to you, or owed by you. */
  readonly figureKey: StringKey;
  readonly emptyKey: StringKey;
  readonly actions?: readonly PartyAction[];
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onRetry?: () => void;
  /** F-9: the header's way back. Explicit `| undefined` for exactOptionalPropertyTypes. */
  readonly onBack?: (() => void) | undefined;
  /** R5: what P2 adds above the ledger - the all-days balance and its actions. */
  readonly extra?: ReactNode;
  /**
   * USABILITY item 5: THE HERO, WHEN IT IS NOT TODAY'S MOVEMENT. P2 passes the
   * balance owed, which is the answer the page is opened for; absent, the
   * figure is `partyMovementToday` under `figureKey`, as P3 has it.
   */
  readonly headline?: { readonly labelKey: StringKey; readonly amount: Paise } | undefined;
}

export function PartyDetail({
  id,
  store,
  partyId,
  titleKey,
  figureKey,
  emptyKey,
  actions = [],
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onRetry = () => {},
  onBack,
  extra = null,
  headline,
}: PartyDetailProps) {
  const t = tokens(display);
  const s = strings(language);

  const party = store.state.parties.find((p) => p.id === partyId);
  const entries = store.partyEntries(partyId);

  /*
   * THE SIGNED EFFECT OF ONE LINE IS THE STORE'S, NOT THIS SCREEN'S. A local copy
   * here knew about purchases and nothing else, so a returned sale would have
   * shown as a bare +amount and a cash refund as udhar coming off, while the
   * headline (`partyMovementToday`, which sums `partyEffect`) counted neither.
   */
  const signed = partyEffect;

  return (
    <Shell
      id={id}
      s={s}
      display={display}
      status={status}
      titleKey={titleKey}
      headline={headline ?? { labelKey: figureKey, amount: store.partyMovementToday(partyId) }}
      // USABILITY item 8: the sync chip, as on Today and the Ledger.
      sync={syncOf(store)}
      empty={entries.length === 0}
      emptyKey={emptyKey}
      onRetry={onRetry}
      onBack={onBack}
      footer={
        actions.length === 0 ? null : (
          <View style={{ padding: t.space.sm }}>
            {actions.map((a) => (
              <PrimaryButton
                key={a.key}
                testID={id + '-action-' + a.key}
                label={s(a.labelKey)}
                display={display}
                variant={a.variant ?? 'primary'}
                size={(a.variant ?? 'primary') === 'primary' ? 'lg' : 'md'}
                onPress={a.onPress}
              />
            ))}
          </View>
        )
      }
      /*
       * IN THE BODY HEADER, so the name and (P2) the all-days balance with its
       * reminder stay on the page on a day with no line against this party -
       * which is most days for a customer who owes from last week.
       */
      bodyHeader={
        <>
        {/*
          THE NAME IS A HEADING, NOT A SUBTITLE.

          The bar says "Customer"; this says which one. It is the only thing on the
          screen that identifies whose money this is, so it is not abbreviated and
          it wraps - an Odia name truncated on a credit page is the one field where
          guessing who it was costs somebody money.

          `party` can be missing if a partyId outlives its party. Rendering the id
          would show a uuid to a shopkeeper, so the name is simply absent and the
          ledger still renders - the lines are the truth either way.
        */}
        {party === undefined ? null : (
          <Card testID={id + '-party'} display={display}>
            <View style={{ padding: t.space.md, backgroundColor: t.color.surface }}>
              <Text
                testID={id + '-name'}
                maxFontSizeMultiplier={t.maxFontScale}
                style={{
                  fontFamily: t.font.bold,
                  fontSize: t.type.heading,
                  lineHeight: t.leading(t.type.heading),
                  color: t.color.ink,
                }}
              >
                {party.name}
              </Text>
            </View>
          </Card>
        )}

        {extra}
        </>
      }
    >
      <Card testID={id + '-ledger'} display={display} title={s('p2.ledger')}>
        {entries.map((e) => {
          const delta = signed(e);
          /*
           * F-13: COLOURED BY WHAT THE LINE DOES TO THE BALANCE, NOT BY THE SIGN
           * OF THE NUMBER - the reference's rule (store.js:493, `isIn: delta < 0,
           * isOut: delta > 0`). Udhar given raises what is owed and is money not
           * received, so it is drawn in the money-out colour; a collection lowers
           * it and is drawn money-in. `Row directional` did the opposite - giving
           * credit looked green. `Money`'s sign colouring is right for cash-flow
           * figures, so this is fixed here and not there.
           *
           * A line that does not move the balance (a cash purchase) shows no
           * amount, as in the reference, rather than a signed figure the headline
           * never counted.
           */
          const color = delta > 0 ? t.color.negative : t.color.positive;
          return (
            <View
              key={e.id}
              testID={id + '-line-' + e.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
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
                style={{
                  flex: 1,
                  marginRight: t.space.sm,
                  fontFamily: t.font.regular,
                  fontSize: t.type.body,
                  lineHeight: t.leading(t.type.body),
                  color: t.color.ink,
                }}
              >
                {lineLabel(s, e)}
              </Text>
              {delta === 0 ? null : (
                <Text
                  testID={id + '-line-' + e.id + '-amount'}
                  allowFontScaling
                  style={{
                    fontFamily: t.font.medium,
                    fontSize: t.type.body,
                    lineHeight: t.leadingUncapped(t.type.body),
                    color,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatPaise(delta, { withSign: true })}
                </Text>
              )}
            </View>
          );
        })}
      </Card>
    </Shell>
  );
}
