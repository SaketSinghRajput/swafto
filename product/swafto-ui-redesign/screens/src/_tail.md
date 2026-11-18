## Task speed: taps counted from the frames (targets are the founder's; seconds are NOT measured)

Counted by hand from the frames, assuming the user knows where the tile is. A tap is any touch, including each keypad digit. No time is claimed: the only honest figure available is the tap count, and "one tap is about one second" in USABILITY.md was the tester's estimate, not data. M3 (timed on the phone) and M4 (real shopkeepers) decide.

| Task | Target | Path in Mitra | Taps | v1 as built (USABILITY) | Where it could miss |
|---|---|---|---|---|---|
| Cash sale, 2-digit amount | under 10 s | Sale tile, 2 digits, Add | 4 | 5, with a scroll first | Add must be reachable one-handed: it is full width above the keypad. |
| Cash sale, 3-digit amount | under 10 s | Sale tile, 3 digits, Add | 5 | 6 to 7 | none expected |
| Next sale | under 10 s | Back lands on Today with scroll kept; same path | 4 to 5 | scroll repeated every sale | scroll restore must be built (item 2). |
| UPI sale | under 10 s | Sale tile, digits, UPI, Add | 5 to 6 | n/a | |
| Collect udhar, 3-digit | under 20 s | Collect tile, person row, person (balance is on the row), 3 digits, Add | 7 | 8 plus a stale error | +1 tap and a read if the amount is more than owed (QA-03 confirm, deliberate). |
| Owes-lookup, one person | under 10 s | Ledger tab: the list shows each balance, sorted by amount owed; open person for detail | 1 to read, 2 for detail | 1 to 3, no per-person balance on the list | |
| Owes-lookup from Today | under 10 s | tap "Udhar to collect" on Today (goes to the list) | 1 | shop total only | |
| Close the day, 6 empty sections (see `close.html`, quiet-day frames) | under 3 min | Continue day close, 6 x "Nothing today", Open cash check, count digits (5), Save, Close the day, Done | 15 (16 if the drawer is short; 23 with one recount; +1 to confirm UPI receipts) | 9 to reach the count, then count, Save, Close | The count is the long part; unknown real time. Difference case adds a reason tap and a recount option. |

Not a core task, but noted: there is no Pay tile on Today (it is a row in More), so Pay supplier is about 9 taps for a 4-digit amount (More, Pay supplier, supplier, digits, Add); udhar sale is 8 taps. Neither has a target. The tap counts in the money, sales and close areas are the designers' counts from the frames.

Close under 3 minutes is about reading and counting cash, not tapping; the design keeps the next step named on one sticky button so no step needs searching.

## Token map (reconcile with DESIGN-SYSTEM-V2.md when it lands)

`DESIGN-SYSTEM-V2.md` landed while this was being written. The mockups keep short CSS variable names (cheaper to read in a mockup); every one maps one-to-one to a V2 token below, and the hex values were checked equal against V2 section 1.1 (comfort and focus). Build uses the V2 names, not the mockup names.

| Mockup variable | V2 token | Comfort | Focus |
|---|---|---|---|
| `--bg` / `--surface` / `--raised` | `bg` / `surface` / `surfaceRaised` | #FFF6EA / #FFFFFF / #F6EADA | #1A1410 / #261E18 / #30261E |
| `--ink` / `--muted` / `--edge` / `--rule` | `ink` / `inkMuted` / `edge` / `border` | #2B2118 / #5E4E41 / #8A7560 / #E6D5BF | #F6EDE2 / #BFAF9E / #9C8A78 / #3E3126 |
| `--act` `--onact` `--sel` `--onsel` | `brand` `onBrand` `selected` `onSelected` | #0A6B66 / #FFFFFF | #4FC3BA / #10201F |
| `--hbg` `--hfg` | `header` `onHeader` | #0A6B66 / #FFFFFF | #261E18 / #F6EDE2 |
| `--pos` / `--neg` | `positive` / `negative` | #1E6B2E / #A3410C | #6FD48A / #F2A06A |
| `--waitbg` `--waitfg` | `tintGold` `warning` | #FFE9B8 / #6B4400 | #3A2E12 / #F2CF7A |
| `--t1` to `--t5` (bg / ic) | `tintSale`/`inkSale`, `tintUdhar`/`inkUdhar`, `tintCollect`/`inkCollect`, `tintExpense`/`inkExpense`, `tintMore`/`inkMore` | as C-mitra.html | as C-mitra.html |
| `--scrim` | `scrim` | rgba(43,33,24,.55) in the mockup; V2 is #2B211880 (about .50) | #000000B3 |
| radius 20 / 24 / pill | `lg` 20 / `xl` 24 / `pill` | | |
| type | 17 body, Anek Odia only; V2 section 1.3 owns sizes and leading (mockup uses 1.4 leading for Latin-digit money, the known M1 gap) | | |

Differences to reconcile: the mockup scrim opacity (.55 vs V2 .50, cosmetic); disabled tiles use a dashed `edge` rim with `inkMuted` on `surfaceRaised` (measured well above the AA minimum, from V2 1.2 pair "muted on raised"); the "info" banner uses `edge`, not the V2 `info` ink or `tintIndigo`, so a V2 review may prefer `tintIndigo` for informational banners and `tintRed` for the refused banner (the mockup draws refusals as a `negative` rim on `surface`). Neither changes any structure.

Contrast ratios for these pairs were measured in `concepts/C-mitra.html`; the new frames add no new colour pairs, except dashed-edge disabled tiles (`--muted` on `--raised`, measured well above the AA minimum) and the dark scrim.

## Cross-cutting decisions (so each frame does not repeat them)

- **Disabled is explained.** A greyed control carries a dashed edge, `aria-disabled`, and a visible reason (banner or line). Silent greyed tiles on a closed day were a USABILITY finding.
- **Refusals** appear only after a tap, never on opening a form, and are cleared when leaving the form (QA-07). They sit clear of the Back button.
- **Switches** are labelled with a tick or dash and words (Yes/No), never a bare coloured knob. Consent withdrawal is one tap and takes effect immediately.
- **Destructive steps** state what happens, how long the undo window is, and give Cancel equal weight.
- **No stored totals**: every figure in a frame is derived from the entries drawn in it.

## Open copy gaps and blocked items

The generated roll-up above lists every string with no key. All need Odia and Hindi drafts and a native reviewer (H13); nothing is marked reviewed. Human-blocked and not mine to close: H13 copy review; grievance-officer contact (shown as an honest not-published state); the real https address on About; Google Play and privacy-policy publication items in `docs/handover/HUMAN-ACTIONS.md`.

## Risks

- Mockups are expert design, not tested with shopkeepers; M4 may overturn any layout.
- The icon font is required by Mitra; DESIGN-SYSTEM-V2.md measures it at 9,184 bytes for 27 codepoints (APK delta not measured). The mockup draws more icon names than that (about 50 in `kit/kit.js` `ICO`, many added for settings, devices, ledger and offline). Either the glyph list grows (a few KB more, to be re-measured) or the extras are cut to the 27; the design-system lead and Saket should decide, and each cut icon keeps its word beside it so nothing depends on the picture. The mockup draws strokes at 2.4, V2 specifies 2.0 (daylight check on device).
- Five tint pairs times two modes are new tokens.
- Odia at 1.5x and 2.0x, conjunct clipping and tabular figures on the real phone are M3 checks; the browser render proves none of them.
- Items marked "For Saket's review" change structure or need backend, native or human work and must not be built without his decision.
