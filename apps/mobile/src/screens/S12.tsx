/**
 * S12 - ENTRIES FOR YOUR ACCOUNTANT (R5 FR-4). Reached from S1; back returns.
 *
 * A MONTH, THEN THE SHARE SHEET. The file is made on the phone from what was
 * typed (`share.ts` documents every column) and handed to whichever app he
 * picks; nothing goes to the server. Free, always: a one-off copy of his own
 * book is his, and R1 GAP-5 records the resentment a paywalled export causes.
 *
 * WHAT IT IS CALLED, AND WHAT IT IS NOT. "Entries", never an invoice or a
 * return of any kind (L-16, `check:naming`), and the L-15 sentence is on this
 * screen and at the top of the file, as LEGAL-AUDIT §7 requires of an export.
 */
import { Text } from '@swafto/ui';
import { Shell, Card, LinkRow, type LoadStatus } from '../components/Shell.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type StringKey } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';
import { exportMonths } from '../app/share.ts';

export interface AccountantExportProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  /** 'YYYY-MM'. The host makes the file and opens the share sheet. */
  readonly onShareMonth?: (month: string) => void;
  readonly onRetry?: () => void;
  readonly onBack?: (() => void) | undefined;
}

export function AccountantExport({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onShareMonth = () => {},
  onRetry = () => {},
  onBack,
}: AccountantExportProps) {
  const t = tokens(display);
  const s = strings(language);
  // Months that have at least one entry: a month of nothing is nothing to send.
  const months = exportMonths(store.allEntries().map((e) => e.dayId));
  const para = {
    paddingHorizontal: t.space.md,
    paddingTop: t.space.md,
    fontFamily: t.font.regular,
    fontSize: t.type.body,
    lineHeight: t.leading(t.type.body),
  } as const;

  return (
    <Shell
      id="s12"
      s={s}
      display={display}
      status={status}
      titleKey="s12.title"
      empty={months.length === 0}
      emptyKey="s12.empty"
      onRetry={onRetry}
      onBack={onBack}
    >
      <Text testID="s12-explain" maxFontSizeMultiplier={t.maxFontScale} style={{ ...para, color: t.color.ink }}>
        {s('s12.body')}
      </Text>
      <Text testID="s12-not-tax" maxFontSizeMultiplier={t.maxFontScale} style={{ ...para, color: t.color.inkMuted }}>
        {s('s5.notTax')}
      </Text>
      <Card testID="s12-months" display={display} title={s('s12.months')}>
        {months.map((m) => (
          <LinkRow
            key={m}
            testID={'s12-month-' + m}
            label={s(('t1.month.' + String(parseInt(m.slice(5, 7), 10))) as StringKey) + ' ' + m.slice(0, 4)}
            display={display}
            onPress={() => onShareMonth(m)}
          />
        ))}
      </Card>
    </Shell>
  );
}
