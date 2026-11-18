# Human-tester pass 5 - BLOCKED (2026-10-26)

Independent tester session for SWAFTO Retail Desk, method per
`.claude/skills/swafto-human-tester/SKILL.md`. **No charter was run.** This page
says why, and what was verified before the block.

## Rig verification (done, all good)

| Check | Result |
|---|---|
| Device attached | `10BE6H031T000BN  device` |
| Installed APK md5 (`pm path` + `md5sum`) | `822f360ce90194ea34928b4c5b85f088` |
| Built APK md5 (`apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`) | `822f360ce90194ea34928b4c5b85f088` - matches |
| Built APK time vs HEAD | APK 2026-10-26 02:17:08 +0530, HEAD `24f53a1` 2026-10-26 01:46:44 +0530 - APK is newer |
| `adb reverse --list` | `UsbFfs tcp:8787 tcp:8787` - present |
| Dev API log | `/tmp/devserver.log` prints "THIS PRINTS SIGN-IN CODES. Development only." |
| Screen lock | `dumpsys lock_settings` -> `CredentialType: PIN` |

## The block

On the first step (`act.mjs launch shot p5-000`, frame
`artifacts/device-tests/pass5/p5-000.png`) the phone was showing its lock screen,
not the app:

- `dumpsys power`: `mWakefulness=Asleep`
- `dumpsys window`: `isKeyguardShowing=true`, `mDreamingLockscreen=true`
- `dumpsys trust`: user 0 `deviceLocked=1`, `trustState=UNTRUSTED`
- UI tree: "Device locked. Position your face in front of the screen to unlock the device", clock 02:18

The phone had locked itself (screen timeout) before the session began; this session sent
no power or sleep key. The device has a PIN, the tester does not have it, and the skill
forbids trying to get past a credential. Every charter needs the app in the foreground, so
**charters 1-9 are all BLOCKED - device locked with a PIN credential.**

Nothing was tested, so this pass reports **no defects and no confirmed fixes**. HT-21,
HT-22, HT-25, HT-26, HT-27, HT-29 and HT-30 keep their pass-4 status. Not one of them
was re-observed.

## Side effects of this session

- `act.mjs launch` force-stopped `com.swafto` once and sent a launcher intent. The keyguard
  stayed up. App data was not cleared (`clear` was not used).
- No device setting was changed, so there is nothing to restore. `adb reverse` is still in place.
- No file outside this one was written, apart from the frame under `artifacts/device-tests/pass5/`,
  which is git-ignored.

## What the Lead needs to do before re-running pass 5

1. Unlock the phone by hand.
2. Stop it locking again while the session runs, either by setting the screen timeout to the
   maximum or by turning on Developer options -> "Stay awake" (equivalently
   `adb shell settings put global stay_on_while_plugged_in 7`; afterwards restore the old
   value, which `settings get global stay_on_while_plugged_in` shows first).
3. Re-dispatch the tester with the same nine charters.
