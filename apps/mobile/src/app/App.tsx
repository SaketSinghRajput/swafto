/**
 * THE APP. One switch, ten screens, and no logic of its own.
 *
 * Everything here is wiring: the session says which screen, the screen gets the
 * store and its callbacks, and every callback is a session method. There is no
 * decision in this file that is not "which component renders" - deliberately,
 * because a composition root that starts deciding things becomes the place
 * nobody tests and everybody edits.
 *
 * IT TAKES A SESSION RATHER THAN MAKING ONE. The caller builds the session with
 * a real store, a real clock and a real id source; a test builds it with a
 * frozen clock and counted ids. Neither is a special case of the other.
 *
 * NO BOTTOM NAV ANYWHERE IN IT. The §B.6 keypad rule is per-screen and each
 * screen asserts it, but the rule can only hold if nothing above them adds a
 * navigation bar to every screen at once. So the app renders exactly one screen
 * and no chrome around it.
 */
import { Today } from '../screens/T1.tsx';
import { DayCloseList } from '../screens/T5.tsx';
import { OpeningCash } from '../screens/T6.tsx';
import { FormA } from '../screens/T7.tsx';
import { FormB } from '../screens/T8.tsx';
import { FormC } from '../screens/T9.tsx';
import { FormD } from '../screens/T10.tsx';
import { CashCheck } from '../screens/T11.tsx';
import { CashDifference } from '../screens/T12.tsx';
import { DayClosed } from '../screens/T14.tsx';
import { ConsentNotice } from '../screens/X0.tsx';
import type { Session, ScreenId } from './session.tsx';
import type { LoadStatus } from '../components/Shell.tsx';
import type { CommitOption } from '../components/EntryForm.tsx';
import type { Entry, Mode as PaymentMode } from '@swafto/formula-engine';
import type { ConsentPurpose } from '@swafto/values';

export interface AppProps {
  readonly session: Session;
  /**
   * What happens when he agrees. The decision goes to whoever owns the network -
   * this file has none, and the sign-in call is the host's, not a screen's.
   */
  readonly onConsent?: (decision: ReturnType<Session['agreeConsent']>) => void;
  /**
   * One purpose changed on the consent screen, after the account exists.
   *
   * It fires on the TOGGLE rather than on the button, because withdrawal has
   * to take effect: a screen that collects a withdrawal and posts it only if
   * he also finds the Save button is friction, and friction is how the
   * "as easy as giving" requirement is usually broken.
   */
  readonly onConsentChange?: (purpose: ConsentPurpose, granted: boolean) => void;
  /** He asked to see the consent screen. The host fetches what is in force. */
  readonly onOpenPrivacy?: () => void;
  /** Loading and error belong to whatever is opening the day, not to a screen. */
  readonly status?: LoadStatus;
  readonly onRetry?: () => void;
}

/**
 * Which form opens for each section, when a Today row is tapped.
 *
 * Today's rows are the only route into the forms, so a section missing from
 * here is a section he cannot reach. Exhaustive by type, not by memory.
 */
const FORM_FOR_SECTION: Record<Entry['section'], ScreenId> = {
  cash_sales: 'T7',
  upi_sales: 'T7',
  udhar_sales: 'T8',
  udhar_collection: 'T8',
  party_payment: 'T8',
  purchase: 'T9',
  expense: 'T9',
  withdrawal: 'T10',
};

/**
 * T7 reports a payment MODE rather than a full option, because Form A's three
 * buttons are three modes of one thing. The section each mode belongs to is
 * IN1's rule, restated here only to turn the mode back into an option.
 */
const SALES_COMMIT: Record<'cash' | 'upi' | 'udhar', CommitOption> = {
  cash: { labelKey: 'formA.mode.cash', section: 'cash_sales', mode: 'cash' },
  upi: { labelKey: 'formA.mode.upi', section: 'upi_sales', mode: 'upi' },
  udhar: { labelKey: 'formA.mode.udhar', section: 'udhar_sales', mode: 'udhar' },
};

export function App({
  session,
  status = 'ready',
  onRetry = () => {},
  onConsent = () => {},
  onConsentChange = () => {},
  onOpenPrivacy = () => {},
}: AppProps) {
  const {
    screen,
    language,
    display,
    draftPaise,
    countedPaise,
    reason,
    grantedConsents,
    consentMode,
  } = session.state;
  const store = session.store;

  const common = { status, language, display, onRetry } as const;
  const entry = {
    ...common,
    store,
    draftPaise,
    onKey: (k: Parameters<Session['press']>[0]) => session.press(k),
  } as const;

  switch (screen) {
    case 'X0':
      return (
        <ConsentNotice
          {...common}
          mode={consentMode}
          granted={grantedConsents}
          onToggle={(purpose) => {
            session.toggleConsent(purpose);
            if (consentMode === 'manage') {
              onConsentChange(purpose, session.state.grantedConsents.includes(purpose));
            }
          }}
          onAgree={() => {
            const decision = session.agreeConsent();
            if (consentMode === 'signup') onConsent(decision);
          }}
        />
      );

    case 'T5':
      return (
        <DayCloseList
          {...common}
          store={store}
          onOpenSection={(s) => session.goTo(FORM_FOR_SECTION[s])}
          onSkipSection={(s) => session.skipSection(s)}
        />
      );

    case 'T6':
      return (
        <OpeningCash
          {...common}
          draftPaise={draftPaise}
          onKey={(k) => session.press(k)}
          onConfirm={() => session.confirmOpeningCash()}
        />
      );

    case 'T7':
      return (
        <FormA
          {...entry}
          onCommit={(mode: PaymentMode) => {
            const option = SALES_COMMIT[mode as 'cash' | 'upi' | 'udhar'];
            if (option) session.commit(option);
          }}
        />
      );

    case 'T8':
      return <FormB {...entry} onCommit={(option) => session.commit(option)} />;

    case 'T9':
      return <FormC {...entry} onCommit={(option) => session.commit(option)} />;

    case 'T10':
      return <FormD {...entry} onCommit={(option) => session.commit(option)} />;

    case 'T11':
      return (
        <CashCheck
          {...common}
          store={store}
          countedPaise={draftPaise}
          onKey={(k) => session.press(k)}
          onConfirm={() => session.confirmCount()}
        />
      );

    case 'T12':
      return (
        <CashDifference
          {...common}
          store={store}
          countedPaise={countedPaise ?? 0}
          reason={reason}
          onChooseReason={(key) => session.setReason(key)}
          onReasonText={(t) => session.setReason(t)}
          onClose={() => session.closeDay()}
        />
      );

    case 'T14':
      return <DayClosed {...common} store={store} />;

    case 'T1':
    default:
      return (
        <Today
          {...common}
          store={store}
          onCloseDay={() => session.goTo('T11')}
          onOpenPrivacy={onOpenPrivacy}
          onOpenSection={(s) => session.goTo(FORM_FOR_SECTION[s as Entry['section']] ?? 'T7')}
        />
      );
  }
}
