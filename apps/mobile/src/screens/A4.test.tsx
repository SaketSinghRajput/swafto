/**
 * A4 ENTER THE CODE - six boxes, the sixth digit sends, and the keypad is gone
 * while the code is being checked.
 */
import { describe, it, expect } from 'vitest';
import { CodeEntry, NO_CODE_AFTER_RESENDS } from './A4.tsx';
import { Session } from '../app/session.tsx';
import { canonicalStore } from './registry.tsx';
import { render, byTestId, text, all } from '../../test/render.tsx';
import { undersizedTargets, failingContrast } from '../../test/a11y.tsx';

const ids = (tree: ReturnType<typeof render>) => all(tree).map((n) => String(n.props?.testID ?? ''));

describe('A4 Enter the code', () => {
  it('six boxes, the typed digits in order, the next empty one ringed', () => {
    const tree = render(<CodeEntry phone="9876543210" code="987" />);
    const boxes = [0, 1, 2, 3, 4, 5].map((i) => byTestId(tree, 'a4-box-' + i));
    expect(boxes.map((b) => text(b))).toEqual(['9', '8', '7', '', '', '']);
    const ringed = boxes.map((b) => b.props.style.borderColor);
    expect(ringed[3]).not.toBe(ringed[4]);
    expect(text(byTestId(tree, 'a4-sent-to'))).toBe('Sent to +91 98765 43210');
  });

  it('the session reports the SIXTH digit once, which is when the code is sent', () => {
    const s = new Session(canonicalStore(), { now: () => '', newId: () => 'x', screen: 'A4' });
    const completed = '1234567'.split('').map((d) => s.pressCode(d as '1'));
    expect(completed).toEqual([false, false, false, false, false, true, false]);
    expect(s.state.auth.code).toBe('123456'); // the seventh press changed nothing
  });

  it('while checking, the keypad is withdrawn and "Checking" is shown', () => {
    const busy = render(<CodeEntry code="987654" busy />);
    expect(ids(busy)).not.toContain('a4-keypad');
    expect(text(byTestId(busy, 'a4-checking'))).toBe('Checking…');
    expect(ids(render(<CodeEntry code="98" />))).toContain('a4-keypad');
  });

  it('"Try again" appears only when the request never got an answer', () => {
    let retried = 0;
    const offline = render(<CodeEntry problem="offline" onRetryVerify={() => (retried += 1)} />);
    byTestId(offline, 'a4-retry').props.onPress();
    expect(retried).toBe(1);
    expect(ids(render(<CodeEntry problem="failed" />))).toContain('a4-retry');
    expect(ids(render(<CodeEntry problem={null} />))).not.toContain('a4-retry');
  });

  it('"Still no code?" is offered only after the reference\'s two resends', () => {
    expect(NO_CODE_AFTER_RESENDS).toBe(2);
    expect(ids(render(<CodeEntry resends={1} />))).not.toContain('a4-no-code');
    expect(ids(render(<CodeEntry resends={2} />))).toContain('a4-no-code');
  });

  it('edit, resend, trouble and back each reach their handler', () => {
    const hit: string[] = [];
    const tree = render(
      <CodeEntry
        onEditPhone={() => hit.push('edit')}
        onResend={() => hit.push('resend')}
        onTrouble={() => hit.push('trouble')}
        onBack={() => hit.push('back')}
      />,
    );
    for (const id of ['a4-edit', 'a4-resend', 'a4-trouble', 'a4-back']) byTestId(tree, id).props.onPress();
    expect(hit).toEqual(['edit', 'resend', 'trouble', 'back']);
  });

  it('renders loading and error, and clears the floors at the worst case', () => {
    expect(byTestId(render(<CodeEntry status="loading" />), 'a4-loading')).toBeTruthy();
    expect(byTestId(render(<CodeEntry status="error" />), 'a4-retry')).toBeTruthy();
    const tree = render(<CodeEntry language="longest" display="focus" code="98" resends={2} />);
    expect(failingContrast(tree)).toEqual([]);
    expect(undersizedTargets(tree)).toEqual([]);
  });
});

describe('HT-34 - the code being typed stays beside the keypad at any text size', () => {
  it('the boxes are in the footer with the keypad, not in the scrolling body', () => {
    const tree = render(<CodeEntry phone="9876543210" code="98" />);
    const pinned = all(tree).some(
      (n) =>
        n.children.some((c) => c.props.testID === 'a4-boxes') &&
        n.children.some((c) => c.props.testID === 'a4-keypad'),
    );
    expect(pinned).toBe(true);
  });

  it('and they stay on screen while the code is being checked', () => {
    expect(byTestId(render(<CodeEntry code="987654" busy />), 'a4-boxes')).toBeTruthy();
  });
});
