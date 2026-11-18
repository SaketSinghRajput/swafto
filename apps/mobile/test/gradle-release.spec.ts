/**
 * OPS-13 - release hardening, checked as TEXT. UNVERIFIED-BUILD: no Gradle,
 * JDK or Android SDK exists on this machine (H14), so these pin what the file
 * says, not what a build does. The CTO's Wave 5 build is the proof.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const gradle = read('../android/app/build.gradle');
// Comments may mention what is forbidden; assertions about code look at code only.
const code = gradle.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const rules = read('../android/app/proguard-rules.pro');

describe('release signing', () => {
  it('has no path that signs a release with the debug key', () => {
    const release = code.slice(code.indexOf('release {'));
    expect(release.slice(0, release.indexOf('proguardFiles'))).not.toMatch(/signingConfigs\.debug/);
    expect(code).not.toMatch(/\?\s*signingConfigs\.upload\s*:\s*signingConfigs\.debug/);
    expect(code).toContain("signingConfig signingConfigs.findByName('upload')");
  });

  it('fails a release task when no upload keystore is configured, naming the settings and H14', () => {
    expect(code).toContain('gradle.taskGraph.whenReady');
    expect(code).toMatch(/\(assemble\|bundle\|package\|sign\|validateSigning\)Release/);
    expect(code).toContain("!project.android.signingConfigs.findByName('upload')");
    expect(code).toContain('throw new GradleException');
    expect(code).toContain('SWAFTO_UPLOAD_STORE_FILE');
    expect(code).toContain('H14');
  });

  it('reads the keystore settings from properties or the environment, never from the tree', () => {
    expect(code).toContain('System.getenv(name)');
    for (const k of ['STORE_FILE', 'STORE_PASSWORD', 'KEY_ALIAS', 'KEY_PASSWORD']) {
      expect(code).toContain(`swaftoSetting('SWAFTO_UPLOAD_${k}'`);
    }
  });
});

describe('version', () => {
  it('versionCode and versionName come from SWAFTO_VERSION_* with a dev default', () => {
    expect(code).toMatch(/versionCode swaftoSetting\('SWAFTO_VERSION_CODE', '1'\)\.toInteger\(\)/);
    expect(code).toMatch(/versionName swaftoSetting\('SWAFTO_VERSION_NAME', '1\.0'\)/);
    expect(code).not.toMatch(/versionCode\s+\d/);
  });
});

describe('R8 and resource shrinking', () => {
  it('are on for release', () => {
    expect(code).toContain('def enableProguardInReleaseBuilds = true');
    expect(code).toMatch(/minifyEnabled enableProguardInReleaseBuilds/);
    expect(code).toMatch(/shrinkResources enableProguardInReleaseBuilds/);
    expect(code).toContain('"proguard-rules.pro"');
  });

  it('keep rules cover Nitro, MMKV, op-sqlite and our own native modules', () => {
    for (const keep of [
      '-keep class com.margelo.nitro.** { *; }',
      '-keep class com.margelo.nitro.mmkv.** { *; }',
      '-keep class com.op.sqlite.** { *; }',
      '-keep class com.swafto.** { *; }',
      '-keep class com.facebook.jni.** { *; }',
      '@com.facebook.react.bridge.ReactMethod',
    ]) {
      expect(rules).toContain(keep);
    }
  });

  it('every keep rule targets a package that exists in the tree or in node_modules', () => {
    expect(read('../android/app/src/main/java/com/swafto/MainApplication.kt')).toContain('package com.swafto');
    expect(
      readFileSync(
        new URL('../../../node_modules/@op-engineering/op-sqlite/android/src/main/java/com/op/sqlite/OPSQLitePackage.kt', import.meta.url),
        'utf8',
      ),
    ).toContain('package com.op.sqlite');
  });
});
