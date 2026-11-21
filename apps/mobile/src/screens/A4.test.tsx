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

describe('INVITE GATE - A4 with an eight-digit invite code', () => {
  it('eight boxes in two fours: 4821 0937 - the gap is before the fifth box, and only there', () => {
    const tree = render(<CodeEntry phone="9876543210" code="48210937" mode="invite" digits={8} />);
    const boxes = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => byTestId(tree, 'a4-box-' + i));
    expect(boxes.map((b) => text(b)).join('')).toBe('48210937');
    expect(ids(tree)).not.toContain('a4-box-8');
    const left = boxes.map((b) => (b.props.style.marginLeft ?? b.props.style.margin) as number);
    expect(left[4]).toBeGreaterThan(left[3] as number);
    expect(new Set(left.filter((_, i) => i !== 4)).size).toBe(1);
  });

  it('six digits (sms) stay six boxes in one run, with no group gap', () => {
    const tree = render(<CodeEntry code="123456" mode="sms" digits={6} />);
    expect(ids(tree)).toContain('a4-box-5');
    expect(ids(tree)).not.toContain('a4-box-6');
    const left = [0, 1, 2, 3, 4, 5].map((i) => byTestId(tree, 'a4-box-' + i).props.style.marginLeft);
    expect(left.every((m) => m === undefined)).toBe(true);
  });

  it('invite: no "Sent to", no Resend, no "Still no code?" - and "Paste code" reaches its handler', () => {
    let pasted = 0;
    const tree = render(
      <CodeEntry phone="9876543210" mode="invite" digits={8} resends={5} onPaste={() => (pasted += 1)} />,
    );
    expect(text(byTestId(tree, 'a4-sent-to'))).toBe('Type the code SWAFTO gave you for +91 98765 43210');
    expect(ids(tree)).not.toContain('a4-resend');
    expect(ids(tree)).not.toContain('a4-no-code');
    byTestId(tree, 'a4-paste').props.onPress();
    expect(pasted).toBe(1);
  });

  it('sms: "Sent to" and Resend as before, and no paste button', () => {
    const tree = render(<CodeEntry phone="9876543210" mode="sms" onPaste={() => {}} />);
    expect(text(byTestId(tree, 'a4-sent-to'))).toBe('Sent to +91 98765 43210');
    expect(ids(tree)).toContain('a4-resend');
    expect(ids(tree)).not.toContain('a4-paste');
  });

  it('the session takes eight digits once the reply says invite, and a pasted "4821 0937" fills them', () => {
    const s = new Session(canonicalStore(), { now: () => '', newId: () => 'x', screen: 'A3' });
    s.codeSent(false, { mode: 'invite', digits: 8 });
    expect(s.state.auth.codeDigits).toBe(8);
    expect(s.enterCode('4821 0937')).toBe(true);
    expect(s.state.auth.code).toBe('48210937');
  });

  it('clears the floors at the worst case in invite mode', () => {
    const tree = render(
      <CodeEntry language="longest" display="focus" code="48210" mode="invite" digits={8} onPaste={() => {}} />,
    );
    expect(failingContrast(tree)).toEqual([]);
    expect(undersizedTargets(tree)).toEqual([]);
  });
});
