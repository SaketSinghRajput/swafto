/**
 * PR-2 - THE ITEM CARDS, for the Premium dashboard (M1) to drop in.
 *
 * PURE: each card takes data ALREADY COMPUTED by the engine (`Store.itemReports`
 * or `itemReports` in @swafto/formula-engine) plus the plan, and computes nothing
 * that is a figure. No store, no clock.
 *
 * COVERAGE GOES BESIDE EVERY ITEM FIGURE. Each card carries the coverage line,
 * so a card lifted out on its own still says how much of the sales value its
 * figures are drawn from.
 *
 * THE GATE. `allows(plan, 'itemReports')` decides whether the cards are a Premium
 * feature in use; on a free plan the cards still render whatever was recorded
 * under Premium (R4 §7, nothing is hidden on lapse), marked read-only, and render
 * nothing at all when there is nothing recorded.
 *
 * WORDS. Every estimate says "estimate" and its method; "slow" says it is how
 * often an item sold, never what is on the shelf (R5 decision 3).
 */
import { View, Text } from '@swafto/ui';
import type { ItemReports, ItemTotal, ShopItem } from '@swafto/formula-engine';
import { Card, Row } from './Shell.tsx';
import { fill } from './DayParts.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type StringKey } from '../i18n/strings.ts';
import { allows, type Plan } from '../app/plan.ts';

export interface ItemCardsProps {
  readonly reports: ItemReports;
  readonly items: readonly ShopItem[];
  readonly plan?: Plan;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  /** "What a named customer usually buys": already computed, with his name. */
  readonly customer?: { readonly name: string; readonly totals: readonly ItemTotal[] } | undefined;
}

type CardBase = Omit<ItemCardsProps, 'customer'>;

/** A whole percent from basis points, for the coverage sentence. Not money. */
const percent = (bp: number | null): number => (bp === null ? 0 : Math.round(bp / 100));

/** A count in tenths, written with one decimal ("17" is "1.7"). A count, never money. */
const tenths = (n: number): string => String(Math.trunc(n / 10)) + '.' + String(n % 10);

const nameOf = (items: readonly ShopItem[], id: string | null, other: string) =>
  (id === null ? undefined : items.find((i) => i.id === id)?.name) ?? other;

function Note({ testID, text, display }: { testID: string; text: string; display: DisplayMode }) {
  const t = tokens(display);
  return (
    <Text
      testID={testID}
      maxFontSizeMultiplier={t.maxFontScale}
      style={{
        paddingHorizontal: t.space.md,
        paddingVertical: t.space.sm,
        fontFamily: t.font.regular,
        fontSize: t.type.body,
        lineHeight: t.leading(t.type.body),
        color: t.color.inkMuted,
      }}
    >
      {text}
    </Text>
  );
}

/** The coverage line and, on a lapsed plan, the read-only line. Under every card. */
function Footer({ reports, plan = 'free', language = 'en', display = 'comfort', id }: CardBase & { id: string }) {
  const s = strings(language);
  return (
    <View>
      <Note
        testID={id + '-coverage'}
        display={display}
        text={fill(s('items.coverage'), { pct: percent(reports.coverage.basisPoints) })}
      />
      {allows(plan, 'itemReports') ? null : <Note testID={id + '-readonly'} display={display} text={s('items.readOnly')} />}
    </View>
  );
}

/** Nothing recorded and not Premium: the card is absent, not an empty promise. */
const absent = (p: CardBase) => !allows(p.plan ?? 'free', 'itemReports') && p.reports.coverage.numeratorPaise === 0;

function TotalsCard(p: CardBase & { id: string; titleKey: StringKey; rows: readonly ItemTotal[]; noteKey?: StringKey }) {
  const display = p.display ?? 'comfort';
  const s = strings(p.language ?? 'en');
  if (absent(p)) return null;
  return (
    <Card testID={p.id} display={display} title={s(p.titleKey)}>
      {p.rows.length === 0 ? <Note testID={p.id + '-none'} display={display} text={s('items.none')} /> : null}
      {p.rows.map((r) => (
        <Row
          key={String(r.itemId)}
          testID={p.id + '-' + String(r.itemId)}
          label={nameOf(p.items, r.itemId, s('i1.other')) + ' · ' + fill(s('items.sales'), { n: r.sales })}
          amount={r.value}
          display={display}
        />
      ))}
      {p.noteKey === undefined ? null : <Note testID={p.id + '-note'} display={display} text={s(p.noteKey)} />}
      <Footer {...p} />
    </Card>
  );
}

export const TopItemsCard = (p: CardBase & { by?: 'value' | 'count' }) => (
  <TotalsCard
    {...p}
    id={p.by === 'count' ? 'items-top-count' : 'items-top-value'}
    titleKey={p.by === 'count' ? 'items.topCount' : 'items.topValue'}
    rows={p.by === 'count' ? p.reports.topByCount : p.reports.topByValue}
  />
);

export const SlowItemsCard = (p: CardBase) => (
  <TotalsCard {...p} id="items-slow" titleKey="items.slow" rows={p.reports.slow} noteKey="items.slowNote" />
);

export function CustomerItemsCard(p: CardBase & { name: string; totals: readonly ItemTotal[] }) {
  return <TotalsCard {...p} id="items-customer" titleKey="items.customer" rows={p.totals} />;
}

export function ItemPairsCard(p: CardBase) {
  const display = p.display ?? 'comfort';
  const s = strings(p.language ?? 'en');
  if (absent(p)) return null;
  const pairs = p.reports.pairs;
  const other = s('i1.other');
  return (
    <Card testID="items-pairs" display={display} title={s('items.pairs')}>
      {!pairs.available ? (
        <Note
          testID="items-pairs-gate"
          display={display}
          text={fill(s('items.pairsGate'), { required: pairs.required, soFar: pairs.soFar })}
        />
      ) : pairs.value.pairs.length === 0 ? (
        <Note testID="items-pairs-none" display={display} text={s('items.pairsNone')} />
      ) : (
        pairs.value.pairs.map((x) => (
          <Note
            key={x.a + x.b}
            testID={'items-pair-' + x.a + '-' + x.b}
            display={display}
            text={fill(s('items.pairLine'), {
              a: nameOf(p.items, x.a, other),
              b: nameOf(p.items, x.b, other),
              n: x.support,
            })}
          />
        ))
      )}
      <Footer {...p} id="items-pairs" />
    </Card>
  );
}

export function ItemDemandCard(p: CardBase) {
  const display = p.display ?? 'comfort';
  const s = strings(p.language ?? 'en');
  if (absent(p)) return null;
  const other = s('i1.other');
  return (
    <Card testID="items-demand" display={display} title={s('items.demand')}>
      {p.reports.demand.map(({ itemId, result }) => (
        <Note
          key={itemId}
          testID={'items-demand-' + itemId}
          display={display}
          text={
            result.available
              ? fill(s('items.demandLine'), {
                  name: nameOf(p.items, itemId, other),
                  q: tenths(result.value.perWeekTenths),
                })
              : fill(s('items.demandGate'), { name: nameOf(p.items, itemId, other), n: result.soFar, required: result.required })
          }
        />
      ))}
      <Note testID="items-demand-method" display={display} text={s('items.demandMethod')} />
      <Footer {...p} id="items-demand" />
    </Card>
  );
}

/** Every item card in one column, in the order a shopkeeper reads them. */
export function ItemCards(p: ItemCardsProps) {
  return (
    <View testID="item-cards">
      <TopItemsCard {...p} by="value" />
      <TopItemsCard {...p} by="count" />
      <SlowItemsCard {...p} />
      {p.customer === undefined ? null : <CustomerItemsCard {...p} name={p.customer.name} totals={p.customer.totals} />}
      <ItemPairsCard {...p} />
      <ItemDemandCard {...p} />
    </View>
  );
}
