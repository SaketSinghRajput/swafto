/**
 * S2 - YOUR SHOP. One fact, shown back to him exactly as he gave it.
 *
 * WHY IT IS A SCREEN AND NOT A LINE ON S1. S1 shows the name as the detail of a
 * row, which answers "what is it" and not "where does it go". The name is
 * stamped on everything exported - a report handed to a lender, a GST adviser or
 * a family member - and a shopkeeper who has never seen that sentence has never
 * been told. `s2.note` is the only thing here S1 did not already say, and it is
 * the whole reason this screen earns its tap.
 *
 * THE NAME IS RENDERED VERBATIM, AND THAT IS THE DESIGN. Not capitalised, not
 * trimmed for display, not title-cased, not truncated, no `numberOfLines` and no
 * `ellipsizeMode`. "No inference in data entry" is usually read as a rule about
 * the amount field; it binds just as hard on the way OUT. A shop called
 * "m/s r k stores" rendered as "M/S R K Stores" is the app telling him his own
 * sign-board is wrong, and the name he would then find on an export is not the
 * name he typed. X1 turns autocorrect off on the way in for exactly this reason;
 * this is the other end of the same decision.
 *
 * WHEN HIS DAY STARTS (decision 1) is the one choice here, because it is a fact
 * about the shop rather than about the phone. Applied at once like S3's, with no
 * Save button, and it governs only days opened afterwards - the note says so,
 * because a setting that seemed to move yesterday's takings would be believed.
 *
 * THE NAME IS NOT EDITABLE YET, AND THE SCREEN DOES NOT PRETEND OTHERWISE. There is
 * no `onEditName` prop, so the name sits in a plain block rather than a
 * `LinkRow`. A row that looks tappable and does nothing teaches a shopkeeper
 * that the app is broken - the lesson `PrimaryButton`'s real disabled state
 * records one file over. When renaming exists this becomes a `LinkRow` with a
 * handler; that is a line, not a redesign.
 *
 * NO KEYPAD AND NO BOTTOM NAV. Nothing is typed here, and this is not one of
 * C-5's three destinations - it is reached from S1 and returns there, so it
 * carries `onBack` instead of tabs.
 */
import { View, Text } from "@swafto/ui";
import { Shell, Card, Segmented, type LoadStatus } from "../components/Shell.tsx";
import { tokens, type Mode as DisplayMode } from "../theme/tokens.ts";
import { strings, type RenderLanguage } from "../i18n/strings.ts";
import { DAY_START_CHOICES, type Store } from "../store/index.ts";

export interface ShopProfileProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  /** Exactly the characters he typed, or null when he has not been asked yet. */
  readonly shopName?: string | null;
  /**
   * Decision 1: a new day start, for days opened from now on. Without it the
   * choice is not drawn at all - a control that does nothing reads as broken.
   */
  readonly onSelectDayStart?: ((startsAt: string) => void) | undefined;
  readonly onBack?: (() => void) | undefined;
  readonly onRetry?: () => void;
}

export function ShopProfile({
  store,
  status = "ready",
  language = "en",
  display = "comfort",
  shopName = null,
  onSelectDayStart,
  onBack,
  onRetry = () => {},
}: ShopProfileProps) {
  const t = tokens(display);
  const s = strings(language);

  /*
   * The store is read for nothing here, and it is still a required prop. Every
   * screen in this product takes one, the registry renders them all against
   * both fixtures, and a screen that quietly opts out of that is a screen the
   * adversarial shop never reaches.
   *
   * IT IS ALSO AN ASSERTION ABOUT WHERE THE NAME LIVES. `StoreState` carries a
   * `shopId` and no name, so the name arrives from the session as a prop - and
   * the day's figures, which the store does hold, have no business on this
   * screen at all. `S2.test.tsx` mutates the store and requires this render not
   * to move, which is what stops a day total being dropped in here later.
   *
   * The one thing read from it is the day-start SETTING - not a figure, and not
   * the open day's own `startsAt`, which the setting never changes.
   */
  const dayStartsAt = store.state.dayStartsAt ?? "00:00";

  /*
   * NULL AND EMPTY ARE THE SAME QUESTION AND GET THE SAME ANSWER: he has not
   * told us. "Not set" is the words for that. It is never a blank line, which
   * reads as a defect, and never a guess assembled out of anything else held.
   */
  const unnamed = shopName === null || shopName === "";

  return (
    <Shell
      id="s2"
      s={s}
      display={display}
      status={status}
      titleKey="s2.title"
      /*
       * NEVER EMPTY, AND SAID HONESTLY RATHER THAN SKIPPED. The card below
       * always has content - the name he gave, or the words for not having
       * given one - and the note is structural rather than data. No state of
       * this screen has nothing in it, so claiming an empty one would describe
       * something that cannot happen. `Shell` still owns loading and error,
       * which can.
       */
      empty={false}
      onBack={onBack}
      onRetry={onRetry}
    >
      <Card testID="s2-shop" display={display}>
        <View
          style={{
            padding: t.space.md,
            backgroundColor: t.color.surface,
          }}
        >
          <Text
            testID="s2-name-label"
            maxFontSizeMultiplier={t.maxFontScale}
            style={{
              fontFamily: t.font.medium,
              fontSize: t.type.label,
              lineHeight: t.leading(t.type.label),
              color: t.color.inkMuted,
            }}
          >
            {s("s2.name")}
          </Text>
          {/*
            HIS CHARACTERS, UNTOUCHED. A long Odia shop name wraps onto a second
            line rather than losing its tail - `Row`'s label does the same thing
            for the same reason, because a truncated name is a name somebody has
            to guess at. The muted ink is used ONLY for the "not set" words, so
            the colour distinguishes what he wrote from what the app wrote.
          */}
          <Text
            testID="s2-name"
            maxFontSizeMultiplier={t.maxFontScale}
            style={{
              marginTop: t.space.xs,
              fontFamily: t.font.regular,
              fontSize: t.type.body,
              lineHeight: t.leading(t.type.body),
              color: unnamed ? t.color.inkMuted : t.color.ink,
            }}
          >
            {unnamed ? s("s2.unnamed") : shopName}
          </Text>
        </View>
      </Card>

      {/*
        THE REASON THE SCREEN EXISTS, in its own card rather than as small print
        under the field. It is not a caption on the name - it is a fact about
        where the name ends up, which is a different kind of statement and reads
        as one when it is not tucked under the thing it describes.
      */}
      {onSelectDayStart && (
        <Card testID="s2-day-start-card" display={display}>
          <Text
            testID="s2-day-start-label"
            maxFontSizeMultiplier={t.maxFontScale}
            style={{
              paddingHorizontal: t.space.md,
              paddingTop: t.space.md,
              fontFamily: t.font.medium,
              fontSize: t.type.label,
              lineHeight: t.leading(t.type.label),
              color: t.color.inkMuted,
            }}
          >
            {s("s2.dayStart")}
          </Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={s("s2.dayStart")}
            style={{ paddingBottom: t.space.sm, backgroundColor: t.color.surface }}
          >
            <Segmented<string>
              testID="s2-day-start"
              options={DAY_START_CHOICES.map((h) => ({ key: h, label: h }))}
              value={dayStartsAt}
              onChange={onSelectDayStart}
              display={display}
            />
            <Text
              testID="s2-day-start-note"
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                paddingHorizontal: t.space.md,
                fontFamily: t.font.regular,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: t.color.ink,
              }}
            >
              {s("s2.dayStartNote")}
            </Text>
          </View>
        </Card>
      )}

      <Card testID="s2-note-card" display={display}>
        <View
          style={{
            padding: t.space.md,
            backgroundColor: t.color.surface,
          }}
        >
          <Text
            testID="s2-note"
            maxFontSizeMultiplier={t.maxFontScale}
            style={{
              fontFamily: t.font.regular,
              fontSize: t.type.body,
              lineHeight: t.leading(t.type.body),
              color: t.color.ink,
            }}
          >
            {s("s2.note")}
          </Text>
        </View>
      </Card>
    </Shell>
  );
}
