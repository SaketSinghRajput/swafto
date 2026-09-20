/**
 * THE ENTRY FORM. Four screens, one implementation.
 *
 * T7, T8, T9 and T10 are the same screen with different sections behind the
 * buttons: repeating lines, a running total, a draft amount, a keypad. Building
 * them separately would give four dialects of one form, and the fourth would be
 * the one where the running total was computed slightly differently.
 *
 * WHAT VARIES IS DECLARED, NOT IMPLIED. A form says which sections it lists,
 * which figure is its running total, and what its buttons commit. Everything else
 * - the keypad, the wrapping, the four states, the touch targets - is identical
 * because it is the same code.
 *
 * THE RUNNING TOTAL IS ALWAYS AN ENGINE FIGURE, passed in as a value the caller
 * read from the store on this render, never accumulated here. A form that added
 * up its own rows would be a second implementation of a total the day-close sheet
 * also computes, and the first time they disagreed the shopkeeper would have two
 * numbers and no way to tell which was his.
 *
 * IT WRITES NOTHING. Every action leaves as a callback. The screen never calls
 * `store.append` - the caller does, through the IN1-IN7 parsers, which is the only
 * path that refuses bad input by naming the field it refused.
 */
import { View, Text, Pressable } from '@swafto/ui';
import type { Mode as PaymentMode, Paise, Entry } from '@swafto/formula-engine';
import { Money } from './Money.tsx';
import { Keypad, type KeypadKey } from './Keypad.tsx';
import { Shell, Row, type LoadStatus } from './Shell.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type StringKey } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

/** One button at the bottom of the form: what it says, and what it commits. */
export interface CommitOption {
  readonly labelKey: StringKey;
  readonly section: Entry['section'];
  readonly mode: PaymentMode;
}

export interface EntryFormProps {
  readonly id: string;
  readonly store: Store;
  readonly titleKey: StringKey;
  /** Which sections this form lists. The order is the order on screen. */
  readonly sections: readonly Entry['section'][];
  /** The engine figure this form is about, read by the caller on this render. */
  readonly runningTotal: Paise;
  readonly runningTotalKey: StringKey;
  readonly commits: readonly CommitOption[];
  readonly emptyKey: StringKey;
  /** A sentence under the rows: why this form is not what it looks like. */
  readonly noteKey?: StringKey;

  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly draftPaise?: Paise | null;
  readonly onKey?: (key: KeypadKey) => void;
  readonly onCommit?: (option: CommitOption) => void;
  readonly onRetry?: () => void;
}

export function EntryForm({
  id,
  store,
  titleKey,
  sections,
  runningTotal,
  runningTotalKey,
  commits,
  emptyKey,
  noteKey,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  draftPaise = null,
  onKey = () => {},
  onCommit = () => {},
  onRetry = () => {},
}: EntryFormProps) {
  const t = tokens(display);
  const s = strings(language);

  const parties = new Map(store.state.parties.map((p) => [p.id, p.name]));
  const lines = store.state.entries.filter((e) => sections.includes(e.section));

  return (
    <Shell
      id={id}
      s={s}
      display={display}
      status={status}
      titleKey={titleKey}
      headline={{ labelKey: runningTotalKey, amount: runningTotal }}
      empty={lines.length === 0}
      emptyKey={emptyKey}
      onRetry={onRetry}
      footer={
        <>
          <View
            testID={id + '-draft'}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              // sm rather than md: the footer is the tightest vertical budget on
              // the screen, and at the chrome cap in Focus mode those eight
              // pixels were the difference between the keypad fitting and not.
              padding: t.space.sm,
              borderTopWidth: t.hairline,
              borderTopColor: t.color.border,
            }}
          >
            <Text
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                fontFamily: t.font.regular,
                fontSize: t.type.label,
                lineHeight: t.leading(t.type.label),
                color: t.color.inkMuted,
              }}
            >
              {s('formA.amount')}
            </Text>
            <Money
              testID={id + '-draft-amount'}
              amount={draftPaise ?? 0}
              mode={display}
              size="figure"
            />
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: t.space.sm }}>
            {commits.map((option) => (
              <Pressable
                key={option.section + ':' + option.mode}
                testID={id + '-commit-' + option.mode + '-' + option.section}
                accessibilityRole="button"
                accessibilityLabel={s(option.labelKey)}
                onPress={() => onCommit(option)}
                style={{
                  /*
                   * TWO PER ROW, NOT ALL OF THEM. Three or five buttons across a
                   * 360dp screen leaves about 100dp each, and an Odia or English
                   * word wider than that cannot break - it overflows the button.
                   * check:layout caught exactly that on T8 and T9.
                   */
                  flexBasis: '45%',
                  flexGrow: 1,
                  minHeight: t.touchTarget,
                  minWidth: t.touchTarget,
                  margin: t.space.xs,
                  borderRadius: t.radius.md,
                  backgroundColor: t.color.accent,
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
                    color: t.color.onAccent,
                    textAlign: 'center',
                  }}
                >
                  {s(option.labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* An entry screen, so the keypad is here - and no bottom nav beside it. */}
          <Keypad onKey={onKey} s={s} mode={display} />
        </>
      }
    >
      {lines.map((e) => (
        <Row
          key={e.id}
          testID={id + '-line-' + e.id}
          label={
            s(('section.' + e.section) as StringKey) +
            (e.partyId ? ' - ' + (parties.get(e.partyId) ?? e.partyId) : '') +
            (e.label ? ' - ' + e.label : '')
          }
          amount={e.amount}
          display={display}
        />
      ))}

      {noteKey ? (
        <Text
          testID={id + '-note'}
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            padding: t.space.md,
            fontFamily: t.font.regular,
            fontSize: t.type.body,
            lineHeight: t.leading(t.type.body),
            color: t.color.inkMuted,
          }}
        >
          {s(noteKey)}
        </Text>
      ) : null}
    </Shell>
  );
}
