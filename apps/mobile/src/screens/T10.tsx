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

import { FORM_D_COMMITS as COMMITS } from './entryRoutes.ts';

export interface FormDProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly draftPaise?: Paise | null;
  readonly onKey?: (key: KeypadKey) => void;
  readonly onCommit?: (option: CommitOption) => void;
  /**
   * WHICH COMMIT IS LIVE, AND THE BACK DESTINATION.
   *
   * The payment mode stopped being a button that also writes the entry and
   * became a segment that only chooses, so the choice now needs somewhere to
   * live. It lives in the Session like every other piece of state - this screen
   * holds nothing - and arrives here as a controlled value.
   *
   * It defaults to 0 rather than null on purpose: acceptance criterion 1 says
   * the entry is committed in TWO taps from a cold start, and an unselected
   * segment would cost a third on every entry.
   */
  readonly entryPartyId?: string | null;
  /** USABILITY item 6: the entry this form just saved - said, and shown first. */
  readonly savedId?: string | null;
  readonly pickingParty?: boolean;
  readonly onOpenPartyPicker?: () => void;
  readonly onChooseParty?: (partyId: string) => void;
  readonly onCancelPartyPicker?: () => void;
  readonly selectedCommit?: number;
  readonly onSelectCommit?: (index: number) => void;
  /** Explicit `| undefined`: the project runs `exactOptionalPropertyTypes`. */
  readonly onBack?: (() => void) | undefined;
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
  entryPartyId = null,
  savedId = null,
  pickingParty = false,
  onOpenPartyPicker = () => {},
  onChooseParty = () => {},
  onCancelPartyPicker = () => {},
  selectedCommit = 0,
  onSelectCommit = () => {},
  onBack,
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
      entryPartyId={entryPartyId}
      savedId={savedId}
      pickingParty={pickingParty}
      onOpenPartyPicker={onOpenPartyPicker}
      onChooseParty={onChooseParty}
      onCancelPartyPicker={onCancelPartyPicker}
      selectedCommit={selectedCommit}
      onSelectCommit={onSelectCommit}
      onBack={onBack}
      onRetry={onRetry}
    />
  );
}
