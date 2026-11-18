/**
 * THE TWO DAY FACTS ON SCREEN: the UPI check (decision 3) and the typed
 * adjustments (decision 2). Shared by T5, where they are answered, and by T12,
 * T13 and T14, where they are only stated.
 *
 * THE UPI CARD NEVER CLAIMS A CHECK NOBODY DID. With receipts and no tick it
 * says "UPI not checked", in words, on every screen the day closes from - not a
 * tick mark, not a zero difference, not silence. Both ways in ship together:
 * a tick per payment, and one tap for "all N received" that confirms exactly the
 * receipts it names (a payment typed after it stays unticked).
 *
 * NO KEYPAD AND NO TEXT HERE. Confirming is a tap on a figure he already typed;
 * an adjustment's amount is typed on T19's keypad, and its kind is chosen from
 * the fixed list there.
 */
import { View, Text, Pressable } from '@swafto/ui';
import { adjustmentKey, formatPaise, subtract, type Entry, type UpiCheck } from '@swafto/formula-engine';
import { Card, Row, PrimaryButton } from './Shell.tsx';
import { fill } from './DayParts.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import type { Strings, StringKey } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

/** The status in words. The only source of the phrase, so no screen can soften it. */
export function upiStatusLine(check: UpiCheck, s: Strings): string {
  if (check.status === 'partly_checked') {
    return fill(s('upi.status.partly_checked'), { done: check.confirmedCount, n: check.receiptCount });
  }
  return s(('upi.status.' + check.status) as StringKey);
}

export interface UpiCheckCardProps {
  readonly testID: string;
  readonly store: Store;
  readonly s: Strings;
  readonly display?: DisplayMode;
  /**
   * Present on T5 on an open day: the receipts become tickable. Absent, the
   * card states the check and offers nothing - which is what a closed day and
   * the close screens need.
   */
  readonly onConfirm?: ((entryIds: readonly string[]) => void) | undefined;
}

export function UpiCheckCard({ testID, store, s, display = 'comfort', onConfirm }: UpiCheckCardProps) {
  const t = tokens(display);
  const check = store.upiCheck();
  const open = onConfirm !== undefined && store.state.day.state !== 'closed';
  const line = (muted: boolean) =>
    ({
      paddingHorizontal: t.space.md,
      paddingBottom: t.space.sm,
      fontFamily: muted ? t.font.regular : t.font.medium,
      fontSize: muted ? t.type.label : t.type.body,
      lineHeight: t.leading(muted ? t.type.label : t.type.body),
      color: muted ? t.color.inkMuted : t.color.ink,
    }) as const;

  return (
    <Card testID={testID} display={display} title={s('upi.title')}>
      <Text testID={testID + '-status'} maxFontSizeMultiplier={t.maxFontScale} style={line(false)}>
        {upiStatusLine(check, s)}
      </Text>
      {check.status === 'no_upi' ? null : (
        <>
          <Row
            testID={testID + '-expected'}
            label={s('upi.expected')}
            amount={check.expectedReceived}
            display={display}
          />
          <Row
            testID={testID + '-confirmed'}
            label={s('upi.confirmed')}
            amount={check.confirmedReceived}
            display={display}
          />
        </>
      )}
      {open && check.unconfirmed.length > 0 ? (
        <>
          <Text
            testID={testID + '-note'}
            maxFontSizeMultiplier={t.maxFontScale}
            style={{ ...line(true), paddingTop: t.space.sm }}
          >
            {s('upi.note')}
          </Text>
          <View style={{ paddingHorizontal: t.space.sm, paddingBottom: t.space.sm }}>
            <PrimaryButton
              testID={testID + '-all'}
              label={fill(s('upi.all'), {
                n: check.unconfirmed.length,
                // What is still unticked, derived from the two figures above.
                amount: formatPaise(subtract(check.expectedReceived, check.confirmedReceived)),
              })}
              onPress={() => onConfirm(check.unconfirmed.map((e) => e.id))}
              variant="secondary"
              size="lg"
              display={display}
            />
          </View>
          {check.unconfirmed.map((e) => (
            <ReceiptRow
              key={e.id}
              testID={testID + '-receipt-' + e.id}
              entry={e}
              s={s}
              display={display}
              onTick={() => onConfirm([e.id])}
            />
          ))}
        </>
      ) : null}
    </Card>
  );
}

function ReceiptRow({
  testID,
  entry,
  s,
  display,
  onTick,
}: {
  readonly testID: string;
  readonly entry: Entry;
  readonly s: Strings;
  readonly display: DisplayMode;
  readonly onTick: () => void;
}) {
  const t = tokens(display);
  const label = s(
    entry.section === 'upi_sales'
      ? 'section.upi_sales'
      : entry.section === 'exchange_receipt'
        ? 'section.exchange_receipt'
        : 'working.udhar_collected_upi',
  );
  return (
    /*
     * THE FIGURE GETS THE FULL WIDTH, THE TICK SITS UNDER IT. Side by side,
     * the figure's row was a 55% column, and in the longest-string case at
     * 2.0x "₹1,18,060.00" ran 42px out of it the moment the tick fitted beside
     * (check:layout, M3, after v2 widened the card by four pixels). A layout
     * that holds only while the neighbour happens NOT to fit is not a layout.
     */
    <View
      testID={testID}
      style={{
        borderTopWidth: t.hairline,
        borderTopColor: t.color.border,
      }}
    >
      <View>
        <Row testID={testID + '-amount'} label={label} amount={entry.amount} display={display} />
      </View>
      <Pressable
        testID={testID + '-tick'}
        accessibilityRole="button"
        accessibilityLabel={[label, formatPaise(entry.amount), s('upi.tick')].join(', ')}
        onPress={onTick}
        android_ripple={{ color: t.color.brandSoft }}
        style={{
          marginLeft: 'auto',
          marginVertical: t.space.xs,
          marginRight: t.space.sm,
          minHeight: t.touchTarget,
          minWidth: t.touchTarget,
          paddingHorizontal: t.space.md,
          borderRadius: t.radius.pill,
          borderWidth: t.hairline,
          // §9 decision 1: a control border is `inkMuted`.
          borderColor: t.color.inkMuted,
          backgroundColor: t.color.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            fontFamily: t.font.medium,
            fontSize: t.type.label,
            lineHeight: t.leading(t.type.label),
            color: t.color.ink,
          }}
        >
          {s('upi.tick')}
        </Text>
      </Pressable>
    </View>
  );
}

export interface AdjustmentsCardProps {
  readonly testID: string;
  readonly store: Store;
  readonly s: Strings;
  readonly display?: DisplayMode;
  /** T5 on an open day: opens T19. Absent, the card only lists. */
  readonly onAdd?: (() => void) | undefined;
}

export function AdjustmentsCard({ testID, store, s, display = 'comfort', onAdd }: AdjustmentsCardProps) {
  const t = tokens(display);
  const list = store.state.adjustments ?? [];
  const open = onAdd !== undefined && store.state.day.state !== 'closed';
  if (list.length === 0 && !open) return null;
  return (
    <Card testID={testID} display={display} title={s('adjust.title')}>
      {list.length === 0 ? (
        <Text
          testID={testID + '-none'}
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            paddingHorizontal: t.space.md,
            paddingBottom: t.space.sm,
            fontFamily: t.font.regular,
            fontSize: t.type.label,
            lineHeight: t.leading(t.type.label),
            color: t.color.inkMuted,
          }}
        >
          {s('adjust.none')}
        </Text>
      ) : (
        list.map((a) => (
          <Row
            key={a.id}
            testID={testID + '-' + a.id}
            label={s(adjustmentKey(a.type) as StringKey)}
            amount={a.amount}
            display={display}
          />
        ))
      )}
      {open ? (
        <View style={{ padding: t.space.sm }}>
          <PrimaryButton
            testID={testID + '-add'}
            label={s('adjust.add')}
            onPress={onAdd}
            variant="tonal"
            size="lg"
            display={display}
          />
        </View>
      ) : null}
    </Card>
  );
}
