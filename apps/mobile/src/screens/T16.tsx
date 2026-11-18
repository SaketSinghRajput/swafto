/**
 * T16 - POST A CORRECTION (build map T16, HT-11, D1, D7).
 *
 * A CLOSED DAY IS FROZEN, AND THIS SCREEN SAYS SO BEFORE IT OFFERS ANYTHING.
 * Review scenario 15 asks to reopen a closed day; D7 refuses it, by trigger on
 * both engines, and this is the answer instead: a NEW entry, pointing at the one
 * it corrects, dated to the next open business day. The closed day's figures
 * never move.
 *
 * WHEN NO DAY IS OPEN YET - the closed day is still the current business day by
 * the shop's own start time - there is nowhere honest to write it, so the store
 * HOLDS it and appends it the moment the next day starts. The screen states that
 * in words, with the start time, before the tap; and after it, says which of the
 * two happened. "Saved" alone would let him think the closed day had changed.
 *
 * ADDITIVE ONLY. A correction adds what was missed (amounts are never negative,
 * `buildCorrection`); the copy says "adds", never "changes".
 *
 * THIS SCREEN WRITES NOTHING. Add leaves as a callback to `Session.commitCorrection`.
 */
import { View } from '@swafto/ui';
import { isEventSection, type Entry, type Paise } from '@swafto/formula-engine';
import { Keypad, type KeypadKey } from '../components/Keypad.tsx';
import { Money } from '../components/Money.tsx';
import { Shell, Card, Row, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { Quiet, dateLine, fill } from '../components/DayParts.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type StringKey, type Strings } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';
import type { CorrectionFlow } from '../app/session.tsx';

export interface CorrectDayProps {
  readonly store: Store;
  /** The session's `correction`. Null or absent is the list with no outcome yet. */
  readonly correction?: CorrectionFlow | null;
  readonly draftPaise?: Paise | null;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onRetry?: () => void;
  readonly onBack?: (() => void) | undefined;
  readonly onKey?: (key: KeypadKey) => void;
  readonly onChoose?: (entryId: string) => void;
  readonly onAdd?: () => void;
}

const noop = () => {};

/** "Adds to: Cash sales of Wed 15 Jul" - the section and the day, never restated figures. */
const addsTo = (e: Entry, s: Strings): string =>
  fill(s('t16.addsTo'), { section: s(('section.' + e.section) as StringKey), date: dateLine(e.dayId, s) });

export function CorrectDay({
  store,
  correction = null,
  draftPaise = null,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onRetry = noop,
  onBack,
  onKey = noop,
  onChoose = noop,
  onAdd = noop,
}: CorrectDayProps) {
  const t = tokens(display);
  const s = strings(language);
  const day = store.state.day;
  const closed = day.state === 'closed';

  /*
   * THE CLOSED DAY'S OWN ENTRIES, and only on a closed day. A return's legs are
   * not corrected (they are settled, or the sale returned again - `buildCorrection`
   * refuses them), so they are not offered.
   */
  const entries = closed ? store.state.entries.filter((e) => !isEventSection(e.section)) : [];
  const held = store.state.heldCorrections ?? [];
  const target = correction?.originalId ? store.findEntry(correction.originalId) : undefined;
  const outcome = correction?.outcome ?? null;

  return (
    <Shell
      id="t16"
      s={s}
      display={display}
      status={status}
      titleKey="t3.correction"
      onRetry={onRetry}
      onBack={onBack}
      empty={target === undefined && entries.length === 0 && held.length === 0}
      emptyKey="t16.empty"
      bodyHeader={
        <View style={{ marginHorizontal: t.space.md, marginTop: t.space.md }}>
          <Quiet testID="t16-frozen" text={s('t16.frozen')} display={display} />
          {/* Separate paragraphs: run together, the outcome read as more explanation. */}
          {closed ? (
            <View style={{ marginTop: t.space.sm }}>
              <Quiet
                testID="t16-next-day"
                text={fill(s('t16.nextDay'), { time: store.state.dayStartsAt ?? '00:00' })}
                display={display}
              />
            </View>
          ) : null}
          {outcome === null ? null : (
            <View
              style={{
                marginTop: t.space.md,
                padding: t.space.md,
                borderRadius: t.radius.md,
                backgroundColor: t.color.surface,
              }}
            >
              <Quiet
                testID={'t16-outcome-' + outcome}
                text={s(outcome === 'held' ? 't16.held' : 't16.recorded')}
                display={display}
              />
            </View>
          )}
        </View>
      }
      footer={
        target === undefined ? null : (
          <>
            <View
              testID="t16-draft"
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
                <Quiet text={s('t16.amount')} display={display} />
                <Money testID="t16-draft-amount" amount={draftPaise ?? 0} mode={display} size="figure" />
              </View>
              <PrimaryButton
                testID="t16-add"
                label={s('common.add')}
                display={display}
                size="md"
                disabled={draftPaise === null}
                onPress={onAdd}
              />
            </View>
            <Keypad onKey={onKey} s={s} mode={display} />
          </>
        )
      }
    >
      {target === undefined ? null : (
        <Card testID="t16-target" display={display}>
          <Row testID="t16-target-line" label={addsTo(target, s)} amount={target.amount} display={display} />
        </Card>
      )}
      {target !== undefined || entries.length === 0 ? null : (
        <Card testID="t16-entries" display={display} title={s('t16.entries')}>
          {entries.map((e) => (
            <Row
              key={e.id}
              testID={'t16-entry-' + e.id}
              label={s(('section.' + e.section) as StringKey) + (e.label ? ' · ' + e.label : '')}
              amount={e.amount}
              display={display}
              onPress={() => onChoose(e.id)}
            />
          ))}
        </Card>
      )}
      {held.length === 0 ? null : (
        <Card testID="t16-held" display={display} title={s('t16.waiting')}>
          {held.map((h) => {
            const original = store.findEntry(h.originalId);
            return (
              <Row
                key={h.id}
                testID={'t16-held-' + h.id}
                label={original === undefined ? s('t16.waiting') : addsTo(original, s)}
                amount={h.amount}
                display={display}
              />
            );
          })}
        </Card>
      )}
    </Shell>
  );
}
