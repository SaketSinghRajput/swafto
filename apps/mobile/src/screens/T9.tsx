/**
 * T9 - ENTRY FORM C. "Label, amount, mode split."
 *
 * FIVE MODES, AND THE FIFTH IS THE INTERESTING ONE. An expense paid from shop
 * stock never touches the cash box, so it changes profit and does not change the
 * cash check. A form that offered only cash and UPI would push the shopkeeper
 * into recording it as a cash expense, and his drawer would stop reconciling for
 * a reason he could not find.
 *
 * THE HEADLINE IS P6, what the day has cost him so far.
 */
import { EntryForm, type CommitOption } from '../components/EntryForm.tsx';
import type { LoadStatus } from '../components/Shell.tsx';
import type { Mode as DisplayMode } from '../theme/tokens.ts';
import type { RenderLanguage } from '../i18n/strings.ts';
import type { KeypadKey } from '../components/Keypad.tsx';
import type { Paise } from '@swafto/formula-engine';
import type { Store } from '../store/index.ts';

const COMMITS: readonly CommitOption[] = [
  { labelKey: 'formA.mode.cash', section: 'expense', mode: 'cash' },
  { labelKey: 'formA.mode.upi', section: 'expense', mode: 'upi' },
  { labelKey: 't9.mode.other', section: 'expense', mode: 'other' },
  { labelKey: 'formA.mode.udhar', section: 'expense', mode: 'udhar' },
  { labelKey: 't9.mode.shop_stock', section: 'expense', mode: 'shop_stock' },
];

export interface FormCProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly draftPaise?: Paise | null;
  readonly onKey?: (key: KeypadKey) => void;
  readonly onCommit?: (option: CommitOption) => void;
  readonly onRetry?: () => void;
}

export function FormC({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  draftPaise = null,
  onKey = () => {},
  onCommit = () => {},
  onRetry = () => {},
}: FormCProps) {
  return (
    <EntryForm
      id="t9"
      store={store}
      titleKey="t9.title"
      sections={['expense']}
      runningTotal={store.primary().p6TotalExpenses.value}
      runningTotalKey="section.expense"
      commits={COMMITS}
      emptyKey="common.empty"
      status={status}
      language={language}
      display={display}
      draftPaise={draftPaise}
      onKey={onKey}
      onCommit={onCommit}
      onRetry={onRetry}
    />
  );
}
