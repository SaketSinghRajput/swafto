/**
 * R5 FR-3 / FR-4 - THE PHONE'S OWN SCREEN LOCK, AND HANDING A FILE TO ANOTHER APP.
 *
 * The JavaScript face of `SwaftoDeviceModule.kt`. Only Root imports this file;
 * everything else takes a `DeviceBridge` injected (type-only import), so the
 * lock policy is tested in Node with a fake and no React Native at all.
 *
 * SAFE WHEN THE MODULE IS ABSENT - an older binary under a newer bundle, or any
 * environment without the native side. Absent means: the phone is not known to
 * be secure, a confirm is 'unavailable', and a share rejects so the caller can
 * say so. The lock policy (host.tsx) reads 'unavailable' as "let him in, with a
 * note" - never as "lock him out".
 */
import { NativeModules } from 'react-native';

/** What a confirm came to. 'unavailable': the phone cannot ask (no screen lock, no activity). */
export type ConfirmResult = 'ok' | 'cancelled' | 'unavailable';

export interface DeviceBridge {
  /** True when the phone has a screen lock (PIN, pattern, password, biometric). */
  isDeviceSecure(): Promise<boolean>;
  /** Ask for the phone's own screen lock. */
  confirmCredential(title: string, description: string): Promise<ConfirmResult>;
  /** Write `text` to a cache file and open the share sheet on it. Rejects if it cannot. */
  shareTextFile(fileName: string, mimeType: string, text: string, chooserTitle: string): Promise<void>;
  /**
   * M3: open the phone's Date and time settings. Optional, so a fake bridge
   * need not draw it; rejects when the binary or the phone cannot.
   */
  openDateSettings?(): Promise<void>;
}

interface NativeDevice {
  isDeviceSecure(): Promise<boolean>;
  confirmCredential(title: string, description: string): Promise<string>;
  shareTextFile(fileName: string, mimeType: string, text: string, chooserTitle: string): Promise<null>;
  openDateSettings?(): Promise<null>;
}

const native = (NativeModules as { SwaftoDevice?: NativeDevice }).SwaftoDevice;

export const device: DeviceBridge = {
  async isDeviceSecure() {
    if (!native) return false;
    try {
      return (await native.isDeviceSecure()) === true;
    } catch {
      return false;
    }
  },
  async confirmCredential(title, description) {
    if (!native) return 'unavailable';
    try {
      const r = await native.confirmCredential(title, description);
      return r === 'ok' || r === 'cancelled' ? r : 'unavailable';
    } catch {
      return 'unavailable';
    }
  },
  async shareTextFile(fileName, mimeType, text, chooserTitle) {
    if (!native) throw new Error('file sharing is not available in this build');
    await native.shareTextFile(fileName, mimeType, text, chooserTitle);
  },
  async openDateSettings() {
    // An older binary has no such method: reject, and the caller keeps the written instruction.
    if (!native || typeof native.openDateSettings !== 'function') {
      throw new Error('date settings cannot be opened in this build');
    }
    await native.openDateSettings();
  },
};
