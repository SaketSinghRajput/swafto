/**
 * THE APP. One switch, eighteen screens, and no logic of its own.
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
import { Adjustment } from '../screens/T19.tsx';
import { CashDifference } from '../screens/T12.tsx';
import { DayClosed } from '../screens/T14.tsx';
import { CorrectDay } from '../screens/T16.tsx';
import { ReturnOrExchange } from '../screens/T18.tsx';
import { ItemsForSale } from '../screens/I1.tsx';
import { YourItems } from '../screens/S9.tsx';
import { allows, BETA } from './plan.ts';
import { ConsentNotice } from '../screens/X0.tsx';
import { TodayFirstRun } from '../screens/T2.tsx';
import { TodayClosed } from '../screens/T3.tsx';
import { CashBalanced } from '../screens/T13.tsx';
import { Onboarding } from '../screens/X1.tsx';
import { PartiesList } from '../screens/P1.tsx';
import { Settings } from '../screens/S1.tsx';
import { ShopProfile } from '../screens/S2.tsx';
import { LanguageSettings } from '../screens/S3.tsx';
import { PrivacySettings } from '../screens/S4.tsx';
import { About } from '../screens/S5.tsx';
import { Help } from '../screens/S6.tsx';
import { DeleteAccount } from '../screens/S7.tsx';
import { ConfirmDelete } from '../screens/S8.tsx';
import { YourPlan } from '../screens/S10.tsx';
import { playSubscriptionsUrl, type BasePlan } from './plan.ts';
import { Reports } from '../screens/R1.tsx';
import { Dashboard } from '../screens/M1.tsx';
import { Ask } from '../screens/C1.tsx';
import { CustomerDetail } from '../screens/P2.tsx';
import { SupplierDetail } from '../screens/P3.tsx';
import { Splash } from '../screens/A1.tsx';
import { LanguageChoice } from '../screens/A2.tsx';
import { PhoneNumber } from '../screens/A3.tsx';
import { CodeEntry } from '../screens/A4.tsx';
import { CodeProblem } from '../screens/A5.tsx';
import { SessionExpired } from '../screens/A6.tsx';
import { NumberChanged } from '../screens/A7.tsx';
import { LogoutConfirm } from '../screens/A8.tsx';
import { AppLocked } from '../screens/S11.tsx';
import { CreditLimit } from '../screens/P6.tsx';
import { AccountantExport } from '../screens/S12.tsx';
import { YourData } from '../screens/S13.tsx';
import { SignedInPhones } from '../screens/S14.tsx';
import { View, Text, Pressable, PixelRatio } from '@swafto/ui';
import { tokens, setTextSize } from '../theme/tokens.ts';
import { strings, type StringKey } from '../i18n/strings.ts';
import type { Session, ScreenId } from './session.tsx';
import type { LoadStatus, TabKey } from '../components/Shell.tsx';
import type { CommitOption } from '../components/EntryForm.tsx';
import type { Entry, Mode as PaymentMode, Section } from '@swafto/formula-engine';
import { addDays, DEMAND_GATES } from '@swafto/formula-engine';
import { ItemCards } from '../components/ItemCards.tsx';
import { CHROME_FONT_SCALE_CAP, type ConsentPurpose } from '@swafto/values';
import { WEB_PAGE_URLS } from '../platform/endpoint.ts';
import { Money } from '../components/Money.tsx';

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
  /**
   * The network half of sign-in, which this file does not own. The host
   * implements it; absent, every sign-in action is a no-op and Settings shows
   * no account row - which is exactly the app as it was before the A-series.
   */
  readonly auth?: AuthActions;
  /**
   * F-23: open a web page (the policy, the terms, the deletion page). The host
   * owns `Linking`; absent, the rows do nothing, as in a test.
   */
  readonly onOpenUrl?: (url: string) => void;
  /**
   * M3: "Exit" on the "Exit the app?" sheet. The host owns leaving the app
   * (`BackHandler.exitApp`); absent, as in a test, it only puts the sheet away.
   */
  readonly onExitApp?: () => void;
  /** M3: the phone's Date and time settings (C-19). Absent: the banner gives the words instead. */
  readonly onOpenDateSettings?: () => void;
  /**
   * M3, S13 and S14: the host's network half - the export, the device list
   * and a sign-out. Absent, as in a test, the screens render and do nothing.
   */
  readonly onExportMyData?: () => void;
  readonly onLoadDevices?: () => void;
  readonly onSignOutDevice?: (deviceId: string) => void;
  /**
   * PR-7: the plan's network half - the server's answer, the preview, Play's
   * purchase sheet. `Host` implements it; absent, S10 still renders and its
   * buttons do nothing, as in a test.
   */
  readonly plan?: PlanActions;
  /**
   * R5 FR-3: the cover's Unlock and S1's switch. The host owns both (it holds
   * the phone's screen lock); absent, they do nothing, as in a test.
   */
  readonly onUnlock?: () => void;
  readonly onToggleAppLock?: () => void;
  /**
   * R5 FR-1, FR-2, FR-4: HANDING TEXT TO ANOTHER APP, which the host owns.
   * `onOpenWhatsApp` tries the app link and then the web one; `onShareText`
   * is the share sheet with a message; `onShareFile` is a file (the CSV).
   * Absent, they do nothing, as in a test. Nothing here sends anything.
   */
  readonly onOpenWhatsApp?: (urls: { readonly app: string; readonly web: string }) => void;
  readonly onShareText?: (text: string) => void;
  readonly onShareFile?: (fileName: string, text: string) => void;
}

/** What S10 needs from whoever holds the network and Play Billing. */
export interface PlanActions {
  refreshPlan(): unknown;
  startPreview(): unknown;
  buyPremium(basePlan: BasePlan): unknown;
}

/** What the A-series needs from whoever holds the network. */
export interface AuthActions {
  readonly signedIn: boolean;
  sendCode(): unknown;
  verifyCode(): unknown;
  logOut(): unknown;
  /** F-22: S8's "Delete everything". `Host.deleteAccount`. */
  deleteAccount?(): unknown;
}

/**
 * Which form opens for each section, when a Today row is tapped.
 *
 * Today's rows are the only route into the forms, so a section missing from
 * here is a section he cannot reach. Exhaustive by type, not by memory.
 */
/*
 * The map moved to `screens/entryRoutes.ts` and grew the half it was missing.
 * It used to answer only "which screen", which is why three tiles that all
 * open T8 arrived with T8's first segment live - a collection - and Pay
 * recorded money coming in. The route now carries the segment too, searched
 * out of the form's own commit table so the two cannot drift apart.
 */

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

function Screen({
  session,
  status = 'ready',
  onRetry = () => {},
  onConsent = () => {},
  onConsentChange = () => {},
  onOpenPrivacy = () => {},
  auth,
  onOpenUrl = () => {},
  onExitApp,
  onOpenDateSettings,
  onExportMyData,
  onLoadDevices = () => {},
  onSignOutDevice = () => {},
  plan,
  onToggleAppLock = () => {},
  onOpenWhatsApp = () => {},
  onShareText = () => {},
  onShareFile = () => {},
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
    partyId,
    shopName,
  } = session.state;
  const store = session.store;

  const common = { status, language, display, onRetry } as const;

  /**
   * THE THREE TABS, ROUTED IN ONE PLACE.
   *
   * SPEC-DIGEST C-5 rules three destinations - Today, Parties, Reports.
   * Mapping them here rather than at each tab bar means every screen that
   * carries the nav agrees about where the tabs go; the alternative is three
   * call sites that each decide, and the one that drifts sends Parties
   * somewhere else from one screen only.
   *
   * `today` goes to the ROUTE id, never to a face. `todayFace()` below decides
   * whether that route renders T1, T2 or T3 by reading the day itself, so the
   * tab cannot land a shopkeeper on entry rails for a day he has closed.
   */
  const onSelectTab = (key: TabKey): void => {
    if (key === 'today') session.goTo('T1');
    else if (key === 'parties') session.goTo('P1');
    else session.goTo('R1');
  };

  /**
   * WHICH TODAY. The day decides, not the route.
   *
   * T2 is the first morning - nothing carried and nothing entered, so the only
   * honest thing to ask for is the opening cash. T3 is a day already closed,
   * which is frozen (D7) and must offer a correction rather than a rail. T1 is
   * the ordinary open day.
   *
   * Deriving it here rather than carrying three route ids means there is no
   * state in which the screen and the day disagree. The alternative was for
   * every caller that wanted "Today" to work out which Today, and the first one
   * that got it wrong would show entry rails on a day he had already closed.
   */
  const todayFace = () => {
    const day = store.state.day;
    // M3: "Exit the app?" - the same question on every face of Today.
    const exitPrompt =
      session.state.exitPrompt === true
        ? {
            onStay: () => session.stayInApp(),
            onExit: () => {
              session.stayInApp();
              onExitApp?.();
            },
          }
        : undefined;

    if (day.state === 'closed') {
      return (
        <TodayClosed
          {...common}
          store={store}
          onSelectTab={onSelectTab}
          /* HT-11: to T16, the correction itself - T5 is the open day's list, and a frozen day has none. */
          onPostCorrection={() => session.openCorrection()}
          onOpenSummary={() => session.goTo('T14')}
          onOpenPrivacy={onOpenPrivacy}
          onOpenSettings={() => session.goTo('S1')}
          onOpenChat={() => session.openChat('T1')}
          exitPrompt={exitPrompt}
        />
      );
    }

    if (day.openingCash === null && store.state.entries.length === 0) {
      return (
        <TodayFirstRun
          {...common}
          store={store}
          onEnterOpeningCash={() => session.goTo('T6')}
          exitPrompt={exitPrompt}
        />
      );
    }

    return (
      <Today
        {...common}
        store={store}
        /*
         * HT-1: TO THE DAY-CLOSE LIST, AS THE REFERENCE ROUTES IT. Straight to
         * the cash count left T5 reachable only from a CLOSED day, so on an
         * open day a withdrawal (T10, opened from T5 alone) could not be
         * recorded and no section could be marked empty. Found by the human
         * tester on the device.
         */
        onCloseDay={() => session.goTo('T5')}
        onOpenPrivacy={onOpenPrivacy}
        onSelectTab={onSelectTab}
        onOpenSettings={() => session.goTo('S1')}
        onOpenChat={() => session.openChat('T1')}
        onOpenSection={(s) => session.openSection(s as Section)}
        onOpenParty={(id) => session.openParty(id)}
        onOpenDateSettings={onOpenDateSettings}
        exitPrompt={exitPrompt}
      />
    );
  };
  const entry = {
    ...common,
    store,
    draftPaise,
    onKey: (k: Parameters<Session['press']>[0]) => session.press(k),
    /*
     * THE PARTY, CARRIED THROUGH. None of these existed, which is why Credit,
     * Collect and Pay silently did nothing: the parser demanded a person, no
     * screen could name one, and the refusal went into `lastRefusal`, which
     * nothing renders.
     *
     * Opening the picker is NOT a `goTo` - it is a flag on the same screen, so
     * the half-typed amount survives being interrupted to choose a customer.
     */
    entryPartyId: session.state.entryPartyId,
    /* USABILITY item 6: the entry just saved, so the form can say so and show it first. */
    savedId: session.state.lastSavedId ?? null,
    pickingParty: session.state.pickingParty,
    onOpenPartyPicker: () => {
      session.openPartyPicker();
    },
    onChooseParty: (partyId: string) => {
      session.chooseEntryParty(partyId);
    },
    onCancelPartyPicker: () => {
      session.closePartyPicker();
    },
    /* F-10: the picker can add a party, so a new shop's credit book opens. */
    newParty: {
      draft: session.state.newParty,
      onStart: () => session.startNewParty(),
      onName: (name: string) => session.setNewPartyName(name),
      onPhone: (phone: string) => session.setNewPartyPhone(phone),
      onSave: (kind: 'customer' | 'supplier') => {
        session.createParty(kind);
      },
      onCancel: () => session.cancelNewParty(),
    },
    /*
     * A VISIBLE WAY BACK, WHICH THE DEVICE SHOWED WAS MISSING.
     *
     * `EntryForm` has accepted `onBack` since the redesign and nothing ever
     * passed it, so all four entry forms rendered a header with no way out and
     * the only exit was the hardware key. That is the defect the back
     * affordance was built to fix, left in place because the prop was wired at
     * one end only - invisible to every instrument, because no check asserts
     * that a screen OFFERS the route its parent map already knows about.
     *
     * `session.back()` rather than `goTo('T1')`: an entry form is reached from
     * Today AND from the day-close list, and the parent map is the one place
     * that knows which. Hard-coding T1 here would send a shopkeeper working
     * down the nine sections back to the front door on every save.
     */
    /*
     * THE SEGMENT, WIRED AT BOTH ENDS AT LAST.
     *
     * `EntryForm` has taken `selectedCommit` and `onSelectCommit` since the
     * segmented control replaced the three commit buttons. All four form
     * screens declared them and forwarded them. Nothing ever passed them, so
     * `selectedCommit` stayed at its default of 0 and `onSelectCommit` stayed
     * the no-op: the control highlighted on tap and changed nothing, and every
     * form could only ever write its first option. A UPI sale, a credit sale, a
     * supplier payment and every non-cash expense were unreachable in the
     * shipped app while all four passed their tests - because the tests passed
     * the prop in themselves.
     *
     * Exactly the defect the `onBack` comment above describes, one prop over.
     */
    selectedCommit: session.state.selectedCommit,
    onSelectCommit: (index: number) => {
      session.selectCommit(index);
    },
    onBack: () => {
      session.back();
    },
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
          justWithdrawn={session.state.consentWithdrawn ?? null}
          onBack={() => session.back()}
        />
      );

    case 'T5':
      return (
        <DayCloseList
          {...common}
          store={store}
          onOpenSection={(s) => session.openSection(s as Section)}
          onSkipSection={(s) => session.skipSection(s as Section)}
          onUnskipSection={(s) => session.unskipSection(s as Section)}
          onOpenCashCheck={() => session.goTo('T11')}
          onConfirmUpi={(ids) => {
            session.confirmUpi(ids);
          }}
          onAddAdjustment={() => session.goTo('T19')}
          onBack={() => session.back()}
        />
      );

    case 'T19':
      return (
        <Adjustment
          {...common}
          store={store}
          type={session.state.adjustmentType ?? null}
          amountPaise={draftPaise}
          onChooseType={(type) => session.chooseAdjustmentType(type)}
          onKey={(k) => session.press(k)}
          onSave={() => {
            session.saveAdjustment();
          }}
          onBack={() => session.back()}
        />
      );

    case 'T6':
      return (
        <OpeningCash
          {...common}
          draftPaise={draftPaise}
          onKey={(k) => session.press(k)}
          // HT-30: in focus the keypad waits for a tap on the figure, as on X1.
          keypadOpen={display !== 'focus' || session.state.onboardingKeypad}
          onKeypad={(open) => session.setOnboardingKeypad(open)}
          onConfirm={() => session.confirmOpeningCash()}
          onBack={() => session.back()}
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
          onOpenReturns={() => session.openReturns()}
          plan={session.plan}
          onOpenItems={() => session.openItems()}
        />
      );

    case 'I1': {
      // Back from a chosen sale is back to the list; from the list, the sales form.
      const itemFlow = session.state.itemFlow ?? null;
      return (
        <ItemsForSale
          {...common}
          store={store}
          plan={session.plan}
          flow={itemFlow}
          onChooseSale={(id) => session.chooseItemSale(id)}
          onChooseItem={(id) => session.chooseLineItem(id)}
          onChangeItem={() => session.clearLineItem()}
          onField={(f) => session.setItemField(f)}
          onKey={(k) => session.press(k)}
          onSave={() => {
            session.saveItemLine();
          }}
          onBack={() => {
            if (itemFlow?.saleId) session.openItems();
            else session.back();
          }}
        />
      );
    }

    case 'S9':
      return (
        <YourItems
          {...common}
          store={store}
          plan={session.plan}
          draftName={session.state.itemName ?? ''}
          onName={(name) => session.setItemName(name)}
          onAdd={() => {
            session.addItem();
          }}
          onBack={() => session.back()}
        />
      );

    case 'T18': {
      /*
       * BACK FROM A FORM IS BACK TO THE LIST, not out to the sales form: he
       * chose the wrong sale, he did not mean to leave. From the list, the
       * parent map's T7.
       */
      const flow = session.state.returnFlow;
      const inForm = flow !== null && (flow.saleId !== null || flow.settleId !== null);
      return (
        <ReturnOrExchange
          {...common}
          store={store}
          flow={flow}
          onKey={(k) => session.press(k)}
          onChooseSale={(id) => session.chooseReturnSale(id)}
          onChooseSettle={(id) => session.chooseSettleReturn(id)}
          onSettlement={(c) => session.setReturnSettlement(c)}
          onField={(f) => session.setReturnField(f)}
          onDifferenceMode={(m) => session.setDifferenceMode(m)}
          onSettleMode={(m) => session.setSettleMode(m)}
          onSave={() => {
            session.commitReturn();
          }}
          onSettle={() => {
            session.commitSettlement();
          }}
          entryPartyId={entry.entryPartyId}
          pickingParty={entry.pickingParty}
          onOpenPartyPicker={entry.onOpenPartyPicker}
          onChooseParty={entry.onChooseParty}
          onCancelPartyPicker={entry.onCancelPartyPicker}
          newParty={entry.newParty}
          onBack={() => {
            if (inForm) session.backToReturnList();
            else session.back();
          }}
        />
      );
    }

    case 'T16':
      return (
        <CorrectDay
          {...common}
          store={store}
          correction={session.state.correction}
          draftPaise={draftPaise}
          onKey={(k) => session.press(k)}
          onChoose={(id) => session.chooseCorrectionTarget(id)}
          onAdd={() => {
            session.commitCorrection();
          }}
          onBack={() => session.back()}
        />
      );

    case 'T8':
      return (
        <FormB
          {...entry}
          onCommit={(option) => session.commit(option)}
          advanceConfirm={session.state.advanceConfirm}
          onConfirmAdvance={(option) => session.confirmAdvance(option)}
          onCancelAdvance={() => session.cancelAdvance()}
        />
      );

    case 'T9':
      /*
       * Form C serves purchase and expense. Which one is the section the tile
       * opened, not the screen - they share T9. Anything that reaches T9
       * without going through `openSection` gets the expense face, which is
       * what this screen has always been.
       */
      return (
        <FormC
          {...entry}
          section={session.state.entrySection === 'purchase' ? 'purchase' : 'expense'}
          onCommit={(option) => session.commit(option)}
        />
      );

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
          /* USABILITY item 9: above the chrome cap the pad waits for a tap, so the working list has the screen. */
          keypadOpen={PixelRatio.getFontScale() <= CHROME_FONT_SCALE_CAP || session.state.onboardingKeypad}
          onKeypad={(open) => session.setOnboardingKeypad(open)}
          onBack={() => session.back()}
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
          onRecount={() => session.back()} // HT-23: T12's parent is the count, T11
          onClose={() => session.closeDay()}
          onBack={() => session.back()}
        />
      );

    case 'T13':
      return (
        <CashBalanced
          {...common}
          store={store}
          countedPaise={countedPaise ?? 0}
          onCloseDay={() => session.closeDay()}
          onBack={() => session.back()}
        />
      );

    case 'T14':
      return (
        <DayClosed
          {...common}
          store={store}
          onBack={() => session.back()}
          onDone={() => session.goTo('T1')}
        />
      );

    case 'X1':
      return (
        <Onboarding
          {...common}
          shopName={shopName}
          openingCashPaise={draftPaise}
          onShopName={(name) => session.setShopName(name)}
          onLanguage={(l) => session.setLanguage(l)}
          onDisplay={(d) => session.setDisplay(d)}
          onKey={(k) => session.press(k)}
          keypadOpen={session.state.onboardingKeypad}
          onKeypad={(open) => session.setOnboardingKeypad(open)}
          onFinish={() => session.finishOnboarding()}
        />
      );

    case 'P1':
      return (
        <PartiesList
          {...common}
          store={store}
          onSelectTab={onSelectTab}
          onOpenParty={(id) => session.openParty(id)}
        />
      );

    /*
     * SETTINGS, AND THE SIX PLACES IT LEADS.
     *
     * C-5 leaves no fourth tab, so this hub is reached from the Today canvas.
     * Three of its rows are not preferences at all - the in-app deletion path
     * Google Play requires, the privacy notice Apple 5.1.1(i) requires inside
     * the app, and the grievance officer the DPDP Act requires - and none of
     * them had a route before.
     */
    case 'S1':
      return (
        <Settings
          {...common}
          store={store}
          shopName={shopName}
          onBack={() => session.back()}
          onOpenShop={() => session.goTo('S2')}
          onOpenLanguage={() => session.goTo('S3')}
          // PR-7: open S10 and ask the server again, so the status is today's.
          onOpenPlan={
            BETA.allFree
              ? undefined
              : () => {
                  session.goTo('S10');
                  void plan?.refreshPlan();
                }
          }
          onOpenPrivacy={() => session.goTo('S4')}
          onOpenAbout={() => session.goTo('S5')}
          onOpenHelp={() => session.goTo('S6')}
          onDeleteAccount={() => session.goTo('S7')}
          // PR-1: on Premium, or to read a list recorded under Premium after a lapse.
          onOpenItems={
            allows(session.plan, 'items') || store.items.length > 0 ? () => session.goTo('S9') : undefined
          }
          /*
           * SIGN-IN FROM SETTINGS is the door for a handset that already holds
           * a book and no session - every tester from before the A-series. It
           * goes through the consent notice first, because an account may be
           * created on the far side of the code.
           */
          onSignIn={
            auth && !auth.signedIn ? () => session.chooseLanguage(language) : undefined
          }
          onLogOut={auth?.signedIn ? () => session.goTo('A8') : undefined}
          appLock={session.state.appLock === true}
          appLockUnavailable={session.state.lockNote === 'noScreenLock'}
          onToggleAppLock={onToggleAppLock}
          onOpenExport={() => session.goTo('S12')}
          // M3 (M2-approved): Your data, and - with an account - Signed-in phones.
          onOpenYourData={() => session.openYourData()}
          onOpenDevices={
            auth?.signedIn
              ? () => {
                  session.openDevices();
                  onLoadDevices();
                }
              : undefined
          }
        />
      );

    /*
     * THE A-SERIES. Every network step is the host's (`auth`); every screen
     * change on an answer is the session's. Nothing here decides whether a
     * request succeeded - the host does, and only after the response.
     */
    case 'A1':
      return <Splash language={language} display={display} onContinue={() => session.goTo('A2')} />;

    case 'A2':
      return <LanguageChoice {...common} onChoose={(l) => session.chooseLanguage(l)} />;

    case 'A3':
      return (
        <PhoneNumber
          {...common}
          phone={session.state.auth.phone}
          busy={session.state.auth.busy}
          problem={session.state.auth.problem}
          onKey={(k) => session.pressPhone(k)}
          onSend={() => void auth?.sendCode()}
          onChangedNumber={() => session.openNumberChange()}
          onBack={() => session.back()}
        />
      );

    case 'A4':
      return (
        <CodeEntry
          {...common}
          phone={session.state.auth.phone}
          code={session.state.auth.code}
          busy={session.state.auth.busy}
          problem={session.state.auth.problem}
          resends={session.state.auth.resends}
          onKey={(k) => {
            if (session.pressCode(k)) void auth?.verifyCode();
          }}
          onEditPhone={() => session.goTo('A3')}
          onResend={() => void auth?.sendCode()}
          onRetryVerify={() => void auth?.verifyCode()}
          onTrouble={() => session.openNumberChange()}
          onNoCode={() => session.authFailed('noCode')}
          onBack={() => session.back()}
        />
      );

    case 'A5':
      return (
        <CodeProblem
          {...common}
          problem={session.state.auth.problem}
          retryAfterSeconds={session.state.auth.retryAfterSeconds}
          busy={session.state.auth.busy}
          onSendNew={() => void auth?.sendCode()}
          onBack={() => session.back()}
        />
      );

    case 'A6':
      return (
        <SessionExpired
          {...common}
          shopName={store.state.shopName ?? ''}
          phone={session.state.auth.phone}
          busy={session.state.auth.busy}
          problem={session.state.auth.problem}
          onVerify={() =>
            session.state.auth.phone.length === 10 ? void auth?.sendCode() : session.goTo('A3')
          }
        />
      );

    case 'A7':
      return (
        <NumberChanged
          {...common}
          stage={session.state.auth.recovery}
          onHaveOld={() => session.goTo('A3')}
          onNoOld={() => session.setRecovery('handoff')}
          onOpenHelp={() => onOpenUrl(WEB_PAGE_URLS.privacy)}
          onBack={() =>
            session.state.auth.recovery === 'handoff'
              ? session.setRecovery('decide')
              : session.back()
          }
        />
      );

    case 'A8':
      return (
        <LogoutConfirm
          {...common}
          shopName={store.state.shopName ?? ''}
          phone={session.state.auth.phone}
          pendingEntries={store.pendingOutbox.filter((r) => r.kind === 'entry').length}
          onStay={() => session.back()}
          onLogOut={() => void auth?.logOut()}
        />
      );

    /*
     * A PARTY PAGE WITH NO PARTY IS NOT A STATE, so these fall through to Today
     * rather than rendering a ledger with no name on it. `session.openParty`
     * refuses an unknown id, so the only way to reach this line is a caller that
     * set the screen directly - and Today is the honest place to land.
     */
    case 'P2':
      return partyId === null ? (
        todayFace()
      ) : (
        <CustomerDetail
          {...common}
          store={store}
          partyId={partyId}
          /* With the party named and the right segment live - not T8's first segment, nobody named. */
          onRecordCollection={() => session.openSectionFor('udhar_collection', partyId)}
          onNewUdhar={() => session.openSectionFor('udhar_sales', partyId)}
          phoneDraft={session.state.phoneDraft}
          onPhoneDraft={(phone) => session.setPhoneDraft(phone)}
          onSavePhone={() => {
            session.savePartyPhone();
          }}
          onRemind={() => {
            const urls = session.whatsappReminder();
            if (urls !== null) onOpenWhatsApp(urls);
          }}
          onShareStatement={() => {
            const text = session.statement();
            if (text !== null) onShareText(text);
          }}
          onOpenCreditLimit={() => session.openCreditLimit()}
          onBack={() => session.back()}
        />
      );

    case 'P6':
      return partyId === null ? (
        todayFace()
      ) : (
        <CreditLimit
          {...common}
          store={store}
          partyId={partyId}
          amountPaise={draftPaise}
          onKey={(k) => session.press(k)}
          onSave={() => {
            session.saveCreditLimit();
          }}
          onClear={() => {
            session.saveCreditLimit(true);
          }}
          onBack={() => session.back()}
        />
      );

    case 'S12':
      return (
        <AccountantExport
          {...common}
          store={store}
          onShareMonth={(month) => {
            const file = session.accountantExport(month);
            onShareFile(file.fileName, file.text);
          }}
          onBack={() => session.back()}
        />
      );

    case 'P3':
      return partyId === null ? (
        todayFace()
      ) : (
        <SupplierDetail
          {...common}
          store={store}
          partyId={partyId}
          /* goTo('T8') armed a customer COLLECTION from a supplier page. */
          onRecordPayment={() => session.openSectionFor('party_payment', partyId)}
          onBack={() => session.back()}
        />
      );

    /*
     * REPORTS - the third of C-5's tabs, and therefore a tab rather than a
     * detail screen: it carries the nav and has no back affordance.
     */
    case 'R1':
      return (
        <Reports
          {...common}
          store={store}
          onSelectTab={onSelectTab}
          onOpenDashboard={() => session.goTo('M1')}
          onOpenChat={() => session.openChat('R1')}
        />
      );

    /*
     * M1 - THE PREMIUM DASHBOARD, drawn for the session's plan. On free it
     * offers S10, opened the way Settings opens it.
     */
    case 'M1':
      return (
        <Dashboard
          {...common}
          store={store}
          plan={session.state.plan}
          onUpgrade={() => {
            session.goTo('S10');
            void plan?.refreshPlan();
          }}
          // PR-2 in PR-6's slot: the item history over the demand estimate's own window.
          itemCards={({ display: d }) => {
            const to = store.state.day.date;
            const from = addDays(to, 1 - DEMAND_GATES.windowDays);
            return (
              <ItemCards
                reports={store.itemReports({ from, to })}
                items={store.items}
                plan={session.state.plan}
                language={language}
                display={d}
              />
            );
          }}
          onBack={() => session.back()}
        />
      );

    /* C1 - ASK, answering for the session's plan (FR-8 free, PR-5 Premium). */
    case 'C1':
      return (
        <Ask
          {...common}
          store={store}
          plan={session.state.plan}
          chat={session.state.chat ?? null}
          onDraft={(text) => session.setChatDraft(text)}
          onAsk={() => session.askChat()}
          onChip={(r) => session.askChatChip(r)}
          onBack={() => session.back()}
        />
      );

    case 'S2':
      return (
        <ShopProfile
          {...common}
          store={store}
          shopName={shopName}
          onSelectDayStart={(startsAt) => session.setDayStart(startsAt)}
          onBack={() => session.back()}
        />
      );

    case 'S3':
      return (
        <LanguageSettings
          {...common}
          store={store}
          onSelectLanguage={(l) => session.setLanguage(l)}
          onSelectDisplay={(d) => session.setDisplay(d)}
          textSize={session.state.textSize ?? 'normal'}
          onSelectTextSize={(z) => session.setTextSize(z)}
          onBack={() => session.back()}
        />
      );

    case 'S13':
      return (
        <YourData
          {...common}
          store={store}
          phase={session.state.myData ?? 'idle'}
          // Signed out, the server holds nothing this phone can ask for: the button is disabled.
          onDownload={auth?.signedIn ? onExportMyData : undefined}
          onDeleteAccount={() => session.goTo('S7')}
          onBack={() => session.back()}
        />
      );

    case 'S14':
      return (
        <SignedInPhones
          store={store}
          language={language}
          display={display}
          {...(session.state.devices === undefined ? {} : { devices: session.state.devices })}
          today={session.todayIso()}
          onAskSignOut={(id) => session.askSignOut(id)}
          onCancelSignOut={() => session.cancelSignOut()}
          onConfirmSignOut={(id) => onSignOutDevice(id)}
          onRetry={onLoadDevices}
          onBack={() => session.back()}
        />
      );

    /*
     * S4 routes to the EXISTING consent screen rather than rendering its own
     * toggles. Two places a consent can be recorded is two answers to the only
     * question that matters when the notice changes.
     */
    case 'S4':
      return (
        <PrivacySettings
          {...common}
          store={store}
          /*
           * THE SAME ROUTE TODAY USES, AND THE FIRST VERSION OF THIS WAS WRONG.
           *
           * It called `session.openConsentSettings(grantedConsents)` - the
           * IN-MEMORY set. `openConsentSettings`'s own doc comment says the
           * granted list has to come from the server, "because this handset may
           * not be the one that made the last change, and showing a stale
           * answer on a consent screen is showing him a decision he did not
           * make". Reaching the same screen by two routes that disagree about
           * what he consented to is worse than having one route.
           *
           * `onOpenPrivacy` is the host's: it fetches what is actually in force
           * and then opens the screen. T1's privacy link already used it.
           */
          onReviewConsent={onOpenPrivacy}
          onBack={() => session.back()}
        />
      );

    case 'S5':
      return (
        <About
          {...common}
          store={store}
          onOpenPrivacyPolicy={() => onOpenUrl(WEB_PAGE_URLS.privacy)}
          onOpenTerms={() => onOpenUrl(WEB_PAGE_URLS.terms)}
          // HT-15: the licences row did nothing.
          onOpenLicences={() => onOpenUrl(WEB_PAGE_URLS.licences)}
          deleteAccountUrl={WEB_PAGE_URLS.deleteAccount}
          onOpenDeleteAccount={() => onOpenUrl(WEB_PAGE_URLS.deleteAccount)}
          onBack={() => session.back()}
        />
      );

    case 'S6':
      return <Help {...common} store={store} onBack={() => session.back()} />;

    case 'S7':
      return (
        <DeleteAccount
          {...common}
          store={store}
          onContinue={() => session.goTo('S8')}
          onBack={() => session.back()}
        />
      );

    /*
     * S8 CONFIRMS; THE HOST DELETES (F-22). `Host.deleteAccount` schedules the
     * server erasure, and only once it is accepted signs out and wipes this
     * phone's book. Offline or refused, it is a banner and nothing is deleted.
     */
    case 'S8':
      return (
        <ConfirmDelete
          {...common}
          store={store}
          signedIn={auth?.signedIn !== false}
          outcome={session.state.deletion ?? null}
          onConfirm={() => void auth?.deleteAccount?.()}
          onDone={() => session.finishDeletion()}
          onCancel={() => session.back()}
          onBack={() => session.back()}
        />
      );

    /*
     * S10 - YOUR PLAN (PR-7). Everything it shows is the session's copy of the
     * server's answer and Play's offer; every press is the host's. Cancel opens
     * Play's own subscription page - R4 §5.4's two taps from Settings.
     */
    case 'S10': {
      const { plan: current, planAnswer, planOffer, planBusy, planNotice } = session.state;
      return (
        <YourPlan
          {...common}
          store={store}
          plan={current}
          answer={planAnswer}
          offer={planOffer}
          busy={planBusy}
          notice={planNotice}
          onStartPreview={() => void plan?.startPreview()}
          onBuy={(basePlan) => void plan?.buyPremium(basePlan)}
          onCancel={() => onOpenUrl(playSubscriptionsUrl(planAnswer?.buying?.productId ?? null))}
          onBack={() => session.back()}
        />
      );
    }

    case 'T1':
    default:
      return todayFace();
  }
}

/**
 * EVERY SCREEN, PLUS THE ONE THING NO SCREEN DREW: A REFUSAL.
 *
 * Every refused write - an entry with no customer, a skip on a closed day -
 * landed in `lastRefusal`, and nothing rendered it. The press did nothing and
 * said nothing, which on a ledger reads as "saved". This draws it once, over
 * whichever screen is up, so no screen can forget to.
 */
const REFUSAL_HINT: Readonly<Record<string, StringKey>> = {
  amount: 'refusal.amount',
  partyId: 'refusal.partyId',
  consent: 'refusal.consent',
  consentRead: 'refusal.consentRead',
  partyName: 'party.refusal.name',
  partyPhone: 'party.refusal.phone',
  // F-22 / F-23: the host's deletion and link failures (host.tsx, Root.tsx).
  erase: 'refusal.erase',
  eraseOffline: 'refusal.eraseOffline',
  eraseSignIn: 'refusal.eraseSignIn',
  eraseLocal: 'refusal.eraseLocal',
  openUrl: 'refusal.openUrl',
  shopName: 'x1.refusal.shopName',
  wrongShop: 'refusal.wrongShop',
  // R5: the reminder, the share sheet and the credit limit.
  noPhone: 'refusal.noPhone',
  nothingDue: 'refusal.nothingDue',
  share: 'refusal.share',
  creditLimit: 'refusal.creditLimit',
  itemDuplicate: 'refusal.itemDuplicate',
  // HT-52: a form asked for, or an entry added, on a frozen day (D7) - said as T3 says it.
  dayClosedOpen: 't3.banner',
  dayClosed: 't3.banner',
  // C-17: the open book is for an earlier day - close it first. C-09: over the per-entry ceiling.
  dayStale: 'refusal.dayStale',
  // C-19 residual: today's book was closed while the phone's date was wrong.
  dayClosedWrongDate: 'refusal.dayClosedWrongDate',
  amountTooLarge: 'refusal.amountTooLarge',
  // QA-04 / QA-06 (CTO decisions, 2026-11-18): a Rs 0 entry; the phone's date is behind the book.
  amountZero: 'refusal.amountZero',
  dayFuture: 'refusal.dayFuture',
};

/**
 * HT-43: refusals where nothing was being saved - a reminder, a share, a link.
 * Headed "Not saved" they read as if something had been lost.
 * HT-54: nor a sign-in, a consent read or a deletion; HT-52: nor a form not opened.
 * Listed rather than inverted: a save refusal left off a list would lose "Not saved".
 */
const NOT_A_SAVE: ReadonlySet<string> = new Set([
  'noPhone',
  'nothingDue',
  'share',
  'openUrl',
  'wrongShop',
  'consentRead',
  'erase',
  'eraseOffline',
  'eraseSignIn',
  'eraseLocal',
  'dayClosedOpen',
  'dayStale',
  'dayClosedWrongDate',
  'dayFuture',
]);

export function App(props: AppProps) {
  const { lastRefusal, language, display, locked, lockNote } = props.session.state;
  /*
   * M3: THE TEXT-SIZE STEP IS SET ONCE, HERE, BEFORE ANY SCREEN ASKS FOR A
   * TOKEN. `tokens()` reads it the way it reads the system font scale, so no
   * screen threads it through; the App re-renders on every session change, so
   * a new choice is in force on the very next frame - the live preview.
   */
  setTextSize(props.session.state.textSize ?? 'normal');
  const t = tokens(display);
  const s = strings(language);
  /*
   * R5 FR-3: LOCKED MEANS ONLY THE COVER. Not the cover over the screen - the
   * screen is not rendered at all, so no figure or name is in the tree for an
   * accessibility service or a screenshot to read. The session keeps the
   * screen and the draft; rendering resumes them on unlock.
   */
  if (locked) {
    return (
      <AppLocked
        store={props.session.store}
        language={language}
        display={display}
        onUnlock={props.onUnlock ?? (() => {})}
      />
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <Screen {...props} />
      {lastRefusal ? (
        <Pressable
          testID="refusal"
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          accessibilityLabel={s(NOT_A_SAVE.has(lastRefusal.field) ? 'refusal.titleNotDone' : 'refusal.title')}
          onPress={() => props.session.dismissRefusal()}
          style={{
            position: 'absolute',
            /*
             * HT-53: CLEAR OF THE HEADER'S BACK. Laid over it, a tap on Back
             * landed on the banner and only dismissed it, so Back looked dead.
             * The back control is md in from the edge, control.md wide, sm before
             * the title (Shell), so the banner starts after it.
             */
            left: t.space.md + t.control.md + t.space.sm,
            right: t.space.md,
            top: t.space.md,
            minHeight: t.touchTarget,
            padding: t.space.md,
            borderRadius: t.radius.md,
            backgroundColor: t.color.surface,
            borderWidth: t.hairline,
            borderColor: t.color.negative,
            /*
             * QA-10: ABOVE THE HEADER, WHICH HAS ELEVATION. Android draws a
             * higher `elevation` over a lower one whatever the tree order, so
             * an unelevated banner was painted UNDER the header and its first
             * line was cut off. The sheet level is the highest this app uses.
             */
            elevation: t.elevation.sheet,
            zIndex: 1,
          }}
        >
          <Text
            maxFontSizeMultiplier={t.maxFontScale}
            style={{ fontFamily: t.font.bold, fontSize: t.type.body, color: t.color.negative }}
          >
            {s(NOT_A_SAVE.has(lastRefusal.field) ? 'refusal.titleNotDone' : 'refusal.title')}
          </Text>
          <Text
            maxFontSizeMultiplier={t.maxFontScale}
            style={{ fontFamily: t.font.regular, fontSize: t.type.body, color: t.color.ink }}
          >
            {s(lastRefusal.left !== undefined ? 'refusal.itemOverSale' : (REFUSAL_HINT[lastRefusal.field] ?? 'refusal.other'))}
          </Text>
          {lastRefusal.left !== undefined ? (
            <Money testID="refusal-left" amount={lastRefusal.left} mode={display} size="body" />
          ) : null}
        </Pressable>
      ) : null}
      {lockNote === 'paused' ? (
        <Pressable
          testID="lock-paused"
          accessibilityRole="alert"
          accessibilityLabel={s('s11.paused')}
          onPress={() => props.session.setLock({ lockNote: null })}
          style={{
            position: 'absolute',
            left: t.space.md,
            right: t.space.md,
            bottom: t.space.md,
            minHeight: t.touchTarget,
            padding: t.space.md,
            borderRadius: t.radius.md,
            backgroundColor: t.color.surface,
            borderWidth: t.hairline,
            borderColor: t.color.inkMuted,
          }}
        >
          <Text
            maxFontSizeMultiplier={t.maxFontScale}
            style={{ fontFamily: t.font.regular, fontSize: t.type.body, color: t.color.ink }}
          >
            {s('s11.paused')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
