# SWAFTO Retail Desk: design system v2 ("Mitra") buildable spec

Author: design-system-lead, 2026-11-18. M2 of `PLAN.md`. Direction C "Mitra" chosen by Saket (decisions log). Builds on `DESIGN-SYSTEM-AUDIT.md`. No app code was touched; this is the spec the CTO team implements.

**Evidence labels.** MEASURED = produced by a tool this session. READ = read from a file. ESTIMATE / ASSUMPTION = not verified, labelled where used.

**Document hygiene (do not skip).** `check:registry` scans every `.md` in the repo. Any number written with a dp unit that is not the touch floor, any number written with an sp unit that is not the body floor, and any ratio written with a colon-one suffix on a line that mentions the contrast minimum, is read as a claim and fails. This file therefore writes sizes in tables whose header carries the unit, and writes ratios as bare decimals. Keep it that way when editing. Also: `concepts/CONCEPTS.md` line 254 writes a pictogram disc size with the dp unit and is likely to trip this rule already (ASSUMPTION: I could not run the check; run `npm run check:registry` first, see 5.0).

Measured ratios come from `product/swafto-ui-redesign/contrast-v2.mjs` (plain Node, no dependencies; formula copied from `apps/mobile/test/a11y.tsx`: sRGB linearisation with threshold 0.04045, luminance 0.2126/0.7152/0.0722, no rounding; sanity: white on `#B87214` = 3.8496, black on white = 21.0000). Ratios below are **floored** to two decimals, never rounded up. Pass/fail used the exact value.

---

## 1. Tokens

Both modes keep **identical token names** (tokens.spec rule). Comfort = light, Focus = dark. Values below are final candidates; every colour pair is in 1.2.

### 1.1 Colour (comfort | focus)

Change column: **V** = value changes, name kept; **N** = new name; **=** = unchanged.

| Token | Role | Comfort | Focus | Change |
|---|---|---|---|---|
| `bg` | ground, warm paper / warm dark | `#FFF6EA` | `#1A1410` | V (was `#FFF9EF` / `#0E1521`) |
| `surface` | card | `#FFFFFF` | `#261E18` | V focus (comfort =) |
| `surfaceRaised` | tray, selected row, disabled fill | `#F6EADA` | `#30261E` | V |
| `ink` | primary text | `#2B2118` | `#F6EDE2` | V |
| `inkMuted` | secondary text | `#5E4E41` | `#BFAF9E` | V |
| `edge` | control rim (2 px) | `#8A7560` | `#9C8A78` | **N** |
| `border` | rule, card rim, skeleton, progress track | `#E6D5BF` | `#3E3126` | V |
| `borderStrong` | separates, never encloses | `#C9BCA3` | `#54463A` | = comfort, V focus |
| `brand` | THE teal: primary fill, Sale tile, progress, done mark | `#0A6B66` | `#4FC3BA` | V (was indigo) |
| `onBrand` | label on brand | `#FFFFFF` | `#10201F` | V focus |
| `brandPressed` | pressed primary | `#08524E` | `#3AA79F` | **N** |
| `brandSoft` | brand as text or link | `#0A6B66` | `#4FC3BA` | V |
| `header` | header bar fill | `#0A6B66` | `#261E18` | **N** |
| `onHeader` | text on header | `#FFFFFF` | `#F6EDE2` | **N** |
| `selected` / `onSelected` | chosen segment, active tab | `#0A6B66` / `#FFFFFF` | `#4FC3BA` / `#10201F` | V |
| `accent`, `accentPressed`, `onAccent` | marigold, **retained, unused after migration** | `#F5A524`, `#DB9317`, `#12181F` | same | = |
| `positive` | money in | `#1E6B2E` | `#6FD48A` | V |
| `negative` | money out | `#A3410C` | `#F2A06A` | V (was red) |
| `success` | status ink | `#1E6B2E` | `#6FD48A` | **N** |
| `warning` | status ink, waiting/stale | `#6B4400` | `#F2CF7A` | **N** |
| `info` | status ink | `#24508F` | `#8FB0E4` | **N** |
| `tintRed` | refused fill | `#FCE8E4` | `#331C18` | = |
| `tintGold` | warning fill (sync waiting, stale) | `#FFE9B8` | `#3A2E12` | V comfort, V focus |
| `tintIndigo` | info fill | `#E7EBF2` | `#1B2436` | = |
| `tintSale` / `inkSale` | Sale; hero icon; "next" step | `#DDF3EF` / `#0A6B66` | `#12302D` / `#7EE0D8` | **N** |
| `tintUdhar` / `inkUdhar` | Udhar | `#EDE4F7` / `#5B2E91` | `#2A1F3D` / `#CDB2F0` | **N** |
| `tintCollect` / `inkCollect` | Collect | `#E3F2D6` / `#2F6B1B` | `#1F3018` / `#A5DB86` | **N** |
| `tintExpense` / `inkExpense` | Expense | `#FDE6D3` / `#8F4408` | `#3A2412` / `#FFB27A` | **N** |
| `tintMore` / `inkMore` | More, neutral avatar | `#EFE7DC` / `#5E4E41` | `#30261E` / `#BFAF9E` | **N** |
| `scrim` | sheet backdrop (the only translucent value; lives in tokens.ts) | `#2B211880` | `#000000B3` | **N** (ASSUMPTION: 8-digit hex honoured by RN on Android; verify on device) |

New colour names: 18 (`edge`, `brandPressed`, `header`, `onHeader`, `success`, `warning`, `info`, the ten tint/ink names, `scrim`). Everything else is value-only.

**Decision: the primary fill is `brand`, not `accent`.** `tokens.spec` pins `onAccent !== #FFFFFF` (marigold takes dark ink) and Mitra's fill is teal with a white label. Changing `accent` to teal would force that test to change, which is a weakened test. So the marigold trio stays untouched with its four tests passing, nothing draws it, and PrimaryButton/ActionTile move from `accent` to `brand` (one line each). Removing the dead trio and its tests is a separate follow-up decision for the CTO, not part of this migration.

**Decision: control rims use the new `edge`, not `inkMuted`.** `inkMuted` is now a dark 7.42 on bg and would give heavy brown 2 px rims; the concept's softer rim is `edge`. `inkMuted` stays a valid control border, so migration can be per component. The `borderStrong`/`inkMuted` relationship in `tokens.spec.tsx` is **honoured unchanged**: `borderStrong` on `bg` = 1.75 comfort, 2.00 focus (both under 3); `inkMuted` on `bg` = 7.42 comfort, 8.54 focus (both at or over 3). Focus `borderStrong` was a cool blue-grey (`#3D4A60`) that clashed with the warm ground; the new warm `#54463A` is still under 3.

### 1.2 Contrast, every pair, both modes (MEASURED, floored)

Text and icon pairs need 4.5 (registry `CONTRAST_MIN_RATIO`). Control edges and meaningful graphics need 3.0 (SC 1.4.11, enforced by tokens.spec comments). **0 failures in 71 computed pairs per mode.**

**Text and icons (minimum 4.5)**

| # | Foreground on background | Comfort | Focus |
|---|---|---|---|
| T1 | ink / bg | 14.71 | 15.74 |
| T2 | ink / surface | 15.74 | 14.14 |
| T3 | ink / surfaceRaised | 13.27 | 12.75 |
| T4 | inkMuted / bg | 7.42 | 8.54 |
| T5 | inkMuted / surface | 7.94 | 7.68 |
| T6 | inkMuted / surfaceRaised | 6.69 | 6.92 |
| T7 | positive / bg | 6.13 | 9.95 |
| T8 | positive / surface | 6.56 | 8.94 |
| T9 | positive / surfaceRaised | 5.53 | 8.06 |
| T10 | negative / bg | 5.91 | 8.69 |
| T11 | negative / surface | 6.32 | 7.81 |
| T12 | negative / surfaceRaised | 5.33 | 7.04 |
| T13 | brandSoft / bg | 5.93 | 8.55 |
| T14 | brandSoft / surface | 6.34 | 7.68 |
| T15 | brandSoft / surfaceRaised | 5.35 | 6.92 |
| T16-18 | success / bg, surface, surfaceRaised | 6.13, 6.56, 5.53 | 9.95, 8.94, 8.06 |
| T19 | warning / bg | 8.00 | 12.14 |
| T20 | warning / surface | 8.56 | 10.91 |
| T21 | warning / surfaceRaised | 7.21 | 9.83 |
| T22 | info / bg | 7.49 | 8.24 |
| T23 | info / surface | 8.01 | 7.41 |
| T24 | info / surfaceRaised | 6.75 | 6.68 |
| T25 | onBrand / brand | 6.34 | 7.88 |
| T26 | onBrand / brandPressed | 9.02 | 5.77 |
| T27 | onHeader / header | 6.34 | 14.14 |
| T28 | onSelected / selected | 6.34 | 7.88 |
| T29 | onAccent / accent (retained) | 8.74 | 8.74 |
| T30 | onAccent / accentPressed (retained) | 6.97 | 6.97 |
| T31 | ink / tintRed | 13.35 | 13.73 |
| T32 | ink / tintGold | 13.19 | 11.47 |
| T33 | ink / tintIndigo | 13.17 | 13.40 |
| T34 | ink / tintSale | 13.60 | 12.19 |
| T35 | ink / tintUdhar | 12.77 | 13.31 |
| T36 | ink / tintCollect | 13.45 | 12.13 |
| T37 | ink / tintExpense | 13.07 | 12.58 |
| T38 | ink / tintMore | 12.84 | 12.75 |
| T39 | warning / tintGold | 7.17 | 8.85 |
| T40 | info / tintIndigo | 6.70 | 7.02 |
| T41 | negative / tintRed | 5.36 | 7.58 |
| T42 | inkSale / surface (icon on white disc) | 6.34 | 10.56 |
| T43 | inkSale / tintSale (hero icon, avatar) | 5.48 | 9.10 |
| T44 | inkUdhar / surface | 9.35 | 8.75 |
| T45 | inkUdhar / tintUdhar | 7.59 | 8.24 |
| T46 | inkCollect / surface | 6.48 | 10.20 |
| T47 | inkCollect / tintCollect | 5.53 | 8.75 |
| T48 | inkExpense / surface | 7.00 | 9.28 |
| T49 | inkExpense / tintExpense | 5.81 | 8.25 |
| T50 | inkMore / surface | 7.94 | 7.68 |
| T51 | inkMore / tintMore | 6.48 | 6.92 |
| T53 | positive / surface (hero cash-in line) | 6.56 | 8.94 |
| T54 | negative / surface (hero cash-out line) | 6.32 | 7.81 |
| T56 | brandSoft / tintSale | 5.48 | 6.62 |

Lowest text pair: comfort negative on surfaceRaised (5.33); focus onBrand on brandPressed (5.77).

**Control edges and graphics (minimum 3.0)**

| # | Pair and use | Comfort | Focus |
|---|---|---|---|
| N1 | edge / bg (keypad key, segment, chip rim on ground) | 4.09 | 5.48 |
| N2 | edge / surface (key and card controls) | 4.38 | 4.93 |
| N3 | edge / surfaceRaised (segment tray, aux key) | 3.69 | 4.44 |
| N4 | inkMuted / bg (tokens.spec rule) | 7.42 | 8.54 |
| N5 | brand / bg (selected fill, Sale tile, done mark) | 5.93 | 8.55 |
| N6 | brand / surface (outlined secondary rim) | 6.34 | 7.68 |
| N7 | brand / surfaceRaised (selected segment vs tray, tokens.spec rule) | 5.35 | 6.92 |
| N8 | brand / tintSale ("next" step rim) | 5.48 | 6.62 |
| N9 | brandPressed / bg | 8.43 | 6.25 |
| N10 | brand / border (progress fill vs track) | 4.42 | 5.88 |
| N11 | warning / bg (waiting chip and banner rim) | 8.00 | 12.14 |
| N12 | warning / surface | 8.56 | 10.91 |
| N13 | onBrand / brand (switch thumb, ON) | 6.34 | 7.88 |
| N14 | inkMuted / surfaceRaised (switch thumb, OFF) | 6.69 | 6.92 |

Lowest edge: comfort edge on surfaceRaised (3.69).

**Informational (no threshold, reported so nobody assumes)**

| # | Pair | Comfort | Focus | Reading |
|---|---|---|---|---|
| I1 | header / bg | 5.93 | 1.11 | Focus header is not distinguishable from ground by colour; keep the hairline `borderStrong` rule under it (as today) |
| I2 | borderStrong / bg | 1.75 | 2.00 | must stay under 3 (tokens.spec): passes |
| I3 | border / bg | 1.34 | 1.45 | rule colour: decorative |
| I4 | border / surface | 1.43 | 1.30 | card rim: decorative |
| I5-I9 | tintSale, Udhar, Collect, Expense, More / bg | 1.08, 1.15, 1.09, 1.12, 1.14 | 1.29, 1.18, 1.29, 1.25, 1.23 | tile fill alone does not enclose the tile |
| I10 | edge / border | 3.05 | 3.77 | |

**Adjustments from the concept: none to any colour pair.** All 71 pairs pass as drawn in `C-mitra.html`. What changed is what the concept did not specify or measured against the wrong background:
1. The concept measured tile icons "on their tint", but the icon sits on the **white disc** (`surface`). Re-measured as T42/44/46/48/50: all pass (6.34 to 10.56).
2. Concept lacked a pressed colour, a Focus `borderStrong`, a status `info`, a header token and a scrim. Added and measured (`brandPressed` T26/N9, `borderStrong` I2, `info` T22-24/T40, `header` T27, I1).
3. **Judgement call, not a pass:** tinted tiles (I5-I9, about 1.1) and the 2 px `border` card/row rim (I3-I4) do not reach 3.0. They are identified by their icon and word, and rows by a trailing chevron where width allows (3.3), so the rim is decorative under SC 1.4.11. If Saket or the CTO prefers a strict reading, the fix is cheap: draw tile and tappable-row rims in `edge` (4.09 comfort, 5.48 focus). Recommended default: keep the soft rim, confirm on the vivo phone in daylight (M3).

### 1.3 Type (sp), all Anek Odia static, leading by `leading()` / `leadingUncapped()` (1.8)

| Step | Comfort | Focus | Change | Used by |
|---|---|---|---|---|
| `body` | 17 | 20 | = | body, secondary lines |
| `label` | 17 | 19 | = | chrome labels, quiet buttons |
| `lead` | 19 | 22 | **N** | tile label, hero label, list primary name, avatar initial, step title |
| `heading` | 21 | 25 | = | header title, primary button, keypad digits |
| `figure` | 24 | 29 | = | row amounts, entry amount |
| `hero` | 36 | 38 | V comfort (was 32) | "In the box now", ledger total |

Rules: no letter-spacing, no all-caps, weight Medium for body and Bold for labels and money, tabular figures on every money style (check:font). Concept sizes folded into steps (18, 20, 22, 26, 34 become `lead`, `figure`, `heading`, `hero`) to avoid a ninth size.
Open decision for CPO: Focus type is larger than Comfort today. With the new text-size picker (3.15) this coupling of colour mode to size is redundant; recommended after M4, not now (it would shrink Focus text).
**Money leading.** Concept sets money lines at about 1.4 to save vertical budget; the token is 1.8. Proposed NEW `leadingMoney = round(sp * 1.4)` for rupee-sign and digit runs only. ASSUMPTION, unmeasured: that the rupee sign and digits in Anek never reach above the 1.4 line box. The CTO must measure rupee-sign and digit ink extents in the bundled fonts (fontTools bounding boxes) before adopting; fallback is `leadingUncapped` and a `check:layout` re-run.

### 1.4 Space, radius, border, elevation, size, motion

| Group | Values (dp) | Change |
|---|---|---|
| space | xs 4, sm 8, **gutter 12**, md 16, lg 24, xl 32 | `gutter` **N** (concept uses 12 everywhere; at 16 it would cost vertical budget the keypad needs) |
| radius | sm 4, md **16**, lg **20**, xl 24, pill 999 | md V (was 8), lg V (was 12). Use: key and skeleton md; card, tile, row, banner lg; header bottom, hero, sheet top, tab bar top xl; chip, segment, buttons, switch pill |
| border widths | hairline 1, **edge 2** | `edge` width **N**. 1.5 in the concept becomes 2 |
| elevation | card **0** (was 2), sheet 8 | V. Only the sheet casts depth. Keypad keys, tiles, header, cards: none |
| control | md 56, lg 64, xl 72 | = (derived from `TOUCH_TARGET_MIN_DP`). Tile and party row use xl (concept 76 trimmed to 72, saves vertical budget) |
| disc | sm 40, md 48 | **N**. sm: step mark, hero icon, More tile; md: tile pictogram, avatar |
| icon | sm 20, md 24, lg 28 | **N**. Always at or above the body floor so `undersizedText` never flags an icon Text. Concept's 18, 22, 26, 30 map to 20, 24, 24, 28 |
| motion | state 160 ms, sheet 240 ms, easing (0.2, 0, 0, 1) | = (reduced motion zero via `motionMs`). No shimmer, no looping animation anywhere |
| textScale | normal 1, large 1.25, xlarge 1.5 | **N**, see 3.15 |
| font | regular, medium, bold, **icons: `SwaftoIcons`** | `icons` **N** |

Concept deviation: the hero separators were dashed 2 px; per-side dashed borders mis-render on Android (ASSUMPTION, not tested), so v2 uses solid hairline `border`.

---

## 2. Icon system (recommendation, delegated by the CTO)

**Recommendation: an icon font, a subset of Lucide (ISC licence), shipped as one static TTF named `SwaftoIcons.ttf` in `apps/mobile/assets/fonts/`.** Not View-drawn, not `react-native-svg`.

| Option | Cost | Fit |
|---|---|---|
| **Icon font (recommended)** | one static TTF, 9,184 bytes MEASURED for 27 codepoints (7,892 for the 24 primary names); no native module; Text-based so no new `@swafto/ui` primitive and **no change to `ui-double.tsx`** | reuses the Anek asset path, `fonts-packaged.spec` and the contact-sheet font loading |
| View-drawn | 0 bytes | only tick, minus, plus, chevrons reliably; cannot draw rupee, notebook, receipt, phone, user. Loses Mitra's point (audit 3.1 B) |
| `react-native-svg` 15.16.1 (MIT) | source package 3,834,239 bytes MEASURED (this is the npm source, **not** an APK delta; APK delta not measured, no number given) | native module, rebuild, `package.json`/gradle/`ui/index.ts`/double/rn-web mapping changes; highest churn |

**Licence (MEASURED: LICENSE files fetched from upstream raw URLs).**
- Lucide: ISC ("Copyright (c) 2026 Lucide Icons and Contributors" and "Copyright (c) 2013-present Cole Bemis", the Feather portion). `lucide-static` 1.75.0 `package.json` licence field is ISC, same text. ISC permits use, copy, modify, distribute with or without fee, so a subset font is covered. Obligation: ship the copyright line and the permission notice in all copies (in-app Licences screen plus a file beside the font). Source: https://raw.githubusercontent.com/lucide-icons/lucide/main/LICENSE
- Alternatives, also fetched and also commercial-safe: Tabler (MIT, Pawel Kuna), Phosphor core (MIT), Feather (MIT), Material Icons (Apache 2.0, and its downloads include a variable font, which `check:font` forbids; fvar not verified). Lucide wins on fit: the concept's pictograms are already in Lucide's style (24 grid, round caps).
- Only the repo-level LICENSE was read; per-glyph notices and Phosphor's `web` repo were not checked.

**Build facts the CTO needs (MEASURED).** Stock `lucide.ttf` is 1,017,696 bytes, 2,125 glyphs, no `fvar`, all codepoints in the Private Use Area. `pyftsubset` crashes on its GSUB table (unparseable coverage); the working path is delete GSUB with fontTools first, then subset with `--layout-features='' --no-hinting --drop-tables+=DSIG`. Look up codepoints **by name at build time** from the pinned package's `codepoints.json`; codepoints can change between releases. Commit the built TTF, the build script and the pinned version, not the 1 MB source font. Stroke: stock glyphs are weight 2.0 on the 24 grid; the concept drew 2.4. Start with stock; if M3/M4 daylight finds them thin, rebuild from SVG with a heavier outline (extra build dependency, not shipped).

**Odia / Hindi independence.** Icons are Private Use codepoints in their own family. They go through no Indic shaping, no GSUB (`ory2`), no Anek glyph coverage and no tabular-figure rule, so they can neither break nor depend on Odia or Hindi rendering, and the Odia ink-height line-box rule (1.8) is irrelevant to them. Rule for the Icon component: fixed dp size from `icon.*` via `fontSize`, `lineHeight` equal to the same token, `allowFontScaling={false}`, `includeFontPadding={false}`, and **hidden from assistive tech** (`accessible={false}`, `importantForAccessibility="no-hide-descendants"`), otherwise TalkBack reads a Private Use character aloud and WCAG 2.5.3 label-in-name breaks.

**Check changes (all must go through `npm run prove:verifiers`, CLAUDE.md before-commit item 4).**
1. `tools/check-font-coverage.mjs`: add `SwaftoIcons.ttf` as a second, separate block. Do **not** loosen any Anek rule. New block asserts: file present, sha256 pinned, no `fvar`, size at most a stated small cap, every glyph in the declared icon list present in `cmap`, and every codepoint in the Private Use Area. The Anek rules (Odia coverage, `ory2`, `tnum`, identical weights) stay scoped to the three Anek files.
2. `tools/check-licences.mjs`: current code demands that **every** licence file in `assets/fonts` contain "SIL OPEN FONT LICENSE", "Version 1.1" and a copyright line (it would reject ISC), it only recognises families matching `AnekOdia-*` in `tokens.ts`, and it labels **every** `.ttf` "OFL 1.1" in the generated `LICENCES.md` (that label would be false for the icon font). Change to a per-file licence mapping with a validator per licence (OFL for Anek; ISC for the icon font: title "ISC License" plus the Permission line plus a copyright line), recognise the `icons` family, and generate the right licence per row. Ship `ISC-Lucide.txt` beside the font. `LICENCES.md` is generated: never edit by hand.
3. `tools/check-layout.mjs` (`FONTS` list, line 52) and `tools/gen-contact-sheet.mjs`: load `SwaftoIcons` or every icon renders as an empty box in the instruments. A check that cannot see icons is blind to them.
4. `fonts-packaged.spec.ts`: derived from `tokens().font.*`; adding `font.icons` gets it for free. `check:font` fonts-alone budget (25 MiB, B24) is unaffected at this size.
5. `prove:verifiers` plants: delete a glyph from the subset, change the sha, add an `fvar`, replace the licence file with text lacking the ISC permission line; each must produce a real failure.

**Icon list (25, one accessible-name rule: the control's existing word; the glyph is decorative).**

| Key | Lucide name | Meaning, where used |
|---|---|---|
| sale | indian-rupee | Sale tile; Sale title |
| udhar | notebook | Udhar tile, Udhar mode, Ledger tab |
| collect | hand-coins | Collect tile |
| expense | receipt | Expense tile |
| more | ellipsis | More tile |
| box | archive | "In the box now" hero; Today tab |
| reports | chart-no-axes-column | Reports tab |
| cash | banknote | Cash mode |
| upi | smartphone | UPI mode |
| user | user | customer field, empty avatar |
| tick | check | selected option, done step, saved |
| dash | minus | skipped step, switch OFF thumb |
| lock | lock | locked step, closed day, disabled tile |
| clock | clock | sync waiting, changed today |
| saved | circle-check | sync saved, toast |
| chevron | chevron-right | tappable row |
| back | chevron-left | header back |
| delete | delete | keypad delete-last-digit |
| plus | plus | add customer or supplier |
| in | arrow-down | cash in (arrow into the box) |
| out | arrow-up | cash out |
| stale | calendar-clock | stale open day, 31+ days |
| info | info | info banner |
| alert | circle-alert | error, refused |

(24 distinct glyphs plus the alternate `receipt-indian-rupee` kept as a spare, 27 codepoints in the measured subset.)
**Rule: icons never replace words.** Every icon sits beside its word or inside a control whose accessible name is that word. The concept used `lock` for the calm error banner; v2 uses `alert` (lock means locked).

---

## 3. Components

Common: touch targets are numeric `minHeight`/`minWidth` on the Pressable itself (a11y helpers read the style object); body text uncapped, chrome capped at 1.5; only token values; no elevation except Sheet; one pressed vocabulary (below). **Pressed:** filled controls swap to `brandPressed`; tinted tiles and rows use an Android ripple (colour `ink`, ASSUMPTION: system applies its own alpha; verify on device); keys fill `tintSale`. **Disabled (one vocabulary for all):** fill `surfaceRaised`, text and icon `inkMuted`, 2 px `border` rim, no ripple, `accessibilityState.disabled`. Tokens named by role, e.g. "rim" = `border` at `edge` width.

| # | Component | Status |
|---|---|---|
| 3.1 | Shell and header | restyled; slot added |
| 3.2 | Sync chip | restyled |
| 3.3 | Action tile | restyled; `across` removed |
| 3.4 | Hero card | restyled |
| 3.5 | Row and list item | restyled; chevron variant |
| 3.6 | Party avatar | **new** |
| 3.7 | Segmented control | restyled |
| 3.8 | Keypad key | restyled (no elevation) |
| 3.9 | Buttons | restyled; "add bar" variant |
| 3.10 | Step row (day close) | restyled |
| 3.11 | Banner | **new** |
| 3.12 | State components | **new** (Empty, Loading, Error, Locked); Offline = chip; Stale = banner |
| 3.13 | Sheet | **new** |
| 3.14 | Switch | **new** |
| 3.15 | Text-size picker | **new** |
| (3.16) | Icon | **new**, see section 2 |

**3.1 Shell and header.** Anatomy: header bar (fill `header`, text `onHeader`, bottom corners radius xl, min height `control.lg`), optional back (56 square, icon `back` lg), title (`heading`, Bold) or Today variant (shop name `heading` + date line `body`), sync chip right; body ScrollView; bottom tab bar (top corners xl, rim `border`, tabs min height `control.lg`, selected = `selected` fill, `onSelected` Bold, `aria-current`/selected state, icon md + word); sticky footer slot (`border` hairline top). Focus: header is `surface`, so keep the `borderStrong` hairline under it (I1). Android status bar colour set to the header token. Keep `bar` (`full`/`band`), `status`, `followEnd`, `pinned`; keep testIDs `*-body`, `keypad`, `t7-items`, `t7-secondary`, `t7/t8/t9/t10-headline`. Back accessible name = "Back" word; must differ from the keypad delete name (3.8). Never a keypad beside the tab bar (check:design).

**3.2 Sync chip.** States: saved (icon `saved`, word "Saved", fill `surface`, rim `edge`, text `ink`), waiting (icon `clock`, "{n} waiting · safe on phone", fill `tintGold`, rim `warning`, text `warning`), parked (icon `alert`; word from the existing parked string, not read by me; same colours as waiting). Pill, min 56 x 56, `maxWidth` as a percentage string (numeric widths are forbidden), text wraps, never truncates; compact word form on sub-screens. Never red. Tap opens an explanation (Sheet). Accessible name = the full visible sentence. Contrast T20/T39, N11/N12.

**3.3 Action tile.** Anatomy: tile (radius lg, min height `control.xl`, padding `gutter`) holding a disc (`disc.md`, fill `surface`) with icon lg in `ink<Action>`, then the word (`lead`, Bold, `ink`). Fills: Sale = `brand` fill with `onBrand` word and `brand` icon (the only solid tile); Udhar/Collect/Expense = their tint; More = full-width row, min height `control.md`, disc sm, `tintMore`. 2-column grid, gap sm. Disabled (closed day, HT-27 rules kept): disabled vocabulary, disc icon becomes `lock`, plus the page-level Locked line; never silent. Name = the word only (label-in-name); state disabled with the existing reason string as hint. `across={3}` removed (known to fail at the cap). Hue is decoration only: no tint means good or bad.

**3.4 Hero card.** Surface fill, rim `border` at `edge` width, radius xl, padding `gutter`. Top: disc sm (`tintSale`, icon `box` in `inkSale`) + `lead` label "In the box now". Figure: Money at `hero`, `ink`. Lines (hairline `border` between): Opening (`ink`), cash in (icon `in` + "+" sign, `positive`), cash out (icon `out` + "-" sign, `negative`). Sign always printed, words always present, colour additive (ADR-018); directional money never on a brand fill. The card exposes one label: "In the box now" + amount. Min height by content; no cached totals.

**3.5 Row and list item.** Card-row (fill `surface`, rim `border`, radius lg, margin `gutter`) min height `control.lg` (party row `control.xl`); primary text `lead`/`body` `ink`, secondary `body` `inkMuted`; amounts right-aligned Money `figure`; plain list rows use hairline `border` instead of a rim. Tappable rows get a ripple and, where width allows, a trailing `chevron` md in `inkMuted` (a non-colour tappability cue; omitted on party rows because name + amount + avatar need the width, decided by `check:layout` longest-string case). Keep `Row`/`LinkRow` heights unified: both `control.lg` (audit 1.3 item 1). `accessibleLabel` becomes **required** where a row has an amount (audit item 10; USABILITY W6 identical names): name = name + amount + direction word ("owes"/"you owe").

**3.6 Party avatar (new).** Circle `disc.md`; initial `lead` Bold; fill/ink from one of the five tint pairs chosen by a **stable hash of the party id** (not list index; the concept used index, which reshuffles when a list is re-sorted). Initial = first akshara, not first code point: take the first base letter plus any following virama-joined consonants and combining marks (Odia virama U+0B4D joins; marks category Mn/Mc stay). ASSUMPTION: Hermes has no `Intl.Segmenter`, so implement by code-point class; test with conjunct-initial names. Empty name: `user` icon on `tintMore`. Decorative: hidden from assistive tech, the row's name carries the person. Pairs T43-T51.

**3.7 Segmented control.** Tray (`surfaceRaised`, rim `edge`, pill, min height `control.lg`), options flex with min width 56. Selected: `selected` fill, `onSelected` Bold, `tick` replaces the mode icon, `accessibilityState.selected`/`checked`. Unselected: `ink`, optional leading mode icon. Roles radiogroup/radio (modes) or tablist/tab (Ledger). Name = the word. Contrast T28, N7. Odia words at the longest length must not clip at 360 wide, three options.

**3.8 Keypad key.** 3 x 4 grid, gap sm, key min height 56 and min width 56 (`control.md`), radius md, fill `surface`, rim `edge` (2), digit `heading` Bold tabular. Aux keys (Clear word, Delete icon) fill `surfaceRaised`, label `label`. **No elevation** (removes 12 shadowed views, the heaviest GPU use). Pressed = `tintSale`. Delete key accessible name must **not** be "Back" (the concept reused it; identical names are USABILITY W6): needs a new string ("Delete last digit") in od/hi/en, draft and unreviewed (H13). Clear and Delete keep 56 targets. Keypad keeps the `keypad` testID. Vertical budget (4 rows x 56 + 3 gaps + padding) is the binding `check:layout` constraint.

**3.9 Buttons.**
- Primary: fill `brand`, label `onBrand` `heading` Bold, pill, min height `control.xl` (the single main action per screen); pressed `brandPressed`.
- Add bar (entry): primary at `control.lg` with the typed amount as Money on the trailing side (non-directional).
- Secondary: fill `surface`, rim `brand` at `edge`, label `ink` `lead` Bold, optional leading icon, min height `control.lg`.
- Quiet: no fill, `ink` text underlined (offset, 2 px), min 56 x 56, wraps to two lines rather than truncating (Hindi W4).
- Disabled per vocabulary. Name = visible word. Contrast T25, N6.

**3.10 Step row (day close).** Card-row, min height `control.lg`. Leading mark (`disc.sm`): done = `brand` fill + `onBrand` `tick`; skipped = `surfaceRaised` + rim `edge` + `dash`; next = number on `brand` fill, row fill `tintSale`, rim `brand`; pending = number on `surfaceRaised` + rim `edge`; locked = `lock`, row text `inkMuted`. Name area min height 56 (tappable); value column (Money + "{n} entries" `inkMuted`); quiet action ("Nothing today" / "Undo"). Progress bar above: segments radius pill, fill `brand`, track `border`, plus the words "{done} of {total}" (the bar alone is never the signal; N10). The cash-check step is the highest-leverage moment and gets the `sheet` motion on state change. Names: step name + state word.

**3.11 Banner (new).** Row: icon md + text (wraps) + optional quiet action; min height `control.lg`; radius lg. Kinds: **warning** (fill `tintGold`, rim and text `warning`, icon `stale`/`clock`), **info** (`tintIndigo`, `info`, icon `info`), **calm error / neutral** (fill `surface`, rim `edge`, text `ink`, icon `alert`; deliberately not red). `accessibilityRole=alert` for errors, polite live region otherwise. Compact: one line plus one action at normal size; wraps at large sizes. Stale-day banner sits under the header; it pushes the tiles by one banner height, so add a registry case (`standardCases`) proving tiles stay above the fold at 1.5 and 2.0. Replaces ad hoc notice cards (QA-06).

**3.12 State components (new, token-driven, each with a next action).**
- **Empty:** `disc.md` `tintMore` disc + icon, one sentence (`body`), primary button naming the next action ("Record a sale"). Never "Nothing here" alone.
- **Loading:** three skeleton rows (fill `border`, radius md, height `control.xl`), static, no shimmer, hidden from assistive tech; container carries the existing loading word and `busy`. No spinner on save.
- **Error:** calm banner (above) with "nothing was lost" copy and "Try again"; accessible name includes both.
- **Offline:** not a page state. Sync chip waiting (3.2), always visible; optional warning banner after a long offline period.
- **Stale day:** warning banner with a "Close it now" action (and path to date settings).
- **Locked:** `lock` mark + one line of why ("After the cash check"), disabled vocabulary; used on step rows, tiles and the closed-day (D7) screens.

**3.13 Sheet (new).** In-tree overlay (not RN `Modal`, so the instruments can see it; Shell:111-122). Scrim token over the screen, panel fill `surface`, top radius xl, elevation `sheet` (the only elevation), content scrolls, max height by percentage string. No drag handle (no gesture library). Explicit "Close" quiet button (min 56) and hardware Back both close. Accessibility: `accessibilityViewIsModal`; siblings `importantForAccessibility="no-hide-descendants"`; focus lands on the sheet title (USABILITY W6). Motion `sheet` (240 ms, zero under reduced motion). Replaces per-screen overlays such as PartyPicker.

**3.14 Switch (new).** Track pill, min row 56 (track about 64 wide, drawn from tokens), ON: fill `brand`, thumb `onBrand` circle with `tick`; OFF: fill `surfaceRaised`, rim `edge`, thumb `inkMuted` circle with `dash`. A state **word** always beside it ("On" / "Off", or the existing allow/withdraw wording; strings may need drafting, H13). Role `switch`, `accessibilityState.checked`, name = setting word + state word. Withdrawing consent is as easy as giving it (DPDP). N13/N14.

**3.15 Text-size picker (new).** Screen: three-option Segmented ("Normal", "Large", "Extra large"; **no Odia or Hindi strings exist**, needs a native reviewer, H13; do not mark reviewed), a preview card (fill `surface`, rim `edge`, radius lg) rendering the real `Money` and a label at the chosen step, and one hint line. Tokens `textScale` 1, 1.25, 1.5 apply to **body and figures only**; chrome stays capped at 1.5 (`CHROME_FONT_SCALE_CAP`, unchanged). Effective body scale never exceeds the 2.0 that `check:layout` measures: size = base x step, with `maxFontSizeMultiplier = 2.0 / step` (ASSUMPTION: honoured by RN 0.81 on Android; verify on device). Persisted setting; mode (Comfort/Focus) is independent.

---

## 4. Status: never by colour alone

| Status | Icon | Word (existing key) | Colour (and rim) |
|---|---|---|---|
| Saved | `saved` | "Saved" (`syncSaved`) | `ink` on `surface`, `edge` |
| Waiting, safe on phone | `clock` | "{n} waiting · safe on phone" (`syncWaiting`) | `warning` on `tintGold` |
| Parked | `alert` | existing parked string (not read) | `warning` on `tintGold` |
| Entered (step done) | `tick` | "{n} entries" + amount | `onBrand` on `brand` |
| Skipped | `dash` | "Nothing today" (+ "Undo") | `inkMuted` on `surfaceRaised` |
| Next step | step number | "Enter {section}" | `brand` rim on `tintSale` |
| Locked | `lock` | "Locked" + reason ("After the cash check") | `inkMuted` on `surfaceRaised` |
| Closed day (D7) | `lock` | existing closed-day string | `inkMuted` |
| Stale open day | `stale` | "This book is still open for ..." (draft copy) + "Close it now" | `warning` on `tintGold` |
| Overdue | `stale` | "31+ days" (`overdue`) | `warning` text on `surface` |
| Changed today | `clock` | "changed today" | `inkMuted` |
| Error (calm) | `alert` | "Could not load. Nothing is lost." + "Try again" | `ink` on `surface`, `edge` |
| Refused | `alert` | existing refusal string | `negative` on `tintRed` |
| Info | `info` | the message | `info` on `tintIndigo` |
| Selected option | `tick` | the option word, Bold | `onSelected` on `selected` |
| Money in | `in` | "cash in" + printed "+" | `positive` |
| Money out | `out` | "cash out" + printed "-" | `negative` |
| Switch ON / OFF | `tick` / `dash` | "On" / "Off" | `brand` / `inkMuted` |

Risks to this table: `negative` (clay `#A3410C`) and `inkExpense` (`#8F4408`) are the same family, and green (`positive`) against clay is weak for red-green colour blindness. The printed sign, arrow and word carry the meaning; test with a colour-blind reader in M4. `info` blue and `inkUdhar` purple are near neighbours; the icon and word carry it.

---

## 5. Migration plan for the CTO team

Principle: names are added, values change, nothing is renamed, and each step ends with all checks green.

**5.0 Pre-flight.** `npm ci`, `npm run check:all`, `npx vitest run` on the current commit (baseline); `npm run shots`, copy `docs/contact-sheet/*.png` to `docs/ui/before/`. Run `npm run check:registry` and fix `concepts/CONCEPTS.md` if it fails (see hygiene note). Confirm with Saket the icon-font approval and the two decisions in 1.1 (brand as primary fill; rim `edge`).

**5.1 Tokens** (`apps/mobile/src/theme/tokens.ts`, one file). Apply 1.1, 1.3, 1.4. Add both-mode names together. Update `tokens.spec.tsx`: add `success`, `warning`, `info` to `ON_BACKGROUND`; add tests for T25-T28 and T39-T51 style pairs (every new tint/ink pair, `brandPressed`, `onHeader`/`header`), and for N1-N3 (`edge` at or over 3), N10, N11-N14; keep every existing assertion (including `borderStrong` under 3, `inkMuted` at or over 3, `onAccent !== #FFFFFF`). Regenerate `DESIGN.md` with `npm run design` (generated; never hand-edit). Interim visuals will look odd until Shell reads `header`, so do 5.1 and 5.3 header in one PR.

**5.2 Icon pipeline** (needs CTO approval; can run in parallel with 5.1). Add `SwaftoIcons.ttf`, `ISC-Lucide.txt`, the build script and version pin; `tokens.font.icons`; extend `check-font-coverage.mjs`, `check-licences.mjs`, `check-layout.mjs` FONTS, `gen-contact-sheet.mjs`; then **`npm run prove:verifiers`** with the plants listed in section 2. Add the `Icon` component (Text-based, in `ui` or `components`; no new primitive, no `ui-double` change). Test: glyph table matches the font's `cmap`; Icon is hidden from assistive tech; sizes come from tokens.

**5.3 Restyle primitives** (one PR each, `npm run check:layout` after each): Shell header and tab bar; SyncChip; PrimaryButton (`accent` to `brand`, pill) and variants; Segmented; Card/Row/LinkRow (unify to `control.lg`); ActionTile (remove `across`); Keypad (remove elevation, add delete string); Money unchanged except `leadingMoney` if measured. Replace the three hand-drawn glyphs (back, tick, delete mark) with `Icon`; remove `tokens.glyph` once it has zero callers.

**5.4 New components**: Banner, state set, Sheet, Switch, TextSizePicker (+ settings store), Avatar. Each exported next to the old ones and named to pass `check:naming`.

**5.5 Screens**, via `screen-designer` through `registry.tsx` `standardCases`: Today, Sale entry, Day close, Ledger first, then the rest. Add cases for stale, locked, empty, error, loading so `check:layout` and the contact sheet see them. Keep every predicate phrase and testID listed in the audit (2.2, 2.4).

**5.6 Evidence**: `npm run shots` to `docs/ui/after/`, then the M3 device loop on the vivo phone (install -r, timed tasks).

**Checks, how they stay green.**
- `check:design`: every new value lives in `tokens.ts`; icon sizes via `icon.*`; no raw numerics or hex in components; percentage strings for widths. `DESIGN.md` regenerated.
- `check:layout` (360 x 800, scales 1, 1.5, 2): the real gate. Risks: hero 36, lead 19, `gutter` and disc sizes against the keypad fold at 1.5 in Focus, stale banner pushing tiles, party row amounts at 2.0. Fix by token steps, never by deleting padding blindly.
- `check:font`: Anek rules untouched; icon block added and proved.
- `check:licences`: per-file licence validator; `LICENCES.md` regenerated, not edited.
- `check:registry`: this file and any new `.md` keep unit hygiene.
- `check:money`, `check:generated`, `check:traceability`, `check:tasks`, `check:naming`: run in `check:all`.

**Tests that intentionally change** (each with a stated reason; none weakened):
- `tokens.spec.tsx`: additions only (new names and pairs). Existing assertions stay.
- Tests asserting old values: 7 test files mention `elevation`, `radius`, hero or hex literals (`usability-entry`, `screens`, `tokens`, `ui-double`, `human-pass2-p3`, `qa-device`, `human-pass7`; counts from a grep, **not read**). Expect updates where they assert radius 8/12, elevation 2, `across`, or old hexes, with the new value or token reference as the evidence.
- Keypad delete name test (new string), Row `accessibleLabel` required (type change), tile `across` removal, `fonts-packaged.spec` (derived, should pass).
- `prove:verifiers` gains four plants for the icon font; `check-font` and `check-licences` change, so the harness must be re-run.

**Out of scope here.** Odia and Hindi strings for the new words (text-size picker, delete key, switch states, stale banner) are drafts needing a native reviewer (H13); nothing is marked reviewed. Real-user evidence is still none; all judgements are expert review until M4.

## 6. Open items and risks
- Release APK size still unmeasured; icon font adds 9,184 bytes of file size (MEASURED), APK delta not measured.
- Icon stroke 2.0 versus concept 2.4: daylight check on device.
- `leadingMoney` 1.4 unmeasured (ASSUMPTION).
- Rim 3.0 judgement call in 1.2 item 3.
- `scrim` 8-digit hex, ripple alpha, `maxFontSizeMultiplier` division, dashed borders: ASSUMPTIONS to verify on the phone.
- Colour-blind check of money in/out hues in M4.
- Focus type size coupling to mode: CPO decision.
- Retained marigold tokens: removal is a separate decision.
