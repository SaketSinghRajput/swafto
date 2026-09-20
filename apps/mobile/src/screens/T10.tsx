/**
 * T10 - ENTRY FORM D. Money the owner took for himself.
 *
 * NOT AN EXPENSE, AND THE SCREEN SAYS SO IN WORDS. This is the separation D3
 * exists for: a withdrawal leaves the drawer, so it moves the cash check, and it
 * is not a cost of running the shop, so it stays outside profit. Recorded as an
 * expense it would understate profit and tell him the shop is doing worse than it
 * is - which is the kind of wrong that changes what somebody does next.
 *
 * The note under the rows is not decoration. A form with two buttons and no
 * explanation is a form where the distinction lives only in the developer's head.
 */
import { EntryForm, type CommitOption } from '../components/EntryForm.tsx';
import type { LoadStatus } from '../components/Shell.tsx';
import type { Mode as DisplayMode } from '../theme/tokens.ts';
import type { RenderLanguage } from '../i18n/strings.ts';
import type { KeypadKey } from '../components/Keypad.tsx';
import type { Paise } from '@swafto/formula-engine';
import type { Store } from '../store/index.ts';

const COMMITS: readonly CommitOption[] = [
  { labelKey: 'formA.mode.cash', section: 'withdrawal', mode: 'cash' },
  { labelKey: 'formA.mode.upi', section: 'withdrawal', mode: 'upi' },
];

export interface FormDProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly draftPaise?: Paise | null;
  readonly onKey?: (key: KeypadKey) => void;
  readonly onCommit?: (option: CommitOption) => void;
  readonly onRetry?: () => void;
}

export function FormD({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  draftPaise = null,
  onKey = () => {},
  onCommit = () => {},
  onRetry = () => {},
}: FormDProps) {
  return (
    <EntryForm
      id="t10"
      store={store}
      titleKey="t10.title"
      sections={['withdrawal']}
      runningTotal={store.sectionTotal('withdrawal')}
      runningTotalKey="section.withdrawal"
      commits={COMMITS}
      emptyKey="common.empty"
      noteKey="t10.note"
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
