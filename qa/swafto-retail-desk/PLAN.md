# QA plan — SWAFTO Retail Desk, on-device campaign (productionize Wave 5)

Owner: QA & Reliability, run by the CTO. Authorised by Saket (founder) on 2026-11-18, for his
own app on his own phone. Catalog: `FAILURE-CATALOG.md` (scenario-designer).

## Scope
The Android app, as a real shopkeeper uses it. Every screen and journey, human error,
device and network conditions, and the app's behaviour under server faults. The UI is judged
honestly, and redesigned where it isn't genuinely good. Server-side load, security and
chaos were covered in Waves 2–4 and are out of scope here, except as the app sees them.

## Environment
- Phone: vivo I2219, Android 16, 1080x2408, `adb -s 10BE6H031T000BN`. **High-contrast
  text is ON** (the owner's setting; left on, and noted on every screenshot judgement).
- Build: the debug APK from `productionize`, Gradle 8.14.3 (Saket's 9.7.1 wrapper edit is
  backed up at `C:\Users\user\swafto-saket-backups\`), installed with `adb install -r`.
- API: a local dev server on the laptop, Postgres test DB `swafto-pg-test`, reached via
  `adb reverse`. Server faults are simulated by stopping, slowing or erroring that local
  server only.
- Data: the existing install holds synthetic "TEST STORE D". **It is never cleared.**
  `run-as` backup is broken on this OEM (`packagelist_parse failed`), so no snapshot exists.
  Clean-slate scenarios need a separate install. If one is needed, the CTO decides how
  without touching the existing data, or the scenario is deferred and recorded as such.

## Team (one phone, so device sessions run one at a time)
| Pillar | Specialist |
|---|---|
| Real-device journeys, interruptions, network, kill | `mobile-realworld-tester` (lead device driver) |
| Human mistakes: double-submit, wrong order, back, odd input | `human-error-tester` |
| Usability and WCAG AA, font scale, od/hi/en, one hand, daylight | `usability-accessibility-tester` |
| Redesign specs where a screen fails | `product-designer` |
| Building redesigned screens to the design system | `screen-designer` |
| Defect write-ups and routing | `bug-reporter-triage` |
| Independent check of every fix | `worker-verifier` |

## Waves
1. **Smoke:** install the new build with `-r`, confirm launch, migration of the existing data
   (the outbox parking columns), the stale-day notice for 26 Oct, and no crash in logcat.
2. **Journeys:** the catalog's P0, then P1 (money correctness, close, sync, sign-in).
3. **Human error and device/network:** the catalog's scenarios that are SAFE on existing data.
4. **Usability/accessibility:** every screen; screenshots at 1.0/1.3/2.0 font; en/hi/od.
5. **Fix loop:** defects go to the owners (MOBILE builds; API if server-side). Then rebuild,
   `adb install -r`, re-test, and save before/after shots in `docs/ui/`.
6. **Sign-off:** worker-verifier re-runs the P0/P1 scenarios on the final build.

## Evidence
Screenshots go in `docs/ui/before|after/` and `qa/swafto-retail-desk/evidence/`. Logcat
excerpts, and the scenario ID → result table, live in `qa/swafto-retail-desk/RESULTS.md`.

## Abort conditions
Stop and tell the CTO immediately if:
- any action could clear or corrupt the existing app data;
- the app shows a money figure that doesn't reconcile;
- the phone becomes unresponsive;
- or a test would need anything outside localhost.

Never run `pm clear`, uninstall, or `adb install` without `-r` on the existing package.
