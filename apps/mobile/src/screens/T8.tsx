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
import { EntryForm, type CancelControls, type CommitOption } from '../components/EntryForm.tsx';
import type { LoadStatus } from '../components/Shell.tsx';
import type { Mode as DisplayMode } from '../theme/tokens.ts';
import type { RenderLanguage } from '../i18n/strings.ts';
import type { KeypadKey } from '../components/Keypad.tsx';
import type { Paise } from '@swafto/formula-engine';
import type { Store } from '../store/index.ts';
import type { NewPartyControls } from '../components/PartyPicker.tsx';

import { FORM_B_COMMITS as COMMITS } from './entryRoutes.ts';

export interface FormBProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly draftPaise?: Paise | null;
  readonly onKey?: (key: KeypadKey) => void;
  readonly onCommit?: (option: CommitOption) => void;
  /** QA-03: a collection or payment above what is owed, held for "record as advance". */
  readonly advanceConfirm?: { readonly extra: Paise } | null;
  readonly onConfirmAdvance?: (option: CommitOption) => void;
  readonly onCancelAdvance?: () => void;
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
  /** F-10: add a party from inside the picker. */
  readonly newParty?: NewPartyControls | undefined;
  readonly selectedCommit?: number;
  readonly onSelectCommit?: (index: number) => void;
  /** Explicit `| undefined`: the project runs `exactOptionalPropertyTypes`. */
  readonly onBack?: (() => void) | undefined;
  /** Cancel this entry: the session's half (EntryForm's CancelControls). */
  readonly cancel?: CancelControls | undefined;
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
  advanceConfirm = null,
  onConfirmAdvance = () => {},
  onCancelAdvance = () => {},
  entryPartyId = null,
  savedId = null,
  pickingParty = false,
  onOpenPartyPicker = () => {},
  onChooseParty = () => {},
  onCancelPartyPicker = () => {},
  newParty,
  selectedCommit = 0,
  onSelectCommit = () => {},
  onBack,
  cancel,
  onRetry = () => {},
}: FormBProps) {
  /*
   * USABILITY item 4: ONE SCREEN, THREE CORRECT NAMES. It was titled "Udhar
   * book" for all three directions, and paying a SUPPLIER still showed "Owed to
   * you", a customer figure (U-15). The title is the job the live segment does,
   * and the total beside it is the side of the book that job moves: P8 when
   * paying a supplier, P7 otherwise. Both are engine figures, read on render.
   */
  const chosen = COMMITS[selectedCommit];
  const paying = chosen?.section === 'party_payment';
  const titleKey =
    chosen?.section === 'udhar_collection' ? 't8.title.collect' : paying ? 't8.title.pay' : 't8.title.credit';
  const primary = store.primary();
  return (
    <EntryForm
      id="t8"
      store={store}
      titleKey={titleKey}
      sections={['udhar_collection', 'party_payment', 'udhar_sales']}
      runningTotal={paying ? primary.p8SupplierOutstanding.value : primary.p7CreditOutstanding.value}
      runningTotalKey={paying ? 'p1.youOwe' : 't8.outstanding'}
      commits={COMMITS}
      emptyKey="common.empty"
      status={status}
      language={language}
      display={display}
      draftPaise={draftPaise}
      onKey={onKey}
      onCommit={onCommit}
      advanceConfirm={advanceConfirm}
      onConfirmAdvance={onConfirmAdvance}
      onCancelAdvance={onCancelAdvance}
      entryPartyId={entryPartyId}
      savedId={savedId}
      pickingParty={pickingParty}
      onOpenPartyPicker={onOpenPartyPicker}
      onChooseParty={onChooseParty}
      onCancelPartyPicker={onCancelPartyPicker}
      newParty={newParty}
      selectedCommit={selectedCommit}
      onSelectCommit={onSelectCommit}
      onBack={onBack}
      cancel={cancel}
      onRetry={onRetry}
    />
  );
}
