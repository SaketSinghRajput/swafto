/**
 * HT-17: in landscape the keypad's bottom rows were off screen and nothing
 * scrolled. A counter app with a full-height keypad is held upright, so the
 * activity is locked to portrait.
 * ponytail: Android 16 ignores the lock on large screens; tablets need a landscape layout.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('HT-17 - the activity does not rotate the keypad off screen', () => {
  it('MainActivity is locked to portrait', () => {
    const manifest = readFileSync(join(__dirname, '../android/app/src/main/AndroidManifest.xml'), 'utf8');
    const activity = manifest.match(/<activity[\s\S]*?android:name="\.MainActivity"[\s\S]*?>/)?.[0] ?? '';
    expect(activity).toContain('android:screenOrientation="portrait"');
  });
});

describe('HT-35 - a font-size change while open neither restarts nor freezes the layout', () => {
  it('MainActivity handles fontScale and density itself', () => {
    const manifest = readFileSync(join(__dirname, '../android/app/src/main/AndroidManifest.xml'), 'utf8');
    const changes = manifest.match(/android:configChanges="([^"]*)"/)?.[1]?.split('|') ?? [];
    expect(changes).toEqual(expect.arrayContaining(['fontScale', 'density']));
  });
});

describe('HT-35 - a font-size change starts a fresh process, not a stale layout', () => {
  it('MainActivity relaunches when the font scale changes', () => {
    const src = readFileSync(join(__dirname, '../android/app/src/main/java/com/swafto/MainActivity.kt'), 'utf8');
    expect(src).toMatch(/override fun onConfigurationChanged[\s\S]*newConfig\.fontScale != fontScale[\s\S]*startActivity\(relaunch\)[\s\S]*exit\(0\)/);
  });
});
