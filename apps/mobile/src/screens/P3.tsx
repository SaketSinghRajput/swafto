/**
 * P3 - SUPPLIER DETAIL. The same page as P2 with the money running the other way.
 *
 * ONE ACTION, NOT TWO. A customer page offers "record a collection" and "new
 * udhar sale" because a shopkeeper both takes money from customers and gives
 * them credit. With a supplier he does one thing: he pays. Taking stock on
 * credit from a wholesaler is a PURCHASE and it belongs in the purchase form
 * with its section and its due date, not behind a button on a contact page -
 * the spec's anti-pattern list names quick-add with its own store explicitly.
 *
 * `p3.owed` rather than `t8.outstanding`: the figure is the same arithmetic seen
 * from the other side, and calling it "owed to you" on a supplier page would
 * invert its meaning while the number stayed right.
 */
import { PartyDetail, type PartyAction } from '../components/PartyDetail.tsx';
import type { LoadStatus } from '../components/Shell.tsx';
import type { Mode as DisplayMode } from '../theme/tokens.ts';
import type { RenderLanguage } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

export interface SupplierDetailProps {
  readonly store: Store;
  readonly partyId: string;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onRecordPayment?: () => void;
  readonly onRetry?: () => void;
  /** F-9: the header's way back. Explicit `| undefined` for exactOptionalPropertyTypes. */
  readonly onBack?: (() => void) | undefined;
}

export function SupplierDetail({
  store,
  partyId,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onRecordPayment = () => {},
  onRetry = () => {},
  onBack,
}: SupplierDetailProps) {
  const actions: readonly PartyAction[] = [
    { key: 'pay', labelKey: 'p3.recordPayment', onPress: onRecordPayment },
  ];

  return (
    <PartyDetail
      id="p3"
      store={store}
      partyId={partyId}
      titleKey="p3.title"
      /*
       * The same movement label P2 uses, for the same reason: this is what today
       * changed, not what is owed. `p3.owed` is kept in the string table for the
       * day the figure becomes a real balance - see the note in P2.
       */
      figureKey="p1.changeToday"
      emptyKey="p3.empty"
      actions={actions}
      status={status}
      language={language}
      display={display}
      onRetry={onRetry}
      onBack={onBack}
    />
  );
}
