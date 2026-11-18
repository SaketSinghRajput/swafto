/**
 * A6 SESSION EXPIRED - ADR-007's copy, the number to verify with, and no back.
 */
import { describe, it, expect } from 'vitest';
import { SessionExpired } from './A6.tsx';
import { render, byTestId, text, all } from '../../test/render.tsx';
import { undersizedTargets, failingContrast } from '../../test/a11y.tsx';
import { phrase } from '../i18n/strings.ts';

describe('A6 Session expired', () => {
  it('names the shop, says the book is safe, and offers to verify the number', () => {
    let verified = 0;
    const tree = render(
      <SessionExpired
        shopName="Sharma Kirana Store"
        phone="9876543210"
        onVerify={() => (verified += 1)}
      />,
    );
    expect(text(byTestId(tree, 'a6-shop'))).toBe('Sharma Kirana Store');
    expect(text(tree)).toContain('Your book is untouched');
    const button = byTestId(tree, 'a6-verify');
    expect(button.props.accessibilityLabel).toBe('Verify with +91 98765 43210');
    button.props.onPress();
    expect(verified).toBe(1);
  });

  it('has no back affordance - there is nowhere signed-in to go back to', () => {
    const tree = render(<SessionExpired phone="9876543210" />);
    expect(all(tree).some((n) => n.props?.testID === 'a6-back')).toBe(false);
  });

  it('an unnamed shop reads as unnamed, never blank', () => {
    expect(text(byTestId(render(<SessionExpired />), 'a6-shop'))).toBe(phrase('s2.unnamed', 'en'));
  });

  it('disables the button while a code is being requested, and shows no signal quietly', () => {
    expect(byTestId(render(<SessionExpired busy />), 'a6-verify').props.disabled).toBe(true);
    expect(byTestId(render(<SessionExpired problem="offline" />), 'auth-notice-offline')).toBeTruthy();
  });

  it('renders loading and error, and clears the floors at the worst case', () => {
    expect(byTestId(render(<SessionExpired status="loading" />), 'a6-loading')).toBeTruthy();
    expect(byTestId(render(<SessionExpired status="error" />), 'a6-retry')).toBeTruthy();
    const tree = render(<SessionExpired language="longest" display="focus" phone="9876543210" />);
    expect(failingContrast(tree)).toEqual([]);
    expect(undersizedTargets(tree)).toEqual([]);
  });
});
