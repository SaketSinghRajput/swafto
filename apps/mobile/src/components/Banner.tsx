/**
 * THE BANNER (DESIGN-SYSTEM-V2 3.11). One line of state, said in words, with at
 * most one thing to do about it.
 *
 * It replaces the ad hoc notice cards (QA-06): a stale day, a phone date behind
 * the book, a refusal and a calm error were each a white card with grey text,
 * drawn four ways on four screens. A notice that has to be read in shop daylight
 * is a fill, an edge, an icon AND a sentence - never one of them alone.
 *
 * FOUR KINDS, NO RED FOR AN ERROR. `error` is the calm one - "could not load,
 * nothing is lost" - and it is deliberately the card colour with an `edge` rim:
 * red in this product means refused, and a load that failed refused nothing.
 * `refused` is the only kind drawn in `negative` on `tintRed`.
 *
 *   warning  tintGold, warning ink and rim   stale day, waiting   T39, N11
 *   info     tintIndigo, info ink and rim    a fact to note       T40
 *   error    surface, ink, edge rim          calm load failure    T2, N2
 *   refused  tintRed, negative ink and rim   the server said no   T41
 *
 * THE TEXT IS BODY COPY, so it grows with the reader's setting and wraps; the
 * one action is chrome, capped, and drawn as the quiet button (underlined ink)
 * so it reads as a way on rather than as a second primary.
 */
import { View, Text, Pressable } from '@swafto/ui';
import { Icon, type IconName } from '../ui/Icon.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';

export type BannerKind = 'warning' | 'info' | 'error' | 'refused';

export interface BannerAction {
  readonly testID: string;
  readonly label: string;
  readonly onPress: () => void;
}

export interface BannerProps {
  readonly testID: string;
  readonly kind: BannerKind;
  readonly text: string;
  readonly display?: DisplayMode;
  /** Overrides the kind's own icon - `stale` for an old day, `clock` for waiting. */
  readonly icon?: IconName;
  readonly action?: BannerAction;
  /** A second sentence, drawn under the first, for an instruction that is not a button. */
  readonly detail?: string;
  /** The sentence's own testID, where a screen already names it (`t1-stale-body`). */
  readonly textTestID?: string;
}

const KIND = {
  warning: { fill: 'tintGold', ink: 'warning', rim: 'warning', icon: 'stale' },
  info: { fill: 'tintIndigo', ink: 'info', rim: 'info', icon: 'info' },
  error: { fill: 'surface', ink: 'ink', rim: 'edge', icon: 'alert' },
  refused: { fill: 'tintRed', ink: 'negative', rim: 'negative', icon: 'alert' },
} as const;

export function Banner({
  testID,
  kind,
  text,
  display = 'comfort',
  icon,
  action,
  detail,
  textTestID,
}: BannerProps) {
  const t = tokens(display);
  const k = KIND[kind];
  const ink = t.color[k.ink];
  const urgent = kind === 'error' || kind === 'refused';
  return (
    <View
      testID={testID}
      accessibilityRole={urgent ? 'alert' : undefined}
      accessibilityLiveRegion={urgent ? 'assertive' : 'polite'}
      style={{
        marginHorizontal: t.space.gutter,
        marginTop: t.space.sm,
        paddingHorizontal: t.space.gutter,
        paddingVertical: t.space.sm,
        minHeight: t.control.lg,
        justifyContent: 'center',
        borderRadius: t.radius.lg,
        borderWidth: t.edgeWidth,
        borderColor: t.color[k.rim],
        backgroundColor: t.color[k.fill],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ marginRight: t.space.sm }}>
          <Icon name={icon ?? k.icon} size="md" color={k.ink} display={display} />
        </View>
        <Text
          testID={textTestID ?? testID + '-text'}
          {...t.bodyText}
          style={{
            flex: 1,
            fontFamily: t.font.medium,
            fontSize: t.type.body,
            lineHeight: t.leadingUncapped(t.type.body),
            color: ink,
          }}
        >
          {text}
        </Text>
      </View>
      {detail === undefined ? null : (
        <Text
          testID={testID + '-detail'}
          {...t.bodyText}
          style={{
            marginTop: t.space.xs,
            fontFamily: t.font.regular,
            fontSize: t.type.body,
            lineHeight: t.leadingUncapped(t.type.body),
            color: ink,
          }}
        >
          {detail}
        </Text>
      )}
      {action === undefined ? null : (
        <Pressable
          testID={action.testID}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={{
            alignSelf: 'flex-end',
            minHeight: t.touchTarget,
            minWidth: t.touchTarget,
            paddingHorizontal: t.space.sm,
            justifyContent: 'center',
          }}
        >
          <Text
            maxFontSizeMultiplier={t.maxFontScale}
            style={{
              fontFamily: t.font.bold,
              fontSize: t.type.body,
              lineHeight: t.leading(t.type.body),
              color: ink,
              textDecorationLine: 'underline',
              textAlign: 'right',
            }}
          >
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
