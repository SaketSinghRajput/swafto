/**
 * M1 - THE PREMIUM DASHBOARD (PR-6, docs/research/R5-free-premium-plan.md).
 *
 * ONE SCREEN bringing the Premium readings together: the sales estimate (PR-3),
 * the comparisons (PR-4), and - in the slot below - the item cards (PR-2), which
 * another builder provides. Reached from Reports (R1); Back returns there.
 *
 * THE ONE GATE. Whether this plan may use the dashboard is `allows(plan,
 * 'dashboard')` in app/plan.ts and nowhere else. On the free plan the screen
 * says plainly what Premium adds and draws no Premium figure; whatever was
 * recorded under Premium (the item history, through the slot) stays readable,
 * marked read-only (R4 §7: a lapse hides nothing and deletes nothing).
 *
 * EVERY FIGURE IS DERIVED ON READ by `store.premiumReports()`. Every estimate
 * says "estimate", how it was made and how often it has been wrong; every
 * comparison is something to look at. Nothing here tells him what to do, and
 * nothing is typed here, so there is no keypad.
 */
import type { ReactNode } from 'react';
import { View, Text } from '@swafto/ui';
import { formatBasisPoints, type Paise, type SalesForecast } from '@swafto/formula-engine';
import { Shell, Card, Row, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { Money } from '../components/Money.tsx';
import { Reading, Note, Gate, partyName } from '../components/ReportParts.tsx';
import { dateLine, fill } from '../components/DayParts.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type StringKey, type Strings } from '../i18n/strings.ts';
import { readOnly, type Plan } from '../app/plan.ts';
import type { Store } from '../store/index.ts';

export interface DashboardProps {
  readonly store: Store;
  /** Until billing lands (another builder), the caller passes the session's plan or 'free'. */
  readonly plan?: Plan;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onBack?: () => void;
  readonly onRetry?: () => void;
  /** The plan screen, when there is one. Absent, no button is drawn - nothing is offered that cannot be done. */
  readonly onUpgrade?: () => void;
  /**
   * ===== ITEM CARDS SLOT (PR-2) - PROVIDED BY THE ITEMS BUILDER, NOT BUILT HERE =====
   *
   * Rendered at the foot of the dashboard. `readOnly` is true on a plan that may
   * not use items any more: the history recorded under Premium is still shown,
   * and nothing may be added from it. No stock, no reorder, ever (R5 decision 3).
   */
  readonly itemCards?: (o: { readonly readOnly: boolean; readonly display: DisplayMode; readonly s: Strings }) => ReactNode;
}

/** The likely range under a forecast day: two figures through `Money`, never a string of rupees. */
function RangeLine({
  testID,
  low,
  high,
  s,
  display,
}: {
  readonly testID: string;
  readonly low: Paise;
  readonly high: Paise;
  readonly s: Strings;
  readonly display: DisplayMode;
}) {
  const t = tokens(display);
  const label = {
    fontFamily: t.font.regular,
    fontSize: t.type.body,
    lineHeight: t.leading(t.type.body),
    color: t.color.inkMuted,
  } as const;
  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        minHeight: t.touchTarget,
        paddingHorizontal: t.space.md,
        paddingVertical: t.space.sm,
        borderBottomWidth: t.hairline,
        borderBottomColor: t.color.border,
      }}
    >
      <Text maxFontSizeMultiplier={t.maxFontScale} style={{ ...label, flex: 1, marginRight: t.space.sm }}>
        {s('m1.forecast.range')}
      </Text>
      <Money testID={testID + '-low'} amount={low} mode={display} size="body" />
      <Text maxFontSizeMultiplier={t.maxFontScale} style={{ ...label, marginHorizontal: t.space.xs }}>
        -
      </Text>
      <Money testID={testID + '-high'} amount={high} mode={display} size="body" />
    </View>
  );
}

function ForecastBody({ f, s, display }: { readonly f: SalesForecast; readonly s: Strings; readonly display: DisplayMode }) {
  const hw = f.holtWintersGate;
  return (
    <>
      <Note testID="m1-forecast-method" text={s(`m1.forecast.${f.method}` as StringKey)} display={display} />
      <Note
        testID="m1-forecast-window"
        text={fill(s('m1.forecast.window'), { n: f.historyDays, from: dateLine(f.historyFrom, s), to: dateLine(f.historyTo, s) })}
        display={display}
      />
      {f.days.map((d) => (
        <View key={d.date}>
          <Row testID={`m1-forecast-${d.date}`} label={dateLine(d.date, s)} amount={d.point} display={display} />
          {d.low === null || d.high === null ? null : (
            <RangeLine testID={`m1-forecast-${d.date}-range`} low={d.low} high={d.high} s={s} display={display} />
          )}
        </View>
      ))}
      {f.typicalMiss === null ? (
        <Note testID="m1-forecast-no-range" text={s('m1.forecast.noRange')} display={display} />
      ) : (
        <Row testID="m1-forecast-miss" label={s('m1.forecast.miss')} amount={f.typicalMiss} display={display} />
      )}
      {f.method === 'holt_winters' ? (
        <Reading
          testID="m1-forecast-mase"
          label={s('m1.forecast.mase')}
          value={formatBasisPoints(f.holtWintersMaseBasisPoints)}
          display={display}
        />
      ) : hw.soFar < hw.required ? (
        <Note testID="m1-forecast-hw-gate" text={fill(s('m1.forecast.hwGate'), { need: hw.required, have: hw.soFar })} display={display} />
      ) : (
        <Note testID="m1-forecast-hw-lost" text={s('m1.forecast.hwLost')} display={display} />
      )}
    </>
  );
}

/** PR-3 and PR-4, for a plan that may use them. */
function PremiumCards({ store, s, display }: { readonly store: Store; readonly s: Strings; readonly display: DisplayMode }) {
  const p = store.premiumReports();
  const ly = p.samePeriodLastYear;
  return (
    <>
      <Card testID="m1-forecast" title={s('m1.forecast.title')} display={display}>
        {p.forecast.available ? (
          <ForecastBody f={p.forecast.value} s={s} display={display} />
        ) : (
          <Gate testID="m1-forecast-gate" label={s('m1.forecast.title')} gated={p.forecast} s={s} display={display} />
        )}
        {/* THE WORD "ESTIMATE", on every state of the card. */}
        <Note testID="m1-forecast-estimate" text={s('m1.forecast.estimate')} display={display} />
      </Card>

      <Card testID="m1-last-year" title={s('m1.lastYear.title')} display={display}>
        <Row
          testID="m1-last-year-this"
          label={fill(s('m1.lastYear.this'), { n: ly.thisYear.closedDays })}
          amount={ly.thisYear.netSales}
          display={display}
        />
        {ly.lastYear.closedDays === 0 ? (
          <Note testID="m1-last-year-none" text={s('m1.lastYear.none')} display={display} />
        ) : (
          <Row
            testID="m1-last-year-last"
            label={fill(s('m1.lastYear.last'), { n: ly.lastYear.closedDays })}
            amount={ly.lastYear.netSales}
            display={display}
          />
        )}
      </Card>

      <Card testID="m1-festival" title={s('m1.festival.title')} display={display}>
        {p.festivalWeeks.length === 0 ? (
          <Note testID="m1-festival-none" text={s('m1.festival.none')} display={display} />
        ) : (
          p.festivalWeeks.map((f) => (
            <View key={f.date}>
              <Row
                testID={`m1-festival-${f.date}`}
                label={fill(s('m1.festival.week'), { name: s(`festival.${f.key}` as StringKey), n: f.week.closedDays })}
                amount={f.week.netSales}
                display={display}
              />
              <Row
                testID={`m1-festival-${f.date}-before`}
                label={fill(s('m1.festival.before'), { n: f.weekBefore.closedDays })}
                amount={f.weekBefore.netSales}
                display={display}
              />
            </View>
          ))
        )}
        <Note testID="m1-festival-source" text={s('m1.festival.source')} display={display} />
      </Card>

      <Card testID="m1-pay" title={s('m1.pay.title')} display={display}>
        {p.daysToPay.length === 0 ? (
          <Note testID="m1-pay-none" text={s('m1.pay.none')} display={display} />
        ) : (
          <>
            {p.daysToPay.map((d) => (
              <Reading
                key={d.partyId}
                testID={`m1-pay-${d.partyId}`}
                label={partyName(store, d.partyId)}
                value={fill(s('m1.pay.value'), { n: d.medianDays })}
                display={display}
              />
            ))}
            <Note testID="m1-pay-note" text={s('m1.pay.note')} display={display} />
          </>
        )}
      </Card>

      <Card testID="m1-returns" title={s('m1.returns.title')} display={display}>
        {p.returnsTrend.map((w) => (
          <View key={w.to}>
            <Row
              testID={`m1-returns-${w.to}`}
              label={fill(s('m1.returns.returns'), { date: dateLine(w.to, s), n: w.returnCount })}
              amount={w.returns}
              display={display}
            />
            <Row
              testID={`m1-returns-${w.to}-adjustments`}
              label={fill(s('m1.returns.adjustments'), { n: w.adjustmentCount })}
              amount={w.adjustments}
              display={display}
            />
          </View>
        ))}
      </Card>
    </>
  );
}

export function Dashboard({
  store,
  plan = 'free',
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onBack = () => {},
  onRetry = () => {},
  onUpgrade,
  itemCards,
}: DashboardProps) {
  const t = tokens(display);
  const s = strings(language);
  const locked = readOnly(plan, 'dashboard');
  const closedDays = store.reports().closedDays;

  return (
    <Shell
      id="m1"
      s={s}
      display={display}
      status={status}
      titleKey="m1.title"
      // Nothing closed and no item recorded means nothing to show - but a free shop is told what Premium is first.
      empty={!locked && closedDays === 0 && (store.state.itemLines ?? []).length === 0}
      emptyKey="m1.empty"
      onRetry={onRetry}
      onBack={onBack}
    >
      {locked ? (
        <Card testID="m1-locked" title={s('m1.locked.title')} display={display}>
          <Note testID="m1-locked-body" text={s('m1.locked.body')} display={display} />
          {onUpgrade === undefined ? null : (
            <View style={{ padding: t.space.md }}>
              <PrimaryButton testID="m1-upgrade" label={s('m1.upgrade')} onPress={onUpgrade} variant="secondary" size="lg" display={display} />
            </View>
          )}
        </Card>
      ) : (
        <PremiumCards store={store} s={s} display={display} />
      )}

      {/* ===== ITEM CARDS SLOT (PR-2) - see `itemCards`. Empty until the items builder fills it. ===== */}
      {itemCards === undefined ? null : itemCards({ readOnly: locked, display, s })}

      <View style={{ height: t.space.md }} />
    </Shell>
  );
}
