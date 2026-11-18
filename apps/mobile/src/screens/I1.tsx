/**
 * I1 - ITEMS IN A SALE (PR-1, Premium). Reached from the sales form; back returns there.
 *
 * OPTIONAL, AND AFTER THE SALE. The sale is already in the book when he gets
 * here, so nothing on this screen can hold up saving a sale or closing the day.
 * He picks one of today's sales, then one of HIS OWN items (or "Other"), then
 * types how many and for how much. Nothing is pre-chosen and nothing is
 * pre-filled: no price is stored, so none can be offered (no inference in data
 * entry).
 *
 * NEVER MORE THAN THE SALE. The screen says what the sale's items come to so far
 * beside the sale - "items recorded for 300 of 500" - and the store refuses a
 * line that would take it past the sale.
 *
 * ABSENT ON A FREE PLAN. The session never opens it there; if it is rendered
 * anyway it says Premium and offers nothing to press.
 */
import type { ReactNode } from 'react';
import { View, Text, Pressable } from '@swafto/ui';
import { ITEM_SALE_SECTIONS, formatPaise, saleItemised, type Entry } from '@swafto/formula-engine';
import { timeOf } from '../components/EntryForm.tsx';
import { Shell, Card, Row, PrimaryButton, Segmented, type LoadStatus } from '../components/Shell.tsx';
import { Keypad, type KeypadKey } from '../components/Keypad.tsx';
import { Money } from '../components/Money.tsx';
import { fill } from '../components/DayParts.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type StringKey, type Strings } from '../i18n/strings.ts';
import { allows, type Plan } from '../app/plan.ts';
import type { ItemFlow } from '../app/session.tsx';
import type { Store } from '../store/index.ts';

export interface ItemsForSaleProps {
  readonly store: Store;
  readonly plan?: Plan;
  readonly flow?: ItemFlow | null;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onChooseSale?: (saleId: string) => void;
  readonly onChooseItem?: (itemId: string) => void;
  /** HT-61: clears the picked item, keeping what was typed. */
  readonly onChangeItem?: () => void;
  readonly onField?: (field: ItemFlow['field']) => void;
  readonly onKey?: (key: KeypadKey) => void;
  readonly onSave?: () => void;
  readonly onRetry?: () => void;
  readonly onBack?: (() => void) | undefined;
}

const describe = (e: Entry, s: Strings, store: Store): string =>
  [s(('section.' + e.section) as StringKey), store.state.parties.find((p) => p.id === e.partyId)?.name ?? '']
    .filter((x) => x !== '')
    .join(' · ');

export function ItemsForSale({
  store,
  plan = 'free',
  flow = null,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onChooseSale = () => {},
  onChooseItem = () => {},
  onChangeItem = () => {},
  onField = () => {},
  onKey = () => {},
  onSave = () => {},
  onRetry = () => {},
  onBack,
}: ItemsForSaleProps) {
  const t = tokens(display);
  const s = strings(language);
  const premium = allows(plan, 'items');
  const closed = store.state.day.state === 'closed';
  const sales = store.state.entries.filter((e) => ITEM_SALE_SECTIONS.includes(e.section));
  const sale = flow?.saleId ? sales.find((e) => e.id === flow.saleId) : undefined;
  const lines = sale ? store.saleLines(sale.id) : [];
  const items = store.items;
  const nameOf = (id: string | undefined) =>
    id === undefined ? s('i1.other') : (items.find((i) => i.id === id)?.name ?? s('i1.other'));
  const typing = premium && !closed && sale !== undefined && flow !== null;
  // HT-51: the switch, the figures and the keypad come once an item is picked.
  const picked = typing && flow.itemId !== null;
  const canSave =
    typing &&
    flow.itemId !== null &&
    flow.quantity !== null &&
    flow.quantity > 0 &&
    flow.amount !== null &&
    flow.amount > 0;
  // Pass 9: an amount with no "How many" leaves Save off - say why, never fill it in.
  const needQuantity =
    picked && flow.amount !== null && flow.amount > 0 && (flow.quantity === null || flow.quantity <= 0);

  const text = (testID: string, value: string, muted = true) => (
    <Text
      key={testID}
      testID={testID}
      maxFontSizeMultiplier={t.maxFontScale}
      style={{
        paddingHorizontal: t.space.md,
        paddingVertical: t.space.sm,
        fontFamily: t.font.regular,
        fontSize: t.type.body,
        lineHeight: t.leading(t.type.body),
        color: muted ? t.color.inkMuted : t.color.ink,
      }}
    >
      {value}
    </Text>
  );

  // A word inside a padded row: the row owns the inset (HT-58).
  const inline = (testID: string, value: string) => (
    <Text
      key={testID}
      testID={testID}
      maxFontSizeMultiplier={t.maxFontScale}
      style={{
        marginRight: t.space.xs,
        fontFamily: t.font.regular,
        fontSize: t.type.body,
        lineHeight: t.leading(t.type.body),
        color: t.color.inkMuted,
      }}
    >
      {value}
    </Text>
  );

  const body: ReactNode[] = [];
  if (!premium) {
    body.push(text('i1-premium', s('i1.premium')));
  } else if (sale === undefined) {
    body.push(text('i1-optional', s('i1.optional')));
    body.push(
      <Card key="sales" testID="i1-sales" display={display} title={s('i1.pickSale')}>
        {sales.map((e) => (
          <Row
            key={e.id}
            testID={'i1-sale-' + e.id}
            // WCAG 4.1.2 (W6): the time on the face, the amount in the spoken name.
            label={describe(e, s, store) + timeOf(e.createdAt)}
            accessibleLabel={[describe(e, s, store) + timeOf(e.createdAt), formatPaise(e.amount)].join(', ')}
            amount={e.amount}
            display={display}
            onPress={() => onChooseSale(e.id)}
          />
        ))}
      </Card>,
    );
  } else {
    const so = saleItemised(sale, lines);
    body.push(
      <Card key="sale" testID="i1-sale" display={display}>
        <Row testID="i1-sale-line" label={describe(sale, s, store)} amount={sale.amount} display={display} />
        {/*
          HT-58: THE PADDING IS ON THE ROW, NOT ON ITS WORDS. Each word carried
          its own inset and the figures none, so a figure that wrapped started
          flush with the card's edge. Now every piece, wrapped or not, starts
          inside the same padding.
        */}
        <View
          testID="i1-recorded"
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            paddingHorizontal: t.space.md,
            paddingVertical: t.space.sm,
          }}
        >
          {inline('i1-recorded-label', s('i1.recorded'))}
          <View style={{ marginRight: t.space.xs }}>
            <Money testID="i1-recorded-itemised" amount={so.itemised} mode={display} size="body" />
          </View>
          {inline('i1-recorded-of', s('i1.of'))}
          <Money testID="i1-recorded-sale" amount={so.sale} mode={display} size="body" />
        </View>
        {lines.map((l) => (
          <Row
            key={l.id}
            testID={'i1-line-' + l.id}
            label={nameOf(l.itemId) + ' ' + fill(s('i1.times'), { n: l.quantity })}
            amount={l.amount}
            display={display}
          />
        ))}
      </Card>,
    );
    if (typing) {
      body.push(text('i1-prompt', s('i1.item'), false));
      if (items.length === 0) body.push(text('i1-nolist', s('i1.noList')));
      const choices = [...items.map((i) => ({ id: i.id, label: i.name })), { id: 'other', label: s('i1.other') }];
      body.push(
        // A column, like T19's list: a long item name wraps inside its row, never off the edge.
        <View key="choices" testID="i1-choices" style={{ paddingHorizontal: t.space.sm }}>
          {choices.map((c) => {
            const on = flow.itemId === c.id;
            return (
              <Pressable
                key={c.id}
                testID={'i1-item-' + c.id}
                accessibilityRole="radio"
                accessibilityLabel={c.label}
                accessibilityState={{ selected: on }}
                onPress={() => onChooseItem(c.id)}
                style={{
                  minHeight: t.touchTarget,
                  minWidth: t.touchTarget,
                  margin: t.space.xs,
                  paddingHorizontal: t.space.md,
                  borderRadius: t.radius.md,
                  borderWidth: on ? t.glyph.stroke : t.hairline,
                  // §9 decision 1: a control border is `inkMuted`; chosen is the accent.
                  borderColor: on ? t.color.brand : t.color.inkMuted,
                  backgroundColor: t.color.bg,
                  justifyContent: 'center',
                }}
              >
                <Text
                  maxFontSizeMultiplier={t.maxFontScale}
                  style={{
                    fontFamily: on ? t.font.medium : t.font.regular,
                    fontSize: t.type.body,
                    lineHeight: t.leading(t.type.body),
                    color: t.color.ink,
                  }}
                >
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </View>,
      );
    }
  }

  return (
    <Shell
      id="i1"
      s={s}
      display={display}
      status={status}
      titleKey="i1.title"
      empty={premium && sale === undefined && sales.length === 0}
      emptyKey="i1.empty"
      onRetry={onRetry}
      onBack={onBack}
      footer={
        !typing ? undefined : !picked ? (
          /*
           * HT-51: UNTIL AN ITEM IS PICKED THE FOOTER IS ONLY SAVE (disabled).
           * With the switch, the figures and the keypad always down here, the
           * item choices were squeezed into a strip above them: out of view
           * after one saved line at font 1.0 and from the start at 1.3 and 2.0,
           * and a tap aimed at a hidden item landed in the footer. A save
           * starts the next line with no item, so the list is back in view.
           */
          <PrimaryButton testID="i1-save" label={s('i1.save')} onPress={onSave} display={display} disabled />
        ) : (
          <>
            {/*
             * HT-61: WHAT IS BEING RECORDED, IN THE FIXED FOOTER. Once an item
             * is picked the keypad comes up and the list shrinks, so the picked
             * choice scrolled out of view (1.3 and 2.0 on the device) and he
             * typed figures against an item he could not see. Its name sits
             * here above the figures, and "Change" beside Save goes back to the
             * list with what he typed kept. The name is one line of text and
             * Change shares Save's line: the footer is measured against the
             * fold, and a row of its own for the control put the keypad below
             * it at the chrome cap (check:layout, I1-longest).
             */}
            <View testID="i1-picked" style={{ paddingHorizontal: t.space.md }}>
              <Text
                testID="i1-picked-name"
                maxFontSizeMultiplier={t.maxFontScale}
                style={{
                  fontFamily: t.font.bold,
                  fontSize: t.type.body,
                  lineHeight: t.leading(t.type.body),
                  color: t.color.ink,
                }}
              >
                {nameOf(flow.itemId === 'other' ? undefined : (flow.itemId ?? undefined))}
              </Text>
            </View>
            {/*
             * HT-38: the How many / Amount switch sits in the footer, beside the
             * figures it chooses between. In the body it fell below a long item
             * list (PR-1 plans 20-40) and he had to scroll to find Amount.
             */}
            <View style={{ paddingHorizontal: t.space.md }}>
              <Segmented
                testID="i1-field"
                options={[
                  { key: 'quantity', label: s('i1.quantity') },
                  { key: 'amount', label: s('i1.amount') },
                ]}
                value={flow.field}
                onChange={onField}
                display={display}
              />
            </View>
            <View
              testID="i1-typed"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                paddingHorizontal: t.space.md,
                borderTopWidth: t.hairline,
                borderTopColor: t.color.border,
              }}
            >
              {/*
                Pass 9: an amount with no "How many" leaves Save off, and said
                nothing. The count's own place says what is missing - in the
                slot that read "How many: –", so it costs the fold no line.
                Nothing is filled in for him.
              */}
              {needQuantity ? (
                <Text
                  testID="i1-need-quantity"
                  maxFontSizeMultiplier={t.maxFontScale}
                  style={{
                    flexShrink: 1,
                    marginRight: t.space.sm,
                    fontFamily: t.font.bold,
                    fontSize: t.type.body,
                    lineHeight: t.leading(t.type.body),
                    color: t.color.negative,
                  }}
                >
                  {s('i1.needQuantity')}
                </Text>
              ) : (
                <Text
                  testID="i1-quantity-figure"
                  maxFontSizeMultiplier={t.maxFontScale}
                  style={{
                    fontFamily: flow.field === 'quantity' ? t.font.bold : t.font.regular,
                    fontSize: t.type.body,
                    lineHeight: t.leading(t.type.body),
                    color: t.color.ink,
                  }}
                >
                  {s('i1.quantity') + ': ' + (flow.quantity === null ? '–' : String(flow.quantity))}
                </Text>
              )}
              <Money testID="i1-amount-figure" amount={flow.amount ?? 0} mode={display} size="figure" />
              {/* HT-51: Save beside the figures it files, as on the entry forms - one row less above the list. */}
              <PrimaryButton testID="i1-save" label={s('i1.save')} onPress={onSave} display={display} size="md" disabled={!canSave} />
              <Pressable
                testID="i1-change"
                accessibilityRole="button"
                accessibilityLabel={s('i1.changeItem')}
                onPress={onChangeItem}
                android_ripple={{ color: t.color.brandSoft }}
                style={{
                  minHeight: t.touchTarget,
                  minWidth: t.touchTarget,
                  paddingHorizontal: t.space.sm,
                  borderRadius: t.radius.md,
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
                    color: t.color.ink,
                  }}
                >
                  {s('i1.change')}
                </Text>
              </Pressable>
            </View>
            <Keypad onKey={onKey} s={s} mode={display} />
          </>
        )
      }
    >
      {body}
    </Shell>
  );
}
