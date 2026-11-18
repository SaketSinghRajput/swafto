/**
 * S9 - YOUR ITEMS (PR-1, Premium). Reached from Settings; back returns there.
 *
 * THE SHOP'S OWN SHORT LIST, NAMES ONLY. He types a name once (20-40 is the
 * usual list) and picks it on a sale afterwards. No catalogue, no price, no
 * stock: a stored price would be offered while he types the amount, which is
 * inference, and a stock figure is ruled out in both plans (R5 decision 3).
 *
 * APPEND-ONLY, LIKE THE LEDGER. A name added stays; that keeps every recorded
 * line pointing at the name it was recorded under.
 *
 * THE CUSTOMER NOTICE (R4 §7.1). Item lines on an udhar sale say what a named
 * customer bought, so the shopkeeper, the fiduciary for his customer's data,
 * gets one line he can show or read to that customer. DRAFT copy; counsel reads
 * it before Premium launches.
 *
 * ON A FREE PLAN the list is still readable - nothing recorded under Premium is
 * hidden - and the add field is absent.
 */
import { View, Text, TextInput } from '@swafto/ui';
import { ITEM_NAME_MAX } from '@swafto/formula-engine';
import { Shell, Card, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage } from '../i18n/strings.ts';
import { allows, type Plan } from '../app/plan.ts';
import type { Store } from '../store/index.ts';

export interface YourItemsProps {
  readonly store: Store;
  readonly plan?: Plan;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  /** The name as he is typing it - held by the session, never by this screen. */
  readonly draftName?: string;
  readonly onName?: (name: string) => void;
  readonly onAdd?: () => void;
  readonly onRetry?: () => void;
  readonly onBack?: (() => void) | undefined;
}

export function YourItems({
  store,
  plan = 'free',
  status = 'ready',
  language = 'en',
  display = 'comfort',
  draftName = '',
  onName = () => {},
  onAdd = () => {},
  onRetry = () => {},
  onBack,
}: YourItemsProps) {
  const t = tokens(display);
  const s = strings(language);
  const premium = allows(plan, 'items');
  const items = store.items;
  const para = (testID: string, value: string, color: string = t.color.inkMuted) => (
    <Text
      testID={testID}
      maxFontSizeMultiplier={t.maxFontScale}
      style={{
        paddingHorizontal: t.space.md,
        paddingVertical: t.space.sm,
        fontFamily: t.font.regular,
        fontSize: t.type.body,
        lineHeight: t.leading(t.type.body),
        color,
      }}
    >
      {value}
    </Text>
  );

  return (
    <Shell id="s9" s={s} display={display} status={status} titleKey="s9.title" empty={false} onRetry={onRetry} onBack={onBack}>
      {para('s9-intro', s('s9.intro'))}
      {premium ? null : para('s9-premium', s('s9.premium'))}
      {premium ? (
        <Card testID="s9-add" display={display}>
          <Text
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
            {s('s9.name')}
          </Text>
          <TextInput
            testID="s9-name"
            accessibilityLabel={s('s9.name')}
            value={draftName}
            onChangeText={onName}
            maxLength={ITEM_NAME_MAX}
            autoCorrect={false}
            autoComplete="off"
            maxFontSizeMultiplier={t.maxFontScale}
            style={{
              minHeight: t.touchTarget,
              margin: t.space.md,
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
          <View style={{ paddingHorizontal: t.space.sm, paddingBottom: t.space.sm }}>
            <PrimaryButton
              testID="s9-add-button"
              label={s('s9.add')}
              onPress={onAdd}
              display={display}
              size="md"
              disabled={draftName.trim() === ''}
            />
          </View>
        </Card>
      ) : null}
      <Card testID="s9-list" display={display}>
        {items.length === 0
          ? para('s9-empty', s('s9.empty'))
          : items.map((i) => (
              <View
                key={i.id}
                testID={'s9-item-' + i.id}
                style={{
                  minHeight: t.touchTarget,
                  justifyContent: 'center',
                  borderBottomWidth: t.hairline,
                  borderBottomColor: t.color.border,
                }}
              >
                {para('s9-item-name-' + i.id, i.name, t.color.ink)}
              </View>
            ))}
      </Card>
      <Card testID="s9-notice" display={display} title={s('s9.noticeTitle')}>
        {para('s9-notice-text', s('s9.notice'), t.color.ink)}
      </Card>
    </Shell>
  );
}
