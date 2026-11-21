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
import { EntryForm, type CancelControls, type CommitOption } from '../components/EntryForm.tsx';
import type { LoadStatus } from '../components/Shell.tsx';
import type { Mode as DisplayMode } from '../theme/tokens.ts';
import type { RenderLanguage } from '../i18n/strings.ts';
import type { KeypadKey } from '../components/Keypad.tsx';
import type { Paise } from '@swafto/formula-engine';
import type { Store } from '../store/index.ts';
import type { NewPartyControls } from '../components/PartyPicker.tsx';

import { FORM_C_EXPENSE_COMMITS, FORM_C_PURCHASE_COMMITS } from './entryRoutes.ts';

/**
 * FORM C IS TWO FORMS, AND ONLY ONE OF THEM USED TO EXIST.
 *
 * Buying stock and buying tea are the same shape - a label, an amount, a mode -
 * and different lines in the day sheet. The reference design serves both from
 * Form C, and the engine has had `parsePurchaseEntry` and `p5NetPurchase` all
 * along. But this screen hard-coded `sections={['expense']}` and five commits
 * of which every single one wrote `section: 'expense'`. The Purchase tile
 * opened it regardless, so a shopkeeper buying ten thousand rupees of stock
 * filed it as an expense, while T5 and T11 went on displaying a purchase total
 * that nothing in the app could ever add to.
 *
 * `shop_stock` is absent from the purchase side on purpose: taking goods into
 * stock is what a purchase already is, so the mode would only repeat the
 * section.
 */
const FACE = {
  expense: {
    commits: FORM_C_EXPENSE_COMMITS,
    titleKey: 't9.title',
    totalKey: 'section.expense',
  },
  purchase: {
    commits: FORM_C_PURCHASE_COMMITS,
    titleKey: 'act.purchase',
    totalKey: 'section.purchase',
  },
} as const;

export interface FormCProps {
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
  /** F-10: add a party from inside the picker. */
  readonly newParty?: NewPartyControls | undefined;
  readonly selectedCommit?: number;
  readonly onSelectCommit?: (index: number) => void;
  /**
   * Which face of Form C this is. Defaults to `expense`, so every existing
   * caller keeps the screen it already had.
   */
  readonly section?: 'expense' | 'purchase';
  /** Explicit `| undefined`: the project runs `exactOptionalPropertyTypes`. */
  readonly onBack?: (() => void) | undefined;
  /** Cancel this entry: the session's half (EntryForm's CancelControls). */
  readonly cancel?: CancelControls | undefined;
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
  entryPartyId = null,
  savedId = null,
  pickingParty = false,
  onOpenPartyPicker = () => {},
  onChooseParty = () => {},
  onCancelPartyPicker = () => {},
  newParty,
  selectedCommit = 0,
  onSelectCommit = () => {},
  section = 'expense',
  onBack,
  cancel,
  onRetry = () => {},
}: FormCProps) {
  const face = FACE[section];
  const primary = store.primary();
  return (
    <EntryForm
      id="t9"
      store={store}
      titleKey={face.titleKey}
      sections={[section]}
      runningTotal={
        section === 'purchase' ? primary.p5NetPurchase.value : primary.p6TotalExpenses.value
      }
      runningTotalKey={face.totalKey}
      commits={face.commits}
      emptyKey="common.empty"
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
      newParty={newParty}
      selectedCommit={selectedCommit}
      onSelectCommit={onSelectCommit}
      onBack={onBack}
      cancel={cancel}
      onRetry={onRetry}
    />
  );
}
