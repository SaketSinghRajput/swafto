/**
 * S10 - YOUR PLAN. What he is on, what stays free, what Premium adds, what it
 * costs, and the way out - on one screen (PR-7, R4 §5.4).
 *
 * WHY EVERY LINE HERE IS THE SHAPE IT IS. The CCPA dark-pattern guidelines
 * (R4 §5.2) name the subscription moves this screen must not make, and each one
 * maps to a decision below rather than to taste:
 *
 *   - **Drip pricing.** The price is the final, GST-included figure, printed
 *     beside the button that buys it, with the billing period and "renews until
 *     you cancel" in the same tile. Nothing about the cost appears for the first
 *     time on Play's sheet.
 *   - **Interface interference.** Monthly and yearly are two identical tiles
 *     with identical buttons. Neither is pre-selected, neither is marigold, and
 *     there is no "best value" badge - which one is better value is his sum.
 *   - **Subscription trap.** Cancel is two taps from Settings: the S1 row, then
 *     the button here, which opens Play's own subscription page. It is never
 *     disabled and never greyed.
 *   - **Confirm shaming / false urgency / nagging.** The status is a plain fact
 *     with a date. No countdown, no "only 3 days left", no guilt line on Cancel,
 *     and nothing on this screen reappears anywhere else.
 *
 * IT NEVER PRETENDS TO SELL. Until Play is set up (R4-HA1/3/4) the server sends
 * no `buying` block and the phone gets no `ready` offer; the buy buttons are then
 * disabled WITH THE REASON IN WORDS. A button that looked live and failed would
 * teach him the app is broken; one that looked live and "succeeded" would be a
 * lie about money.
 *
 * NO STORE FIGURE, AND NO MARIGOLD. The plan is the server's answer, handed in;
 * nothing here is derived from the ledger. The accent is left unspent, as on S7:
 * this screen is for reading, and the three actions it offers are all brand
 * indigo so none of them is shouting at the others.
 *
 * DATES BY STRING, LIKE T3. A stamp is read as written rather than through
 * `new Date(iso)`, which would resolve against the machine's timezone and make
 * the contact sheet differ per build agent. The server writes UTC, so a plan
 * ending between 00:00 and 05:30 IST shows the day before - the early side,
 * which is the safe one for "ends on" and "renews on" alike.
 *
 * NO KEYPAD AND NO BOTTOM NAV. Nothing is typed here, and this is a child of S1
 * with a back affordance, like S5 and S7.
 */
import { View, Text } from '@swafto/ui';
import { Shell, Card, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { Money } from '../components/Money.tsx';
import { dateLine, fill } from '../components/DayParts.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type Strings, type StringKey } from '../i18n/strings.ts';
import { PREMIUM_PRICES, BASE_PLANS, type BasePlan, type Plan, type PlanAnswer } from '../app/plan.ts';
import type { ProductsResult } from '../net/billing.ts';
import type { PlanNotice } from '../app/session.tsx';
import type { Store } from '../store/index.ts';

export interface YourPlanProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  /** `session.state.plan`: the answer, already ended at its own `until`. */
  readonly plan?: Plan;
  readonly answer?: PlanAnswer | null;
  readonly offer?: ProductsResult | null;
  readonly busy?: boolean;
  readonly notice?: PlanNotice | null;
  readonly onStartPreview?: () => void;
  readonly onBuy?: (basePlan: BasePlan) => void;
  /** Opens Play's subscription page. The caller owns the URL and `Linking`. */
  readonly onCancel?: () => void;
  readonly onBack?: (() => void) | undefined;
  readonly onRetry?: () => void;
}

const ON_HOLD = 'SUBSCRIPTION_STATE_ON_HOLD';

const NOTICE: Readonly<Record<PlanNotice, StringKey>> = {
  previewStarted: 's10.notice.previewStarted',
  notOpen: 's10.notice.notOpen',
  offline: 's10.notice.offline',
  failed: 's10.notice.failed',
  pending: 's10.notice.pending',
  verifyLater: 's10.notice.verifyLater',
  purchased: 's10.notice.purchased',
};

const FREE_ITEMS = [
  's10.free.close',
  's10.free.entries',
  's10.free.parties',
  's10.free.history',
  's10.free.data',
  's10.free.rights',
] as const satisfies readonly StringKey[];

/** PR-1 .. PR-6, in R5's order. */
const PREMIUM_ITEMS = [
  's10.premium.items',
  's10.premium.itemReports',
  's10.premium.forecast',
  's10.premium.comparisons',
  's10.premium.chat',
  's10.premium.dashboard',
] as const satisfies readonly StringKey[];

/** "Monday 9 November 2026" from a stamp's own date, or null for anything else. */
export function planDate(stamp: string | null | undefined, s: Strings): string | null {
  if (!stamp || !/^\d{4}-\d{2}-\d{2}T/.test(stamp)) return null;
  const line = dateLine(stamp.slice(0, 10), s);
  return line === '' ? null : line + ' ' + stamp.slice(0, 4);
}

/** The one status sentence. A fact with a date; never a countdown. */
export function planStatus(plan: Plan, answer: PlanAnswer | null, s: Strings): string {
  const e = answer?.entitlement;
  if (plan === 'premium' && e) {
    const date = planDate(e.source === 'preview' ? (e.until ?? e.previewEndsAt) : e.until, s);
    if (date === null) return s('s10.status.on');
    if (e.source === 'preview') return fill(s('s10.status.preview'), { date });
    return fill(s(e.renews ? 's10.status.renews' : 's10.status.ends'), { date });
  }
  if (e?.state === ON_HOLD) return s('s10.status.onHold');
  if (e?.everPremium === true) return s('s10.status.lapsed');
  return s('s10.status.free');
}

export function YourPlan({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  plan = 'free',
  answer = null,
  offer = null,
  busy = false,
  notice = null,
  onStartPreview = () => {},
  onBuy = () => {},
  onCancel = () => {},
  onBack,
  onRetry = () => {},
}: YourPlanProps) {
  const t = tokens(display);
  const s = strings(language);

  /* Read for nothing, and still required - the contract S1, S5 and S7 state. */
  void store;

  const e = answer?.entitlement ?? null;
  const onHold = plan === 'free' && e?.state === ON_HOLD;
  const purchased = plan === 'premium' && e?.source === 'purchase';
  /*
   * CANCEL WHEREVER A SUBSCRIPTION EXISTS ON PLAY. On hold, Play keeps retrying
   * the payment; the same page is where he fixes it or cancels it, so the way
   * out is offered there too rather than only while Premium is running.
   */
  const canCancel = purchased || onHold;
  const showPreview = plan === 'free' && e?.previewAvailable === true;
  const showBuy = !canCancel;

  const playPlans = offer?.kind === 'ready' ? offer.plans : [];
  const priceOf = (base: BasePlan) =>
    playPlans.find((p) => p.basePlanId === base)?.pricePaise ?? PREMIUM_PRICES[base];
  const open = (base: BasePlan) =>
    answer?.buying != null && playPlans.some((p) => p.basePlanId === base);
  const anyClosed = BASE_PLANS.some((b) => !open(b));

  const body = {
    fontFamily: t.font.regular,
    fontSize: t.type.body,
    lineHeight: t.leading(t.type.body),
    color: t.color.ink,
  } as const;
  const muted = { ...body, color: t.color.inkMuted } as const;

  const list = (id: string, keys: readonly StringKey[]) =>
    keys.map((key, i) => (
      <Text
        key={key}
        testID={id + '-' + String(i + 1)}
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          ...body,
          paddingHorizontal: t.space.md,
          paddingVertical: t.space.sm,
          borderTopWidth: t.hairline,
          borderTopColor: t.color.border,
        }}
      >
        {s(key)}
      </Text>
    ));

  return (
    <Shell
      id="s10"
      s={s}
      display={display}
      status={status}
      titleKey="s10.title"
      /*
       * NEVER EMPTY. With no answer from the server yet he is on Free, and the
       * free promise, the Premium list and the price are structural - there is
       * no plan state in which this screen has nothing to say.
       */
      empty={false}
      onBack={onBack}
      onRetry={onRetry}
    >
      {notice === null ? null : (
        <View
          testID={'s10-notice-' + notice}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{
            marginHorizontal: t.space.md,
            marginTop: t.space.md,
            padding: t.space.md,
            borderRadius: t.radius.lg,
            backgroundColor: t.color.surfaceRaised,
            borderWidth: t.hairline,
            borderColor: t.color.borderStrong,
          }}
        >
          <Text maxFontSizeMultiplier={t.maxFontScale} style={body}>
            {s(NOTICE[notice])}
          </Text>
        </View>
      )}

      <Card testID="s10-status-group" display={display}>
        <Text
          testID="s10-status"
          maxFontSizeMultiplier={t.maxFontScale}
          style={{ ...body, fontFamily: t.font.medium, padding: t.space.md }}
        >
          {planStatus(plan, answer, s)}
        </Text>
        {canCancel ? (
          <View style={{ paddingHorizontal: t.space.sm, paddingBottom: t.space.sm }}>
            <PrimaryButton
              testID="s10-cancel"
              label={s('s10.cancel')}
              onPress={onCancel}
              display={display}
              variant="secondary"
              size="lg"
            />
            <Text
              testID="s10-cancel-note"
              maxFontSizeMultiplier={t.maxFontScale}
              style={{ ...muted, paddingHorizontal: t.space.sm }}
            >
              {s('s10.cancel.note')}
            </Text>
          </View>
        ) : null}
        {showPreview ? (
          <View style={{ paddingHorizontal: t.space.sm, paddingBottom: t.space.sm }}>
            <PrimaryButton
              testID="s10-preview"
              label={s('s10.preview')}
              onPress={onStartPreview}
              display={display}
              disabled={busy}
              variant="secondary"
              size="lg"
            />
            <Text
              testID="s10-preview-note"
              maxFontSizeMultiplier={t.maxFontScale}
              style={{ ...muted, paddingHorizontal: t.space.sm }}
            >
              {s('s10.preview.note')}
            </Text>
          </View>
        ) : null}
      </Card>

      {showBuy ? (
        <Card testID="s10-price-group" display={display} title={s('s10.price.title')}>
          {/*
            HOW TO LEAVE, BEFORE THE BUTTONS THAT JOIN. R4 §5.4.1 wants the price,
            the period, the renewal and the way to cancel all seen before he buys;
            in reading order this line comes first, and each tile carries the rest.
          */}
          <Text
            testID="s10-terms"
            maxFontSizeMultiplier={t.maxFontScale}
            style={{ ...muted, paddingHorizontal: t.space.md }}
          >
            {s('s10.cancelTerms')}
          </Text>
          {/*
            WHY THE BUTTONS ARE GREY, ABOVE THEM. Below the tiles it fell under
            the fold on a 360x800 screen, leaving two disabled buttons with the
            reason out of sight - which reads as a broken screen, not a closed one.
          */}
          {anyClosed ? (
            <Text
              testID="s10-not-open"
              maxFontSizeMultiplier={t.maxFontScale}
              style={{ ...body, paddingHorizontal: t.space.md, paddingTop: t.space.sm }}
            >
              {s('s10.notOpen')}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: t.space.xs }}>
            {BASE_PLANS.map((base) => (
              <View
                key={base}
                testID={'s10-price-' + base}
                style={{
                  // Two equal tiles, side by side where they fit and stacked
                  // where they do not; the same weight either way.
                  flexBasis: '45%',
                  flexGrow: 1,
                  margin: t.space.xs,
                  paddingTop: t.space.sm,
                  borderRadius: t.radius.md,
                  borderWidth: t.hairline,
                  borderColor: t.color.border,
                  // The button sits at the foot of its tile, so the two line up
                  // when Odia wraps one tile's terms to more lines than the other's.
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ paddingHorizontal: t.space.sm }}>
                  <Text
                    maxFontSizeMultiplier={t.maxFontScale}
                    style={{ ...body, fontFamily: t.font.medium }}
                  >
                    {s(base === 'monthly' ? 's10.price.monthly' : 's10.price.yearly')}
                  </Text>
                  <Money
                    testID={'s10-price-' + base + '-amount'}
                    amount={priceOf(base)}
                    mode={display}
                    size="figure"
                  />
                  <Text maxFontSizeMultiplier={t.maxFontScale} style={muted}>
                    {s(base === 'monthly' ? 's10.price.perMonth' : 's10.price.perYear')}
                  </Text>
                  <Text maxFontSizeMultiplier={t.maxFontScale} style={muted}>
                    {s(base === 'monthly' ? 's10.renew.monthly' : 's10.renew.yearly')}
                  </Text>
                </View>
                <PrimaryButton
                  testID={'s10-buy-' + base}
                  label={s(base === 'monthly' ? 's10.buy.monthly' : 's10.buy.yearly')}
                  onPress={() => onBuy(base)}
                  display={display}
                  disabled={busy || !open(base)}
                  variant="secondary"
                  size="lg"
                />
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <Card testID="s10-free-group" display={display} title={s('s10.free.title')}>
        <Text
          testID="s10-free-promise"
          maxFontSizeMultiplier={t.maxFontScale}
          style={{ ...body, paddingHorizontal: t.space.md, paddingBottom: t.space.sm }}
        >
          {s('s10.free.promise')}
        </Text>
        {list('s10-free', FREE_ITEMS)}
      </Card>

      <View style={{ paddingBottom: t.space.md }}>
        <Card testID="s10-premium-group" display={display} title={s('s10.premium.title')}>
          {list('s10-premium', PREMIUM_ITEMS)}
        </Card>
      </View>
    </Shell>
  );
}
