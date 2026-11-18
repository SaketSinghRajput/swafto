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
import { EntryForm } from '../components/EntryForm.tsx';
import { FORM_A_COMMITS as COMMITS } from './entryRoutes.ts';
import type { LoadStatus } from '../components/Shell.tsx';
import type { Mode as DisplayMode } from '../theme/tokens.ts';
import type { RenderLanguage } from '../i18n/strings.ts';
import type { KeypadKey } from '../components/Keypad.tsx';
import type { Mode as PaymentMode, Paise } from '@swafto/formula-engine';
import type { Store } from '../store/index.ts';
import type { NewPartyControls } from '../components/PartyPicker.tsx';
import { allows, type Plan } from '../app/plan.ts';

export interface FormAProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly draftPaise?: Paise | null;
  readonly onKey?: (key: KeypadKey) => void;
  readonly onCommit?: (mode: PaymentMode) => void;
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
  readonly onRetry?: () => void;
  /** T18: "Return or exchange a sale", one ghost action under the lines (EX-7). */
  readonly onOpenReturns?: (() => void) | undefined;
  /**
   * PR-1 (Premium): "Add items to a sale", to I1. ABSENT on a free plan - the
   * gate is `allows(plan, 'items')` and nothing else.
   */
  readonly plan?: Plan;
  readonly onOpenItems?: (() => void) | undefined;
}

export function FormA({
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
  onBack,
  onRetry = () => {},
  onOpenReturns,
  plan = 'free',
  onOpenItems,
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
      onRetry={onRetry}
      secondaryAction={
        onOpenReturns === undefined ? undefined : { labelKey: 't18.open', onPress: onOpenReturns }
      }
      itemsAction={
        onOpenItems === undefined || !allows(plan, 'items') ? undefined : { labelKey: 't7.items', onPress: onOpenItems }
      }
    />
  );
}
