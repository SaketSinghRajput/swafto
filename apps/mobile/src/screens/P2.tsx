/**
 * P2 - CUSTOMER DETAIL. "Ledger, running balance, aging, record a collection."
 *
 * A thin instantiation of `PartyDetail`, which is also P3. The two screens differ
 * in which word names the figure and which actions sit at the bottom, and in
 * nothing else - see the note at the top of that component for why they are not
 * two implementations.
 *
 * THE TWO ACTIONS ARE IN THIS ORDER ON PURPOSE. Recording a collection is the
 * thing a shopkeeper opens a customer's page to do - he is looking at the man's
 * name because the man just handed him money. Giving more udhar is the rarer
 * errand and sits second.
 *
 * NO AGING BADGES, and the build map does ask for them. `agedParties` needs the
 * date each credit was given, which lives in a carried per-party record that
 * nothing in this app constructs yet (W4). The badges arrive with persistence;
 * inventing an age from today's entries would put a number on the screen that
 * nobody computed from anything the shopkeeper typed.
 */
import { formatPaise, subtract } from '@swafto/formula-engine';
import { PartyDetail, type PartyAction } from '../components/PartyDetail.tsx';
import { View, Text, TextInput } from '@swafto/ui';
import { Card, Row, LinkRow, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';
import { whatsappNumber } from '../app/share.ts';

export interface CustomerDetailProps {
  readonly store: Store;
  readonly partyId: string;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onRecordCollection?: () => void;
  readonly onNewUdhar?: () => void;
  /** R5 FR-1: open HIS WhatsApp with a polite reminder. The host does the opening. */
  readonly onRemind?: () => void;
  /** R5 FR-2: the ledger as text, to the share sheet. */
  readonly onShareStatement?: () => void;
  /** R5 FR-6: to P6. */
  readonly onOpenCreditLimit?: () => void;
  /** HT-43: the number being typed for a customer saved without one - held by the session. */
  readonly phoneDraft?: string;
  readonly onPhoneDraft?: (phone: string) => void;
  readonly onSavePhone?: () => void;
  readonly onRetry?: () => void;
  /** F-9: the header's way back. Explicit `| undefined` for exactOptionalPropertyTypes. */
  readonly onBack?: (() => void) | undefined;
}

export function CustomerDetail({
  store,
  partyId,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onRecordCollection = () => {},
  onNewUdhar = () => {},
  onRemind = () => {},
  onShareStatement = () => {},
  onOpenCreditLimit = () => {},
  phoneDraft = '',
  onPhoneDraft = () => {},
  onSavePhone = () => {},
  onRetry = () => {},
  onBack,
}: CustomerDetailProps) {
  const s = strings(language);
  const t = tokens(display);
  const party = store.state.parties.find((p) => p.id === partyId);
  const noPhone = whatsappNumber(party?.phone) === null;
  /*
   * R5: THE BALANCE OVER EVERY DAY THIS PHONE HOLDS, labelled as exactly that.
   * The headline stays today's change (below); this is the figure a reminder
   * and a statement are about, and it is derived on read like every other.
   */
  const balance = store.partyBalance(partyId);
  const limit = store.creditLimit(partyId);
  const account =
    party === undefined ? null : (
      <Card testID="p2-account" display={display} title={s('p2.share')}>
        {/* QA-03: a negative balance is an ADVANCE - the shop owes them - said in words. */}
        {/*
          USABILITY item 5: the balance moved up to be the page's hero; today's
          change is the small line here, signed, because it goes either way.
        */}
        <Row
          testID="p2-change-today"
          label={s('p1.changeToday')}
          amount={store.partyMovementToday(partyId)}
          display={display}
          directional
        />
        <LinkRow
          testID="p2-limit"
          label={s('p2.limit')}
          detail={limit === null ? s('p2.noLimit') : formatPaise(limit)}
          display={display}
          onPress={onOpenCreditLimit}
        />
        {/*
          ONLY WHEN SOMETHING IS DUE. A reminder for nothing is not polite. With
          no phone saved the row says so in its own words, and the tap says it
          again rather than opening WhatsApp on nobody.
        */}
        {balance > 0 ? (
          <LinkRow
            testID="p2-remind"
            label={s('p2.remind')}
            detail={noPhone ? s('p2.noPhone') : s('p2.remindNote')}
            display={display}
            onPress={onRemind}
          />
        ) : null}
        {/*
          HT-43: WITH NO NUMBER, THE WAY TO ADD ONE IS HERE, where the reminder
          needs it. The number is exactly as typed - no contact lookup, no
          suggestion. Saved, the customer's profile carries it; no figure moves.
        */}
        {noPhone ? (
          <View testID="p2-phone">
            <Text
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                paddingHorizontal: t.space.md,
                paddingTop: t.space.sm,
                paddingBottom: t.space.xs,
                fontFamily: t.font.regular,
                fontSize: t.type.label,
                lineHeight: t.leading(t.type.label),
                color: t.color.inkMuted,
              }}
            >
              {s('p2.addPhone')}
            </Text>
            {/*
              HT-57: SAVE NUMBER SITS BESIDE THE FIELD, AND DONE ON THE KEYBOARD
              SAVES TOO. Under the field it fell behind the fixed footer once the
              keyboard was up: a tap there only closed the keyboard, and nothing
              was saved or said. Beside the field it rises with it; where the row
              has to wrap at a large text size, the keyboard's own Done key files it.
            */}
            <View
              testID="p2-phone-row"
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                paddingHorizontal: t.space.sm,
                paddingBottom: t.space.sm,
              }}
            >
              <TextInput
                testID="p2-phone-input"
                accessibilityLabel={s('p2.addPhone')}
                keyboardType="phone-pad"
                returnKeyType="done"
                textContentType="none"
                autoComplete="off"
                autoCorrect={false}
                value={phoneDraft}
                onChangeText={onPhoneDraft}
                onSubmitEditing={() => {
                  if (phoneDraft.trim() !== '') onSavePhone();
                }}
                maxFontSizeMultiplier={t.maxFontScale}
                style={{
                  flexGrow: 1,
                  flexBasis: '50%',
                  // A web input's own width is about twenty characters; without a floor
                  // it would not shrink below that, and ran off a narrow card.
                  flexShrink: 1,
                  minWidth: t.touchTarget,
                  minHeight: t.touchTarget,
                  margin: t.space.xs,
                  paddingHorizontal: t.space.md,
                  borderWidth: t.hairline,
                  borderColor: t.color.inkMuted,
                  borderRadius: t.radius.md,
                  fontFamily: t.font.regular,
                  fontSize: t.type.body,
                  color: t.color.ink,
                  backgroundColor: t.color.bg,
                }}
              />
              <PrimaryButton
                testID="p2-phone-save"
                label={s('p2.savePhone')}
                display={display}
                size="md"
                disabled={phoneDraft.trim() === ''}
                onPress={onSavePhone}
              />
            </View>
          </View>
        ) : null}
        <LinkRow testID="p2-statement" label={s('p2.statement')} display={display} onPress={onShareStatement} />
      </Card>
    );
  const actions: readonly PartyAction[] = [
    // Item 5: "Collect" is the one primary; a new udhar sale is the quiet second.
    { key: 'collect', labelKey: 'act.collect', onPress: onRecordCollection, variant: 'primary' },
    { key: 'udhar', labelKey: 'p2.newUdhar', onPress: onNewUdhar, variant: 'tonal' },
  ];

  return (
    <PartyDetail
      id="p2"
      store={store}
      partyId={partyId}
      titleKey="p2.title"
      /*
       * USABILITY item 5: THE HERO IS WHAT HE OWES. It was today's change, and
       * the real answer - "Owed to you, all days" - was a small row lower down
       * (U-19). The balance is `partyBalance`, over every day this phone holds;
       * below zero it is an advance (QA-03), said in words with its size, never
       * "Owed to you -300". `figureKey` remains P3's way and the fallback.
       */
      headline={{ labelKey: balance < 0 ? 'advance.label' : 'p2.balanceAll', amount: balance < 0 ? subtract(0, balance) : balance }}
      figureKey="p1.changeToday"
      emptyKey="p2.empty"
      actions={actions}
      status={status}
      language={language}
      display={display}
      onRetry={onRetry}
      onBack={onBack}
      extra={account}
    />
  );
}
