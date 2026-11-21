# Environment notes (Phase 0, 2026-11-20)

Hand-written run notes, not a generated file.

## The emulator

| | |
|---|---|
| AVD name | `swafto_test` (Pixel 6 profile, Android 15 / API 35, `google_apis`, x86_64, `hw.ramSize=2048`) |
| Serial | `emulator-5554` |
| Acceleration | WHPX (`emulator -accel-check`: "WHPX(10.0.26200) is installed and usable.") |
| State at handover | **Running**, headless, app installed |
| AVD files | `C:\Users\user\.android\avd\swafto_test.avd` |
| Boot log | `C:\Users\user\AppData\Local\Temp\emulator.log` |

Paths (Git Bash):

```bash
export ANDROID_HOME="C:/Users/user/AppData/Local/Android/Sdk"
export ANDROID_AVD_HOME="C:/Users/user/.android/avd"
# start (background), then wait for boot
nohup "$ANDROID_HOME/emulator/emulator.exe" -avd swafto_test -no-window -no-audio \
  -gpu swiftshader_indirect -no-snapshot-save > /tmp/emulator.log 2>&1 &
adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done
# stop
adb -s emulator-5554 emu kill
```

`adb` and `sdkmanager` are on PATH, but `emulator` is not: call it by full path.
The `.bat` wrappers (`sdkmanager.bat`, `avdmanager.bat`) are needed from Git Bash.
`avdmanager` prints "Could not load devices from ...devices.xml" but still
creates the AVD; ignore it.

## The app

Debug APK built with `-PreactNativeArchitectures=x86_64` (the repo default is
`arm64-v8a,armeabi-v7a`, which the x86_64 emulator cannot run natively):

```bash
cd apps/mobile/android
./gradlew assembleDebug -PreactNativeArchitectures=x86_64 --console=plain
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.swafto/.MainActivity
```

Run the build from Git Bash with absolute paths. `./gradlew` must be invoked in
`apps/mobile/android` after any `source env.sh` (that file changes directory).
The build took 2m37s with a warm Gradle cache (measured, this machine); the
APK is 37,691,363 bytes (measured). It embeds the JS bundle, so Metro is not needed.

Launch evidence: `design/audit/phase0-launch.png`, `design/audit/phase0-logcat.txt`
(0 FATAL, 0 AndroidRuntime lines; `ReactNativeJS: Running "SWAFTO"`; `Displayed
com.swafto/.MainActivity +3s604ms`).

**Observation for Phase 1, not diagnosed:** with no API reachable the app stays
on the teal "SWAFTO" splash screen (checked about 45 s after launch). It is not
known whether that is the designed offline/first-run state or a stuck gate.

## Reaching a local dev API from the app

The debug build's API base URL is `http://localhost:8787` (see
`apps/mobile/android/app/build.gradle`), reached from the emulator through a
reverse tunnel. `adb reverse tcp:8787 tcp:8787` is **already set** for
`emulator-5554`; it is lost when the emulator or adb server restarts, so repeat it.

```bash
node tools/pg-up.mjs          # throwaway Postgres 17 in Docker on port 55432
node tools/dev-server.mjs     # API on 127.0.0.1:8787; prints DEV-OTP lines (dev only)
adb reverse tcp:8787 tcp:8787
```

Nothing is pointed at api.rohinova.com or any remote host.

## Postgres / Docker on this machine

Docker Desktop is installed (CLI present) but the **daemon is not running**
(`docker version`: cannot connect to `dockerDesktopLinuxEngine` pipe). So
`node tools/pg-up.mjs` fails today with "Docker daemon not reachable", and the
Postgres-backed suites skip. Starting Docker Desktop (a WSL2 VM) was **not
attempted**: with about 5 GB free and the emulator running it risks starving
both. **Not verified** that Docker can start here. Phase 1 should start Docker
Desktop only when the emulator is idle or stopped, then run `pg-up.mjs`.

## Node

`node -v` is 26.x in a fresh shell; the repo needs 24. Use
`source "C:/Users/user/AppData/Local/Temp/claude/5ffa23da51200cce/77fbafc9-5e28-4b05-919b-e234edfe3cfb/scratchpad/env.sh"`
(Node 24.22.3), and `cd` back to the repo afterwards.
