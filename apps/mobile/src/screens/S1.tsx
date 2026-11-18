/**
 * S1 - SETTINGS. The hub, and most of what hangs off it is not a preference.
 *
 * WHY THIS SCREEN EXISTS AT ALL, which is worth being precise about. Three of
 * its seven rows are there because an app store or a statute requires them:
 *
 *   - **Privacy and consent** - Apple 5.1.1(i) requires a privacy policy link
 *     INSIDE the app and easy to reach, not only in the App Store Connect
 *     metadata field. DPDP s6 independently requires that withdrawing a consent
 *     be as easy as giving it, which means a route back to the screen that took
 *     it.
 *   - **Delete this account** - Google Play's User Data policy requires an
 *     in-app path to delete the account AND its data for any app that lets a
 *     user create one, plus a web link besides. Apple 5.1.1(v) says the same.
 *     Freezing or deactivating satisfies neither.
 *   - **Help and contact** - DPDP requires a NAMED grievance officer who can
 *     actually be reached.
 *
 * None of those are discretionary, and none of them existed. The app had no
 * settings screen of any kind: language and display were asked once during
 * onboarding and then unreachable forever, and there was no route back to the
 * consent he had given.
 *
 * NOT A FOURTH TAB. SPEC-DIGEST C-5 rules three - Today, Parties, Reports - so
 * this is reached from the Today canvas instead. That is one extra tap on a
 * screen nobody opens daily, which is the right place to spend one.
 *
 * NO KEYPAD, AND NO BOTTOM NAV. Nothing is typed here, and this is not one of
 * C-5's three destinations - it is a place you go from one of them and come
 * back from, so it carries a back affordance rather than tabs.
 */
import { Text } from '@swafto/ui';
import { Shell, Card, LinkRow, type LoadStatus } from '../components/Shell.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

export interface SettingsProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  /** The shop's name, so the row shows it rather than only naming the field. */
  readonly shopName?: string | null;
  readonly onOpenShop?: () => void;
  readonly onOpenLanguage?: () => void;
  /** S10, the plan screen (PR-7): status, price, and the way to cancel. */
  /** Absent in the all-free beta (plan.ts BETA): no plan row is drawn. */
  readonly onOpenPlan?: (() => void) | undefined;
  readonly onOpenPrivacy?: () => void;
  readonly onOpenAbout?: () => void;
  readonly onOpenHelp?: () => void;
  readonly onDeleteAccount?: () => void;
  /**
   * PR-1: "Your items" (S9). The host passes it on Premium, or when a list
   * recorded under Premium exists to read; absent, no row.
   */
  readonly onOpenItems?: (() => void) | undefined;
  /**
   * The account row: "Sign in" when this handset holds no session, "Log out"
   * when it does. The host decides which by passing one of the two; neither
   * passed means no row, which is every caller that predates sign-in.
   */
  readonly onSignIn?: (() => void) | undefined;
  readonly onLogOut?: (() => void) | undefined;
  readonly onBack?: (() => void) | undefined;
  readonly onRetry?: () => void;
  /** R5 FR-3: the app-lock setting as saved, and the tap that asks to change it. */
  readonly appLock?: boolean;
  /** True after he tried to turn it on and the phone has no screen lock. */
  readonly appLockUnavailable?: boolean;
  readonly onToggleAppLock?: () => void;
  /** R5 FR-4: to S12, entries for the accountant. */
  readonly onOpenExport?: () => void;
  /** M3 (M2-approved): S13, everything the server holds - DPDP access. Always drawn. */
  readonly onOpenYourData?: () => void;
  /** M3: S14, signed-in phones. Only with an account: without one there is no device list. */
  readonly onOpenDevices?: (() => void) | undefined;
}

export function Settings({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  shopName = null,
  onOpenShop = () => {},
  onOpenLanguage = () => {},
  onOpenPlan,
  onOpenPrivacy = () => {},
  onOpenAbout = () => {},
  onOpenHelp = () => {},
  onDeleteAccount = () => {},
  onOpenItems,
  onSignIn,
  onLogOut,
  onBack,
  onRetry = () => {},
  appLock = false,
  appLockUnavailable = false,
  onToggleAppLock = () => {},
  onOpenExport = () => {},
  onOpenYourData = () => {},
  onOpenDevices,
}: SettingsProps) {
  const s = strings(language);
  const t = tokens(display);

  /*
   * The store is read for nothing on this screen today, and it is still a
   * required prop. Every screen in this product takes one, the registry renders
   * them all against both fixtures, and a screen that quietly opts out of that
   * is a screen the adversarial shop never reaches.
   */
  void store;

  return (
    <Shell
      id="s1"
      s={s}
      display={display}
      status={status}
      titleKey="s1.title"
      /*
       * NEVER EMPTY. A settings hub with nothing in it is not a state this
       * screen can reach - the seven rows are structural, not data - so claiming
       * an empty state here would be describing something that cannot happen.
       */
      empty={false}
      onBack={onBack}
      onRetry={onRetry}
    >
      {/*
        v2 / M2: THE HUB IS GROUPED, AND EACH GROUP SAYS WHAT IT IS - your shop,
        your account, legal and help, and the one danger - with an icon on
        every row and the chevron that says it leads on.
      */}
      <Card testID="s1-shop-group" title={s('s1.group.shop')} display={display}>
        <LinkRow
          testID="s1-shop"
          icon="sale"
          label={s('s1.shop')}
          /*
           * The name as he typed it, or the words for "not set" - never a
           * guessed or prettified version of either. The app does not correct,
           * complete or capitalise what a user entered.
           */
          detail={shopName === null || shopName === '' ? s('s2.unnamed') : shopName}
          display={display}
          onPress={onOpenShop}
        />
        <LinkRow
          testID="s1-language"
          icon="info"
          label={s('s1.language')}
          display={display}
          onPress={onOpenLanguage}
        />
        {/*
          YOUR PLAN. Always drawn, Free or Premium: R4 §5.4 puts Cancel two taps
          from Settings - this row, then S10's button - and a row that appeared
          only while he was paying would make the way out harder to find than
          the way in.
        */}
        {/* Absent only in the all-free beta, when buying is closed and nothing can need cancelling. */}
        {onOpenPlan === undefined ? null : (
          <LinkRow testID="s1-plan" label={s('s1.plan')} display={display} onPress={onOpenPlan} />
        )}
        {onOpenItems === undefined ? null : (
          <LinkRow testID="s1-items" label={s('s1.items')} display={display} onPress={onOpenItems} />
        )}
        {/* R5 FR-4: free, always - a one-off copy of his own book is his. */}
        <LinkRow testID="s1-export" icon="share" label={s('s1.export')} display={display} onPress={onOpenExport} />
      </Card>

      {/*
        R5 FR-3: THE APP LOCK. Free, because security is never behind a paywall
        (R1 GAP-4). The row says what it is set to; the host asks the phone's own
        screen lock before changing it either way. When the phone has none, the
        reason sits under the row - the switch is not silently dead.
      */}
      <Card testID="s1-lock-group" title={s('s1.group.yourAccount')} display={display}>
        <LinkRow
          testID="s1-app-lock"
          icon="lock"
          label={s('s1.appLock')}
          detail={s(appLock ? 's1.appLockOn' : 's1.appLockOff')}
          display={display}
          onPress={onToggleAppLock}
        />
        {appLockUnavailable ? (
          <Text
            testID="s1-app-lock-unavailable"
            maxFontSizeMultiplier={t.maxFontScale}
            style={{
              paddingHorizontal: t.space.md,
              paddingVertical: t.space.sm,
              fontFamily: t.font.regular,
              fontSize: t.type.body,
              lineHeight: t.leading(t.type.body),
              color: t.color.ink,
            }}
          >
            {s('s1.appLockNoScreenLock')}
          </Text>
        ) : null}
        {/* M3: DPDP access, as a row - not behind the deletion flow. */}
        <LinkRow
          testID="s1-your-data"
          icon="download"
          label={s('s13.title')}
          display={display}
          onPress={onOpenYourData}
        />
        {onOpenDevices === undefined ? null : (
          <LinkRow
            testID="s1-devices"
            icon="upi"
            label={s('s14.title')}
            detail={s('s14.detail')}
            display={display}
            onPress={onOpenDevices}
          />
        )}
      </Card>

      {onSignIn === undefined && onLogOut === undefined ? null : (
        <Card testID="s1-account-group" title={s('s1.group.account')} display={display}>
          {onLogOut !== undefined ? (
            <LinkRow
              testID="s1-log-out"
              icon="signout"
              label={s('a8.logout')}
              display={display}
              onPress={onLogOut}
            />
          ) : (
            <LinkRow
              testID="s1-sign-in"
              icon="user"
              label={s('s1.signIn')}
              display={display}
              onPress={onSignIn ?? (() => {})}
            />
          )}
        </Card>
      )}

      {/*
        THE LEGAL GROUP, SEPARATED ON PURPOSE.

        These are not settings in the sense the two above are. Grouping them
        apart is how a shopkeeper finds the consent he gave and the way out -
        and it is how a store reviewer finds them in thirty seconds, which is
        the actual review condition for two of these three rows.
      */}
      <Card testID="s1-legal-group" title={s('s1.group.legal')} display={display}>
        <LinkRow
          testID="s1-privacy"
          icon="lock"
          label={s('s1.privacy')}
          display={display}
          onPress={onOpenPrivacy}
        />
        <LinkRow testID="s1-about" icon="info" label={s('s1.about')} display={display} onPress={onOpenAbout} />
        <LinkRow testID="s1-help" icon="alert" label={s('s1.help')} display={display} onPress={onOpenHelp} />
      </Card>

      <Card testID="s1-danger-group" title={s('s1.group.danger')} display={display}>
        {/*
          THE ONE DESTRUCTIVE ROW, AND IT IS COLOURED AS ONE.

          `destructive` draws it in money-out so it does not read as a seventh
          preference. The colour is not the safeguard - S7 explains what is
          destroyed and S8 asks again - it is only the signal that this row is
          a different kind of thing from the five above it.
        */}
        <LinkRow
          testID="s1-delete-account"
          icon="erase"
          label={s('s1.deleteAccount')}
          display={display}
          destructive
          onPress={onDeleteAccount}
        />
        {/* M3: what it does and how long the undo lasts, said before the tap (FLOWS). */}
        <Text
          testID="s1-delete-detail"
          {...t.bodyText}
          style={{
            paddingHorizontal: t.space.md,
            paddingVertical: t.space.sm,
            fontFamily: t.font.regular,
            fontSize: t.type.body,
            lineHeight: t.leadingUncapped(t.type.body),
            color: t.color.inkMuted,
          }}
        >
          {s('s1.delete.detail')}
        </Text>
      </Card>
    </Shell>
  );
}
