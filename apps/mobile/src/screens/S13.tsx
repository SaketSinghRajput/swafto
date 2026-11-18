/**
 * S13 - YOUR DATA. DPDP's right of access, as a button (M2-approved, FLOWS
 * "Your data (access and export)").
 *
 * WHAT IT DOES. One button asks the server for everything it holds about this
 * account (`GET /v1/me/export`, which already exists - no backend work), and
 * hands the answer to the phone's share sheet as a file. Nothing is shown on
 * this screen that the server did not send, and nothing is sent anywhere he
 * did not choose on the share sheet.
 *
 * WHAT IT DOES NOT DO. It does not correct or erase. A correction is a new
 * dated entry on its day (D1, append-only), and erasure is "Delete this
 * account" - the screen says both in words and links the second, so access is
 * never mistaken for the only right he has.
 *
 * OFFLINE IS SAID, NOT HIDDEN. The export needs the server; with no signal the
 * banner says nothing was downloaded and to try again with signal. A spinner
 * would be a promise the phone cannot keep.
 *
 * NO KEYPAD, NO BOTTOM NAV: a settings leaf, reached from S1, with a way back.
 */
import { View } from '@swafto/ui';
import { Shell, Card, LinkRow, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { Banner } from '../components/Banner.tsx';
import { Quiet } from '../components/DayParts.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

/** Where the one request stands. `idle` before he asks; `done` once the share sheet opened. */
export type MyDataPhase = 'idle' | 'busy' | 'offline' | 'failed' | 'done';

export interface YourDataProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly phase?: MyDataPhase;
  /** Absent when this phone holds no session: the server has nothing to say to it. */
  readonly onDownload?: (() => void) | undefined;
  readonly onDeleteAccount?: () => void;
  readonly onBack?: (() => void) | undefined;
  readonly onRetry?: () => void;
}

export function YourData({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  phase = 'idle',
  onDownload,
  onDeleteAccount = () => {},
  onBack,
  onRetry = () => {},
}: YourDataProps) {
  const t = tokens(display);
  const s = strings(language);
  // Every screen takes the store, so the registry reaches it with both shops.
  void store;

  return (
    <Shell
      id="s13"
      s={s}
      display={display}
      status={status}
      titleKey="s13.title"
      // Never empty: the explanation and the button are structural, not data.
      empty={false}
      onBack={onBack}
      onRetry={onRetry}
      footer={
        <PrimaryButton
          testID="s13-download"
          label={s('s13.download')}
          onPress={onDownload ?? (() => {})}
          display={display}
          // Busy is a disabled button, never a spinner; signed out, there is nothing to ask.
          disabled={onDownload === undefined || phase === 'busy'}
        />
      }
    >
      <View style={{ padding: t.space.md }}>
        <Quiet testID="s13-what" text={s('s13.body')} display={display} />
      </View>
      {phase === 'offline' ? (
        <Banner testID="s13-offline" kind="warning" icon="offline" text={s('s13.offline')} display={display} />
      ) : phase === 'failed' ? (
        <Banner testID="s13-failed" kind="error" text={s('common.error')} display={display} />
      ) : null}
      <Card testID="s13-rights" display={display}>
        <View style={{ padding: t.space.md }}>
          <Quiet testID="s13-correct" text={s('s13.correct')} display={display} />
        </View>
        <LinkRow
          testID="s13-delete"
          label={s('s7.title')}
          icon="erase"
          destructive
          display={display}
          onPress={onDeleteAccount}
        />
      </Card>
    </Shell>
  );
}
