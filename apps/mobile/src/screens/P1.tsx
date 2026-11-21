/**
 * P1 - PARTIES. "Customers and suppliers, with both outstanding totals."
 *
 * THE TWO QUESTIONS THIS SCREEN ANSWERS are who owes the shop and who the shop
 * owes, and they are deliberately not merged into one net figure. A shopkeeper
 * holding 12,000 of udhar and owing 11,000 to a wholesaler is not in the same
 * position as one holding 1,000 and owing nothing, and a single net number says
 * they are.
 *
 * WHAT THE PARTY ROWS SHOW (USABILITY item 5). Each row's figure is the
 * party's BALANCE over every day this phone holds - `Store.partyBalance`, the
 * R5 FR-1 figure P2 already shows - and the list is sorted by it, most owed
 * first. Today's change is a small second line, only when there was one. The
 * rows used to be today's movement under a "Change today" note, because no
 * per-party balance existed then; one does now, so the qualifier went with it.
 * The two headline figures stay P7 and P8 from the engine.
 *
 * THE TAB AND THE TITLE ARE ONE WORD. The tab said "Ledger" and the screen
 * said "Parties" (U-18); both now say what the tab says, in all three languages.
 *
 * NO AGING BADGES: `agedParties` needs the date the credit was given, which
 * lives in the carried record this store does not have. An empty space is
 * honest; "31+ days" over a date nobody holds is not.
 *
 * NO KEYPAD. Nothing is entered here - this is where he decides which party to
 * open. The sentence that used to follow, "therefore no bottom nav either", was
 * a misreading of §B.6, and this file rendered the contradiction for a while:
 * B.6 forbids a keypad BESIDE a nav, and SPEC-DIGEST C-5 rules that the nav
 * exists with three tabs, of which Parties is one. Having no keypad is what
 * ENTITLES this screen to the nav, not what denies it.
 */
import { View, Text, Pressable } from '@swafto/ui';
import {
  Shell,
  Row,
  Card,
  BottomNav,
  type TabKey,
  type LoadStatus,
} from '../components/Shell.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type Strings } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';
import { subtract, type Party, type Paise } from '@swafto/formula-engine';
import { Money } from '../components/Money.tsx';
import { balanceName, balanceWord } from '../components/PartyPicker.tsx';
import { syncOf } from '../components/DayParts.tsx';
import { Avatar } from '../components/Avatar.tsx';

export interface PartiesListProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onOpenParty?: (partyId: string) => void;
  /**
   * P1 IS A TAB, which is why this prop exists.
   *
   * SPEC-DIGEST C-5 rules three destinations and Parties is one of them.
   * Before this it was a bare text link at the foot of Today, reachable one
   * way and left only by the hardware key.
   */
  readonly onSelectTab?: (key: TabKey) => void;
  readonly onRetry?: () => void;
}

export function PartiesList({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onOpenParty = () => {},
  onSelectTab = () => {},
  onRetry = () => {},
}: PartiesListProps) {
  const t = tokens(display);
  const s = strings(language);

  const parties = store.state.parties;
  const primary = store.primary();

  /*
   * Split by the party's own `kind` rather than by which sections it appears in.
   * A supplier who has not been paid today still belongs under Suppliers, and a
   * list that hides a party because the day was quiet is a list he cannot trust
   * to be complete.
   */
  const customers = parties.filter((p) => p.kind === 'customer');
  const suppliers = parties.filter((p) => p.kind === 'supplier');

  /*
   * USABILITY item 5: WHO OWES ME, HOW MUCH - ANSWERED BY THE LIST ITSELF.
   * Each row was "Change today +₹0.00" with no balance anywhere and no order
   * (U-18). Now the balance over every day this phone holds is the biggest
   * thing on the row, the list is sorted by it (most owed first), and today's
   * change is a small line under the name, only when there was one. Every
   * figure is read from the store on render (`partyBalance`,
   * `partyMovementToday`); nothing is held or re-added here.
   */
  const byOwed = (group: readonly Party[]) =>
    group
      .map((p) => ({ party: p, balance: store.partyBalance(p.id) }))
      .sort((x, y) => (x.balance === y.balance ? 0 : x.balance > y.balance ? -1 : 1));

  const partyRows = (group: readonly Party[], prefix: string, kind: 'customer' | 'supplier') =>
    byOwed(group).map(({ party: p, balance }) => (
      <PartyRow
        key={p.id}
        testID={prefix + p.id}
        partyId={p.id}
        name={p.name}
        kind={kind}
        balance={balance}
        today={store.partyMovementToday(p.id)}
        s={s}
        display={display}
        onPress={() => onOpenParty(p.id)}
      />
    ));

  return (
    <Shell
      id="p1"
      s={s}
      display={display}
      status={status}
      titleKey="p1.title"
      headline={{ labelKey: 'p1.toCollect', amount: primary.p7CreditOutstanding.value }}
      // USABILITY item 8: what is safe, on every screen that holds the book.
      sync={syncOf(store)}
      empty={parties.length === 0}
      emptyKey="p1.empty"
      onRetry={onRetry}
      nav={
        /*
         * Nothing is typed on this screen, so the pair B.6 forbids - a
         * keypad beside a bottom navigation - cannot occur. P1.test.tsx
         * asserts both halves separately so neither can drift.
         */
        <BottomNav active="parties" onSelect={onSelectTab} s={s} display={display} />
      }
    >
      {/*
        THE TWO SHOP TOTALS, TOGETHER AND QUALIFIED.

        `p1.toCollect` is also the headline, and repeating it here is deliberate:
        the bar shows the one figure the screen is about, and this card is the
        PAIR, which is what makes either of them mean anything.
      */}
      {/*
        LIVE DEMO S3-6: BELOW ZERO IS AN ADVANCE, SAID IN WORDS. "You owe
        suppliers -₹300.00" sat beside Today's "Advance ₹300.00" for the same
        payment. The figure is the same engine figure; only the words and the
        sign change, as Today and the entry forms already do (QA-03).
      */}
      <Card testID="p1-totals" display={display} title={s('p1.shopTotals')}>
        <Row
          testID="p1-to-collect"
          label={s(primary.p7CreditOutstanding.value < 0 ? 'p1.advanceFromCustomers' : 'p1.toCollect')}
          amount={unsigned(primary.p7CreditOutstanding.value)}
          display={display}
        />
        <Row
          testID="p1-you-owe"
          label={s(primary.p8SupplierOutstanding.value < 0 ? 'p1.advanceToSuppliers' : 'p1.youOwe')}
          amount={unsigned(primary.p8SupplierOutstanding.value)}
          display={display}
        />
      </Card>

      {customers.length === 0 ? null : (
        <Card testID="p1-customers" display={display} title={s('p1.customers')}>
          {partyRows(customers, 'p1-customer-', 'customer')}
        </Card>
      )}

      {suppliers.length === 0 ? null : (
        <Card testID="p1-suppliers" display={display} title={s('p1.suppliers')}>
          {partyRows(suppliers, 'p1-supplier-', 'supplier')}
        </Card>
      )}
    </Shell>
  );
}

/** A balance below zero, as the size of the advance: the words carry the direction. */
const unsigned = (amount: Paise): Paise => (amount < 0 ? subtract(0, amount) : amount);

/**
 * ONE PERSON IN THE BOOK: the name large, what is owed larger, and today's
 * change small. A component rather than `Row`, because `Row` is one label and
 * one figure and this is a balance with a qualifier under the name.
 *
 * THE NAME WRAPS, NEVER ELIDES - a truncated Odia name on a credit line is
 * where guessing who it was costs somebody money. The spoken name is the
 * visible name followed by the balance in words (WCAG 2.5.3 and 4.1.2), so two
 * customers called Ramesh are two different things to a screen reader.
 */
function PartyRow({
  testID,
  partyId,
  name,
  kind,
  balance,
  today,
  s,
  display,
  onPress,
}: {
  readonly testID: string;
  readonly partyId: string;
  readonly name: string;
  readonly kind: 'customer' | 'supplier';
  readonly balance: Paise;
  readonly today: Paise;
  readonly s: Strings;
  readonly display: DisplayMode;
  readonly onPress: () => void;
}) {
  const t = tokens(display);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={balanceName(s, name, kind, balance)}
      onPress={onPress}
      android_ripple={{ color: t.color.brandSoft }}
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        // v2 3.5: a party row is the tallest list row - name, balance and the avatar.
        minHeight: t.control.xl,
        minWidth: t.touchTarget,
        paddingHorizontal: t.space.gutter,
        paddingVertical: t.space.sm,
        borderBottomWidth: t.hairline,
        borderBottomColor: t.color.border,
      }}
    >
      {/*
        v2 3.6: THE AVATAR - the first akshara on a tint chosen by the party's id,
        so re-sorting by what is owed never repaints a person. Decorative and
        hidden: the name beside it is what TalkBack reads. No chevron on this
        row (V2 3.5): name, balance and avatar need the width.
      */}
      <View style={{ marginRight: t.space.gutter }}>
        <Avatar partyId={partyId} name={name} display={display} />
      </View>
      <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: '40%', marginRight: t.space.sm }}>
        <Text
          testID={testID + '-name'}
          {...t.bodyText}
          style={{
            fontFamily: t.font.bold,
            fontSize: t.type.body,
            lineHeight: t.leadingUncapped(t.type.body),
            color: t.color.ink,
          }}
        >
          {name}
        </Text>
        {today === 0 ? null : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
            <Text
              {...t.bodyText}
              style={{
                marginRight: t.space.xs,
                fontFamily: t.font.regular,
                fontSize: t.type.label,
                lineHeight: t.leadingUncapped(t.type.label),
                color: t.color.inkMuted,
              }}
            >
              {s('p1.changedToday')}
            </Text>
            <Money testID={testID + '-today'} amount={today} mode={display} size="body" withSign tone="directional" />
          </View>
        )}
      </View>
      <View style={{ alignItems: 'flex-end', marginLeft: 'auto' }}>
        <Text
          {...t.bodyText}
          style={{
            fontFamily: t.font.regular,
            fontSize: t.type.label,
            lineHeight: t.leadingUncapped(t.type.label),
            color: t.color.inkMuted,
          }}
        >
          {s(balanceWord(kind, balance))}
        </Text>
        {/* QA-03: below zero is an advance, said in words above - the figure is its size. */}
        {/*
          `heading`, NOT `figure`, MEASURED (check:layout, 2026-11-20, with the
          shipped face actually loaded). Money grows without a cap, and a lakh
          balance at `figure` in Focus at font 2.0 is 322px - wider than the
          308px a card row has on a 360dp screen, so it ran out of the row on
          Linux and sat 1px from failing on Windows. A figure has no break
          opportunity; the only honest room is a step down the type scale.
          `heading` is still larger than the name and today's change, so the
          balance stays the biggest thing in the row (USABILITY item 5), and the
          same figure now has about 30px to spare.
        */}
        <Money
          testID={testID + '-balance'}
          amount={balance < 0 ? subtract(0, balance) : balance}
          mode={display}
          size="heading"
        />
      </View>
    </Pressable>
  );
}
