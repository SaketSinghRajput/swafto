/**
 * FR-7 · THE FREE BASIC REPORTS, drawn on R1 (R5; R2 §3 items 1-5).
 *
 * Free in every plan: who owes him and whom he owes, by age, oldest first; the
 * month at a glance with what he took home shown BESIDE profit, never inside it
 * (D3); the cash-check history; and the UPI he confirmed (decision 3). Every
 * figure comes from `store.basicReports()`, derived on this render; nothing here
 * is kept, re-added or cached. Every line states what the book says and none
 * says what to do.
 */
import { View } from '@swafto/ui';
import { DUE_AGE_BUCKETS, type DuesByAge, type MonthAtAGlance, type Paise } from '@swafto/formula-engine';
import { Card, Row } from './Shell.tsx';
import { Note, Reading, partyName, reasonText } from './ReportParts.tsx';
import { dateLine, fill } from './DayParts.tsx';
import type { Mode as DisplayMode } from '../theme/tokens.ts';
import type { StringKey, Strings } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

/** How many of the oldest parties each dues card names. A named choice. */
export const DUES_PARTIES_SHOWN = 5;
/** How many of the latest cash checks are listed one by one. A named choice. */
export const CASH_CHECK_DAYS_SHOWN = 7;

interface Common {
  readonly s: Strings;
  readonly display: DisplayMode;
}

/** One dues card: the four age buckets, then the oldest parties by name. */
function DuesCard({
  testID,
  titleKey,
  noneKey,
  dues,
  store,
  s,
  display,
}: Common & {
  readonly testID: string;
  readonly titleKey: StringKey;
  readonly noneKey: StringKey;
  readonly dues: DuesByAge;
  readonly store: Store;
}) {
  return (
    <Card testID={testID} title={s(titleKey)} display={display}>
      {dues.parties.length === 0 ? (
        <Note testID={testID + '-none'} text={s(noneKey)} display={display} />
      ) : (
        <>
          {DUE_AGE_BUCKETS.map((_, i) => (
            <Row
              key={i}
              testID={`${testID}-bucket-${i}`}
              label={s(`rep.bucket.${i}` as StringKey)}
              amount={dues.bucketTotals[i]!}
              display={display}
            />
          ))}
          {dues.parties.slice(0, DUES_PARTIES_SHOWN).map((p) => (
            <Row
              key={p.partyId}
              testID={`${testID}-party-${p.partyId}`}
              label={fill(s('rep.party.age'), { name: partyName(store, p.partyId), n: p.oldestAgeDays })}
              amount={p.amount}
              display={display}
            />
          ))}
          <Note testID={testID + '-note'} text={s('rep.dues.note')} display={display} />
        </>
      )}
    </Card>
  );
}

/** One month at a glance. Withdrawal is drawn BESIDE profit, never inside it (D3). */
function MonthCard({
  testID,
  titleKey,
  m,
  s,
  display,
}: Common & { readonly testID: string; readonly titleKey: StringKey; readonly m: MonthAtAGlance }) {
  const row = (id: string, key: StringKey, amount: Paise, directional = false) => (
    <Row testID={`${testID}-${id}`} label={s(key)} amount={amount} directional={directional} display={display} />
  );
  return (
    <Card testID={testID} title={s(titleKey)} display={display}>
      {/* A COUNT, never `<Money>`. */}
      <Reading testID={testID + '-closed'} label={s('r1.daysClosed')} value={String(m.closedDays)} display={display} />
      {row('net-sales', 'rep.month.netSales', m.netSales)}
      {row('cash', 'rep.month.cash', m.cashSales)}
      {row('upi', 'rep.month.upi', m.upiSales)}
      {row('udhar', 'rep.month.udhar', m.udharSales)}
      {row('expenses', 'rep.month.expenses', m.expenses)}
      {row('purchases', 'rep.month.purchases', m.purchases)}
      {row('profit', 'rep.month.profit', m.estimatedProfit, true)}
      {row('taken-home', 'rep.month.takenHome', m.withdrawals)}
      {row('left', 'rep.month.left', m.profitLeftInShop, true)}
      <Note testID={testID + '-note'} text={s('rep.month.note')} display={display} />
    </Card>
  );
}

export function BasicReportCards({ store, s, display }: Common & { readonly store: Store }) {
  const b = store.basicReports();
  const c = b.cashChecks;
  const of = (n: number) => fill(s('r1.ofDays'), { n, w: c.days.length });
  return (
    <>
      <DuesCard testID="r1-dues" titleKey="rep.dues.title" noneKey="rep.dues.none" dues={b.customerDues} store={store} s={s} display={display} />
      <DuesCard testID="r1-owe" titleKey="rep.owe.title" noneKey="rep.owe.none" dues={b.supplierDues} store={store} s={s} display={display} />
      <MonthCard testID="r1-month" titleKey="rep.month.this" m={b.months[0]!} s={s} display={display} />
      {/* HT-46: absent when the book starts this month - no block of zeroes for a month before the shop. */}
      {b.months[1] === undefined ? null : (
        <MonthCard testID="r1-last-month" titleKey="rep.month.last" m={b.months[1]} s={s} display={display} />
      )}
      <Card testID="r1-cash" title={s('rep.cash.title')} display={display}>
        <Reading testID="r1-cash-balanced" label={s('rep.cash.balanced')} value={of(c.balancedDays)} display={display} />
        <Reading testID="r1-cash-short" label={s('rep.cash.short')} value={of(c.shortDays)} display={display} />
        <Reading testID="r1-cash-extra" label={s('rep.cash.extra')} value={of(c.extraDays)} display={display} />
        {c.days.slice(0, CASH_CHECK_DAYS_SHOWN).map((d) => (
          <Row
            key={d.date}
            testID={`r1-cash-${d.date}`}
            label={dateLine(d.date, s) + reasonText(d.reason, s)}
            amount={d.difference}
            directional
            display={display}
          />
        ))}
      </Card>
      <Card testID="r1-upi" title={s('rep.upi.title')} display={display}>
        {b.upiMonths.map((u, i) => (
          <View key={u.month}>
            <Row
              testID={`r1-upi-${i}`}
              label={s(i === 0 ? 'rep.month.this' : 'rep.month.last')}
              amount={u.confirmed}
              display={display}
            />
            <Reading
              testID={`r1-upi-${i}-count`}
              label={s('rep.upi.title')}
              value={fill(s('rep.upi.receipts'), { n: u.confirmedCount, w: u.receiptCount })}
              display={display}
            />
          </View>
        ))}
      </Card>
    </>
  );
}
