# SWAFTO Retail Desk — design system audit and v2 "must keep" list

Author: design-system-lead · 2026-11-18 · Task 2 of `PLAN.md`. Read-only: no app code touched.

**Evidence labels.** MEASURED = read from a file or tool output this session. READ = read from source. ASSUMPTION = not verified, stated so.

**Coverage, said plainly.** I read in full: `theme/tokens.ts`, `components/Shell.tsx` (which holds Card, Row, LinkRow, PrimaryButton, Segmented, ActionTile, ActionGrid, BottomNav, SyncChip), `Keypad.tsx`, `Money.tsx`, `ui/index.ts`, `tools/gen-design.mjs`, `check-layout.mjs`, `check-font-coverage.mjs`, `packages/values/src/index.ts`, `test/a11y.tsx`, `test/tokens.spec.tsx`, `test/fonts-packaged.spec.ts`, the contact-sheet tools, the skill and `USABILITY.md`. `DayParts`, `EntryForm`, `PartyPicker`, `PartyDetail`, `DayFacts`, `ReportParts`, `ItemCards`, `BasicReports` were inventoried from their exported signatures only (grep), not read line by line. Section 1.2 marks which rows are signature-level. `DESIGN.md` itself was not opened; its generator was read, which is what defines it. No Bash was available to me; sizes were measured by a worker with `stat -c %s`.

---

## 1. Inventory

### 1.1 Tokens (`apps/mobile/src/theme/tokens.ts`; one function `tokens(mode)`, modes `comfort` = light, `focus` = dark)

| Category | Current values | File:line | Used by |
|---|---|---|---|
| Colour, 17 names, identical in both modes | comfort: bg `#FFF9EF`, surface `#FFFFFF`, surfaceRaised `#FDF4E4`, ink `#12181F`, inkMuted `#57606A`, brand `#13294B`, brandSoft `#2A4571`, onBrand `#FFFFFF`, accent `#F5A524`, accentPressed `#DB9317`, onAccent `#12181F`, positive `#0B6B3A`, negative `#C2371F`, border `#E3D9C6`, borderStrong `#C9BCA3`, selected `#13294B`, onSelected `#FFFFFF`, tintRed `#FCE8E4`, tintGold `#FDEBCF`, tintIndigo `#E7EBF2`. focus: bg `#0E1521`, surface `#171F2E`, surfaceRaised `#1E2839`, ink `#EAEEF4`, inkMuted `#8E99A8`, brand `#0E1521` (= bg), brandSoft `#8FB0E4`, onBrand `#EAEEF4`, accent/accentPressed/onAccent unchanged, positive `#4FCB89`, negative `#FF8A72`, border `#283243`, borderStrong `#3D4A60`, selected `#8FB0E4`, onSelected `#0E1521`, tints `#331C18/#33291A/#1B2436` | 50-121 | Shell bar fill = brand (Shell:326); Card = surface (Shell:838); Keypad tray = surfaceRaised, keys = surface (Keypad:64,106); primary button = accent (Shell:1113); Segmented chosen = selected (Shell:1294); SyncChip = tintGold/surface (Shell:749). `tintRed`/`tintIndigo`: used by DayParts/DayFacts (ASSUMPTION, not read). |
| Space (dp) | xs 4, sm 8, md 16, lg 24, xl 32 | 124 | everywhere; `xl` use not confirmed in files I read |
| Type (sp) | comfort: body 17, label 17, figure 24, heading 21, hero 32. focus: body 20, label 19, figure 29, heading 25, hero 38. All derived from `BODY_TEXT_MIN_SP` (17) | 131-146 | body/label: everything; heading: Shell title (Shell:445), keypad digits (Keypad:156), large ActionTile; hero: Today headline Money (Shell:614); figure: Money lists |
| Line height | `leading(sp)` = round(sp × 1.8 × cappedLineScale) for chrome; `leadingUncapped` = round(sp × 1.8) for body and money | 160-219 | all Text. 1.8 is sized for Odia ink (above-matra reach 26 vs declared ascent 24 at 24px, per tokens.ts:198-212) |
| Font scale | chrome cap 1.5 (`maxFontScale`); body copy uncapped via `bodyText` spread (`maxFontSizeMultiplier: 0`, `dataSet`) | 221, 238 | chrome Text uses `maxFontSizeMultiplier={t.maxFontScale}`; Row label, Shell empty copy use `bodyText`; Money uses `allowFontScaling` |
| Radius | sm 4, md 8, lg 12, xl 24, pill 999 | 244 | md: buttons, keypad keys, segment tray, back; lg: Card, ActionTile; sm: segment, delete-mark; pill: sync chip, header pill; xl: no use found in files read (ASSUMPTION: sheets in PartyPicker) |
| Border | `hairline` 1 only | 250 | row rules, control edges |
| Elevation (Android `elevation`) | card 2, sheet 8 | 260 | header bar (Shell:327), Card (839), **every keypad key** (Keypad:107), ActionTile (1441), BottomNav sheet 8 (1590) |
| Control sizes (dp) | md 56, lg 64, xl 72 (all derived from `TOUCH_TARGET_MIN_DP` 56) | 192-196 | md: back, rows; lg: keypad? no (keypad uses touchTarget 56, Keypad:101), segment, tab, LinkRow, secondary button; xl: primary button, ActionTile |
| Motion | state 160 ms, sheet 240 ms, easing (.2,0,0,1); `motionMs(kind, reduced)` zeroes both for reduced motion | 273-277, 311 | ProgressRing fill via `Animated` (DayParts:106-196). Nothing else animates; Shell scroll-to-end is the only other motion |
| Ring | 72 size, 8 stroke | 284 | ProgressRing |
| Glyph (View-drawn marks) | badge 32, size 12, stroke 2 | 291 | back chevron (Shell:412), sync tick/circle (Shell:752), delete mark (Keypad:194), header pill outline stroke (Shell:568) |
| Font family | AnekOdia-Regular / -Medium / -Bold (static instances, sha-pinned) | 297 | all Text |
| Registry floors (not in tokens file, imported) | `TOUCH_TARGET_MIN_DP` 56 (ours; platform is 48), `BODY_TEXT_MIN_SP` 17, `CHROME_FONT_SCALE_CAP` 1.5, `CONTRAST_MIN_RATIO` 4.5 (external, WCAG 2.2 SC 1.4.3) | values/src/index.ts:183, 197, 204, 214 | `tokens.ts`, `a11y.tsx`, `check-layout`, `gen-design` |

### 1.2 Components

| Component | File:line | Props | States covered |
|---|---|---|---|
| Shell | Shell.tsx:163 | id, s, display, status (`loading`/`error`/`ready`), titleKey, headline{labelKey, amount, inline}, empty, emptyKey, onRetry, onBack, meta, eyebrow, subtitle, pill, bodyHeader, children, footer, nav, overlay, bar (`full`/`band`), followEnd, pinned, sync | loading (spinner + word), error (word + retry), empty (centred text), ready |
| SyncChip | 716 | id, s, sync{waiting, parked}, display | saved / waiting (gold tint) / parked count |
| Card | 829 | testID, display, title, children | static |
| Row | 894 | testID, label, amount, display, directional, out, onPress, accessibleLabel | static or pressable; no pressed style (no ripple, unlike LinkRow) |
| LinkRow | 1009 | testID, label, detail, onPress, display, destructive | ripple; no chevron |
| PrimaryButton | 1092 | testID, label, onPress, display, disabled, variant (primary/secondary/tonal/ghost), size (md/lg/xl) | enabled, disabled (flat + edge), ripple |
| Segmented | 1229 | testID, options, value (nullable), onChange, display | selected = fill + bold + `accessibilityState.selected` |
| ActionTile | 1385 | testID, label, accessibleLabel, direction (in/out), onPress, display, disabled, across (2/3), large | enabled, disabled (flat, rule outline, no edge bar) |
| ActionGrid | 1499 | testID, display, children | layout |
| BottomNav | 1574 | active (today/parties/reports), onSelect, s, display, testID | selected = ink bar + bold |
| Money | Money.tsx:98 | amount, mode, size (figure/body/heading/hero), withSign, tone, onFill (`brand` only), out, testID | type union forbids directional on brand |
| Keypad | Keypad.tsx:44 | onKey, s, mode, testID | stateless; 12 keys; no decimal |
| DeleteMark | Keypad.tsx:194 | testID, mode | private |
| DayParts.tsx (signature-level) | exports ProgressRing:136, SectionLabel:246, Quiet:268, ProgressCard:296, OpeningLine:387, SoFarHeader:450, TodayFigures:571, CashInBox:681, PartyTotals:800, Observation:893, CollectToday:944, EmptyNote:1028, `fill`, `dateLine` | various | not read |
| EntryForm.tsx (signature-level) | EntryForm:147, CommitOption:36 | not read | not read |
| PartyPicker.tsx (signature-level) | PartyPicker:88, balanceWord, balanceName | not read | picker is in-tree overlay |
| PartyDetail, DayFacts (UpiCheckCard, AdjustmentsCard), ReportParts (Reading, Note, Gate), ItemCards, BasicReports | per grep | not read | not read |

### 1.3 Duplicates, one-offs, inconsistencies (READ; all from files I read)

1. **Two row heights.** `Row` min height = `touchTarget` 56 (Shell:939) but `LinkRow` = `control.lg` 64 (Shell:1026). Same visual role (a list line), two sizes.
2. **Label equals body in comfort.** `type.label` and `type.body` are both 17 (tokens.ts:133-134), so "label" is not a distinct step in the default mode; in focus they differ (20 vs 19). A hierarchy token that is flat in one mode.
3. **Chrome text that should be label uses body.** LinkRow detail uses `type.body` (Shell:1050) while Card title uses `label` (Shell:851); same role, different token.
4. **Spacing baked into components.** PrimaryButton has `margin: t.space.sm` inside it (Shell:1168), ActionTile `margin xs` (1425), Card `marginHorizontal/Top md` (835-836). Layout margins living in leaf components make spacing changes touch many call sites and are why check:layout failures were fixed by deleting padding (Shell:1427, 1508; Segmented 1251).
5. **Elevation on every keypad key** (Keypad:107) plus header, cards, tiles, nav. Twelve shadowed keys on a screen is the heaviest GPU use in the app and is explicitly a concern for v2 (section 5).
6. **Three hand-drawn icons from rotated borders:** back chevron (Shell:412-423), delete mark (Keypad:194-245), sync tick (Shell:773-783). Each re-implements the "square turned 45 degrees" trick with local arithmetic (`side * Math.SQRT2`, `-(side/2)` at Keypad:228-229, `-g.stroke` at Shell:777). No shared glyph primitive; no other icons exist anywhere.
7. **Header `borderStrong` rule** (Shell:341-342) is used to separate, consistent with the rule, but the header also relies on it because focus `brand` equals `bg` (tokens.ts:97, 1.24:1 note at 108). The header disappears in focus without it.
8. **Brand is overloaded.** `brand` is the header fill, the secondary button fill and (comfort) the selected-segment fill. In focus the same name is the ground colour, which is why `selected` and `brandSoft` exist. Palette semantics differ per mode behind one name.
9. **ActionTile `across={3}`** still exists although measured to fail at the cap (Shell:1408-1420 comment). A prop whose only documented use is a known-bad layout.
10. **Hard-coded accessibility cases:** tile `accessibleLabel` vs face label mismatch fixed by `nameWithLabel` (Shell:1363), but `Row`'s `accessibleLabel` is optional (Shell:884) and USABILITY W6 shows lists without it.
11. **Disabled state differs by component:** PrimaryButton disabled = surfaceRaised + inkMuted edge (Shell:1111-1139); ActionTile disabled = surfaceRaised + `border` outline, no edge bar (1438-1461); Segmented has no disabled. Three vocabularies for "disabled".
12. **`FlatList` is exported from `@swafto/ui`** (ui/index.ts:24) but not used anywhere under `apps/mobile/src` (grep). Every list is `ScrollView` children (Shell:641).
13. **Loading/error/empty are minimal.** Loading = spinner + word, no skeleton. Error = one red line + marigold retry. Empty = one grey sentence. No offline, stale-day, or locked variants in Shell; those live ad hoc elsewhere (USABILITY: notice card at four lines, greyed tiles on closed day "silent", cash-check "locked state with no lock cue").
14. **Raw-value scan accuracy.** gen-design's scan covers `NUMERIC_PROPS` and hex/rgb/named colours only; strings such as `flexBasis: '30%'` (Shell:1279, 1421) and `maxWidth: '100%'` (Shell:742) are not numeric literals and pass. v2 may use them; it may not use `width: 30` style literals.

### 1.4 Usability evidence the system must answer (USABILITY.md, 2026-11-18, on a vivo I2219; expert review, no real shopkeeper yet)
Redesign verdicts: Today (T1), Udhar book, Ledger/Parties, Customer detail. Top gaps touching the design system: no icons (item "add an icon set"), settings rows not looking tappable, switches render as outlined boxes, text-size 2.0x FAIL partial (W3), Hindi skip pill truncation (W4), label-in-name (W5), identical accessible names (W6), sync state as grey text (item 8), Add button weakest control. Odia: Latin numerals in the Odia typeface can be misread (the "19" note).

---

## 2. The enforcement contract v2 must pass unchanged

Never weaken any of these. A change to a check requires `npm run prove:verifiers` (CLAUDE.md, Before every commit item 4).

### 2.1 `check:design` (`gen-design.mjs --check`)
Fails (ENFORCED) on:
- **Raw value anywhere under `apps/mobile/src` except `theme/tokens.ts`** (named by path, gen-design:250). Rows kind: hex `#RGB..#RRGGBBAA`, `rgb()/rgba()/hsl()/hsla()`, named colours `white|black|red|green|blue|grey|gray|yellow|orange` for `color|backgroundColor|borderColor|tintColor|shadowColor`, and any non-zero numeric literal on: fontSize, lineHeight, letterSpacing, padding*/margin* (all sides, H, V), width, height, min/maxWidth, min/maxHeight, borderRadius, borderWidth (+Top/Bottom/Left/Right/Start/End), top, bottom, left, right, flexBasis, gap, rowGap, columnGap, elevation. Zero is allowed. Comment lines skipped. Includes unregistered files in `screens/` (gen-design:279).
- **Keypad beside bottom nav** ("a keypad is never shown beside a bottom navigation"): a screen source containing both `Keypad` and `<BottomNav|TabBar|NavBar`.
- **STATIC vs MEASURED disagreement** for `touchTarget`/`fontSize` when `reports/design/measured.json` exists.
- **`DESIGN.md` differs from a fresh generation** (never hand-edit; run `npm run design`).
REPORTED (judgement, not failing): contrast pair below `CONTRAST_MIN_RATIO` in a style object with both literal hexes; `fontSize` literal below `BODY_TEXT_MIN_SP`; `height`/`minHeight` literal below `TOUCH_TARGET_MIN_DP` in a file with Pressable/Touchable/Button; screens not referencing TRACEABILITY feature ids.
`design:prove` plants one `#ff00ff` and requires exactly one row, then zero.

### 2.2 `check:layout` (`check-layout.mjs`, B31)
Real layout in headless Chromium, react-native-web, viewport **360x800 CSS px**, shipped fonts, font scales **1, 1.5 (cap), 2**. Fails on:
- horizontal overflow of the document (`horizontalOverflowPx > 0`), at every scale;
- any element running more than 1 px outside its parent (flagged by testID or tag);
- `t7-items` and `t7-secondary` below the scrolling body bottom at any scale (HT-51), and the running totals `t7/t8/t9/t10-headline` at scale 1 or any scale in Comfort (HT-60). Known open: Focus at 1.5 and 2 for totals;
- keypad (`data-testid="keypad"`) bottom below the fold at scale <= 1.5 (Focus included);
- an IN_VIEW id that no case ever rendered (check can't go blind);
- chrome scales to the cap only; Money (text containing the rupee sign) and `data-font-scale="body"` nodes scale fully. Animations frozen before measuring.
**Consequences for v2:** keep testIDs `keypad`, `*-body`, `t7-items`, `t7-secondary`, `t7/t8/t9/t10-headline`; keep the `bodyText` dataSet; keep Money rendering the rupee sign; a body should be named `<id>-body`. Vertical budget on entry screens is the binding constraint (keypad 4 rows x >= 56 dp + footer).

### 2.3 `check:font` (`check-font-coverage.mjs`)
- Three files `AnekOdia-{Regular,Medium,Bold}.ttf` present and **sha256-pinned** (lines 56-60). Swapping or adding a font family requires editing this check's pins and running `prove:verifiers`; it is a deliberate gate, not a bug to route around.
- Every character in every shipped Odia SMS template (`apps/api/src/sms/templates.ts`) plus `0-9 space , . - : / ( ) % + ₹` has a **non-zero glyph** in every weight.
- GSUB script `ory2` or `orya` present (conjunct shaping).
- **No variable font** (no `fvar`; RN on Android cannot pick an axis, AD-016).
- Tabular figures: default digits are proportional; `tnum` must collapse all ten to one width; `1111111111` vs `0000000000` equal under `tnum`. Every money style must set `fontVariant: ['tabular-nums']`.
- The three weights cover identical codepoints.
- Fonts alone <= **25 MiB** (B24).
Related: `fonts-packaged.spec.ts` requires every `tokens().font.*` family to exist as `assets/fonts/<family>.ttf` and `build.gradle` to add `../../assets` as an asset source. **A new family name must be a file name under `assets/fonts/`.** Note the check only covers the Odia strings in the SMS templates, not the app's UI Odia strings (ASSUMPTION: UI strings checked elsewhere; B30 is mentioned in values/src/index.ts:166 for missing strings). A different Odia font must be proven for all required codepoints before the pin is changed.

### 2.4 Vitest contract on tokens and a11y (`apps/mobile/test/tokens.spec.tsx`, `a11y.tsx`)
Rule names as tests state them:
- every `ink|inkMuted|positive|negative|brandSoft` on every `bg|surface|surfaceRaised`, both modes, >= 4.5;
- `onAccent` on `accent` and on `accentPressed` >= 4.5; `onBrand` on `brand` >= 4.5; `onSelected` on `selected` >= 4.5; `selected` vs `surfaceRaised` >= 3 (F-41);
- `ink` on each of `tintRed|tintGold|tintIndigo` >= 4.5;
- `onAccent` is not `#FFFFFF`;
- `borderStrong` on `bg` **< 3** (so it may not enclose a control) and `inkMuted` on `bg` **>= 3** (so it can be the control border). Note this is a pinned property: a v2 palette that makes `borderStrong` clear 3:1 fails the test, and the fix is to change the rule with evidence, not to hide it;
- both modes carry **identical colour token names** (`Object.keys(color)` equal);
- `tokens().touchTarget` equals `TOUCH_TARGET_MIN_DP`; the minimum of `Object.values(tokens(mode).type)` >= `BODY_TEXT_MIN_SP`;
- the shipped-failure regression (white on `#B87214` = 3.85) stays rejected.
Per-screen: `undersizedTargets` (every Pressable or role=button needs numeric `minHeight` and `minWidth` >= 56), `undersizedText` (numeric `fontSize` < 17), `failingContrast` (Text colour vs nearest ancestor `backgroundColor`, a Text with none above it is reported). Every screen needs the predicate phrases (`mutates the store`, `adversarial`, `four states`, `longest string`, `TOUCH_TARGET_MIN_DP`, `keypad`) in its test and a registry entry through `standardCases` (canonical, adversarial, focus, longest). **The helpers read the style object, so a target must be a numeric `minHeight`/`minWidth` on the Pressable node itself**; padding that "adds up" to 56, or a hit-slop trick, fails it.

### 2.5 Other contract points that bind visuals
- `check:money` (bare `+ - Number()` on money, in source and tests), ADR-018: every rupee figure through `<Money>`; Latin numerals in every language; sign always rendered; colour additive.
- `@swafto/ui` is the only import for RN primitives (test seam). **Adding a primitive means adding it to `ui/index.ts` and the vitest alias/double `test/ui-double.tsx`, and react-native-web mapping for check:layout.** An icon library will need a double (see 3.1).
- `check:generated`, `check:prose`, `check:crossdoc`: `DESIGN.md`, `PLAN.md`, `TASKS.md` etc. are generated; do not edit by hand. `check:traceability` and `check:tasks` expect screen rows.
- Product rules in the visual layer: no inference in entry (no camera/OCR/voice/autocomplete as visual affordances); Keypad is the app's own and never beside a bottom nav; drift to a stored total is forbidden; interrogative difference copy; no free-form adjustments; Odia/Hindi stay unreviewed (H13); never mark them reviewed.
- Skill banned patterns (section 5 of the skill): generic add-transaction FAB, quick-add with its own store, inferring section from amount, blocking save on sync, cached day totals, spinner on save, inventory table even greyed out, rating/upsell/backup nag at end of day. "Balanced cash check" is the highest-leverage moment and must get weight and motion.
- Colour rules measured not preferred: marigold is a fill never type (white on marigold 2.04:1); control borders use `inkMuted`; directional money never on the brand bar.

---

## 3. Gaps v2 must fill

### 3.1 Icon set — none exists (MEASURED)
No `react-native-svg`, no vector-icons, no images under `assets/` (worker check). Today's three marks are hand-drawn from Views (1.3 item 6). USABILITY: a non-reader cannot scan Settings or the six tiles; nine tiles and settings rows need icons.
Options for v2 (decision needed from CTO since a native module is an APK change; the current code comment says "an APK rebuild may not add a native module", tokens.ts:287):
- **A. Icon font** (a single `.ttf` of ~25-40 glyphs, e.g. subset of an OFL/Apache icon font). No native module, works with `fontFamily` and the existing asset path, must be sha-pinned like the Anek files, **must be added to `fonts-packaged.spec` coverage** and the font check generalised without weakening it. Cheapest churn and lowest GPU. Recommended starting position (ASSUMPTION about licence; verify the chosen font's licence with open-source-compliance before use).
- **B. View-drawn marks** extended into one shared `Glyph` primitive. Zero dependency, but only reliable for simple shapes (chevron, tick, plus, minus, lock-ish). Fine for 6-8 marks; poor for a rupee-bag or customer silhouette.
- **C. `react-native-svg`.** New native module, new-architecture compatible but needs a rebuild and licence entry (`check:licences`), plus a double in `test/ui-double.tsx` and react-native-web mapping. Highest flexibility, highest churn.
Whatever is chosen: icons never replace the word (label-in-name WCAG 2.5.3, Odia draft copy), carry the accessible name from the existing string, and meet the WCAG non-text contrast minimum (SC 1.4.11).

### 3.2 State components (today only ad hoc inside Shell)
Needed as first-class, token-driven components, each with a visible next action (USABILITY: "no state offers a next action"):
- **Empty** (with an action, e.g. "Record a sale"); the word "Nothing here yet" is the audit's example of a dead end.
- **Loading** (skeleton rows or a still placeholder; no spinner on save per skill; spinner animation needs a frozen-animation allowance in check:layout, already present).
- **Error** (calm, "nothing was lost" copy kept; retry plus next step).
- **Offline** (persistent, never red; today a grey caption — chip exists as SyncChip, USABILITY item 8 wants it on every screen with tap-to-explain).
- **Stale day / phone-date notice** (QA-06: four-line white card with no button to the phone's date settings; at 2.0x eight lines. Needs a compact banner form that does not push the primary tiles).
- **Locked** (closed day D7, cash-check not yet reachable; a visible lock mark plus one line why, not a silent greyed tile; HT-27 disabled-tile rules must be preserved).
- **Disabled** as one shared vocabulary (1.3 item 11).

### 3.3 Text-size picker — absent (MEASURED by grep)
Only the system font scale is read (`PixelRatio.getFontScale`, tokens.ts:162). There is no in-app "Normal / Large / Extra large". The USABILITY item 9 and W3 want a real choice with live preview, body to 2.0x, chrome capped at 1.5. v2 needs the component (three-step selector with preview) and a persisted setting. **Constraint:** `check:layout` already tests 1, 1.5 and 2; an in-app multiplier must be an additional multiplier on body only (a new token, not a number in a screen) and cannot change `CHROME_FONT_SCALE_CAP` (registry value). Also note Focus (dark) mode is separate from text size; keep that distinction (tokens.ts:13-19, "not for old people").

### 3.4 List virtualisation — none
`FlatList` exported but unused (1.3 item 12); every list is `ScrollView` children inside Shell (Shell:641-678). USABILITY: the Return picker shows "sixty-odd rows"; a shop with years of entries and parties will exceed hundreds. On a low-end phone a non-virtualised list of hundreds of `Row`s with `elevation` is a real risk. **Caveats the CTO should weigh:** (a) `Shell` puts `children` in a ScrollView, so nesting a FlatList inside gives "VirtualizedList inside ScrollView" warnings and loses virtualisation; v2 needs a `Shell` mode where the list IS the body (ListHeaderComponent = `bodyHeader`). (b) check:layout and the contact sheet render through react-native-web with SSR (`renderToStaticMarkup`), where FlatList renders only the initial window; the `t7-items`/`t7-headline` in-view probes assume those nodes exist in the DOM. (c) the vitest double has no FlatList implementation (ASSUMPTION: `ui-double.tsx` not read). So adopting FlatList is a test-seam change, not just a component swap. Alternative: paginate/limit lists in the store ("show 20, then more"), which is ledger-safe and test-simple; `DUES_PARTIES_SHOWN`/`COLLECT_TOP` already follow that pattern.

### 3.5 Other missing components
- **Sheet / modal container** (xl radius 24 and elevation `sheet` 8 exist as tokens; PartyPicker is an in-tree overlay by design so check:layout can see it, Shell:111-122; v2 needs one shared `Sheet` rather than per-screen overlays). Background controls still listed beside the open sheet (W6): needs `accessibilityViewIsModal` / importantForAccessibility on siblings.
- **Switch/toggle** (consent "switches" render as outlined boxes; need a real switch look plus state word; withdraw as easy as give, DPDP).
- **Chevron / disclosure row** (settings, parties).
- **List item with leading icon and two lines** (name large, balance larger for parties; USABILITY item 5).
- **Button set:** a real full-width "Add" bar variant for entry (item 6), a quiet tonal "Nothing today" link with undo (item 7).
- **Toast / saved confirmation** ("Saved Rs 50 cash") without a spinner.
- **Divider/section header** (SectionLabel exists in DayParts, not shared).
- **Search field** for parties (if M2 flows need it; the no-inference rule allows matching, not auto-fill).
- **Banner** (replaces ad hoc notice cards).
- **Avatar/initial chip** for parties (optional; Odia initial glyph rendering must be checked).

---

## 4. Migration approach: smallest churn, tests stay green

**Principle: values change, names do not.** Every screen and component reads `tokens(display)`; `check:design` already forbids raw values outside `tokens.ts`. So a re-skin that only changes values in `theme/tokens.ts` touches **one file** and needs no screen edits.

### Phase A — value-only (no renames, ships first)
- Change palette hexes, type step values, radius values, elevation numbers, control heights. Keep all token names and the `type` keys (`body|label|figure|heading|hero`).
- Must keep: all pair tests in 2.4 (re-measure; `borderStrong` < 3 and `inkMuted` >= 3 on bg; both modes same names), `type` values >= 17, `control.*` derived from `TOUCH_TARGET_MIN_DP`, `leading()` ratio >= 1.8-equivalent headroom for Odia (loosening it needs a fresh Odia ink measurement; never tighten without it).
- Expected fallout: `check:layout` is the real gate. A larger type step or taller control will push the keypad below the fold at 1.5x in Focus (this has already happened, Keypad:86-100). Budget: four keypad rows x 56 plus footer on a 800-px viewport. Run `npm run check:layout` after every value change.
- Run: `npx vitest run --dir apps/mobile`, `npm run design && npm run check:design`, `npm run check:layout`, `npm run sheet && npm run shots`.

### Phase B — additive tokens (new names alongside old)
Add, never rename: `icon: {size, stroke}`, `textSize` multiplier steps, `state.*` colours if needed (must be added to **both** modes with the same names and measured in `tokens.spec.tsx`), `skeleton` tone, `radius` additions, `space` additions only if a 4-step scale cannot work (gen-design asks for a missing token as a single D.3 row; prefer expressing with existing steps). Keep `glyph` (still used by Shell/Keypad until they migrate). Add tests for each new colour pair to `tokens.spec.tsx` (the skill requires it).

### Phase C — structural, per component, behind a token layer
- Move margins out of leaf components (1.3 item 4) only with `check:layout` evidence; do it one component at a time. Replace the three hand-drawn marks with the shared `Glyph`/icon primitive.
- Unify disabled and row heights (decide 56 vs 64; if Row moves to `control.lg`, re-run layout; this adds one spacing step per row on every list).
- Introduce new components (state set, sheet, switch, text-size picker) as additions exported next to the old ones; migrate screens through `screen-designer` one at a time via the registry (`standardCases` gives canonical, adversarial, focus, longest).
- Rename only when the old name has zero callers and a `check:naming`/typecheck pass proves it. A rename like `accent` to `action` would touch every Pressable file; the benefit is cosmetic and the risk is a missed colour pair. **Recommendation: do not rename colour tokens in v2.**

### What each kind of change touches
| Change | Files | Risk |
|---|---|---|
| Colour/radius/elevation/type values | `tokens.ts` | low; tests re-measure, layout may need work |
| Font family swap or weight add | `tokens.ts`, `assets/fonts`, `check-font-coverage.mjs` SHA pins, `gen-contact-sheet.mjs` and `check-layout.mjs` FONTS lists, `fonts-packaged.spec.ts` (derived) | **high**: change to a check, so `prove:verifiers` required; Odia coverage unknown |
| Add icon font | as above plus `ui` Text only | medium |
| Add a native lib (svg) | `package.json`, gradle, licences, `ui/index.ts`, `ui-double.tsx`, rn-web alias in two tools | high |
| FlatList | `Shell`, `ui-double`, check-layout probes | medium-high |
| Rename tokens | every file | avoid |

### Before/after on the screen registry and contact sheet
`apps/mobile/src/screens/registry.tsx` (`SCREEN_CASES`, `standardCases(id, caption, render)`) is the single list the unit tests, `check:layout` and the contact sheet read. `npm run sheet && npm run shots` writes PNGs and `docs/contact-sheet/index.html` (360x800, deviceScaleFactor 2, reduced motion, Anek fonts loaded). The generator has no before/after mode. **Proposal (no code from me):** run `npm run shots` at the current commit and copy `docs/contact-sheet/*.png` to `docs/ui/before/`; after v2, copy to `docs/ui/after/`; add a plain HTML page (or a gen script owned by the CTO team, not a check) that pairs the same ids. Panels keyed by case id (`T2-...`, `or`, `focus`, `longest`) already give four states per screen. The caption states it is a web render, not Android; real device screenshots (`install -r`, vivo I2219) are the M3 truth and go in `docs/ui/`. Keep mockup HTML in `product/.../concepts/` out of `apps/mobile/src` so the raw-value scan never sees concept hex values.

---

## 5. Constraints any concept must respect

### 5.1 Odia glyph coverage with the bundled font (MEASURED/READ)
- Single family Anek Odia, three static instances; any concept font must provide Odia (U+0B00-0B7F, GSUB `ory2`), Latin, digits, `₹` in every weight used, static (not variable), and tabular figures via `tnum`. The Google Fonts v1 default served **zero Odia glyphs** at 42 KB each (check-font-coverage.mjs:40-44); never trust a "subset" file without running `check:font`.
- Anek's default digits are proportional ("1" about 60% of "0"); `tnum` fixes them. Mock-ups must show money with tabular figures, and must not rely on a Latin display font for money (rupee + digits are rendered in the Odia typeface by rule).
- Odia ink exceeds the font's declared ascent (26 vs 24 at 24px); line height 1.8 is a floor, so headings cannot be tightened for taste. Concepts that use tight leading (1.2-1.3), all-caps (Odia has no case; `textTransform: uppercase` is used on the eyebrow and pill, Shell:463, 579) or letter-spacing are invalid for Odia: tracking breaks conjunct shaping. **No negative or large letter-spacing.**
- Concept mockups must be checked with real Odia strings (from `apps/mobile/src/i18n/strings.ts`) in the real fonts, longest string at 1.5x. The Odia and Hindi copy is a draft (H13); mockups label it so.
- Known open: Latin "19" in the Odia typeface can resemble an Odia numeral (USABILITY). A concept that shows dates may propose a different numeral rendering for the reviewer, not decide it.

### 5.2 Contrast in daylight
- Floor 4.5:1 for all text (WCAG 2.2 SC 1.4.3) and 3:1 for control boundaries and meaningful icons (SC 1.4.11); both measured in tests. The two modes: comfort = warm light, focus = dark. Marigold `#F5A524` is a fill only; ink on it 8.75:1. Muted text on the three surfaces must stay >= 4.5 (inkMuted comfort `#57606A` is 6.39:1 on a card per the file).
- The stated daylight answer is a **non-white ground** (warm paper) with white cards above it. Pure-white backgrounds and pale-grey-on-white "modern" palettes will fail either the pair tests or the daylight premise. Also avoid thin weights (Regular is the lightest bundled; no Light/Thin exist), 1px low-contrast dividers as the only separator, and colour as the only signal (positive/negative need the sign; selected needs fill + bold + state).
- Measured field data point: with the owner's high-contrast text setting on, the app's rendered ratios were far above the floor, but the app's own colours with the setting off were **not** measurable (USABILITY W1); do not take that as proof of daylight legibility.

### 5.3 Target floor
- `TOUCH_TARGET_MIN_DP` = **56 dp** (ours, stricter than 48), on both axes, as numeric `minHeight`/`minWidth` on the Pressable node. Body text >= **17 sp**. Chrome font cap **1.5**; body/money uncapped to the system's 2.0.
- Back at exactly 56 square was measured "at the floor, nothing spare"; Add the "weakest control"; targets need spacing as well as size (USABILITY W2). Concepts must hold 56 dp **including the keypad key** inside a 360x800 budget with four rows plus footer.
- Layout must hold at the narrowest supported width (360 CSS px, as check:layout measures), Odia longest string, 1.5x chrome, and 2.0x body without horizontal overflow (check:layout).

### 5.4 Low-end GPU (₹7,000 phone)
- **No blur** (backdrop or otherwise), no gradients (no gradient library; RN core has none), no large or layered shadows. Android `elevation` is the only depth tool; today it is 2 and 8. A concept needing many elevated surfaces should use fill steps and a hairline instead (the palette already works this way: warm/cool step, no border). Strongly prefer **no elevation on the 12 keypad keys** (flat fill + `inkMuted` hairline), which is the largest single saving.
- Animation: only `Animated`, 160 ms / 240 ms, easing (.2,0,0,1), reduced-motion zero. No Lottie, no Reanimated (neither installed, not licensed here). Overdraw: avoid full-screen translucent layers; avoid `opacity` animation on large lists.
- Bitmaps: none today. Any illustration (empty states) should be drawn from Views or an icon font glyph, or a very small image counted below.

### 5.5 APK size for fonts and icons (MEASURED)
| Item | Bytes |
|---|---|
| AnekOdia-Regular.ttf | 163,252 |
| AnekOdia-Medium.ttf | 162,948 |
| AnekOdia-Bold.ttf | 163,620 |
| **Fonts (.ttf) total** | **489,820** (about 0.47 MiB) |
| OFL-AnekOdia.txt | 4,379 |
| Other assets under `apps/mobile/assets/` | none (no images, no icons) |
| Debug APK `app-debug.apk` (2026-11-18) | 39,315,761 (about 37.5 MiB; **debug**, not a release number) |
| B24 budget (APK) | 25 MiB = 26,214,400; fonts alone are 1.87% (matches the "1.87%" in check-verifiers.mjs:713) |

- No release APK exists (MEASURED), so the true release size against 25 MiB is **unknown**; do not claim headroom. Treat the font budget as: **v2 may add at most one new static font file or icon font of roughly 50-150 KB, and must not add a fourth Odia weight** without CTO sign-off (each Anek instance is about 160 KB). A second Odia family would roughly double font bytes (about +490 KB) for little benefit. Hindi (Devanagari) is not in the bundled Anek Odia file set per `check:font` (it checks Odia SMS strings and Latin only); how Hindi renders on a no-Devanagari phone is outside this audit (ASSUMPTION: system fallback, to be confirmed by the CTO).
- APK builds split `armeabi-v7a` + `arm64-v8a` (gradle.properties:28) so per-ABI size differs from a universal debug.

### 5.6 React Native 0.81 limits
- RN `^0.81.4`, React 19.1.0, **new architecture enabled** (`newArchEnabled=true`), Hermes enabled, ABIs arm64-v8a and armeabi-v7a (MEASURED, package.json and gradle.properties).
- Android styling: no iOS `shadow*` (elevation only); no CSS `box-shadow`, `filter: blur()` is not a safe path on low-end Android; `fontVariant: ['tabular-nums']` support on Android is explicitly **unproven on-device** (check-font-coverage.mjs: "DEVICE-CHECKLIST B4"; the USABILITY pass observed the keypad/figures aligned but did not isolate it); custom fonts only by file name under `assets/fonts` with **no variable-axis selection**, so weights are separate files; `textTransform` fine, `letterSpacing` risky for Indic.
- Line height scales by full system font scale while font size scales by the cap on Android Fabric (tokens.ts:148-163): `leading()` compensates; never use a bare multiple of a size for `lineHeight`.
- The test and measurement toolchain is react-native-web in Chromium, which differs from Android in pixel spacing and font-scale mechanics (stated in three tool headers). A passing `check:layout` is strong evidence, not proof; B14-B19 on the device remain blocked per those headers.
- No gesture-handler / reanimated: swipe-to-delete, bottom-sheet drag and shared-element transitions are out unless a native module is approved. `Modal` is avoided on purpose so the instruments can see overlays (Shell:111-122); keep overlays in-tree.
- `exactOptionalPropertyTypes` is on: optional props are typed `| undefined` explicitly (Shell:66-71).

---

## 6. Yardstick for the three concepts (pass/fail before merit)

A concept is viable only if all of these are answered in its brief or mock:
1. Palette: both modes, every text pair >= 4.5, control edge >= 3, ground not pure white, marigold or replacement used as fill only; `borderStrong`-style tokens named for separation vs enclosure.
2. Type: one Odia-capable static family (or Anek), >= 17 sp body, 1.8 leading kept, no tracking, no all-caps reliance, tabular figures for money, longest Odia string at 1.5x chrome and 2.0x body.
3. Targets: 56 dp floor met on the keypad and on the smallest control (Back, Add), with the primary action (Sale) reachable above the fold on Today (USABILITY items 1-2).
4. Depth: no blur, no gradient, shadows only as Android elevation 2/8, ideally none on keys.
5. Icons: which approach (A/B/C in 3.1), glyph count, never without a word.
6. States: shows empty, loading, error, offline, stale day, locked on at least the four key screens (Today, Sale entry, Day close, Ledger).
7. Money rule: every rupee figure with sign; no cached totals shown; difference copy interrogative.
8. Cost: bytes added to APK (measured, not estimated) and any native module requested.

## 7. Open items not mine to close
- Odia/Hindi copy unreviewed (H13).
- Real shopkeeper evidence none; all judgements here are expert review.
- Release APK size unmeasured.
- Whether the text-size picker should exist in V1 scope is a product decision for the CPO.
- Choice of icon approach needs CTO input (native module policy).
