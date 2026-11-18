/**
 * P6 - A CUSTOMER'S CREDIT LIMIT (R5 FR-6). Reached from P2; back returns there.
 *
 * ONE INPUT: the amount, from the keypad. Nothing is pre-filled - not the old
 * limit, not a "suggested" one - because the app never puts a figure in front
 * of him that he did not type (no inference in data entry).
 *
 * A LIMIT BLOCKS NOTHING. The prompt says so in the shopkeeper's words: when an
 * udhar sale would take this customer above it, the entry form says so as an
 * observation, and the sale is recorded exactly as typed. Saving or removing a
 * limit is a new row every time (D1); the old one stays in the book.
 */
import { View, Text } from '@swafto/ui';
import { formatPaise, type Paise } from '@swafto/formula-engine';
import { Shell, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { Keypad, type KeypadKey } from '../components/Keypad.tsx';
import { Money } from '../components/Money.tsx';
import { fill } from '../components/DayParts.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

export interface CreditLimitProps {
  readonly store: Store;
  readonly partyId: string;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly amountPaise?: Paise | null;
  readonly onKey?: (key: KeypadKey) => void;
  readonly onSave?: () => void;
  readonly onClear?: () => void;
  readonly onRetry?: () => void;
  readonly onBack?: (() => void) | undefined;
}

export function CreditLimit({
  store,
  partyId,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  amountPaise = null,
  onKey = () => {},
  onSave = () => {},
  onClear = () => {},
  onRetry = () => {},
  onBack,
}: CreditLimitProps) {
  const t = tokens(display);
  const s = strings(language);
  const party = store.state.parties.find((p) => p.id === partyId);
  const limit = store.creditLimit(partyId);
  const body = {
    fontSize: t.type.body,
    lineHeight: t.leading(t.type.body),
    color: t.color.ink,
  } as const;

  return (
    <Shell
      id="p6"
      s={s}
      display={display}
      status={status}
      titleKey="p6.title"
      onRetry={onRetry}
      onBack={onBack}
      footer={
        <>
          <View
            testID="p6-amount"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              padding: t.space.md,
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
              {s('p6.amount')}
            </Text>
            <Money testID="p6-amount-figure" amount={amountPaise ?? 0} mode={display} size="figure" />
          </View>
          <PrimaryButton
            testID="p6-save"
            label={s('p6.save')}
            onPress={onSave}
            display={display}
            disabled={amountPaise === null || amountPaise <= 0}
          />
          <Keypad onKey={onKey} s={s} mode={display} />
        </>
      }
    >
      <Text
        testID="p6-prompt"
        maxFontSizeMultiplier={t.maxFontScale}
        style={{ ...body, padding: t.space.md, fontFamily: t.font.regular }}
      >
        {fill(s('p6.prompt'), { name: party?.name ?? '' })}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          paddingHorizontal: t.space.md,
        }}
      >
        <Text maxFontSizeMultiplier={t.maxFontScale} style={{ ...body, fontFamily: t.font.medium }}>
          {s('p6.current')}
        </Text>
        <Text
          testID="p6-current"
          maxFontSizeMultiplier={t.maxFontScale}
          style={{ ...body, fontFamily: t.font.medium, fontVariant: ['tabular-nums'] }}
        >
          {limit === null ? s('p2.noLimit') : formatPaise(limit)}
        </Text>
      </View>
      {/* Removing is offered only when there is something to remove. */}
      {limit === null ? null : (
        <PrimaryButton
          testID="p6-clear"
          label={s('p6.clear')}
          onPress={onClear}
          display={display}
          variant="ghost"
          size="md"
        />
      )}
    </Shell>
  );
}
