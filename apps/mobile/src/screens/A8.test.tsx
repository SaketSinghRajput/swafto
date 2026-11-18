/**
 * A8 LOG OUT - a confirmation, and a pending line that tells the truth: logging
 * out here does NOT delete the entries.
 */
import { describe, it, expect } from 'vitest';
import { LogoutConfirm } from './A8.tsx';
import { render, byTestId, text } from '../../test/render.tsx';
import { undersizedTargets, failingContrast } from '../../test/a11y.tsx';
import { phrase, type Language } from '../i18n/strings.ts';

describe('A8 Log out confirmation', () => {
  it('names the shop and the number a sign-in will text', () => {
    const tree = render(<LogoutConfirm shopName="Sharma Kirana Store" phone="9876543210" />);
    expect(text(byTestId(tree, 'a8-heading'))).toBe('Log out of Sharma Kirana Store?');
    expect(text(tree)).toContain('+91 98765 43210');
  });

  it('counts unsynced entries, singular and plural, and never says they are lost', () => {
    const line = (n: number) => text(render(<LogoutConfirm pendingEntries={n} />));
    expect(line(2)).toContain('2 entries not yet synced');
    expect(line(1)).toContain('1 entry not yet synced');
    expect(line(0)).toContain('Everything is saved. Nothing will be lost.');
    for (const n of [0, 1, 2]) expect(line(n)).not.toMatch(/will lose/);
    for (const language of ['en', 'hi', 'or'] as Language[]) {
      expect(phrase('a8.pending', language)).toContain('{n}');
    }
  });

  it('"Stay signed in" and "Log out" reach different handlers', () => {
    const hit: string[] = [];
    const tree = render(
      <LogoutConfirm onStay={() => hit.push('stay')} onLogOut={() => hit.push('out')} />,
    );
    byTestId(tree, 'a8-stay').props.onPress();
    byTestId(tree, 'a8-logout').props.onPress();
    expect(hit).toEqual(['stay', 'out']);
  });

  it('renders loading and error, and clears the floors at the worst case', () => {
    expect(byTestId(render(<LogoutConfirm status="loading" />), 'a8-loading')).toBeTruthy();
    expect(byTestId(render(<LogoutConfirm status="error" />), 'a8-retry')).toBeTruthy();
    const tree = render(<LogoutConfirm language="longest" display="focus" pendingEntries={2} />);
    expect(failingContrast(tree)).toEqual([]);
    expect(undersizedTargets(tree)).toEqual([]);
  });
});
