/**
 * T14 - THE DAY, CLOSED. "Figures, estimated profit, withdrawal shown OUTSIDE it."
 *
 * THE WITHDRAWAL IS THE WHOLE REASON THIS SCREEN IS SPECIFIED SEPARATELY. D3:
 * money the owner took is not a cost of running the shop, so it is not in profit
 * - and a summary that quietly folded it in would tell him the shop is doing
 * worse than it is. It is shown, plainly, below the profit line, with a sentence
 * saying it was not deducted. The sentence matters: a figure sitting under a
 * profit figure looks like it was subtracted from it.
 *
 * NOTHING HERE IS EDITABLE. A closed day is frozen; the correction path is a new
 * entry against today that references this day. So no keypad, no inputs, and no
 * bottom nav either.
 */
import { Text } from '@swafto/ui';
import { Shell, Row, type LoadStatus } from '../components/Shell.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

export interface DayClosedProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onRetry?: () => void;
}

export function DayClosed({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onRetry = () => {},
}: DayClosedProps) {
  const t = tokens(display);
  const s = strings(language);
  const primary = store.primary();

  return (
    <Shell
      id="t14"
      s={s}
      display={display}
      status={status}
      titleKey="t14.title"
      headline={{ labelKey: 't14.profit', amount: primary.estimatedProfit.value }}
      onRetry={onRetry}
    >
      <Row
        testID="t14-net-sales"
        label={s('section.cash_sales')}
        amount={primary.p4NetSales.value}
        display={display}
      />
      <Row
        testID="t14-purchases"
        label={s('section.purchase')}
        amount={primary.p5NetPurchase.value}
        display={display}
      />
      <Row
        testID="t14-expenses"
        label={s('section.expense')}
        amount={primary.p6TotalExpenses.value}
        display={display}
      />
      <Row
        testID="t14-credit-outstanding"
        label={s('section.udhar_sales')}
        amount={primary.p7CreditOutstanding.value}
        display={display}
      />

      {/*
        OUTSIDE the profit figure, and the sentence underneath says so. Placement
        alone would not: a number below a total reads as part of it.
      */}
      <Row
        testID="t14-withdrawal"
        label={s('section.withdrawal')}
        amount={store.sectionTotal('withdrawal')}
        display={display}
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
    </Shell>
  );
}
