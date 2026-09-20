/**
 * T8 - ENTRY FORM B. "Party and amount, three directions."
 *
 * THE THREE DIRECTIONS ARE THE WHOLE SCREEN. Money coming back from a customer,
 * money going out to a supplier, and a new sale on credit. All three name a
 * PERSON, which is what separates this form from Form A - and why IN4, IN5 and
 * IN1's credit path all refuse an entry with no party. Udhar owed by nobody can
 * never be collected.
 *
 * THE HEADLINE IS P7, WHAT THE SHOP IS OWED. The figure a shopkeeper opens this
 * screen to change.
 */
import { EntryForm, type CommitOption } from '../components/EntryForm.tsx';
import type { LoadStatus } from '../components/Shell.tsx';
import type { Mode as DisplayMode } from '../theme/tokens.ts';
import type { RenderLanguage } from '../i18n/strings.ts';
import type { KeypadKey } from '../components/Keypad.tsx';
import type { Paise } from '@swafto/formula-engine';
import type { Store } from '../store/index.ts';

const COMMITS: readonly CommitOption[] = [
  { labelKey: 't8.collect', section: 'udhar_collection', mode: 'cash' },
  { labelKey: 't8.pay', section: 'party_payment', mode: 'cash' },
  { labelKey: 't8.credit', section: 'udhar_sales', mode: 'udhar' },
];

export interface FormBProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly draftPaise?: Paise | null;
  readonly onKey?: (key: KeypadKey) => void;
  readonly onCommit?: (option: CommitOption) => void;
  readonly onRetry?: () => void;
}

export function FormB({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  draftPaise = null,
  onKey = () => {},
  onCommit = () => {},
  onRetry = () => {},
}: FormBProps) {
  return (
    <EntryForm
      id="t8"
      store={store}
      titleKey="t8.title"
      sections={['udhar_collection', 'party_payment', 'udhar_sales']}
      runningTotal={store.primary().p7CreditOutstanding.value}
      runningTotalKey="t8.outstanding"
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
