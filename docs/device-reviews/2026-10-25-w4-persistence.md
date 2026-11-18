# Device review — W4 persistence walk, 2026-10-25

**Device:** iQOO I2219 (serial ending …0BN), 1080×2408, density 440, logical
393×876. **Build:** debug APK from commit `cacd461`. **Driver:**
label-driven walk (`persist.mjs`, accessibility tree, no pixel coordinates).
**Recording:** `artifacts/device-tests/2026-10-25-w4-persist.mp4`, 80.2 s
(kept off git — it shows the tester's home screen). Reviewed frame by frame
at 0.5 fps contact sheets plus the per-step screenshots and UI dumps.

## Steps and result

| t (s) | Step | Observed |
|---|---|---|
| 0–4 | `pm clear`, cold launch | home screen, then **blank dark screen ~2 s**, then X0 |
| 6 | X0 consent → "I agree" | X1 |
| 14–40 | shop name "Test Store", opening 2000, Finish setup | Today, "Cash should be ₹2,000.00" |
| 42–56 | Sale → 4,5,0 → Add → Back | Sales list shows "Cash sales ₹450.00"; Today ₹2,450.00 |
| ~62 | force-stop, cold launch | blank frame, then **Today** (not X0), ₹2,450.00, ₹450.00 |
| ~74 | second force-stop, cold launch | same |

**Verdict:** W4 PASS on device — entries, opening cash and onboarding
survive two process kills; the restart lands on Today.

## Defects seen in the recording

| ID | Sev | t (s) | Defect | Owner |
|---|---|---|---|---|
| DV-1 | P2 | 2–4, ~62 | ~2 s blank dark window on every cold start before the first screen: no native splash | Agent 3 |
| DV-2 | P3 | 48 | Add gives no confirmation beyond the new line appearing (F-15 motion/feedback) | Agent 1/2 |
| DV-3 | P2 | 56 | Today: a second summary card is clipped under the tile grid | Agent 1 (T1 rebuild) |
| DV-4 | — | 14–40 | amounts typed as whole rupees shown with `.00` | U-6, UNRESOLVED |
| DV-5 | P3 | all | an orange floating circle on the right edge is a phone overlay, not the app | not a defect |

Procedure fix: the recording started before launch and captured the home
screen. Future walks start `screenrecord` after the app is foregrounded.
