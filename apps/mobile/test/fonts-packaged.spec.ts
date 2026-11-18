/**
 * DV-11: every font a token names must be INSIDE THE APK.
 *
 * React Native on Android resolves `fontFamily: 'X'` to the APK's
 * assets/fonts/X.ttf. The files sat in apps/mobile/assets/fonts and Gradle
 * never packaged that directory, so a real phone drew the system fallback on
 * every screen - while check:font, which hashes the files, stayed green.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tokens } from '../src/theme/tokens.ts';

const MOBILE = join(__dirname, '..');

describe('the fonts the tokens name ship in the APK', () => {
  it('build.gradle packages apps/mobile/assets as an asset source', () => {
    const gradle = readFileSync(join(MOBILE, 'android/app/build.gradle'), 'utf8');
    expect(gradle).toMatch(/assets\.srcDirs\s*\+=\s*\[\s*'\.\.\/\.\.\/assets'\s*\]/);
  });

  it('every family in both displays has its .ttf under assets/fonts', () => {
    for (const display of ['comfort', 'focus'] as const) {
      for (const family of Object.values(tokens(display).font)) {
        if (typeof family !== 'string') continue;
        expect(existsSync(join(MOBILE, 'assets/fonts', family + '.ttf')), family).toBe(true);
      }
    }
  });
});
