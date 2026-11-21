# Design library for Mitra (phase 2, vetted resources)

Author: product-designer. Date checked for every web fact: **2026-11-20**. Next phase builds from this list; nothing here changes app code.

**How to read the evidence labels.**
- **VERIFIED** = a worker read it on the cited page, API or file this session.
- **PARTLY** = seen only in a search summary, or via a summarising fetch tool, or a secondary source.
- **NOT VERIFIED** = could not be read. Not filled from memory. Material 3 and Apple HIG pages are JavaScript-rendered and returned only their titles, so nothing below is quoted from them.
- **MEASURED** = measured in this repo by a tool.
- **JUDGEMENT** = my own inference, labelled as such.

**Document hygiene.** `check:registry` scans every `.md`. So unit-bearing figures that are not the registry floors are written out in words (for example "48 density-independent pixels") and contrast ratios are written "4.5 to 1".

**The repo's own floors (READ from `packages/values/src/index.ts`):** the touch floor `TOUCH_TARGET_MIN_DP` is 56 dp, **higher than every external figure below**. Contrast minimum comes from `CONTRAST_MIN_RATIO`. External figures are context; the repo floors win.

---

## 1. Design systems

| System | What we take for SWAFTO | Source and status |
|---|---|---|
| **Material 3 and Android accessibility** | (a) Touch targets: Android says at least 48 by 48 density-independent pixels, with at least eight density-independent pixels between targets. Our floor is stricter (56). (b) Never colour alone: distinguish with shape, size, text or pattern, and Android's own figure pairs colour-only buttons against buttons that also carry icon and text. This is the basis of our money in/out rule. (c) Use real semantic components and give gesture-only actions an accessibility action. (d) Tonal roles and state ideas: take the *idea* of role-named colours (we already have `ink`, `brand`, `onBrand`, ...); M3's own contrast levels and 4/8 grid were **not** read. | Touch target text: https://support.google.com/accessibility/android/answer/7101858 (VERIFIED). Colour-not-alone and semantics: https://developer.android.com/guide/topics/ui/accessibility/principles (VERIFIED). M3 structure, spacing, roles, type: https://m3.material.io/foundations/designing/structure , https://m3.material.io/styles/color/roles (**NOT VERIFIED**, JS-rendered; read in a browser before citing). Code licence: Apache-2.0, https://raw.githubusercontent.com/material-components/material-components-android/master/LICENSE (VERIFIED). M3 design-kit and icon licences: NOT checked. |
| **Apple HIG** | Reference only, not a source of rules we can cite. Plausible takeaways (large tap area, Dynamic Type-style scaling) are already covered by verified Android and WCAG sources, so do not cite HIG numbers. | https://developer.apple.com/design/human-interface-guidelines/ returned titles only. The 44-point hit region is **NOT VERIFIED** from HIG. HIG content is not open licensed (not found/checked); treat as read-only inspiration. |
| **Fluent 2** | (a) Verified touch minimums in one place: 44 by 44 on iOS and web, 48 by 48 on Android. (b) Spacing ramp on a base unit of four, with the in-between steps (2, 6, 10) existing only to pad icons onto the grid; our own space tokens (4, 8, 12, 16, 24, 32) sit on the same base. (c) Contrast: text 4.5 to 1; large text 3 to 1 (Fluent defines large as above 18.5 pixels bold or 24 pixels regular); non-text components 3 to 1. (d) Design text zoom to 200 percent without clipping; notes Android scale varies by manufacturer, which supports our `check:layout` runs at scale 2. | https://fluent2.microsoft.design/layout and https://fluent2.microsoft.design/accessibility (VERIFIED). Code licence: MIT, https://raw.githubusercontent.com/microsoft/fluentui/master/LICENSE (VERIFIED, repo only; Fluent 2 asset and icon licences not checked). Fluent has no verified colour-alone or reduced-motion text. |
| **WCAG 2.2 (the normative layer under all three)** | Target size minimum is 24 by 24 CSS pixels (AA); enhanced is 44 by 44 (AAA); both have exceptions. We exceed both. | https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html and .../target-size-enhanced.html (VERIFIED; AAA label for 2.5.5 is from general knowledge, not the fetched text). |

**Net for Mitra:** these systems add little we do not already have. Their value is as *citable sources* for the rules in section 8.

---

## 2. Component libraries and kits

Checked 2026-11-20 via GitHub API, npm registry and licence pages. "Web only" = depends on `react-dom`; unusable in React Native 0.81 on Hermes.

**Context (READ, DESIGN-SYSTEM-V2.md):** Mitra v2 is a token-driven in-house component set (Shell, ActionTile, Keypad, Banner, Sheet, Switch, ...) built on `apps/mobile/src/theme/tokens.ts`, enforced by `check:design` and `check:layout`. No third-party UI kit is in the spec.

| Library | Licence | Maintenance (checked 2026-11-20) | RN fit | Decision |
|---|---|---|---|---|
| shadcn/ui | MIT | CLI 4.23.0 (2026-10-27); commit 2026-11-19 | Web only (React, Tailwind, Radix) | **Reject for the app.** Fine as *pattern inspiration* only. |
| react-native-reusables (shadcn port) | MIT | commit 2026-11-17; rn-primitives 1.4.0 (2026-03-28) | RN, but needs NativeWind and rn-primitives; other native deps and TalkBack behaviour NOT VERIFIED | **Not adopted.** Copy-in model is attractive, but it would put a styling layer between our tokens and the checks. Revisit only if a measured need appears. |
| Radix UI | MIT | dialog 1.3.1 (2026-10-12); commit 2026-10-14 | Web only | **Reject** (web). |
| MUI Material | MIT | v9.5.0 (2026-10-09); commit 2026-11-20 | Web only | **Reject** (web). |
| MUI Base | MIT | beta.70 (2025-03-17); npm says replaced by Base UI | Web only | **Reject** (deprecated, web). |
| Base UI | MIT | v1.9.0 (2026-10-09); commit 2026-11-19 | Web only | **Reject** (web). |
| MUI Joy | MIT | beta.52 (2025-03-18), no release in over 12 months | Web only | **Reject** (unmaintained, web). |
| Ant Design | MIT | 6.7.1 (2026-11-16); commit 2026-11-20 | Web only | **Reject** (web). |
| Ant Design Mobile | MIT | v5.43.0 (2026-09-14) | Web/H5 only (react-dom peer) | **Reject** (not React Native). |
| Untitled UI (free and PRO) | Proprietary. Commercial closed-source use allowed per the licence page (read through a summarising tool); you may not expose or redistribute source or build a kit from it; the page contradicts itself on Figma sharing for the single-seat tier | no release data | React kit is web; the page does not mention RN | **Reject code.** The Figma kit could be a *visual reference* only; **not recommended** while the licence text is ambiguous and we have a concept already approved. |
| Tailwind UI / Tailwind Plus | Proprietary. End products allowed; no redistribution as a library (read via search summary; exact wording NOT VERIFIED) | N/A | Web components | **Reject** for RN. |
| React Native Paper | MIT | v5.15.5 (2026-11-16); commit 2026-11-20 | RN, Material 3 look; weight, Odia rendering and TalkBack on the target phone NOT VERIFIED | **Reference only, do not install.** It imposes Material shapes and its own theme; Mitra's tokens and checks already cover the same ground. Useful to read for accessibility prop patterns. |
| NativeWind | MIT | 4.2.7 (2026-09-14); commit 2026-11-19 | RN styling layer; adds build and runtime overhead, reanimated use NOT VERIFIED as peer | **Reject.** `check:design` forbids raw values in components; utility classes bypass the token path. |
| Gluestack UI v5 | GitHub shows **no licence**; npm says MIT | v5.0.0 (2026-06-25); commit 2026-09-02 | RN and web; peers undeclared | **Reject until licence is confirmed in the repo** (ambiguous). |
| Tamagui | MIT | v3.3.3 (2026-11-13); commit 2026-11-19 | RN and web; compiler setup is heavy; TalkBack NOT VERIFIED | **Reject.** Compiler complexity against a small ₹7,000-phone budget and our own check pipeline. |
| React Native Elements | MIT | @rneui/themed 5.0.0 (2026-01-19); old package unmaintained (2022) | RN | **Reject.** Slowing releases, two package names. |
| React Native UI Lib (Wix) | MIT | 10.0.0 (2026-11-11) | RN; requires reanimated and gesture-handler | **Reject.** Heavy native dependencies on the weakest target hardware (JUDGEMENT; weight NOT measured). |
| NativeBase | MIT | 3.4.28 (2023-03-06); README says maintenance mode | RN, needs react-native-svg | **Reject** (deprecated). |
| Shoutem UI | BSD-3-Clause | @shoutem/ui 9.3.2 (2026-11-17, npm) | RN; navigation and gesture peers | **Reject.** Not abandoned, but its look and dependencies do not fit and it adds nothing Mitra lacks. |

**Verdict (JUDGEMENT):** adopt **none**. Mitra's tokens, primitives and four instruments (`check:design`, `check:layout`, `check:font`, contact sheet) are the system; every candidate either is web-only, deprecated, ambiguously licensed, or would route styling around the checks. The measured cost of any native dependency (APK size, start time on the target phone) was **not measured** by this research.

**Not verified:** last-commit dates for MUI Base, MUI Joy, React Native Elements, Wix UI Lib, NativeBase, Shoutem (API rate-limited); Untitled UI and Tailwind Plus release dates; bundle size and TalkBack for all RN candidates.

---

## 3. Colour

### Tools
| Tool | Licence and terms | Use for us | Status |
|---|---|---|---|
| **Adobe Leonardo** (https://github.com/adobe/leonardo) | Apache-2.0; last push 2026-07-08; not archived | Generate tonal ramps that hit a stated contrast target; good fit for deriving `tintX`/`inkX` pairs | Repo VERIFIED; leonardocolor.io site not fetched |
| **Realtime Colors** (https://www.realtimecolors.com/) | Site footer says CC BY-NC-ND, FAQ says that covers the site's source and generated colours may be used commercially or not; repo licence file could not be fetched | Preview a palette on a sample UI. Use for exploration only; do not copy its code | PARTLY |
| **Coolors** (https://coolors.co) | Terms page returned 403; a search snippet quotes commercial use of palettes allowed but no stand-alone redistribution; free-tier limits unknown | Brainstorming only; no dependency | PARTLY / NOT VERIFIED |
| **Colour Contrast Analyser (TPGi)** (https://github.com/ThePacielloGroup/CCAe) | GPL-3.0; last push 2025-09-10; checks text and non-text | Desktop pair-checker for manual QA (running it does not make our code GPL) | VERIFIED |
| Repo's own `product/swafto-ui-redesign/contrast-v2.mjs` | MEASURED, in-repo | **The authority.** Use this, not the web tools, for pass/fail | READ |

### Method
- **WCAG 2.2 text and graphics** (VERIFIED, https://www.w3.org/TR/WCAG22/#contrast-minimum):
  - SC 1.4.3 AA: at least 4.5 to 1; large-scale text 3 to 1; large is "at least 18 point or 14 point bold".
  - SC 1.4.6 AAA: 7 to 1, large text 4.5 to 1.
  - SC 1.4.11 AA: 3 to 1 against adjacent colours for UI components and meaningful graphics.
  - SC 1.4.1 A: colour is not the only visual means of conveying information.
- **Never colour alone for money direction.** SC 1.4.1 plus Android's colour-not-alone principle. Mitra already prints a sign, an arrow icon and a word beside every in/out figure (DESIGN-SYSTEM-V2 section 3.4, READ).
- **Colour-blind safety.** Colour Blind Awareness states about 1 in 12 men (8 percent) and 1 in 200 women are affected, about 300 million people, and advises not relying on red/green alone and testing with simulations (https://www.colourblindawareness.org/colour-blindness/ , VERIFIED). **Caveat:** an NIH page reportedly says those rates are for Northern European ancestry and lower elsewhere; seen only in a search summary (PARTLY). Do not state a prevalence for Odisha shopkeepers. Mitra's green `positive` and clay `negative` are a weak red-green pair (READ, DESIGN-SYSTEM-V2 section 4); the sign and arrow carry the meaning; test with a colour-blind person in M4.
- **60-30-10.** This is an interior-design rule of thumb that sources themselves call "meant to be broken" (e.g. https://www.bobvila.com/articles/60-30-10-rule , PARTLY). **No standards body or research was found.** Use as a loose balance check (warm ground dominant, white cards secondary, teal and tints as accents), never as a requirement. Mitra already follows the shape of it (JUDGEMENT).
- **Sunlight and cheap-LCD readability.** **No credible official guideline with an outdoor contrast threshold was found** (WCAG's own contrast text does not mention glare; the ratio is rationalised for moderately low vision at https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html , VERIFIED). A 2026 University of Waterloo paper reportedly argues that bright surroundings change what counts as enough contrast (https://cs.uwaterloo.ca/~dvogel/gi2026/papers/1075b.pdf); it could not be read (NOT VERIFIED). Figures like "aim for 5 or 7 to 1 outdoors" came only from vendor blogs and are **not** cited here. **JUDGEMENT:** exceed AA for body and money text (Mitra's measured lowest text pair is already above AA), prefer heavier weights, avoid pale tints as the only boundary, and **decide by testing on the real phone in daylight** (already the M3/M4 plan; the tile-tint risk is already accepted as decorative in PLAN.md).
- **Material 3 colour roles and contrast levels:** NOT VERIFIED (JS-rendered, https://m3.material.io/styles/color/roles ). Read in a browser if wanted.

---

## 4. Type for Odia and Devanagari

### What is actually shipped (MEASURED this session with fontTools 4.68.0, files read from `apps/mobile/assets/fonts/`)
| Measure | AnekOdia Regular, Medium, Bold | SwaftoIcons |
|---|---|---|
| cmap codepoints | 317 each | 32 |
| Odia block U+0B00-0B7F | 90 | 0 |
| Devanagari block U+0900-097F | **2** (only the danda marks U+0964, U+0965) | 0 |
| Basic Latin | full (95) | 0 |
| Rupee sign U+20B9 | present | absent |
| Variable (fvar)? | no, static | no |
| Units per em | 2000 | 1000 |
| Ascent / descent / gap (hhea and typo) | 1960 / 1400 / 0 | 1000 / 0 / 0 |
| Shaping scripts in GSUB and GPOS | DFLT, latn, ory2, orya (**no deva or dev2**) | none |
| Version and licence | 1.003, SIL OFL 1.1, Anek Project Authors | subset of Lucide 1.75.0 |

Consequences:
1. **Hindi (Devanagari) text is not covered by any bundled font.** It falls back to whatever the handset carries, and a budget phone may carry none (the same risk `tokens.ts` cites for Odia, DC-004). Measured fact; the on-device outcome is NOT measured. This is the biggest type gap for Mitra. (Open for Saket and the CTO; the Hindi copy is also still an unreviewed draft, H13.)
2. The static files' internal names are inconsistent (Regular and Bold carry "Medium" in the family name; the Medium file is "Anek Odia Medium Medium"). The app registers fonts by file name via `tokens.font.*`, so this is harmless today, but never map by internal family name.
3. Metric ratio from the font itself: (1960 + 1400) / 2000 = 1.68 em (computed, not published). `tokens.ts` documents that the repo's 1.8 leading is deliberately larger because Odia ink was measured above the declared ascent (READ in `tokens.ts`); keep it.

### Candidate fonts for Hindi (all SIL OFL 1.1, per Fontsource, a redistributor; the Google Fonts pages were not opened)
| Font | Form | URL | Note |
|---|---|---|---|
| **Anek Devanagari** | variable (wght, wdth) | https://fontsource.org/fonts/anek-devanagari/about | Same designers as our Odia face (Ek Type), so best visual match. PARTLY verified. A variable file would collide with our `check:font` no-`fvar` rule, so a **static instance** would have to be cut, as was done for Odia. |
| Noto Sans Devanagari | variable | https://fontsource.org/fonts/noto-sans-devanagari | Widest coverage; same static-instance note |
| Mukta | static, several weights | https://fontsource.org/fonts/mukta | Static, so no instance work |
| Hind | static, five weights | https://fontsource.org/fonts/hind | Static |
| Noto Sans Oriya | variable | https://fontsource.org/fonts/noto-sans-oriya | Only a fallback comparison for Odia; we already ship Anek Odia |

Anek (Ek Type; Odia contributors named on the repo) is OFL 1.1: https://github.com/EkType/Anek and https://fontsource.org/fonts/anek-odia/about (VERIFIED). The Fontsource package shows font version 1.003, updated 2026-03-03; the repo showed no dated releases.

### Scale and line height
- **No authoritative source gives a numeric line height for Odia or Devanagari.** Material's older language page says tall scripts such as Hindi need "slightly larger" line height than Latin but gives no number (https://m2.material.io/design/typography/language-support.html , PARTLY, seen in search only). W3C Indic Layout Requirements has no general line-height guidance (https://www.w3.org/TR/ilreq/ , VERIFIED); the Odia layout note returned 404. The Indian government site UX4G reportedly uses 1.8 for Devanagari (https://www.ux4g.gov.in/foundations/typography , PARTLY, a search snippet). Other numbers seen (1.4 to 1.6) were vendor pages and are not used.
- **Therefore the evidence for line height is our own measurement**, not a citation: Odia ink in the shipped face reaches above the font's declared ascent (READ, `tokens.ts` comment, measured there), which is why leading is 1.8. Re-measure on any new face before changing it; a clipped matra changes a word.
- Android scaling: non-linear font scaling arrived in Android 14 (PARTLY: the API exists at https://developer.android.com/reference/android/content/res/FontScaleConverter ; "up to 200 percent" and the curve come from secondary sources). Design for 200 percent with scrolling containers (Fluent says the same, VERIFIED). Matches `check:layout` at scales 1, 1.5 and 2.
- Material 3 type scale values: the official page was not readable; third-party mirrors are unverified, so **no M3 number is quoted**. Use the repo's own steps (`body`, `label`, `lead`, `heading`, `figure`, `hero`), which are MEASURED against `check:layout`.

---

## 5. Spacing, touch targets, density, one-handed use

| Fact | Source | Status |
|---|---|---|
| Android: targets at least 48 by 48 density-independent pixels, spaced by at least eight density-independent pixels | https://support.google.com/accessibility/android/answer/7101858 | VERIFIED |
| Fluent: 44 (iOS, web), 48 (Android); spacing base unit four | https://fluent2.microsoft.design/layout | VERIFIED |
| WCAG 2.2: 24 CSS pixels (AA) / 44 (AAA) | w3.org links in section 1 | VERIFIED |
| NN/g: minimum target about 1 cm by 1 cm physical size; fingertip 1.6 to 2 cm wide, thumb impact area about 2.5 cm (citing MIT Touch Lab); about 2 mm spacing "often-recommended" | https://www.nngroup.com/articles/touch-target-size/ | VERIFIED |
| Hoober 2013: 1,333 observations, 780 involved touching the screen; of those 49 percent one-handed, 36 percent cradled, 15 percent two-handed. Author's limits: first seconds only, no demographics or device data, public places, tablets excluded; not "n percent of people" | https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php | VERIFIED |
| Hoober 2017 part 3: touch accuracy from 7 mm at screen centre to 12 mm at the corners; edge list rows at least 9 or 10 mm; suggests designing about 20 percent larger. Cites other studies (Lee and Zhai 2009, Schildbach and Rukzio 2010, Henze 2011) for error rates by button size; primary papers not read | https://www.uxmatters.com/mt/archives/2017/07/design-for-fingers-touch-and-people-part-3.php | VERIFIED as cited there |
| Parhi et al. 2006: about 9.2 mm (discrete) and 9.6 mm (serial) for one-handed thumb use, as cited by others; paper not read | via the NN/g and Hoober pages | PARTLY |
| M3 "4/8 baseline grid" and its 48 target text | https://m3.material.io/foundations/designing/structure | **NOT VERIFIED** |
| Apple 44 points | HIG | **NOT VERIFIED** |
| A Google figure for tap error versus size | | NOT SOURCED |

**Reading it for Mitra (JUDGEMENT):** every external minimum (24, 44, 48) is below our 56 dp floor, and the physical figures (about 9 to 10 mm for thumb targets, 7 to 12 mm accuracy spread) are what 56 dp is consistent with on a typical phone. I did not measure the physical size of 56 dp on the test handset; do that before quoting it in millimetres. Density: keep the 12 gutter and 8 gaps, spacing steps already sit on Fluent's base-of-four. Bottom-weight the primary actions, since one-handed use is the most common observed grip but the studies above have the stated limits.

---

## 6. Icons

| Set | Licence | Release and activity (checked 2026-11-20) | Notes |
|---|---|---|---|
| **Lucide** (https://github.com/lucide-icons/lucide) | ISC. The LICENSE is multi-part: about 130 icons derived from Feather also carry MIT (Cole Bemis). Both require the copyright and permission notice in copies; no on-screen credit needed | Release 1.77.0 (2026-11-20); commit 2026-11-19. README: "1600+" vector files. Icon-font build via `lucide-static` (README says fonts are for prototyping, not recommended for production web) | **Already used.** The repo's subset is cut from Lucide **1.75.0** (MEASURED: font name string), so upstream is two minor versions ahead. `ISC-Lucide.txt` in the fonts folder already carries the ISC text and the Feather MIT text (READ lines 23 to 25). Keep both when regenerating. |
| **Phosphor** (https://github.com/phosphor-icons/core) | MIT, "Copyright (c) 2023 Phosphor Icons"; notice must be kept in copies | core release v2.0.8 (2024-02-01); last commit 2026-01-06; web package 2.1.2 (2025-03-31). React Native community package `phosphor-react-native` 3.0.6 (2026-04-23); an official RN repo exists but its dates were not captured. Webfonts offered with several weights (the "six weights" claim is NOT VERIFIED from a fetched page; icon count not stated on a fetched page) | Candidate for a **second style only if Lucide lacks a glyph** (for example a richer set of shop objects). Slower release cadence than Lucide. Keep one stroke family in the UI; do not mix. |
| Tabler Icons (alternative) | MIT | v3.52.0 (2026-11-14); README: 6545 icons (5491 outline, 1054 filled), 24 grid, 2 px stroke | Larger fallback pool, same stroke family. |
| Material Symbols and Icons (alternative) | Apache-2.0 (API field); whether the Symbols variable font shares it NOT VERIFIED | repo push 2026-10-23; latest tagged release 2020 | Variable fonts would trip our `check:font` fvar rule. Not recommended. |

Rules carried over (READ, DESIGN-SYSTEM-V2 section 2): icons never replace words; glyphs hidden from TalkBack; Private-Use codepoints never go through Indic shaping.

---

## 7. Best-in-class apps (learn from, copy none)

**Ground rules.** Sources were official sites, help pages and search snippets only. Google Play listings did not render through the fetch tool, so **ratings and install counts are NOT VERIFIED for every app**. Figures the vendors print about themselves are marked "vendor claim". No screenshots were taken or saved and none of these apps' brand, colours or layouts may be reused. Home-screen IA and step-by-step entry flows were **not verified** for any app; use a hands-on walkthrough (with Saket's approval) if we need that. All "do well / avoid" lines are my judgement from the sources.

| App | What it is | Flow and IA learnings (own words) | Avoid |
|---|---|---|---|
| **Khatabook** (https://khatabook.com ; search-snippet pages) | A digital ledger (bahi-khata) for business and personal accounts | Reminders hang off each customer's pending balance and go by SMS or WhatsApp, with bulk and automatic options; a cash-book article suggests a separate cash register beside the customer ledger. Automatic backup is stated plainly (snippet, possibly dated). | Public claims disagree with each other (the language count appears as 10-plus, 11 and 12 on official pages). Inconsistent claims erode trust. |
| **OkCredit** (https://okcredit.in/payment-reminder-app) | Udhar-khata with reminders and UPI collection | The customer does not need the app: a pay link arrives by WhatsApp or SMS, and a payment made through it is recorded against that customer automatically. Sign-up needs only a mobile number. Free basic plan includes reminders; unlimited SMS reminders are paid. Vendor claims: 4.6 stars, "1 Crore+" downloads (the website's claim, not the Play listing). | Lending and payment-link emphasis pulls away from simple recording; offline and backup are barely described. |
| **Vyapar** (https://vyaparapp.in/llms.txt) | GST billing, inventory and accounting for small and medium businesses, mobile and desktop | States offline use with sync later, and backup to Google Drive or local storage. Core mobile features free; premium and desktop paid. Vendor claim: "1.5 crore+ businesses". | A large GST and inventory surface is more than a udhar-and-cash shop needs; features beyond the entry loop add menu weight. |
| **myBillBook** (https://mybillbook.in , https://mybillbook.in/s/features/payment-reminders/) | GST and non-GST billing, inventory, bookkeeping | SMS reminders are scheduled in settings around the due date. On the web version, a WhatsApp reminder opens a pre-filled message that **the owner reviews and sends manually** (a human-in-the-loop pattern that fits our "user keeps decision authority"). Vendor claim: "1 Crore+" businesses. Aggregator reviews describe offline billing as unreliable (not vendor-confirmed). | Feature parity differs by platform (WhatsApp on web only), which confuses users. |
| **Zoho Invoice** (https://www.zoho.com/in/invoice/) | Free GST invoicing, quotes, expenses, online payment | Clear single-purpose scope. | Not shaped for daily udhar or cash closing; English-led. |

**Not checked:** Dukaan, Digikhata, BharatPe merchant app, Marg ERP and others were not examined. Discontinued or renamed status was not checked for any app.

**Gap (JUDGEMENT, unverified).** None of the pages read mention a daily cash-closing or drawer-reconciliation flow. That may be an opening for SWAFTO's closing-first design, but needs confirmation from the in-app flows before we claim it anywhere. Competitors' shared centre of gravity is reminders tied to payment links, which sits close to the lending and collection push; our D2 rule (UPI never moves the cash drawer) and "no inference in entry" are deliberate differences.

---

## 8. Implications for Mitra

Each item names its source and what it changes. None alters a product rule in `CLAUDE.md`.

1. **Keep the 56 dp touch floor; do not relax it toward 48 or 44.** External minimums are lower (Android 48 and eight spacing, Fluent 44 and 48, WCAG 24 and 44); the physical-size studies (about 9 to 10 mm, accuracy spread 7 to 12 mm, error rising sharply below 8 mm as cited) favour generous targets for a thumb on a cheap screen. Sources: section 5. Follow-up: measure the millimetre size on the test handset before quoting it.
2. **Money direction stays on sign plus arrow plus word, colour additive.** WCAG 1.4.1 and the Android colour-not-alone principle (verified), and Colour Blind Awareness's advice not to rely on red/green alone. Our `positive` and `negative` hues are a weak red-green pair, so run a colour-blind check in M4 rather than assume. Sources: sections 1 and 3.
3. **Treat the Hindi font as an open gap, and decide before M3 build.** Measured: the bundled Anek Odia has only two Devanagari marks and no deva shaping. Options in section 4 (Anek Devanagari for visual match, or a static Mukta/Hind). Any variable source must be cut to a static instance to pass `check:font`. Needs a CTO decision and a native Hindi reviewer for copy (H13); do not mark reviewed.
4. **Keep leading at 1.8 for Odia and verify any added face.** No authority gives a number for Odia or Devanagari line height; our own measurement is the evidence (`tokens.ts`). Re-measure ink extents before changing it. `leadingMoney` at 1.4 is already an unmeasured assumption in DESIGN-SYSTEM-V2; measure rupee and digit bounds first.
5. **Exceed AA for text, and make daylight on-phone testing the deciding gate.** No credible outdoor contrast threshold exists in what we found; WCAG's number is not an outdoor figure. Use the repo's measured pairs, prefer heavier weights, and keep the `edge` rim fallback for tiles if daylight fails (already in PLAN.md).
6. **Do not adopt a third-party component kit.** Of 18 candidates checked, ten or more are web-only, several are deprecated or unmaintained, Gluestack's licence is ambiguous, and the RN candidates add styling layers or native dependencies that bypass or burden `check:design`, `check:layout` and the ₹7,000 phone. Mine React Native Paper and shadcn/ui for *patterns* only. Source: section 2.
7. **Refresh the Lucide subset on purpose, not by accident.** Upstream is at 1.77.0 and the repo's subset is 1.75.0. If regenerating, keep the codepoint-by-name lookup, keep both the ISC and Feather MIT notices, and rerun `prove:verifiers`. Phosphor (MIT) is an option only for a glyph Lucide lacks; do not mix two stroke styles. Source: section 6.
8. **Borrow the review-then-send pattern for any message to a customer.** myBillBook's WhatsApp flow opens a prefilled message the owner reviews and sends; OkCredit and Khatabook push automatic reminders. Mitra's rule that the user keeps decision authority points to the former: show the message, let the shopkeeper send. Any new Odia/Hindi wording is a draft (H13).
9. **Make the customer's side zero-install, and keep UPI out of the drawer.** OkCredit's pay-link model is clearly valued, but it ties collection to UPI; for us, a UPI receipt is recorded but never adds cash to the till (D2). If a pay link is ever added, the receipt must be recorded as UPI, not cash. Not a V1 recommendation; flag for the CPO.
10. **Own the close-the-day loop.** None of the pages read mention a daily cash close; that is a possible differentiator, but unverified. Do a hands-on look at the competitors' in-app flows (needs Saket's approval) before positioning on it.
11. **Plan for text at 200 percent and a scale picker.** Fluent and Android-14 guidance agree (design to 200 percent; scrolling containers). Our `check:layout` at scales 1, 1.5, 2 already enforces this; keep it as the gate for the Normal/Large/Extra-large picker. Sources: sections 1 and 4.
12. **Do not cite Material 3 or Apple HIG numbers in specs until read in a browser.** Their pages returned titles only, so every M3 spacing, role and type value, and Apple's 44-point figure, are unverified. Cite Android support, Fluent and WCAG pages instead; they were read. Source: section 1.

---

## Open items for the next phase
- Hindi font decision (item 3), and native review of Odia and Hindi copy (H13).
- Read the Material 3 colour roles, type scale and spacing pages, and Apple HIG, in a browser if their numbers are wanted.
- Confirm the Gluestack licence file, Untitled UI and Tailwind Plus raw licence text, and the Realtime Colors and Coolors terms only if any of them is ever adopted (none is recommended).
- Measure the physical size of the touch floor on the test handset; measure daylight legibility on the real device.
- Hands-on competitor walkthrough with approval, to replace the unverified flow and IA rows in section 7.
- Run `npm run check:registry` on this file (not run by me: Bash was unavailable to the main agent; I wrote units and ratios in words to avoid its rules, as an assumption).
