# SWAFTO Retail Desk — full visual redesign (CPO plan)

**Goal.** Make the Retail Desk app genuinely good-looking and effortless for an Odia
shopkeeper on a ₹7,000 phone, one-handed, in shop daylight, with a new visual
language and design system v2.
**Done means BOTH:**
1. **Task-speed targets met**, with first-time users, unaided and error-free. Measured on
   the test phone, then with 5–8 real shopkeepers:
   - record a cash sale in **under 10 s**;
   - collect udhar from a customer in **under 20 s**;
   - close the day in **under 3 min**;
   - find "how much does X owe me" in **under 10 s**.
   These targets are the founder's choice for this project. They are not BENCHMARKS.md
   thresholds and do not touch them.
2. **Saket signs off** on the look and feel.

Scenarios: **P5 Design & UX** (primary) + **P2 Discovery & research** (real users).
The build is done by the CTO team.

## Facts we start from
- The real-device usability pass (`qa/swafto-retail-desk/USABILITY.md`) rated 4 screens
  REDESIGN. Its top-10 list was built as a first pass (commit 6f8a4b0, "redesign v1").
- No real shopkeeper has used the app. Every UI judgement so far is expert or agent review.
  **Assumption** until the M4 research says otherwise.
- The Odia and Hindi copy is an unreviewed draft (H13). A redesign must not mark it reviewed.
- Product rules that the design must keep (`CLAUDE.md`): no inference in entry; append-only;
  a frozen closed day; integer paise; UPI never moves cash; the user keeps decision authority.
- Constraints: low-end Android, offline-first, a bundled Odia font, contrast AA or better in
  daylight, touch targets at or above the registry floor `TOUCH_TARGET_MIN_DP`.
- The current design system lives in `apps/mobile/src/theme` and `DESIGN.md` (generated),
  and is enforced by `check:design` and `check:layout`. The redesign evolves it through its
  generators and checks. Nothing is bypassed.

## Team
| Role | Agent | Owns |
|---|---|---|
| Visual direction and flows | `product-designer` | concepts, end-to-end flows, screen specs |
| Design system v2 | `design-system-lead` | tokens, components, icon set, usage rules |
| Real-user research | `user-researcher` | test kit (Odia/Hindi/English), consent, synthesis |
| Build | CTO: `screen-designer` / `frontend-engineer` | implementation to the system and checks |
| On-device verification | CTO: `mobile-realworld-tester`, `usability-accessibility-tester` | task timings on the phone |

## Milestones (* = Saket approves)
- **M1 Concepts\*:** three distinct visual directions, each shown on the same four key
  screens (Today, Sale entry, Day close, Ledger) as clickable HTML mockups at phone size.
  Saket picks one, or mixes them.
- **M2 Design system v2 + full flows:** tokens, components and icons for the chosen
  direction, plus every screen and state (empty, loading, error, offline, stale day,
  locked). Saket reviews the key screens\*.
- **M3 Build + device loop:** the CTO team implements v2 behind the existing checks. Then
  rebuild, `install -r`, timed tasks on the phone, before/after shots in `docs/ui/`.
- **M4 Real users:** Saket (or someone he trusts) runs 5–8 moderated sessions with the
  kit, with consent. Synthesis, then fixes, then a re-test of the misses.
- **M5 Sign-off\*:** the targets are met on the phone and with users, and Saket approves.

## Risks
- **Rework.** Redesign v1 shipped one day earlier and will be superseded. Its *structure*
  (sale-first, balances first, quiet skip, sync chip) is research-backed and carries into
  every concept; only the visual layer is open.
- **Taste without data.** Concepts are judged against the target user, not personal
  preference. M4 decides any disputes.
- **Odia script.** New type and icon choices must render Odia correctly on a cheap phone, so
  each concept is checked with real Odia strings and the bundled font.
- **Regressions.** Money display must stay correct, and the existing tests and checks stay
  green.

## First 5 tasks
1. `product-designer`: three visual directions × four screens, as HTML mockups (M1).
2. `design-system-lead`: an audit of the current tokens and components, plus what v2 must
   keep (the contrast, target and Odia constraints). It feeds task 1 and M2.
3. `user-researcher`: the real-user test kit: tasks with timing, a DPDP-aligned consent
   form (od/hi/en), an observation sheet, a recruiting screener, and a moderator script.
4. CTO: install the current build (redesign v1) and run a short functional smoke test on
   the phone, so the redesign starts from a working baseline.
5. CPO: present the M1 concepts to Saket for the pick.

## Decisions log
| Date | Decision | By |
|---|---|---|
| 2026-11-18 | **M1: visual direction = C "Mitra"** (warm, rounded, icons and colour tints per action). It was the CPO's recommendation; the designer had recommended A. Concepts: `concepts/C-mitra.html`, renders: `concepts/*-screens.png`. | Saket |
| 2026-11-18 | Research thank-you: **a gift, not cash** (similar value; item TBD) | Saket |
| 2026-11-18 | Recording: **screen + voice**, each separately and optionally consented. **GC-REVIEW**: voice is personal data under DPDP, so the consent wording, retention and storage need privacy counsel before session 1. | Saket |
| 2026-11-18 | Moderation: **a trusted non-founder moderates, Saket observes or takes notes** | Saket |
| 2026-11-18 | **Icons: Lucide subset icon font** (ISC licence, 24 glyphs, ~9 KB measured subset), with attribution shipped. Icons never replace words, and the icon glyphs are hidden from TalkBack. `check:licences` becomes per-file licence-aware (not "OFL" for every font); `check:font` gets an icon block. Both changes go through `prove:verifiers`. | CTO (delegated by Saket's autonomy brief) |
| 2026-11-18 | Primary fill = `brand` (Mitra teal). Marigold `accent` stays for now; its removal is a later, separate pass. | CPO/CTO |
| 2026-11-18 | Tile tint fills below 3:1 are accepted as **decorative** (each tile has its icon and word). Fallback if daylight testing fails: `edge` rims. | CPO |
| 2026-11-18 | Focus mode keeps its current type-size coupling (no change). | CPO |
| 2026-11-18 | **M2 approved.** Approved structural changes: one-tap consent withdraw (no Save button; DPDP withdrawal as easy as giving); new screens "Your data" (export), "Signed-in phones" (the API's `listDevices` exists, so no new backend), and the "Exit the app?" check on hardware Back; the Normal/Large/Extra-large text-size picker; Settings/Ask/Privacy as rows at the foot of Today. **Go for M3 build.** | Saket |
