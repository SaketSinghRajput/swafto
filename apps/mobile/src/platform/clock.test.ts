import { describe, it, expect } from 'vitest';
import { localIso } from './clock.ts';

describe('localIso - DV-8, the close time on the wall clock', () => {
  it('is the same instant, written in the local offset', () => {
    const d = new Date(Date.UTC(2026, 0, 2, 22, 3, 0, 0));
    const s = localIso(d);
    expect(new Date(s).getTime()).toBe(d.getTime());
    expect(s.slice(11, 16)).toBe(
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'),
    );
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/);
    expect(s.length).toBeLessThanOrEqual(30);
  });
});
