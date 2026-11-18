/**
 * S5 - ABOUT THIS APP. Three facts, and two of them are required of us.
 *
 * WHY THIS SCREEN EXISTS. It is reached from S1, which explains why that hub
 * carries legal rows rather than preferences. This one holds:
 *
 *   - **The version**, because a shopkeeper reporting a wrong figure and a
 *     reviewer reading a store listing both need to know which build they are
 *     looking at. It is the first thing support asks for.
 *   - **The open-source licences**, which the OFL and the MIT terms in the
 *     shipped closure require us to make available in the product, not only in
 *     a repository nobody using this app will open (L-19, L-21).
 *   - **The L-15 sentence.** LEGAL-AUDIT §7 requires it on the export screen
 *     and in the header of every exported file. It is HERE as well, because
 *     About is the screen a shopkeeper's accountant opens first, and the
 *     sentence is worth nothing if the only place it appears is a file the
 *     accountant was handed with the figures already in hand.
 *
 * THE VERSION IS PASSED IN, AND THAT IS THE WHOLE POINT OF THE PROP. A literal
 * in this file is a version number nobody measured: it would keep rendering
 * `1.0` through every build that followed, which is worse than no version at
 * all - an absent figure asks a question, a stale one answers it wrongly. So it
 * defaults to null and the row is simply NOT DRAWN when the build has not
 * supplied one. A dash would read as a figure that failed to load; absence
 * reads as what it is.
 *
 * NO KEYPAD, AND NO BOTTOM NAV. Nothing is typed here and this is not one of
 * C-5's three destinations - it is a place reached from S1 and returned from,
 * so it carries a back affordance rather than tabs.
 */
import { View, Text } from '@swafto/ui';
import { Shell, Card, LinkRow, type LoadStatus } from '../components/Shell.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

export interface AboutProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  /**
   * The build's own version string, read from the build and handed in - never
   * composed here. Null means the caller has not been given one, and the screen
   * says nothing rather than guessing.
   */
  readonly version?: string | null;
  readonly onOpenLicences?: () => void;
  /**
   * F-23 (Play User Data policy): the hosted policy and terms. The caller
   * opens the URL; this screen holds none.
   */
  readonly onOpenPrivacyPolicy?: () => void;
  readonly onOpenTerms?: () => void;
  /**
   * The web deletion page (Play answer/13327111), shown as the address it is.
   * Null, nothing is drawn - an invented address is worse than none.
   */
  readonly deleteAccountUrl?: string | null;
  readonly onOpenDeleteAccount?: () => void;
  readonly onBack?: (() => void) | undefined;
  readonly onRetry?: () => void;
}

export function About({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  version = null,
  onOpenLicences = () => {},
  onOpenPrivacyPolicy = () => {},
  onOpenTerms = () => {},
  deleteAccountUrl = null,
  onOpenDeleteAccount = () => {},
  onBack,
  onRetry = () => {},
}: AboutProps) {
  const s = strings(language);
  const t = tokens(display);

  /*
   * Read for nothing, and still required - the same contract S1 carries. Every
   * screen in this product takes a store, the registry renders them all against
   * both fixtures, and a screen that quietly opts out of that is a screen the
   * adversarial shop never reaches. Nothing on this screen is derived from it,
   * which is a property its test asserts rather than a comment nobody checks.
   */
  void store;

  return (
    <Shell
      id="s5"
      s={s}
      display={display}
      status={status}
      titleKey="s5.title"
      /*
       * NEVER EMPTY. The licences row and the L-15 sentence are structural, not
       * data, so there is no shop state in which this screen has nothing in it.
       * Claiming an empty state here would describe something that cannot
       * happen.
       */
      empty={false}
      onBack={onBack}
      onRetry={onRetry}
    >
      <Card testID="s5-app-group" display={display}>
        {version === null || version === '' ? null : (
          <View
            testID="s5-version"
            style={{
              paddingHorizontal: t.space.md,
              paddingVertical: t.space.sm,
              minHeight: t.control.md,
              borderBottomWidth: t.hairline,
              borderBottomColor: t.color.border,
              justifyContent: 'center',
            }}
          >
            <Text
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                fontFamily: t.font.medium,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: t.color.ink,
              }}
            >
              {s('s5.version')}
            </Text>
            {/*
              SELECTABLE, because the one thing anybody does with a version is
              repeat it to somebody else. It is not a tappable row: there is
              nowhere for it to go, and a row that looks like a link and does
              nothing teaches a shopkeeper that tapping is pointless here.
            */}
            <Text
              testID="s5-version-value"
              selectable
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                fontFamily: t.font.regular,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: t.color.inkMuted,
              }}
            >
              {version}
            </Text>
          </View>
        )}
        {/* Reference S10's order: policy, terms, then licences. */}
        <LinkRow
          testID="s5-privacy"
          label={s('s5.privacy')}
          detail={s('settings.open')}
          display={display}
          onPress={onOpenPrivacyPolicy}
        />
        <LinkRow
          testID="s5-terms"
          label={s('s5.terms')}
          detail={s('settings.open')}
          display={display}
          onPress={onOpenTerms}
        />
        <LinkRow
          testID="s5-licences"
          label={s('s5.licences')}
          detail={s('settings.open')}
          display={display}
          onPress={onOpenLicences}
        />
      </Card>

      {/*
        L-15, IN ITS OWN BLOCK.

        LEGAL-AUDIT §7 puts this sentence on the export screen and in every
        exported file header. Here it is a statement about the whole app rather
        than about one row, so it sits apart from the two rows above instead of
        reading as a footnote to the licences link.
      */}
      <Card testID="s5-legal-group" display={display}>
        <Text
          testID="s5-not-tax"
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            padding: t.space.md,
            fontFamily: t.font.regular,
            fontSize: t.type.body,
            lineHeight: t.leading(t.type.body),
            color: t.color.ink,
          }}
        >
          {s('s5.notTax')}
        </Text>
      </Card>

      {deleteAccountUrl === null ? null : (
        <Card testID="s5-web-delete-group" display={display}>
          <Text
            maxFontSizeMultiplier={t.maxFontScale}
            style={{
              paddingHorizontal: t.space.md,
              paddingTop: t.space.md,
              fontFamily: t.font.regular,
              fontSize: t.type.body,
              lineHeight: t.leading(t.type.body),
              color: t.color.ink,
            }}
          >
            {s('s5.webDelete')}
          </Text>
          <LinkRow
            testID="s5-web-delete"
            label={deleteAccountUrl}
            detail={s('settings.open')}
            display={display}
            onPress={onOpenDeleteAccount}
          />
        </Card>
      )}
    </Shell>
  );
}
