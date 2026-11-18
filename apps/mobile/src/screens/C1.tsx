/**
 * C1 - ASK. The shop's own questions, answered in its own language (FR-8, PR-5).
 *
 * A QUESTION, NEVER AN ENTRY. The text field takes a question; nothing typed
 * here reaches the ledger, and no answer fills, predicts or suggests a figure
 * for one (CLAUDE.md, "No inference in data entry"). So there is no keypad: the
 * keypad is how a figure is entered, and nothing is entered here. The chips are
 * questions, not amounts.
 *
 * EVERY ANSWER IS WORKED OUT ON RENDER. The conversation holds what was asked
 * and what it was understood as (`ChatTurn`), never an answer: `answer()` runs
 * the engine over the store each time this draws, so a sale typed after a
 * question moves that question's answer too. A kept answer would be a stored
 * total with a speech bubble round it.
 *
 * EXPLAINED, AND HONEST ABOUT ITS LIMITS. Every answer shows what the question
 * was understood as, so a misunderstanding is visible before its figure is
 * believed; a figure says it covers only what was entered on this phone; below
 * the matcher's confidence floor the screen asks back with three chips instead
 * of guessing. On the free plan a Premium question gets one line saying so and
 * the nearest free figure - never nothing.
 *
 * NOT A TAB. It is reached from Today and Reports and returns to whichever it
 * came from, so it has a way back and no bottom navigation.
 */
import { View, Text, TextInput } from '@swafto/ui';
import { Shell, Card, Row, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { fill } from '../components/DayParts.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type Strings } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';
import { allows, type Plan } from '../app/plan.ts';
import type { ChatState, ChatTurn } from '../app/session.tsx';
import { answer, describe } from '../chat/answer.ts';
import type { Resolution } from '../chat/match.ts';

export interface AskProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  /** The plan arrives as a value (D's work); absent, it is the free plan. */
  readonly plan?: Plan;
  readonly chat?: ChatState | null;
  readonly onDraft?: (text: string) => void;
  readonly onAsk?: () => void;
  readonly onChip?: (r: Resolution) => void;
  readonly onBack?: () => void;
  readonly onRetry?: () => void;
}

/** What a shop can ask on the free plan - and, below, what Premium adds. */
const SUGGEST_FREE: readonly Resolution[] = [
  { intent: 'sales', slots: {} },
  { intent: 'expected', slots: {} },
  { intent: 'owed', slots: {} },
  { intent: 'howClose', slots: {} },
  { intent: 'termUdhar', slots: {} },
];
const SUGGEST_PREMIUM: readonly Resolution[] = [
  { intent: 'sales', slots: { period: { kind: 'thisWeek' } } },
  { intent: 'bestDay', slots: { period: { kind: 'thisMonth' } } },
  { intent: 'olderUdhar', slots: {} },
];

const EMPTY_CHAT: ChatState = { from: 'T1', draft: '', turns: [] };

function Line({
  testID,
  text,
  muted,
  display,
}: {
  readonly testID: string;
  readonly text: string;
  readonly muted?: boolean;
  readonly display: DisplayMode;
}) {
  const t = tokens(display);
  const size = muted ? t.type.label : t.type.body;
  return (
    <Text
      testID={testID}
      maxFontSizeMultiplier={t.maxFontScale}
      style={{
        paddingHorizontal: t.space.md,
        paddingTop: t.space.sm,
        fontFamily: t.font.regular,
        fontSize: size,
        lineHeight: t.leading(size),
        color: muted ? t.color.inkMuted : t.color.ink,
      }}
    >
      {text}
    </Text>
  );
}

function Chips({
  id,
  options,
  store,
  s,
  display,
  onChip,
}: {
  readonly id: string;
  readonly options: readonly Resolution[];
  readonly store: Store;
  readonly s: Strings;
  readonly display: DisplayMode;
  readonly onChip: (r: Resolution) => void;
}) {
  const t = tokens(display);
  return (
    <View style={{ padding: t.space.sm, gap: t.space.sm }}>
      {options.map((r, j) => (
        <PrimaryButton
          key={id + '-' + String(j)}
          testID={id + '-' + String(j)}
          label={describe(r, store, s)}
          display={display}
          variant="tonal"
          size="md"
          onPress={() => onChip(r)}
        />
      ))}
    </View>
  );
}

function Answered({
  id,
  resolution,
  store,
  plan,
  s,
  display,
  onChip,
}: {
  readonly id: string;
  readonly resolution: Resolution;
  readonly store: Store;
  readonly plan: Plan;
  readonly s: Strings;
  readonly display: DisplayMode;
  readonly onChip: (r: Resolution) => void;
}) {
  const t = tokens(display);
  // Worked out NOW, from the store, on every render. Nothing about it is kept.
  const a = answer(resolution, store, plan, s);
  const chips = allows(plan, 'shopChat') ? a.chips : [];
  return (
    <Card testID={id + '-answer'} display={display}>
      <Line
        testID={id + '-heard'}
        text={fill(s('c1.heard'), { what: describe(resolution, store, s) })}
        muted
        display={display}
      />
      {a.lines.map((line, j) => (
        <Line key={j} testID={id + '-line-' + String(j)} text={line} display={display} />
      ))}
      <View style={{ paddingTop: t.space.sm }}>
        {a.figures.map((f) => (
          <Row
            key={f.testID}
            testID={id + '-' + f.testID}
            label={f.label}
            amount={f.amount}
            directional={f.directional === true}
            display={display}
          />
        ))}
      </View>
      {a.derived ? <Line testID={id + '-covers'} text={s('c1.covers')} muted display={display} /> : null}
      {chips.length > 0 ? (
        <>
          <Line testID={id + '-next'} text={s('c1.next')} muted display={display} />
          <Chips id={id + '-chip'} options={chips} store={store} s={s} display={display} onChip={onChip} />
        </>
      ) : (
        <View style={{ height: t.space.sm }} />
      )}
    </Card>
  );
}

function Turn({
  i,
  turn,
  store,
  plan,
  s,
  display,
  onChip,
}: {
  readonly i: number;
  readonly turn: ChatTurn;
  readonly store: Store;
  readonly plan: Plan;
  readonly s: Strings;
  readonly display: DisplayMode;
  readonly onChip: (r: Resolution) => void;
}) {
  const t = tokens(display);
  const id = 'c1-turn-' + String(i);
  const asked =
    turn.question ?? (turn.result.kind === 'resolved' ? describe(turn.result.resolution, store, s) : '');
  return (
    <View testID={id} style={{ marginTop: t.space.md }}>
      {/* What he asked, in his words, on the raised surface. */}
      <View
        style={{
          alignSelf: 'flex-end',
          maxWidth: '85%',
          marginHorizontal: t.space.md,
          padding: t.space.sm,
          borderRadius: t.radius.md,
          backgroundColor: t.color.surfaceRaised,
        }}
      >
        <Text
          testID={id + '-q'}
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            fontFamily: t.font.medium,
            fontSize: t.type.body,
            lineHeight: t.leading(t.type.body),
            color: t.color.ink,
          }}
        >
          {asked}
        </Text>
      </View>
      {turn.result.kind === 'unsure' ? (
        <Card testID={id + '-unsure'} display={display}>
          <Line testID={id + '-didYouMean'} text={s('c1.didYouMean')} display={display} />
          <Chips
            id={id + '-chip'}
            options={turn.result.options}
            store={store}
            s={s}
            display={display}
            onChip={onChip}
          />
        </Card>
      ) : (
        <Answered
          id={id}
          resolution={turn.result.resolution}
          store={store}
          plan={plan}
          s={s}
          display={display}
          onChip={onChip}
        />
      )}
    </View>
  );
}

export function Ask({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  plan = 'free',
  chat = EMPTY_CHAT,
  onDraft = () => {},
  onAsk = () => {},
  onChip = () => {},
  onBack = () => {},
  onRetry = () => {},
}: AskProps) {
  const t = tokens(display);
  const s = strings(language);
  const c = chat ?? EMPTY_CHAT;
  const suggestions = allows(plan, 'shopChat') ? [...SUGGEST_FREE, ...SUGGEST_PREMIUM] : SUGGEST_FREE;

  return (
    <Shell
      id="c1"
      s={s}
      display={display}
      status={status}
      titleKey="c1.title"
      onBack={onBack}
      onRetry={onRetry}
      empty={c.turns.length === 0}
      emptyKey="c1.empty"
      // HT-41: the newest answer is the one he just asked for; keep it in view.
      followEnd
      /*
       * THE SUGGESTIONS LIVE IN THE BODY HEADER because `Shell` swaps CHILDREN
       * for the empty copy, and the empty state is exactly when a shopkeeper
       * needs to see what he can ask.
       */
      bodyHeader={
        c.turns.length === 0 ? (
          <Card testID="c1-suggested" title={s('c1.suggested')} display={display}>
            <Chips id="c1-suggest" options={suggestions} store={store} s={s} display={display} onChip={onChip} />
          </Card>
        ) : undefined
      }
      footer={
        /*
         * STACKED, NOT SIDE BY SIDE. Field and button on one row ran the Odia
         * "Ask" up to 186px off a 360dp screen at the largest type (check:layout).
         */
        <View
          style={{
            gap: t.space.sm,
            padding: t.space.sm,
            borderTopWidth: t.hairline,
            borderTopColor: t.color.border,
            backgroundColor: t.color.surface,
          }}
        >
          <TextInput
            testID="c1-input"
            accessibilityLabel={s('c1.placeholder')}
            placeholder={s('c1.placeholder')}
            placeholderTextColor={t.color.inkMuted}
            value={c.draft}
            onChangeText={onDraft}
            onSubmitEditing={onAsk}
            returnKeyType="send"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="off"
            maxFontSizeMultiplier={t.maxFontScale}
            style={{
              minHeight: t.touchTarget,
              paddingHorizontal: t.space.md,
              borderRadius: t.radius.md,
              borderWidth: t.hairline,
              borderColor: t.color.inkMuted,
              fontFamily: t.font.regular,
              fontSize: t.type.body,
              lineHeight: t.leading(t.type.body),
              color: t.color.ink,
              backgroundColor: t.color.surface,
            }}
          />
          <PrimaryButton
            testID="c1-ask"
            label={s('c1.ask')}
            display={display}
            size="md"
            disabled={c.draft.trim() === ''}
            onPress={onAsk}
          />
        </View>
      }
    >
      {c.turns.map((turn, i) => (
        <Turn key={i} i={i} turn={turn} store={store} plan={plan} s={s} display={display} onChip={onChip} />
      ))}
      <View style={{ height: t.space.md }} />
    </Shell>
  );
}
