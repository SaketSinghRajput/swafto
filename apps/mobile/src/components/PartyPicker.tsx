/**
 * NAMING THE PERSON AN ENTRY IS FOR.
 *
 * This component is the missing half of the worst defect this product shipped.
 * Three of the six actions on Today - Credit, Collect, Pay - commit to sections
 * the engine refuses without a party. `SessionOptions.selectedPartyId` existed
 * from the first draft and nothing ever supplied it, `Session.commit` swallowed
 * every refusal into `lastRefusal`, and no screen rendered `lastRefusal`. The
 * shopkeeper tapped Add and the app did nothing at all. Udhar - the transaction
 * this product exists for - could not be recorded.
 *
 * AN OVERLAY, NOT A SCREEN, AND NOT A MODAL. Two separate reasons:
 *
 *   - Not a screen, because routing goes through `Session.goTo`, which clears
 *     the draft. Choosing a customer would erase the amount just typed, which
 *     is the same class of bug one step along rather than a fix for it.
 *   - Not a React Native `Modal`, because a Modal portals out of the React
 *     tree. `check:layout` and the contact sheet both render registry cases
 *     standalone against react-native-web, so a Modal would photograph an empty
 *     screen and measure nothing. Two of this project's four instruments would
 *     go blind on the control that unblocks half the app.
 *
 * NO SEARCH FIELD, DELIBERATELY. A text field here raises the system keyboard
 * over the list on a 360dp screen - and the system keyboard is barred from the
 * entry path anyway, because it offers prediction. A kirana shop's book holds
 * tens of names, not thousands; when it holds hundreds, the answer is ordering
 * by who owes most, not a keyboard.
 */
import { View, Text, Pressable, ScrollView, TextInput } from '@swafto/ui';
import { Money } from './Money.tsx';
import { PrimaryButton } from './Shell.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import type { Strings, StringKey } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';
import { formatPaise, subtract, type Paise } from '@swafto/formula-engine';
import { fill } from './DayParts.tsx';

/** Which side of the book to show. A collection names a customer, never a supplier. */
export type PartyKind = 'customer' | 'supplier';

/** ITEM 4: the word for what a party's balance means, from this side of the book. */
export const balanceWord = (kind: PartyKind, balance: Paise): StringKey =>
  balance < 0 ? 'advance.label' : balance === 0 ? 'picker.settled' : kind === 'customer' ? 'picker.owes' : 'picker.youOwe';

/**
 * WCAG 4.1.2: A NAME THAT TELLS ONE ROW FROM THE NEXT - "Ramesh, owes ₹450.00".
 * It begins with the visible name (2.5.3), then the balance in words. The
 * figure is `formatPaise` of the store's balance, the same text `Money` draws.
 */
export const balanceName = (s: (k: StringKey) => string, name: string, kind: PartyKind, balance: Paise): string =>
  balance === 0
    ? name + ', ' + s('picker.settled')
    : fill(s('picker.name'), {
        name,
        state: s(balanceWord(kind, balance)),
        amount: formatPaise(balance < 0 ? subtract(0, balance) : balance),
      });

/**
 * F-10: ADDING A PARTY FROM INSIDE THE PICKER.
 *
 * A new shop's book is empty, and every party-requiring entry refused with
 * nobody to name. The draft lives in the Session (screens hold no state); the
 * picker only draws it and reports keystrokes.
 */
export interface NewPartyControls {
  /** Null while the list is showing; the typed text while adding. */
  readonly draft: { readonly name: string; readonly phone: string } | null;
  readonly onStart: () => void;
  readonly onName: (name: string) => void;
  readonly onPhone: (phone: string) => void;
  readonly onSave: (kind: PartyKind) => void;
  readonly onCancel: () => void;
}

export interface PartyPickerProps {
  readonly testID?: string;
  readonly store: Store;
  readonly s: Strings;
  readonly kind: PartyKind;
  readonly onChoose: (partyId: string) => void;
  readonly onCancel: () => void;
  readonly display?: DisplayMode;
  /** Absent means the picker can only choose, as it did before F-10. */
  readonly newParty?: NewPartyControls | undefined;
}

export function PartyPicker({
  testID = 'party-picker',
  store,
  s,
  kind,
  onChoose,
  onCancel,
  display = 'comfort',
  newParty,
}: PartyPickerProps) {
  const t = tokens(display);
  const people = store.state.parties.filter((p) => p.kind === kind);
  const draft = newParty?.draft ?? null;

  /*
   * NO PREDICTION, AND THE PROPS SAY SO. The name is whatever he types: no
   * autocorrect, no spellcheck, no autofill, no capitalisation, and no list of
   * "similar" names offered while he types - the reference's T8 type-ahead is
   * deliberately not copied. A suggestion accepted by a slip is a customer he
   * did not mean, on an uneditable ledger.
   */
  const field = {
    autoCorrect: false,
    spellCheck: false,
    autoComplete: 'off',
    // On one line with its neighbour: a line BEGINNING `import...'x'` is read by
    // check:licences as an import of package x (its regex is line-anchored).
    autoCapitalize: 'none', importantForAutofill: 'no',
    maxFontSizeMultiplier: t.maxFontScale,
    placeholderTextColor: t.color.inkMuted,
    style: {
      minHeight: t.touchTarget,
      marginHorizontal: t.space.md,
      marginBottom: t.space.sm,
      paddingHorizontal: t.space.md,
      borderRadius: t.radius.md,
      borderWidth: t.hairline,
      borderColor: t.color.inkMuted,
      fontFamily: t.font.regular,
      fontSize: t.type.body,
      lineHeight: t.leading(t.type.body),
      color: t.color.ink,
      backgroundColor: t.color.bg,
    },
  } as const;

  const label = {
    paddingHorizontal: t.space.md,
    paddingBottom: t.space.xs,
    fontFamily: t.font.regular,
    fontSize: t.type.label,
    lineHeight: t.leading(t.type.label),
    color: t.color.inkMuted,
  } as const;

  if (newParty !== undefined && draft !== null) {
    return (
      <View
        testID={testID}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: t.color.brand,
          justifyContent: 'flex-end',
        }}
      >
        <View
          testID={testID + '-new'}
          style={{
            backgroundColor: t.color.surface,
            borderTopLeftRadius: t.radius.xl,
            borderTopRightRadius: t.radius.xl,
            paddingTop: t.space.md,
            paddingBottom: t.space.sm,
            elevation: t.elevation.sheet,
          }}
        >
          <Text
            testID={testID + '-new-title'}
            maxFontSizeMultiplier={t.maxFontScale}
            style={{
              paddingHorizontal: t.space.md,
              paddingBottom: t.space.sm,
              fontFamily: t.font.bold,
              fontSize: t.type.heading,
              lineHeight: t.leading(t.type.heading),
              color: t.color.ink,
            }}
          >
            {s(kind === 'customer' ? 'party.newCustomer' : 'party.newSupplier')}
          </Text>
          <Text maxFontSizeMultiplier={t.maxFontScale} style={label}>
            {s('party.name')}
          </Text>
          <TextInput
            {...field}
            testID={testID + '-new-name'}
            accessibilityLabel={s('party.name')}
            value={draft.name}
            onChangeText={newParty.onName}
          />
          <Text maxFontSizeMultiplier={t.maxFontScale} style={label}>
            {s('party.phone')}
          </Text>
          <TextInput
            {...field}
            testID={testID + '-new-phone'}
            accessibilityLabel={s('party.phone')}
            keyboardType="phone-pad"
            textContentType="none"
            value={draft.phone}
            onChangeText={newParty.onPhone}
          />
          <View style={{ paddingHorizontal: t.space.sm }}>
            <PrimaryButton
              testID={testID + '-new-save'}
              label={s('party.save')}
              display={display}
              size="md"
              disabled={draft.name.trim() === ''}
              onPress={() => newParty.onSave(kind)}
            />
          </View>
          <Pressable
            testID={testID + '-new-cancel'}
            accessibilityRole="button"
            accessibilityLabel={s('party.backToList')}
            onPress={newParty.onCancel}
            android_ripple={{ color: t.color.brandSoft }}
            style={{
              minHeight: t.control.lg,
              minWidth: t.touchTarget,
              margin: t.space.sm,
              borderRadius: t.radius.md,
              backgroundColor: t.color.surfaceRaised,
              borderWidth: t.hairline,
              borderColor: t.color.inkMuted,
              alignItems: 'center',
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
              {s('party.backToList')}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View
      testID={testID}
      /*
       * Absolute on all four edges fills the Shell rather than the window,
       * which is what keeps it inside the tree the instruments can see. The
       * scrim is `brand` because this palette has no black, and a token is
       * what `check:design` will accept.
       */
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: t.color.brand,
        justifyContent: 'flex-end',
      }}
    >
      <View
        testID={testID + '-sheet'}
        style={{
          backgroundColor: t.color.surface,
          borderTopLeftRadius: t.radius.xl,
          borderTopRightRadius: t.radius.xl,
          paddingTop: t.space.md,
          paddingBottom: t.space.sm,
          elevation: t.elevation.sheet,
          /*
           * Never taller than most of the screen, so the form behind stays
           * partly visible. He is choosing a name FOR something, and seeing
           * what that something is keeps the question answerable.
           */
          maxHeight: '75%',
        }}
      >
        <Text
          testID={testID + '-title'}
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            paddingHorizontal: t.space.md,
            paddingBottom: t.space.sm,
            fontFamily: t.font.bold,
            fontSize: t.type.heading,
            lineHeight: t.leading(t.type.heading),
            color: t.color.ink,
          }}
        >
          {s(kind === 'customer' ? 'party.chooseCustomer' : 'party.chooseSupplier')}
        </Text>

        {people.length === 0 ? (
          <Text
            testID={testID + '-empty'}
            maxFontSizeMultiplier={t.maxFontScale}
            style={{
              padding: t.space.lg,
              fontFamily: t.font.regular,
              fontSize: t.type.body,
              lineHeight: t.leading(t.type.body),
              color: t.color.inkMuted,
              textAlign: 'center',
            }}
          >
            {s(kind === 'customer' ? 'party.noCustomers' : 'party.noSuppliers')}
          </Text>
        ) : (
          <ScrollView
            testID={testID + '-list'}
            style={{ minHeight: 0 }}
            // HT-50, found by the usability pass's new registry case: no case had
            // ever rendered this list, so the screens.spec sweep never saw that it
            // dropped the first tap while a keyboard was up.
            keyboardShouldPersistTaps="handled"
          >
            {people.map((p) => (
              <Pressable
                key={p.id}
                testID={testID + '-' + p.id}
                accessibilityRole="button"
                // WCAG 4.1.2: "Ramesh, owes ₹450.00" - two Rameshes are two names.
                accessibilityLabel={balanceName(s, p.name, kind, store.partyBalance(p.id))}
                onPress={() => onChoose(p.id)}
                android_ripple={{ color: t.color.brandSoft }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  minHeight: t.control.lg,
                  minWidth: t.touchTarget,
                  paddingHorizontal: t.space.md,
                  paddingVertical: t.space.sm,
                  borderBottomWidth: t.hairline,
                  borderBottomColor: t.color.border,
                  backgroundColor: t.color.surface,
                }}
              >
                <Text
                  maxFontSizeMultiplier={t.maxFontScale}
                  style={{
                    flex: 1,
                    marginRight: t.space.sm,
                    fontFamily: t.font.medium,
                    fontSize: t.type.body,
                    lineHeight: t.leading(t.type.body),
                    color: t.color.ink,
                  }}
                >
                  {p.name}
                </Text>
                {/*
                  USABILITY item 4: WHAT HE OWES, IN LARGE TYPE. The picker
                  showed "+₹0.00" - today's movement - on the screen where he
                  decides whose udhar he is collecting (U-16). `partyBalance` is
                  the all-days figure this phone holds (R5 FR-1), derived on read
                  through the same `partyEffect` signs the ledger uses. Below
                  zero is an advance (QA-03), said in words, never a bare minus.
                */}
                <View testID={testID + '-' + p.id + '-balance'} style={{ alignItems: 'flex-end' }}>
                  <Text
                    {...t.bodyText}
                    style={{
                      fontFamily: t.font.regular,
                      fontSize: t.type.label,
                      lineHeight: t.leadingUncapped(t.type.label),
                      color: t.color.inkMuted,
                    }}
                  >
                    {s(balanceWord(kind, store.partyBalance(p.id)))}
                  </Text>
                  <Money
                    testID={testID + '-' + p.id + '-amount'}
                    amount={store.partyBalance(p.id) < 0 ? subtract(0, store.partyBalance(p.id)) : store.partyBalance(p.id)}
                    mode={display}
                    size="figure"
                  />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {newParty === undefined ? null : (
          <Pressable
            testID={testID + '-add'}
            accessibilityRole="button"
            accessibilityLabel={s(kind === 'customer' ? 'party.addCustomer' : 'party.addSupplier')}
            onPress={newParty.onStart}
            android_ripple={{ color: t.color.brandSoft }}
            style={{
              minHeight: t.control.lg,
              minWidth: t.touchTarget,
              marginHorizontal: t.space.sm,
              marginTop: t.space.sm,
              borderRadius: t.radius.md,
              backgroundColor: t.color.surface,
              borderWidth: t.hairline,
              borderColor: t.color.inkMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                fontFamily: t.font.bold,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: t.color.ink,
              }}
            >
              {'+ ' + s(kind === 'customer' ? 'party.addCustomer' : 'party.addSupplier')}
            </Text>
          </Pressable>
        )}

        <Pressable
          testID={testID + '-cancel'}
          accessibilityRole="button"
          accessibilityLabel={s('party.cancel')}
          onPress={onCancel}
          android_ripple={{ color: t.color.brandSoft }}
          style={{
            minHeight: t.control.lg,
            minWidth: t.touchTarget,
            margin: t.space.sm,
            borderRadius: t.radius.md,
            backgroundColor: t.color.surfaceRaised,
            borderWidth: t.hairline,
            borderColor: t.color.inkMuted,
            alignItems: 'center',
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
            {s('party.cancel')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
