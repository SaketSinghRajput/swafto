# SWAFTO Retail Desk redesign, M2: full flows and screen states in "Mitra"

Author: product-designer · 2026-11-18 · direction chosen by Saket at M1 (decisions log in `PLAN.md`). **Status: DRAFT for Saket's review of the key screens. Nothing here is built.**

**What this is.** Every screen and every state of the app, drawn in Mitra at 360 x 800, with its purpose, primary action, English copy, string keys, copy gaps and the tap count for the four core tasks. The catalogue below ({{TOTAL}} screen states: {{AREAS}}) is generated from the same `body()` functions that draw the mockups in `screens/<area>.html`, so the copy listed is the copy shown. Edit `screens/src/*.js`, `screens/src/_head.md` or `screens/src/_tail.md`, then run `node product/swafto-ui-redesign/screens/build.mjs`.

**What it is not.** No shopkeeper has seen it. Every judgement is expert review and an **assumption** until the M4 sessions; tap counts are counted from the frames, and the second-based targets are **not measured**. Mockups render in a browser with Anek Odia, not on the vivo I2219 or the ₹7,000 handset. Odia and Hindi are the app's unreviewed DRAFT strings (H13), taken verbatim from `strings.ts`; no string is marked reviewed. Where no string exists the catalogue says so and gives English only.

## Open the mockups

`screens/onboarding.html`, `today.html`, `sales.html`, `money.html`, `close.html`, `ledger.html`, `reports.html`, `settings.html`, `system.html`. Each is self-contained (one network request: Google Fonts, with a local-file fallback). Toggles: ଓଡ଼ିଆ / English / हिन्दी, Comfort (light) / Focus (dark), and text 1.0x / 1.3x / 2.0x (header and tab bar stop at 1.5x, as the app's chrome cap does; body text and figures keep growing).

## Structure carried from redesign v1 (research-backed, unchanged)

1. Today is sale-first: four pinned tiles above every figure; one hero, "In the box now"; Purchase and Pay supplier behind More.
2. Balances first in the Ledger: people sorted by what they owe, name large and balance larger, "changed today" as a small line, "+ Customer" in the header area.
3. Entry forms: the strongest control is **Add**, full width directly above the keypad; the saved row appears first with mode and time and a "Saved" line; the title names the real action (Udhar sale, Collect, Pay supplier); each person's balance is shown in the picker and again above the keypad.
4. Day close: the whole row opens its form; "Nothing today" is a quiet link with a one-tap Undo and a skipped count; cash check and Close show as visible locked lines with a lock; the sticky button names the next step.
5. The sync chip is persistent in every header: tick and "Saved", or amber clock and "waiting · safe on phone". Never red.
6. Text size is real: chrome capped at 1.5x, body and figures to 2.0x with reflow.
7. Three tabs only (Today, Ledger, Reports). No fourth tab. Settings, Ask and Privacy are rows at the foot of Today (with icon and chevron), not loose links.

## Product rules every state keeps (`CLAUDE.md`)

No inference in entry (no suggested amounts, no autofill, no camera, OCR or AI in the entry path; a derived observation is allowed and is worded as something to look at). Append-only (a correction is a new dated entry; there is no edit or delete on an entry). A closed day is frozen (D7). UPI, Udhar and Shop stock never move the cash drawer (D2); a withdrawal sits outside profit (D3). Integer paise through the audited helpers; the mockups only format. No dark patterns (no pre-ticked consent, withdrawal as easy as giving, equal weight for refusing, destructive steps say what happens). Status is never colour alone: always an icon and words, plus a printed sign on money.

## Core task targets (founder's targets for this project; not BENCHMARKS.md thresholds)

See "Task speed" in the tail of this document for the tap counts per task, with the assumptions behind them.

