/**
 * A3 YOUR PHONE NUMBER - ten digits typed, never predicted, and "Send code"
 * only when there are ten.
 */
import { describe, it, expect } from 'vitest';
import { PhoneNumber, PHONE_PLACEHOLDER } from './A3.tsx';
import { Session } from '../app/session.tsx';
import { canonicalStore } from './registry.tsx';
import { render, byTestId, text, all } from '../../test/render.tsx';
import { undersizedTargets, failingContrast } from '../../test/a11y.tsx';

describe('HT-25 - ten digits that are not a mobile number say why', () => {
  it('a quiet hint for 1234567890, 0123456789 and 5999999999; none for a real or a short number', () => {
    for (const phone of ['1234567890', '0123456789', '5999999999']) {
      const tree = render(<PhoneNumber phone={phone} />);
      expect(text(byTestId(tree, 'a3-not-mobile')), phone).toContain('6, 7, 8 or 9');
      expect(byTestId(tree, 'a3-send').props.disabled).toBe(true);
    }
    for (const phone of ['9876543210', '12345', '']) {
      const tree = render(<PhoneNumber phone={phone} />);
      expect(all(tree).some((n) => n.props?.testID === 'a3-not-mobile'), phone).toBe(false);
    }
  });

  it('the hint passes contrast at the worst case', () => {
    const tree = render(<PhoneNumber phone="1234567890" language="longest" display="focus" />);
    expect(failingContrast(tree)).toEqual([]);
  });
});

describe('A3 Phone number', () => {
  it('shows the placeholder until a digit is typed, then the digits as 5 + 5', () => {
    expect(byTestId(render(<PhoneNumber />), 'a3-phone').props.children).toBe(PHONE_PLACEHOLDER);
    expect(byTestId(render(<PhoneNumber phone="98765" />), 'a3-phone').props.children).toBe('98765');
    expect(byTestId(render(<PhoneNumber phone="9876543210" />), 'a3-phone').props.children).toBe(
      '98765 43210',
    );
  });

  it('"Send code" is disabled below ten digits and while a request is in flight', () => {
    let sent = 0;
    const send = (phone: string, busy = false) =>
      byTestId(render(<PhoneNumber phone={phone} busy={busy} onSend={() => (sent += 1)} />), 'a3-send');
    expect(send('987654321').props.disabled).toBe(true);
    // HT-5: ten digits is not enough - India's mobile series starts 6-9.
    expect(send('1234567890').props.disabled).toBe(true);
    expect(send('0123456789').props.disabled).toBe(true);
    expect(send('9876543210', true).props.disabled).toBe(true);
    expect(send('9876543210', true).props.accessibilityLabel).toBe('Sending…');
    const ready = send('9876543210');
    expect(ready.props.disabled).toBe(false);
    ready.props.onPress();
    expect(sent).toBe(1);
  });

  it('the keypad reaches the session, which keeps ten digits and no more', () => {
    const s = new Session(canonicalStore(), { now: () => '', newId: () => 'x', screen: 'A3' });
    for (const d of '98765432109') s.pressPhone(d as '9');
    expect(s.state.auth.phone).toBe('9876543210');
    s.pressPhone('back');
    expect(s.state.auth.phone).toBe('987654321');
    s.pressPhone('clear');
    expect(s.state.auth.phone).toBe('');

    const tree = render(<PhoneNumber onKey={(k) => s.pressPhone(k)} />);
    byTestId(tree, 'keypad-7').props.onPress();
    expect(s.state.auth.phone).toBe('7');
  });

  it('no signal is a quiet notice, not a refusal of his number', () => {
    const tree = render(<PhoneNumber phone="9876543210" problem="offline" />);
    expect(byTestId(tree, 'auth-notice-offline')).toBeTruthy();
    expect(text(tree)).toContain("You're offline");
    // No notice for a problem that is not a notice.
    const quiet = render(<PhoneNumber phone="9876543210" problem={null} />);
    expect(all(quiet).some((n) => String(n.props?.testID).startsWith('auth-notice'))).toBe(false);
  });

  it('offers the number-changed path and a way back', () => {
    let changed = 0;
    let back = 0;
    const tree = render(
      <PhoneNumber onChangedNumber={() => (changed += 1)} onBack={() => (back += 1)} />,
    );
    byTestId(tree, 'a3-changed').props.onPress();
    byTestId(tree, 'a3-back').props.onPress();
    expect([changed, back]).toEqual([1, 1]);
  });

  it('renders loading and error, and clears the floors at the worst case', () => {
    expect(byTestId(render(<PhoneNumber status="loading" />), 'a3-loading')).toBeTruthy();
    expect(byTestId(render(<PhoneNumber status="error" />), 'a3-retry')).toBeTruthy();
    const tree = render(<PhoneNumber language="longest" display="focus" phone="9876543210" />);
    expect(failingContrast(tree)).toEqual([]);
    expect(undersizedTargets(tree)).toEqual([]);
  });
});

describe('HT-18 - the problem is shown beside the keypad, not scrolled under it', () => {
  it('the offline notice sits in the footer, directly above the keypad', () => {
    const tree = render(<PhoneNumber phone="9876500042" problem="offline" />);
    const siblings = all(tree).some(
      (n) =>
        n.children.some((c) => c.props.testID === 'auth-notice-offline') &&
        n.children.some((c) => c.props.testID === 'a3-keypad'),
    );
    expect(siblings).toBe(true);
  });
});

describe('HT-34 - the number being typed stays beside the keypad at any text size', () => {
  it('the field is in the footer with the keypad, not in the scrolling body', () => {
    const tree = render(<PhoneNumber phone="98765" />);
    const pinned = all(tree).some(
      (n) =>
        n.children.some((c) => c.props.testID === 'a3-field') &&
        n.children.some((c) => c.props.testID === 'a3-keypad'),
    );
    expect(pinned).toBe(true);
  });
});

describe('HT-34 - a footer taller than the screen scrolls, it is not cut off', () => {
  it('the keypad and Send code sit in a footer that may shrink and scroll', () => {
    const tree = render(<PhoneNumber phone="98765" problem="offline" />);
    const footer = byTestId(tree, 'a3-footer');
    expect(footer.props.style).toMatchObject({ flexGrow: 0, flexShrink: 1 });
    const inside = all(footer).map((n) => n.props?.testID);
    expect(inside).toContain('a3-keypad');
    expect(inside).toContain('a3-send');
  });
});

describe('INVITE GATE - A3 in invite mode says no SMS is coming', () => {
  it('invite: the help line names the code SWAFTO gave him, with its eight digits, and the button is "Next"', () => {
    const tree = render(<PhoneNumber phone="9876543210" mode="invite" digits={8} />);
    expect(text(byTestId(tree, 'a3-help'))).toBe('Type your number, then the 8-digit code SWAFTO gave you.');
    expect(text(byTestId(tree, 'a3-help'))).not.toMatch(/send|SMS/i);
    expect(text(byTestId(tree, 'a3-send'))).toBe('Next');
  });

  it('sms (and no mode): unchanged - "We will send a 6-digit code", "Send code"', () => {
    for (const tree of [render(<PhoneNumber phone="9876543210" mode="sms" />), render(<PhoneNumber phone="9876543210" />)]) {
      expect(text(byTestId(tree, 'a3-help'))).toBe('We will send a 6-digit code to confirm it is you.');
      expect(text(byTestId(tree, 'a3-send'))).toBe('Send code');
    }
  });

  it('invite copy in Hindi and Odia, and the floors at the worst case', () => {
    for (const language of ['hi', 'or'] as const) {
      const help = text(byTestId(render(<PhoneNumber mode="invite" digits={8} language={language} />), 'a3-help'));
      expect(help).toContain('SWAFTO');
      expect(help).toContain('8');
    }
    const worst = render(<PhoneNumber phone="9876543210" mode="invite" digits={8} language="longest" display="focus" />);
    expect(undersizedTargets(worst)).toEqual([]);
    expect(failingContrast(worst)).toEqual([]);
  });
});
