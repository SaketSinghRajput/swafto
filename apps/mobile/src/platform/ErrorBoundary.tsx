/**
 * THE TOP-LEVEL ERROR BOUNDARY. An uncaught render error used to unmount the
 * whole tree and leave a white screen on a shopkeeper's phone.
 *
 * WHAT HE SEES: a calm, translated screen that says his entries are safe -
 * which is true, the ledger is in SQLite and nothing here touches it - and one
 * "Restart" button. Restart remounts the tree under a fresh key, so `Root`
 * builds a new `Host` and reopens the database; no native restart is needed.
 * The language is the shop's when `getLanguage` can say (a render error after
 * start-up); when it cannot (the failure was Host construction itself) all
 * three languages are shown rather than guessing one. hi/od copy is DRAFT
 * pending native review (H13).
 *
 * WHAT IS REPORTED, AND WHAT IS NOT. `onError` receives only the error's class
 * name. Never its message or stack: a message can carry a customer's name or an
 * amount, and `check:client-logs` bans any log sink in client code for exactly
 * that reason. This file therefore logs nothing itself; the host passes a sink
 * when a redacting one exists.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, Pressable } from '@swafto/ui';
import { tokens } from '../theme/tokens.ts';
import { strings, type Language } from '../i18n/strings.ts';

export interface ErrorBoundaryProps {
  readonly children: ReactNode;
  /** The shop's language if known. Called at failure time, never at mount. */
  readonly getLanguage?: () => Language | undefined;
  /** The error class name only - no message, no stack, no data. */
  readonly onError?: (kind: string) => void;
}

interface State {
  readonly failed: boolean;
  /** Bumped by Restart, so the children remount from scratch. */
  readonly attempt: number;
}

const ALL: readonly Language[] = ['en', 'hi', 'or'];

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  override state: State = { failed: false, attempt: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  override componentDidCatch(error: unknown, _info: ErrorInfo): void {
    const kind = error instanceof Error && /^\w+$/.test(error.name) ? error.name : 'Error';
    try {
      this.props.onError?.(kind);
    } catch {
      // a broken sink must not take the error screen down with it
    }
  }

  readonly restart = (): void => {
    this.setState((s) => ({ failed: false, attempt: s.attempt + 1 }));
  };

  override render(): ReactNode {
    if (!this.state.failed) {
      return <Fragmented key={this.state.attempt}>{this.props.children}</Fragmented>;
    }
    const t = tokens('comfort');
    let known: Language | undefined;
    try {
      known = this.props.getLanguage?.();
    } catch {
      known = undefined; // the host may be the thing that broke
    }
    const languages = known ? [known] : ALL;
    return (
      <View
        testID="crash"
        style={{
          flex: 1,
          backgroundColor: t.color.bg,
          padding: t.space.lg,
          justifyContent: 'center',
        }}
      >
        {languages.map((lang) => {
          const s = strings(lang);
          return (
            <View key={lang} testID={'crash-' + lang} style={{ marginBottom: t.space.md }}>
              <Text
                maxFontSizeMultiplier={t.maxFontScale}
                style={{
                  fontFamily: t.font.medium,
                  fontSize: t.type.heading,
                  lineHeight: t.leading(t.type.heading),
                  color: t.color.ink,
                }}
              >
                {s('crash.title')}
              </Text>
              <Text
                maxFontSizeMultiplier={t.maxFontScale}
                style={{
                  fontFamily: t.font.regular,
                  fontSize: t.type.body,
                  lineHeight: t.leading(t.type.body),
                  color: t.color.ink,
                  marginTop: t.space.sm,
                }}
              >
                {s('crash.body')}
              </Text>
            </View>
          );
        })}
        <Pressable
          testID="crash-restart"
          accessibilityRole="button"
          accessibilityLabel={languages.map((l) => strings(l)('crash.restart')).join(' / ')}
          onPress={this.restart}
          style={{
            minHeight: t.control.xl,
            minWidth: t.touchTarget,
            marginTop: t.space.md,
            paddingHorizontal: t.space.md,
            borderRadius: t.radius.md,
            backgroundColor: t.color.brand,
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
              color: t.color.onBrand,
            }}
          >
            {languages.map((l) => strings(l)('crash.restart')).join(' / ')}
          </Text>
        </Pressable>
      </View>
    );
  }
}

/** Gives the children a key without adding a native view. */
function Fragmented({ children }: { children: ReactNode }): ReactNode {
  return children;
}
