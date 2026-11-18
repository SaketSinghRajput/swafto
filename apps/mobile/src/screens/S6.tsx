/**
 * S6 - HELP AND CONTACT. One block, and it is a statutory one.
 *
 * WHY THIS SCREEN EXISTS. The DPDP Act requires a Data Fiduciary to publish the
 * contact details of a NAMED person who answers a Data Principal's grievance -
 * a named human who can actually be reached, not a form and not a support
 * queue. L-07 in TRACEABILITY is that requirement; S1 routes here for it.
 *
 * THE SCREEN RENDERS WHAT IT IS GIVEN AND INVENTS NOTHING. The officer's name
 * and address are human-blocked: `docs/handover/HUMAN-ACTIONS.md` tracks them,
 * and nothing in this repository can mark that done - a name has to be a real
 * person who has agreed to answer. So the prop defaults to null and the screen
 * says, in the shopkeeper's language, that it is not published yet.
 *
 * A FABRICATED OFFICER IS WORSE THAN AN OBVIOUSLY MISSING ONE. A placeholder
 * name with a sample address renders perfectly, passes every instrument in this
 * build, and ships a legal claim nobody can honour - a Data Principal writes to
 * it and nobody answers, which is the failure the requirement exists to
 * prevent. An absent contact is a visible gap that one human action closes.
 * Nothing on this screen may be filled in from here.
 *
 * NO `mailto:` AS THE ONLY ROUTE. A link needs a mail app configured, and on a
 * budget handset signed into nothing it opens a setup wizard instead of a
 * message. The address is rendered as selectable text so it can be copied,
 * read aloud, or written on paper.
 *
 * NO KEYPAD, AND NO BOTTOM NAV. Nothing is typed here, and this is a place
 * reached from S1 and returned from - so it carries a back affordance.
 */
import { View, Text } from '@swafto/ui';
import { Shell, Card, type LoadStatus } from '../components/Shell.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

/** The named human the Act requires, exactly as published. Never composed here. */
export interface GrievanceOfficer {
  readonly name: string;
  readonly email: string;
}

export interface HelpProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  /**
   * Null means not published. It is the DEFAULT on purpose: a screen whose
   * fallback is a plausible-looking contact is one that ships a fiction the
   * first time a caller forgets the prop.
   */
  readonly grievanceOfficer?: GrievanceOfficer | null;
  readonly onBack?: (() => void) | undefined;
  readonly onRetry?: () => void;
}

export function Help({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  grievanceOfficer = null,
  onBack,
  onRetry = () => {},
}: HelpProps) {
  const s = strings(language);
  const t = tokens(display);

  /*
   * Required and read for nothing, as on S1 and S5. Every screen takes a store
   * so the registry can render all of them against both fixtures; this one
   * derives no figure, and its test asserts that rather than trusting this note.
   */
  void store;

  return (
    <Shell
      id="s6"
      s={s}
      display={display}
      status={status}
      titleKey="s6.title"
      /*
       * NEVER EMPTY. There is always something to say here - either the officer
       * or the fact that there is not one yet. "Not published" is a statement,
       * not an empty state, and routing it through the frame's empty copy would
       * tell a shopkeeper his own shop had no data.
       */
      empty={false}
      onBack={onBack}
      onRetry={onRetry}
    >
      <Card testID="s6-grievance-group" display={display} title={s('s6.grievance')}>
        {grievanceOfficer === null ? (
          <View
            testID="s6-pending-block"
            style={{
              paddingHorizontal: t.space.md,
              paddingBottom: t.space.md,
            }}
          >
            <Text
              testID="s6-pending"
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                fontFamily: t.font.regular,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: t.color.ink,
              }}
            >
              {s('s6.pending')}
            </Text>
          </View>
        ) : (
          <View
            testID="s6-officer"
            style={{
              paddingHorizontal: t.space.md,
              paddingBottom: t.space.md,
            }}
          >
            <Text
              testID="s6-officer-name"
              selectable
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                fontFamily: t.font.medium,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: t.color.ink,
              }}
            >
              {grievanceOfficer.name}
            </Text>
            {/*
              AN ADDRESS HAS NO SPACES TO WRAP AT, which is a layout fact and not
              a detail: a long one is a single unbreakable word, and a Text that
              cannot shrink pushes the row wider than the screen at a large font
              scale. `flexShrink` lets the line give way inside the card instead,
              which is what `check:layout` measures at 360 wide.
            */}
            <Text
              testID="s6-officer-email"
              selectable
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                flexShrink: 1,
                fontFamily: t.font.regular,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: t.color.inkMuted,
              }}
            >
              {grievanceOfficer.email}
            </Text>
          </View>
        )}
      </Card>
    </Shell>
  );
}
