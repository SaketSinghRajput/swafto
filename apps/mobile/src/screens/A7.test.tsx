/**
 * A7 CHANGE YOUR NUMBER - the reference's two paths, and only what can be done.
 */
import { describe, it, expect } from 'vitest';
import { NumberChanged } from './A7.tsx';
import { render, byTestId, text, all } from '../../test/render.tsx';
import { undersizedTargets, failingContrast } from '../../test/a11y.tsx';

describe('A7 Change your number', () => {
  it('decide: the two paths, each reaching its handler', () => {
    const hit: string[] = [];
    const tree = render(
      <NumberChanged onHaveOld={() => hit.push('old')} onNoOld={() => hit.push('none')} />,
    );
    expect(text(tree)).toContain('SIM changed, phone lost, or a new device');
    byTestId(tree, 'a7-have-old').props.onPress();
    byTestId(tree, 'a7-no-old').props.onPress();
    expect(hit).toEqual(['old', 'none']);
  });

  it('HT-20 handoff: says support is not set up yet, and offers the one real route', () => {
    const opened: string[] = [];
    const tree = render(<NumberChanged stage="handoff" onOpenHelp={() => opened.push('help')} />);
    expect(text(byTestId(tree, 'a7-handoff'))).toContain('not set up yet');
    // No WhatsApp button and no address: none exists yet (H6, BLOCKED).
    const buttons = all(tree).filter((n) => n.props?.accessibilityRole === 'button');
    expect(buttons.map((b) => b.props.testID)).toEqual(['a7-help']);
    byTestId(tree, 'a7-help').props.onPress();
    expect(opened).toEqual(['help']);
    expect(text(tree)).not.toMatch(/whatsapp|@|\+91/i);
  });

  it('renders loading and error, and clears the floors at the worst case', () => {
    expect(byTestId(render(<NumberChanged status="loading" />), 'a7-loading')).toBeTruthy();
    expect(byTestId(render(<NumberChanged status="error" />), 'a7-retry')).toBeTruthy();
    const tree = render(<NumberChanged language="longest" display="focus" onBack={() => {}} />);
    expect(failingContrast(tree)).toEqual([]);
    expect(undersizedTargets(tree)).toEqual([]);
  });
});
