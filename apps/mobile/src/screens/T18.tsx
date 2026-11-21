/**
 * T18 - RETURN OR EXCHANGE A SALE (review §6-§7, EX-1 to EX-12).
 *
 * NOT T15. The build map's T15 is "Past day - read-only", a different screen;
 * one id meaning two would let this screen tick off that one's eight children.
 *
 * THREE FACES, ONE SCREEN, chosen by the session's `returnFlow`:
 *   - the LIST: recent sales that can still come back, and returns still owed
 *   - the RETURN form: one sale, how it was settled, what came back
 *   - the SETTLE form: a pending return, paid back now in full or in part
 *
 * EVERY AMOUNT IS TYPED. The value of what came back is never prefilled from the
 * sale - a sale of ₹900 may come back as one ₹300 item, and a figure the app put
 * there is a figure nobody typed. The exchange DIFFERENCE is the one figure this
 * screen shows that he did not type, and it is arithmetic on the two he did
 * (`subtract`), not a guess.
 *
 * EVERY STATE IS THE ENGINE'S FOLD (`store.settlement`), read on render. Nothing
 * here decides whether a return is pending; the legs that exist say so.
 *
 * THIS SCREEN WRITES NOTHING. Save leaves as a callback; the session builds the
 * rows through `buildReturnEvent`, and the store appends them all or none.
 */
import { View, Text, Pressable } from '@swafto/ui';
import { formatPaise, returnableOf, subtract, type Entry, type Paise } from '@swafto/formula-engine';
import { timeOf } from '../components/EntryForm.tsx';
import { Money } from '../components/Money.tsx';
import { Keypad, type KeypadKey } from '../components/Keypad.tsx';
import { Shell, Card, Row, Segmented, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { PartyPicker, type NewPartyControls } from '../components/PartyPicker.tsx';
import { Quiet, dateLine, fill } from '../components/DayParts.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type StringKey, type Strings } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';
import type { ReturnFlow } from '../app/session.tsx';

type Choice = ReturnFlow['settlement'];
type MoneyMode = ReturnFlow['differenceMode'];

const SETTLEMENT_OPTIONS: readonly { readonly key: Choice; readonly labelKey: StringKey }[] = [
  { key: 'cash', labelKey: 't18.opt.cash' },
  { key: 'upi', labelKey: 't18.opt.upi' },
  { key: 'udhar', labelKey: 't18.opt.udhar' },
  { key: 'pending', labelKey: 't18.opt.pending' },
  { key: 'exchange', labelKey: 't18.opt.exchange' },
];

const MONEY_OPTIONS: readonly { readonly key: MoneyMode; readonly labelKey: StringKey }[] = [
  { key: 'cash', labelKey: 'formA.mode.cash' },
  { key: 'upi', labelKey: 'formA.mode.upi' },
  { key: 'udhar', labelKey: 'formA.mode.udhar' },
];

/** Settling a pending return: udhar here is "Credit issued", review §7's word for it. */
const SETTLE_OPTIONS: readonly { readonly key: MoneyMode; readonly labelKey: StringKey }[] = [
  { key: 'cash', labelKey: 't18.opt.cash' },
  { key: 'upi', labelKey: 't18.opt.upi' },
  { key: 'udhar', labelKey: 't18.opt.udhar' },
];

export interface ReturnOrExchangeProps {
  readonly store: Store;
  /** The session's `returnFlow`. Null or absent is the list. */
  readonly flow?: ReturnFlow | null;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onRetry?: () => void;
  readonly onBack?: (() => void) | undefined;
  readonly onKey?: (key: KeypadKey) => void;
  readonly onChooseSale?: (saleId: string) => void;
  readonly onChooseSettle?: (returnId: string) => void;
  readonly onSettlement?: (choice: Choice) => void;
  readonly onField?: (field: ReturnFlow['field']) => void;
  readonly onDifferenceMode?: (mode: MoneyMode) => void;
  readonly onSettleMode?: (mode: MoneyMode) => void;
  readonly onSave?: () => void;
  readonly onSettle?: () => void;
  /** The customer, when the sale names none and the settlement needs one. */
  readonly entryPartyId?: string | null;
  readonly pickingParty?: boolean;
  readonly onOpenPartyPicker?: () => void;
  readonly onChooseParty?: (partyId: string) => void;
  readonly onCancelPartyPicker?: () => void;
  readonly newParty?: NewPartyControls | undefined;
}

const noop = () => {};

/** "Cash sales · Wed 15 Jul · Ramesh" - what a row is, in words he wrote down. */
const describe = (e: Entry, s: Strings, parties: ReadonlyMap<string, string>): string =>
  [
    s(('section.' + e.section) as StringKey),
    dateLine(e.dayId, s),
    e.partyId === undefined ? '' : (parties.get(e.partyId) ?? ''),
  ]
    .filter((x) => x !== '')
    .join(' · ');

export function ReturnOrExchange({
  store,
  flow = null,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onRetry = noop,
  onBack,
  onKey = noop,
  onChooseSale = noop,
  onChooseSettle = noop,
  onSettlement = noop,
  onField = noop,
  onDifferenceMode = noop,
  onSettleMode = noop,
  onSave = noop,
  onSettle = noop,
  entryPartyId = null,
  pickingParty = false,
  onOpenPartyPicker = noop,
  onChooseParty = noop,
  onCancelPartyPicker = noop,
  newParty,
}: ReturnOrExchangeProps) {
  const t = tokens(display);
  const s = strings(language);
  const parties = new Map(store.state.parties.map((p) => [p.id, p.name]));

  const sale = flow?.saleId ? store.findEntry(flow.saleId) : undefined;
  const ret = flow?.settleId ? store.findEntry(flow.settleId) : undefined;

  const shell = {
    id: 't18',
    s,
    display,
    status,
    titleKey: 't18.title',
    onRetry,
    onBack,
  } as const;

  const sentence = (testID: string, key: StringKey, negative = false) => (
    <Text
      testID={testID}
      maxFontSizeMultiplier={t.maxFontScale}
      style={{
        marginHorizontal: t.space.md,
        marginTop: t.space.sm,
        fontFamily: t.font.regular,
        fontSize: t.type.body,
        lineHeight: t.leading(t.type.body),
        color: negative ? t.color.negative : t.color.inkMuted,
      }}
    >
      {s(key)}
    </Text>
  );

  /*
   * THE DRAFT ROW: the label, the figure he is building, and the button that
   * files it - EntryForm's draft row, because the number and the button that
   * commits it are one sentence.
   *
   * ONE ROW, EVEN ON AN EXCHANGE. Two amount rows stacked in the footer put the
   * keypad 91px below the fold at the chrome cap in the longest strings -
   * `check:layout` measured it. So the footer holds only the amount the keypad
   * is filling; both figures, and the choice between them, live in the body,
   * which scrolls and costs the keypad nothing.
   */
  const draftRow = (labelKey: StringKey, amount: Paise | null, action: {
    readonly label: string;
    readonly disabled: boolean;
    readonly onPress: () => void;
  }) => (
    <View
      testID="t18-draft"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        paddingHorizontal: t.space.md,
        paddingVertical: t.space.sm,
        backgroundColor: t.color.surface,
        borderTopWidth: t.hairline,
        borderTopColor: t.color.borderStrong,
      }}
    >
      <View style={{ flexShrink: 1, marginRight: t.space.sm }}>
        <Text
          testID="t18-draft-label"
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            fontFamily: t.font.regular,
            fontSize: t.type.label,
            lineHeight: t.leading(t.type.label),
            color: t.color.inkMuted,
          }}
        >
          {s(labelKey)}
        </Text>
        <Money testID="t18-draft-amount" amount={amount ?? 0} mode={display} size="figure" />
      </View>
      <PrimaryButton
        testID="t18-save"
        label={action.label}
        display={display}
        size="md"
        disabled={action.disabled}
        onPress={action.onPress}
      />
    </View>
  );

  /* ---------------------------------------------------------------- *
   * SETTLE: a pending return, paid back now
   * ---------------------------------------------------------------- */
  if (ret !== undefined) {
    const st = store.settlement(ret);
    const typed = flow?.returned ?? null;
    const tooMuch = typed !== null && typed > st.outstanding;
    return (
      <Shell
        {...shell}
        footer={
          <>
            {draftRow('t18.settleAmount', typed, {
              label: s('common.save'),
              disabled: typed === null || tooMuch,
              onPress: onSettle,
            })}
            <Keypad onKey={onKey} s={s} mode={display} />
          </>
        }
      >
        <Card testID="t18-return" display={display}>
          <Row testID="t18-return-line" label={describe(ret, s, parties)} amount={ret.amount} display={display} />
          <Row testID="t18-outstanding" label={s('t18.outstanding')} amount={st.outstanding} display={display} />
        </Card>
        {sentence('t18-settle-how', 't18.settleHow')}
        <Segmented
          testID="t18-settle-mode"
          options={SETTLE_OPTIONS.map((o) => ({ key: o.key, label: s(o.labelKey) }))}
          value={flow?.settleMode ?? 'cash'}
          onChange={onSettleMode}
          display={display}
          // "Refund cash" / "Refund UPI" are phrases; a third of the tray clipped one word of them.
          columns={2}
        />
        {tooMuch ? sentence('t18-too-much', 't18.tooMuchSettle', true) : null}
      </Shell>
    );
  }

  /* ---------------------------------------------------------------- *
   * RETURN: one sale, how it was settled, what came back
   * ---------------------------------------------------------------- */
  if (sale !== undefined && flow !== null) {
    const returnable = returnableOf(sale, store.entriesReferringTo(sale.id));
    const exchange = flow.settlement === 'exchange';
    const returned = flow.returned;
    const replacement = flow.replacement;
    /* The difference is arithmetic on two typed figures, and nothing else. */
    const diff = exchange && returned !== null && replacement !== null ? subtract(replacement, returned) : null;
    const owedBack = diff !== null && diff < 0 ? subtract(0, diff) : (diff ?? 0);

    /*
     * WHO, ONLY WHERE THE EVENT CREATES A LIABILITY TO A PERSON: credit issued,
     * a refund still owed, or a difference left on udhar. The engine refuses the
     * same three (`partyRule`, `buildReturnEvent`); asking first is what keeps
     * the tap from being one that can only fail.
     */
    const needsParty =
      flow.settlement === 'udhar' ||
      flow.settlement === 'pending' ||
      (diff !== null && diff !== 0 && flow.differenceMode === 'udhar');
    const askParty = needsParty && sale.partyId === undefined;
    const partyName = entryPartyId === null ? null : (parties.get(entryPartyId) ?? null);
    const partyMissing = askParty && partyName === null;
    const tooMuch = returned !== null && returned > returnable;

    const save = {
      label: s('t18.save'),
      disabled: returned === null || tooMuch || partyMissing || (exchange && replacement === null),
      onPress: onSave,
    };

    return (
      <Shell
        {...shell}
        overlay={
          pickingParty ? (
            <PartyPicker
              testID="t18-picker"
              store={store}
              s={s}
              kind="customer"
              display={display}
              onChoose={onChooseParty}
              onCancel={onCancelPartyPicker}
              newParty={newParty}
            />
          ) : null
        }
        footer={
          <>
            {exchange && flow.field === 'replacement'
              ? draftRow('t18.replacement', replacement, save)
              : draftRow('t18.returned', returned, save)}
            <Keypad onKey={onKey} s={s} mode={display} />
          </>
        }
      >
        <Card testID="t18-sale" display={display} title={s('t18.sale')}>
          <Row testID="t18-sale-line" label={describe(sale, s, parties)} amount={sale.amount} display={display} />
          {returnable === sale.amount ? null : (
            <Row testID="t18-returnable" label={s('t18.returnable')} amount={returnable} display={display} />
          )}
        </Card>

        {sentence('t18-how', 't18.how')}
        <Segmented
          testID="t18-settlement"
          options={SETTLEMENT_OPTIONS.map((o) => ({ key: o.key, label: s(o.labelKey) }))}
          value={flow.settlement}
          onChange={onSettlement}
          display={display}
          columns={2}
        />

        {/*
          AN EXCHANGE HAS TWO FIGURES ON ONE KEYPAD. Both are shown here, as
          typed, and the segment says which one the keypad is filling - selected
          by fill, weight and `accessibilityState`, never by colour alone. Each
          keeps its own digits in the session, so switching never retypes one.
        */}
        {exchange ? (
          <>
            <Card testID="t18-amounts" display={display}>
              <Row testID="t18-returned" label={s('t18.returned')} amount={returned ?? 0} display={display} />
              <Row
                testID="t18-replacement"
                label={s('t18.replacement')}
                amount={replacement ?? 0}
                display={display}
              />
            </Card>
            <Segmented
              testID="t18-field"
              options={[
                { key: 'returned' as const, label: s('t18.returned') },
                { key: 'replacement' as const, label: s('t18.replacement') },
              ]}
              value={flow.field}
              onChange={onField}
              display={display}
            />
          </>
        ) : null}

        {diff === null ? null : (
          <Card testID="t18-difference" display={display}>
            <Row
              testID="t18-difference-line"
              label={s(diff > 0 ? 't18.diffFrom' : diff < 0 ? 't18.diffTo' : 't18.diffNone')}
              amount={owedBack}
              display={display}
            />
          </Card>
        )}
        {diff === null || diff === 0 ? null : (
          <>
            {sentence('t18-diff-how', 't18.diffHow')}
            <Segmented
              testID="t18-difference-mode"
              options={MONEY_OPTIONS.map((o) => ({ key: o.key, label: s(o.labelKey) }))}
              value={flow.differenceMode}
              onChange={onDifferenceMode}
              display={display}
            />
          </>
        )}

        {askParty ? (
          <Pressable
            testID="t18-party"
            accessibilityRole="button"
            accessibilityLabel={partyName ?? s('party.chooseCustomer')}
            onPress={onOpenPartyPicker}
            android_ripple={{ color: t.color.brandSoft }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              minHeight: t.control.lg,
              minWidth: t.touchTarget,
              marginHorizontal: t.space.md,
              marginTop: t.space.sm,
              paddingHorizontal: t.space.md,
              borderRadius: t.radius.md,
              backgroundColor: t.color.surface,
              borderWidth: t.hairline,
              borderColor: t.color.inkMuted,
            }}
          >
            <Text
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                marginRight: t.space.sm,
                fontFamily: t.font.regular,
                fontSize: t.type.label,
                lineHeight: t.leading(t.type.label),
                color: t.color.inkMuted,
              }}
            >
              {s('party.customer')}
            </Text>
            <Text
              testID="t18-party-value"
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                flexShrink: 1,
                fontFamily: t.font.medium,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: partyName === null ? t.color.brandSoft : t.color.ink,
                textAlign: 'right',
              }}
            >
              {partyName ?? s('party.chooseCustomer')}
            </Text>
          </Pressable>
        ) : null}
        {partyMissing ? sentence('t18-party-required', 'party.required', true) : null}
        {tooMuch ? sentence('t18-too-much', 't18.tooMuch', true) : null}
        {sentence('t18-confirm', 't18.confirm')}
      </Shell>
    );
  }

  /* ---------------------------------------------------------------- *
   * LIST: what can come back, and what is still owed
   * ---------------------------------------------------------------- */
  const sales = store
    .recentSales()
    .map((e) => ({ e, returnable: returnableOf(e, store.entriesReferringTo(e.id)) }))
    // A sale returned in full is not offered: there is nothing left to bring back.
    .filter((x) => x.returnable > 0);
  const pending = store
    .recentReturns()
    .map((e) => ({ e, st: store.settlement(e) }))
    .filter((x) => x.st.state === 'pending_settlement');
  const recorded = flow?.recordedId ? store.findEntry(flow.recordedId) : undefined;

  return (
    <Shell
      {...shell}
      empty={sales.length === 0 && pending.length === 0}
      emptyKey="t18.empty"
      bodyHeader={
        recorded === undefined || recorded.section !== 'sales_return' ? null : (
          <View style={{ marginHorizontal: t.space.md, marginTop: t.space.md }}>
            <Quiet
              testID="t18-recorded"
              text={fill(s('t18.recorded'), {
                state: s(('settlement.' + store.settlement(recorded).state) as StringKey),
              })}
              display={display}
            />
          </View>
        )
      }
    >
      {sales.length === 0 ? null : (
        <Card testID="t18-sales" display={display} title={s('t18.sales')}>
          {sales.map(({ e, returnable }) => (
            <Row
              key={e.id}
              testID={'t18-sale-' + e.id}
              /*
               * WCAG 4.1.2 (USABILITY W6): sixty rows read "Cash sales - Thursday
               * 19 November" and all announced the same. The time it was typed
               * is on the face now, and the amount is in the spoken name.
               */
              label={describe(e, s, parties) + timeOf(e.createdAt) + (returnable === e.amount ? '' : ' · ' + s('t18.partReturned'))}
              accessibleLabel={[describe(e, s, parties) + timeOf(e.createdAt), formatPaise(returnable)].join(', ')}
              amount={returnable}
              display={display}
              onPress={() => onChooseSale(e.id)}
            />
          ))}
        </Card>
      )}
      {pending.length === 0 ? null : (
        <Card testID="t18-pending" display={display} title={s('t18.pending')}>
          {pending.map(({ e, st }) => (
            <Row
              key={e.id}
              testID={'t18-pending-' + e.id}
              label={describe(e, s, parties) + timeOf(e.createdAt)}
              accessibleLabel={[describe(e, s, parties) + timeOf(e.createdAt), formatPaise(st.outstanding)].join(', ')}
              amount={st.outstanding}
              display={display}
              onPress={() => onChooseSettle(e.id)}
            />
          ))}
        </Card>
      )}
    </Shell>
  );
}
