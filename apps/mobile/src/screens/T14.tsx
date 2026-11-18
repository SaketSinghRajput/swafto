/**
 * T14 - THE DAY, CLOSED. "Figures, estimated profit, withdrawal shown OUTSIDE it."
 *
 * THE WITHDRAWAL IS THE WHOLE REASON THIS SCREEN IS SPECIFIED SEPARATELY. D3:
 * money the owner took is not a cost of running the shop, so it is not in profit
 * - and a summary that quietly folded it in would tell him the shop is doing
 * worse than it is. It is shown, plainly, in its own card below the profit, with
 * a sentence saying it was not deducted. The sentence matters: a figure sitting
 * under a profit figure looks like it was subtracted from it.
 *
 * NOTHING HERE CAN CHANGE A FIGURE. A closed day is frozen; the correction path
 * is a new entry against today that references this day. So no keypad, no
 * inputs, no bottom nav - and the only two controls are ways OUT: the header's
 * back (F-9: this screen used to have no interactive element at all, so the
 * only exit was the hardware key) and the reference's "Done".
 *
 * THREE GROUPS, AS THE REFERENCE DRAWS THEM: what made the profit, the
 * withdrawal outside it, and the cash check that closed the day. The rows used
 * to be one flat list, and two of them carried the wrong label - net sales said
 * "Cash sales" and credit outstanding said "Udhar sales".
 */
import { Text } from '@swafto/ui';
import { Shell, Row, Card, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { UpiCheckCard, AdjustmentsCard } from '../components/DayFacts.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, STRINGS, type RenderLanguage, type StringKey } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';
import { subtract, profitAfterCashDifference } from '@swafto/formula-engine';

export interface DayClosedProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onRetry?: () => void;
  /** F-9: the header's way back. Explicit `| undefined` for exactOptionalPropertyTypes. */
  readonly onBack?: (() => void) | undefined;
  /** The reference's "Done". Absent, no button is drawn - as with `onBack`. */
  readonly onDone?: (() => void) | undefined;
}

export function DayClosed({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onRetry = () => {},
  onBack,
  onDone,
}: DayClosedProps) {
  const t = tokens(display);
  const s = strings(language);
  const primary = store.primary();
  const day = store.state.day;
  const expected = store.expectedCash().value;
  const counted = day.countedCash;
  /* A stored reason is a string key. One this build does not know is shown as nothing, not as a crash. */
  // HT-49: only a difference has a reason - an older build stored one on a matched count.
  const reason = counted !== null && counted !== expected ? day.differenceReason : undefined;
  const reasonText = reason !== undefined && reason in STRINGS ? ' · ' + s(reason as StringKey) : '';

  return (
    <Shell
      id="t14"
      s={s}
      display={display}
      status={status}
      titleKey="t14.title"
      headline={{ labelKey: 't14.profit', amount: primary.estimatedProfit.value }}
      onRetry={onRetry}
      onBack={onBack}
      footer={
        onDone === undefined ? null : (
          <PrimaryButton testID="t14-done" label={s('t14.done')} onPress={onDone} display={display} />
        )
      }
    >
      <Card testID="t14-figures" display={display}>
        <Row
          testID="t14-net-sales"
          label={s('t14.netSales')}
          amount={primary.p4NetSales.value}
          display={display}
          directional
        />
        <Row
          testID="t14-purchases"
          label={s('t14.purchases')}
          amount={primary.p5NetPurchase.value}
          out
          display={display}
          directional
        />
        <Row
          testID="t14-expenses"
          label={s('t14.expenses')}
          amount={primary.p6TotalExpenses.value}
          out
          display={display}
          directional
        />
        <Row
          testID="t14-credit-outstanding"
          label={s('p1.toCollect')}
          amount={primary.p7CreditOutstanding.value}
          display={display}
        />
      </Card>

      {/*
        OUTSIDE the profit figure, in a card of its own, and the sentence
        underneath says so. Placement alone would not: a number below a total
        reads as part of it.
      */}
      <Card testID="t14-withdrawal-card" display={display}>
        <Row
          testID="t14-withdrawal"
          label={s('t14.withdrawal')}
          amount={store.sectionTotal('withdrawal')}
          out
          display={display}
          directional
        />
        <Text
          testID="t14-withdrawal-note"
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            padding: t.space.md,
            fontFamily: t.font.regular,
            fontSize: t.type.body,
            lineHeight: t.leading(t.type.body),
            color: t.color.inkMuted,
          }}
        >
          {s('t14.withdrawalNote')}
        </Text>
      </Card>

      {/* The check that closed the day, so the summary explains its own close. */}
      {counted === null ? null : (
        <Card testID="t14-cash-check" display={display} title={s('t14.cashCheck')}>
          <Row testID="t14-expected" label={s('t14.expected')} amount={expected} display={display} />
          <Row testID="t14-counted" label={s('t14.counted')} amount={counted} display={display} />
          <Row
            testID="t14-difference"
            label={s('t12.difference') + reasonText}
            amount={subtract(counted, expected)}
            display={display}
            directional
          />
          {/*
            HT-23: A SHORT DRAWER IS THE DAY'S LOSS, an over one its income - as
            Indian books carry cash short and excess. Beside Estimated Profit, not
            in place of it: the headline stays the sheet's formula.
          */}
          <Row
            testID="t14-profit-after-cash"
            label={s('t14.profitAfterCash')}
            amount={profitAfterCashDifference(store.input)?.value ?? 0}
            display={display}
            directional
          />
        </Card>
      )}

      {/* Decision 3: the second equation, stated as it closed - "not checked" included. */}
      <UpiCheckCard testID="t14-upi" store={store} s={s} display={display} />
      <AdjustmentsCard testID="t14-adjust" store={store} s={s} display={display} />
    </Shell>
  );
}
