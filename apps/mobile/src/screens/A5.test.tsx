/**
 * A5 A PROBLEM WITH THE CODE - one state at a time, each with the server's own
 * figures and no invented count.
 */
import { describe, it, expect } from 'vitest';
import { CodeProblem } from './A5.tsx';
import { render, byTestId, text, all } from '../../test/render.tsx';
import { undersizedTargets, failingContrast } from '../../test/a11y.tsx';
import { OTP_TTL_SECONDS } from '@swafto/values';

const ids = (tree: ReturnType<typeof render>) => all(tree).map((n) => String(n.props?.testID ?? ''));

describe('A5 Code problem', () => {
  it('shows only the state that happened', () => {
    for (const p of ['mismatch', 'expired', 'locked', 'noCode'] as const) {
      const shown = ids(render(<CodeProblem problem={p} />)).filter((id) =>
        /^a5-(mismatch|expired|locked|noCode)$/.test(id),
      );
      expect(shown, p).toEqual(['a5-' + p]);
    }
  });

  it('"does not match" names no attempt count - the server never sends one', () => {
    const body = text(byTestId(render(<CodeProblem problem="mismatch" />), 'a5-message'));
    expect(body).toBe('Check the 6 digits and try again.');
    expect(body).not.toMatch(/attempt/i);
  });

  it('"expired" quotes the code lifetime and offers a new code', () => {
    let sent = 0;
    const tree = render(<CodeProblem problem="expired" onSendNew={() => (sent += 1)} />);
    expect(text(byTestId(tree, 'a5-message'))).toContain(String(OTP_TTL_SECONDS / 60) + ' minutes');
    byTestId(tree, 'a5-send-new').props.onPress();
    expect(sent).toBe(1);
  });

  it('"too many tries" rounds the server wait UP to whole minutes, or says "later"', () => {
    const at = (seconds: number | null) =>
      text(byTestId(render(<CodeProblem problem="locked" retryAfterSeconds={seconds} />), 'a5-message'));
    expect(at(598)).toBe('For your safety, try again in 10 minutes.');
    expect(at(61)).toBe('For your safety, try again in 2 minutes.');
    expect(at(null)).toBe('For your safety, try again later.');
  });

  it('only "expired" (and a request that never landed) offers to send a code', () => {
    expect(ids(render(<CodeProblem problem="mismatch" />))).not.toContain('a5-send-new');
    expect(ids(render(<CodeProblem problem="locked" />))).not.toContain('a5-send-new');
    // No WhatsApp button: there is no support number to open (BLOCKED).
    expect(ids(render(<CodeProblem problem="noCode" />))).not.toContain('a5-send-new');
    expect(ids(render(<CodeProblem problem="offline" />))).toContain('a5-send-new');
    expect(ids(render(<CodeProblem problem="offline" />))).toContain('auth-notice-offline');
  });

  it('renders loading and error, and clears the floors at the worst case', () => {
    expect(byTestId(render(<CodeProblem status="loading" />), 'a5-loading')).toBeTruthy();
    expect(byTestId(render(<CodeProblem status="error" />), 'a5-retry')).toBeTruthy();
    const tree = render(<CodeProblem language="longest" display="focus" problem="expired" />);
    expect(failingContrast(tree)).toEqual([]);
    expect(undersizedTargets(tree)).toEqual([]);
  });
});
