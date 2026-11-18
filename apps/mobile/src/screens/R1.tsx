/**
 * R1 - REPORTS. The tab that is empty on purpose for the first day of a shop's
 * life, and the one screen whose empty state is the state most users see first.
 *
 * WHY THE EMPTY STATE IS THE DESIGN. S06 strategy S05's activation ladder has
 * the FIRST CLOSE "reveal Reports": until a day has actually been closed there
 * is no closed day to report on, and anything drawn here would be a figure
 * about a day the shopkeeper has not finished. So emptiness is derived from the
 * day records - a count of days whose state is `closed` - and never from a flag,
 * a count the screen keeps, or an entry count. A shop with forty entries and an
 * open day has nothing to report yet, and says so.
 *
 * EVERY FIGURE IS DERIVED ON READ, HERE AS EVERYWHERE. `store.primary()` and
 * `store.reports()` run the engine on each render; nothing on this screen is
 * stored, memoised or re-added. A reports screen is the obvious place to cache
 * a total - it is the one screen whose figures look like a summary - and that is
 * exactly why it is the worst place to start: a cached total is a second source
 * of truth, and the first time it disagrees with the entries the shopkeeper is
 * looking at a number nobody can explain. BE-10's cost was measured rather than
 * assumed, and is recorded in docs/spec/SCORES.md §7.
 *
 * WHAT IS ON IT, BY THE FIVE OUTPUT LEVELS OF docs/spec/SCORES.md §6.
 *   Level 1, what happened - days closed, sales, expenses, owed to you.
 *   Level 2, what is changing - BI1 profit trend, BI2 sales variation.
 *   Level 3, where pressure is building - BI3, BI4, BI6.
 *   Then the two scores, each as its separate published ratios, never one number.
 * BI5 has no card, by D5. Business Health has no number, by BE-07, and the
 * screen says so in a sentence rather than leaving a gap he would read as a bad
 * result. Every gated reading shows its gate sentence until it has the days -
 * never a zero, never an empty chart. Nothing here is an instruction.
 *
 * IT IS A TAB, SO IT CARRIES THE NAV AND HAS NO WAY BACK. SPEC-DIGEST C-5 rules
 * three destinations - Today, Parties, Reports - and this is the third. Nothing
 * is typed here, so §B.6's forbidden pair (a keypad beside a bottom navigation)
 * cannot arise; R1.test.tsx asserts both halves separately so neither can drift.
 */
import { View } from '@swafto/ui';
import { formatBasisPoints, type Ratio } from '@swafto/formula-engine';
import { Reading, Note, Gate } from '../components/ReportParts.tsx';
import { BasicReportCards } from '../components/BasicReports.tsx';
import {
  Shell,
  Row,
  Card,
  BottomNav,
  LinkRow,
  PrimaryButton,
  type TabKey,
  type LoadStatus,
} from '../components/Shell.tsx';
import { fill } from '../components/DayParts.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type Strings } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

export interface ReportsProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  /**
   * R1 IS A TAB, which is why this prop exists and `onBack` does not. A tab is
   * a destination, not a detail screen: the way out of it is another tab.
   */
  readonly onSelectTab?: (key: TabKey) => void;
  /** C1, Ask - one tap from here, and back here after (FR-8). */
  readonly onOpenChat?: () => void;
  readonly onRetry?: () => void;
  /** PR-6: the way to the Premium dashboard, M1. Absent, the row is not drawn. */
  readonly onOpenDashboard?: () => void;
}

const share = (r: Ratio): string => formatBasisPoints(r.basisPoints);

const ofDays = (s: Strings, r: Ratio): string =>
  fill(s('r1.ofDays'), { n: r.numeratorPaise, w: r.denominatorPaise });

export function Reports({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onSelectTab = () => {},
  onOpenChat = () => {},
  onRetry = () => {},
  onOpenDashboard,
}: ReportsProps) {
  const t = tokens(display);
  const s = strings(language);

  const primary = store.primary();
  const r = store.reports();
  const bi = r.intelligence;
  const cc = r.cashConfidence;
  const oc = r.operationalConsistency;

  /*
   * HOW MANY DAYS HAVE BEEN CLOSED - counted by the engine over the day records
   * this phone holds, including today's if it is closed. A store built in a test
   * holds one day, so there it is 0 or 1 and does not pretend otherwise.
   */
  const daysClosed = r.closedDays;

  return (
    <Shell
      id="r1"
      s={s}
      display={display}
      status={status}
      titleKey="r1.title"
      /*
       * NO HEADLINE FIGURE, deliberately. The bar would carry it in BOTH states,
       * so a shop that has closed nothing would read a hero sales figure above
       * the sentence saying reports are not open yet - the screen contradicting
       * itself in its own header.
       */
      empty={daysClosed === 0}
      emptyKey="r1.empty"
      onRetry={onRetry}
      nav={<BottomNav active="reports" onSelect={onSelectTab} s={s} display={display} />}
      /*
       * ASK IS IN THE BODY HEADER so it survives the empty state: before the
       * first close the shop can still ask how to close a day.
       */
      bodyHeader={
        <View style={{ paddingHorizontal: t.space.md, paddingTop: t.space.md }}>
          <PrimaryButton
            testID="r1-ask"
            label={s('c1.open')}
            display={display}
            variant="tonal"
            size="md"
            onPress={onOpenChat}
          />
        </View>
      }
    >
      {/* LEVEL 1 - what happened: the day count, then P4, P6 and P7 from `primary`. */}
      <Card testID="r1-figures" display={display}>
        {/*
          A COUNT, NOT MONEY - AND IT MUST NEVER BECOME A `<Money>`. A count of 2
          rendered by the money component reads as INR 0.02.
        */}
        <Reading
          testID="r1-days-closed"
          label={s('r1.daysClosed')}
          value={String(daysClosed)}
          display={display}
        />
        <Row
          testID="r1-total-sales"
          label={s('r1.totalSales')}
          amount={primary.p4NetSales.value}
          display={display}
        />
        <Row
          testID="r1-total-expenses"
          label={s('r1.totalExpenses')}
          amount={primary.p6TotalExpenses.value}
          display={display}
        />
        <Row
          testID="r1-credit-outstanding"
          label={s('r1.creditOutstanding')}
          amount={primary.p7CreditOutstanding.value}
          display={display}
        />
        <Note testID="r1-note" text={s('r1.note')} display={display} />
      </Card>

      {/* PR-6 - the one way to the Premium dashboard. A free shop sees there what it holds. */}
      {onOpenDashboard === undefined ? null : (
        <Card testID="r1-dashboard-card" display={display}>
          <LinkRow
            testID="r1-dashboard"
            label={s('rep.dashboard')}
            detail={s('rep.dashboard.detail')}
            onPress={onOpenDashboard}
            display={display}
          />
        </Card>
      )}

      {/* FR-7 - the free basic reports, in every plan. */}
      <BasicReportCards store={store} s={s} display={display} />

      {/* LEVEL 2 - what is changing. */}
      <Card testID="r1-changing" title={s('r1.changing')} display={display}>
        {bi.bi1ProfitTrend.available ? (
          <>
            <Reading
              testID="r1-bi1"
              label={s('r1.bi1')}
              value={s(`r1.bi1.${bi.bi1ProfitTrend.value.direction}`)}
              display={display}
            />
            <Row
              testID="r1-bi1-earlier"
              label={s('r1.bi1.earlier')}
              amount={bi.bi1ProfitTrend.value.firstHalfMean}
              directional
              display={display}
            />
            <Row
              testID="r1-bi1-later"
              label={s('r1.bi1.later')}
              amount={bi.bi1ProfitTrend.value.secondHalfMean}
              directional
              display={display}
            />
          </>
        ) : (
          <Gate testID="r1-bi1" label={s('r1.bi1')} gated={bi.bi1ProfitTrend} s={s} display={display} />
        )}
        {bi.bi2SalesConsistency.available ? (
          <Reading
            testID="r1-bi2"
            label={s('r1.bi2')}
            value={share(bi.bi2SalesConsistency.value)}
            display={display}
          />
        ) : (
          <Gate testID="r1-bi2" label={s('r1.bi2')} gated={bi.bi2SalesConsistency} s={s} display={display} />
        )}
      </Card>

      {/* LEVEL 3 - where pressure is building. */}
      <Card testID="r1-pressure" title={s('r1.pressure')} display={display}>
        {bi.bi3CashFlowStability.available ? (
          <>
            <Reading
              testID="r1-bi3"
              label={s('r1.bi3')}
              value={share(bi.bi3CashFlowStability.value.coefficientOfVariation)}
              display={display}
            />
            <Reading
              testID="r1-bi3-short"
              label={s('r1.bi3.short')}
              value={fill(s('r1.ofDays'), {
                n: bi.bi3CashFlowStability.value.deficitDayCount,
                w: r.windowClosedDays,
              })}
              display={display}
            />
          </>
        ) : (
          <Gate testID="r1-bi3" label={s('r1.bi3')} gated={bi.bi3CashFlowStability} s={s} display={display} />
        )}
        {bi.bi4WorkingCapitalPressure.available ? (
          <Reading
            testID="r1-bi4"
            label={s('r1.bi4')}
            value={share(bi.bi4WorkingCapitalPressure.value)}
            display={display}
          />
        ) : (
          <Gate testID="r1-bi4" label={s('r1.bi4')} gated={bi.bi4WorkingCapitalPressure} s={s} display={display} />
        )}
        {bi.bi6CreditConcentration.available ? (
          <>
            <Reading
              testID="r1-bi6"
              label={s('r1.bi6')}
              value={share(bi.bi6CreditConcentration.value.top3Share)}
              display={display}
            />
            <Reading
              testID="r1-bi6-direction"
              label={s('r1.bi6.compared')}
              value={s(`r1.bi6.${bi.bi6CreditConcentration.value.direction}`)}
              display={display}
            />
          </>
        ) : (
          <Gate testID="r1-bi6" label={s('r1.bi6')} gated={bi.bi6CreditConcentration} s={s} display={display} />
        )}
      </Card>

      {/* THE SCORES - each as its published ratios, never blended. */}
      <Card testID="r1-cc" title={s('r1.cc.title')} display={display}>
        {cc.available ? (
          <>
            <Reading
              testID="r1-cc-match"
              label={s('r1.cc.match')}
              value={ofDays(s, cc.value.exactMatch)}
              display={display}
            />
            <Reading
              testID="r1-cc-gap"
              label={s('r1.cc.gap')}
              value={share(cc.value.typicalGapShare)}
              display={display}
            />
          </>
        ) : (
          <Gate testID="r1-cc-match" label={s('r1.cc.match')} gated={cc} s={s} display={display} />
        )}
        <Note testID="r1-cc-not-yet" text={s('r1.cc.notYet')} display={display} />
      </Card>

      <Card testID="r1-oc" title={s('r1.oc.title')} display={display}>
        {oc.available ? (
          <>
            <Reading
              testID="r1-oc-closing"
              label={s('r1.oc.closing')}
              value={ofDays(s, oc.value.closingRate)}
              display={display}
            />
            <Reading
              testID="r1-oc-recording"
              label={s('r1.oc.recording')}
              value={share(oc.value.recordingCompleteness)}
              display={display}
            />
            <Reading
              testID="r1-oc-corrections"
              label={s('r1.oc.corrections')}
              value={share(oc.value.correctionRate)}
              display={display}
            />
          </>
        ) : (
          <Gate testID="r1-oc-closing" label={s('r1.oc.closing')} gated={oc} s={s} display={display} />
        )}
      </Card>

      {/* BUSINESS HEALTH - said, not shown (BE-07). */}
      <View style={{ marginBottom: t.space.md }}>
        <Card testID="r1-bh" display={display}>
          <Note testID="r1-bh-note" text={s('r1.bh')} display={display} />
        </Card>
      </View>
    </Shell>
  );
}
