/**
 * T7 - ENTRY FORM A. The build map calls it "repeating lines with running total".
 *
 * It was the first screen built and it inlined everything: the header, the four
 * states, the rows, the draft bar, the buttons, the keypad. Three more forms then
 * needed the same shape, so that composition now lives in `EntryForm` and this
 * file is the DECLARATION of what makes Form A Form A - which sections it lists,
 * which engine figure is its running total, and what its three buttons commit.
 *
 * THE RUNNING TOTAL IS P4, READ ON EVERY RENDER. Not accumulated, not stored. It
 * is passed down as a value rather than as a function so that this file is the
 * one place that decides Form A's total is net sales.
 *
 * THIS SCREEN WRITES NOTHING. `onCommit` reports which button was pressed; the
 * caller creates the entry through the IN1 parser, which is the only path that
 * refuses a credit sale naming nobody.
 */
import { EntryForm, type CommitOption } from '../components/EntryForm.tsx';
import type { LoadStatus } from '../components/Shell.tsx';
import type { Mode as DisplayMode } from '../theme/tokens.ts';
import type { RenderLanguage } from '../i18n/strings.ts';
import type { KeypadKey } from '../components/Keypad.tsx';
import type { Mode as PaymentMode, Paise } from '@swafto/formula-engine';
import type { Store } from '../store/index.ts';

/** Cash, UPI, credit. The mode decides the section, which is IN1's rule. */
const COMMITS: readonly CommitOption[] = [
  { labelKey: 'formA.mode.cash', section: 'cash_sales', mode: 'cash' },
  { labelKey: 'formA.mode.upi', section: 'upi_sales', mode: 'upi' },
  { labelKey: 'formA.mode.udhar', section: 'udhar_sales', mode: 'udhar' },
];

export interface FormAProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly draftPaise?: Paise | null;
  readonly onKey?: (key: KeypadKey) => void;
  readonly onCommit?: (mode: PaymentMode) => void;
  readonly onRetry?: () => void;
}

export function FormA({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  draftPaise = null,
  onKey = () => {},
  onCommit = () => {},
  onRetry = () => {},
}: FormAProps) {
  return (
    <EntryForm
      id="t7"
      store={store}
      titleKey="formA.title"
      sections={['cash_sales', 'upi_sales', 'udhar_sales']}
      runningTotal={store.primary().p4NetSales.value}
      runningTotalKey="formA.runningTotal"
      commits={COMMITS}
      emptyKey="formA.empty"
      status={status}
      language={language}
      display={display}
      draftPaise={draftPaise}
      onKey={onKey}
      onCommit={(option) => onCommit(option.mode)}
      onRetry={onRetry}
    />
  );
}
