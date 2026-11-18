/**
 * T2 - TODAY, FIRST RUN. "No history, one action: enter opening cash."
 *
 * DRAWN TO `docs/design-reference/comfort/T2.png`: the Today brand bar, then
 * the "Today's book" card with an empty ring, "Not started", the reason he is
 * being asked and the one marigold button, then the dashed note that stands
 * where the day's figures will be.
 *
 * WHAT THE REFERENCE HAS THAT THIS DOES NOT, AND WHY. The picture also draws
 * the six entry rails and a two-tab nav under the card. `App.tsx` hands T2 one
 * callback - `onEnterOpeningCash` - and no route for a rail or a tab, so drawing
 * them here would put eight controls on the first screen a shop ever sees that
 * do nothing when pressed. A control that looks alive and refuses silently is
 * the failure E2 names. They arrive when the App wires them; until then this
 * screen keeps its one action, which T2.test.tsx asserts.
 *
 * `openingCash: null` MEANS UNKNOWN, AND IS NEVER ZERO. The card renders the
 * ABSENCE - the word, not a figure - until a figure exists. A `<Money>` of zero
 * would be the app answering a question only the shopkeeper can answer. Once
 * the figure exists it is read back from the store and the action is spent:
 * `setOpeningCash` refuses a second write, so the button is disabled rather
 * than offered and then rejected.
 *
 * EVERYTHING IS DERIVED ON RENDER. NO KEYPAD - the figure is typed on T6.
 */
import { Shell, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { ExitSheet, type ExitPrompt } from '../components/Sheet.tsx';
import { ProgressCard, Quiet, EmptyNote, dateLine } from '../components/DayParts.tsx';
import { Money } from '../components/Money.tsx';
import { type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

export interface TodayFirstRunProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  /** Opens T6, which owns the keypad. This screen asks; it does not collect. */
  readonly onEnterOpeningCash?: () => void;
  /** M3: "Exit the app?" after a hardware Back; present only while it is up. */
  readonly exitPrompt?: ExitPrompt | undefined;
  readonly onRetry?: () => void;
}

export function TodayFirstRun({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onEnterOpeningCash = () => {},
  onRetry = () => {},
  exitPrompt,
}: TodayFirstRunProps) {
  const s = strings(language);
  const openingCash = store.state.day.openingCash;

  /*
   * Three states for one field, and only two of them are a number. `null` is the
   * app not knowing; a figure - including zero, which is a real answer for a shop
   * that opens with an empty drawer - is something the shopkeeper said.
   */
  const started = openingCash !== null;

  return (
    <Shell
      id="t2"
      overlay={exitPrompt === undefined ? undefined : <ExitSheet id="t2" s={s} prompt={exitPrompt} display={display} />}
      s={s}
      display={display}
      status={status}
      titleKey="t1.title"
      eyebrow={store.state.shopName}
      subtitle={dateLine(store.state.day.date, s)}
      onRetry={onRetry}
    >
      <ProgressCard
        testID="t2-book"
        store={store}
        s={s}
        display={display}
        heading={s(started ? 't6.title' : 't2.notStarted')}
        caption={
          started ? (
            <Money testID="t2-opening" amount={openingCash} mode={display} size="figure" />
          ) : (
            <Quiet testID="t2-nothing-carried" text={s('t2.nothingCarried')} display={display} />
          )
        }
      >
        <Quiet testID="t2-prompt" text={s('t2.prompt')} display={display} />
        {/* The promise, and the reason he will not resent being asked. */}
        <Quiet testID="t2-carried" text={s('t2.carried')} display={display} />
        <PrimaryButton
          testID="t2-enter-opening"
          label={s('t2.enterOpening')}
          onPress={onEnterOpeningCash}
          display={display}
          size="lg"
          /*
           * Spent, not hidden. `Store.setOpeningCash` throws an
           * AppendOnlyViolation on a second write.
           */
          disabled={started}
        />
      </ProgressCard>
      <EmptyNote testID="t2-empty" text={s('t2.empty')} display={display} />
    </Shell>
  );
}
