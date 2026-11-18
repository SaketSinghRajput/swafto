# SETUP: device, test shop, reset, timing, recording rules

Status: DRAFT for Saket. Section 2 is a **requirement for the CTO team**: the reset path does not exist yet (nothing in `apps/mobile/src` offers a reset or a seeded test shop that I could find). Nothing below has been built or tested.

## 1. The device

| Item | Setting | Why |
|---|---|---|
| Phone | One test phone of the **target class** (the budget Android in `docs/handover/DEVICE-CHECKLIST.md`). **CTO to confirm which phone** and use the same phone and Android version as the M3 timed tasks, so M3 and M4 numbers compare | The target handset is a Rs 7,000 phone. The QA pass used a vivo I2219; a different, cheaper phone could be slower |
| App | **Test build only**, never the production build or the Play listing. Marked clearly (for example a "TEST" band on every screen) so no one mistakes it for the real thing | No real data may enter the live product |
| Network | **Off** (airplane mode, Wi-Fi off) during sessions | The product is offline-first, so it must work like this; nothing can reach a server; OTP and sync cannot send real messages |
| Account | A **test account** only (see REQ-5). The participant never types their own phone number | Their number must not enter any system |
| Shop | Seeded **Demo Kirana** (see section 3) | No real data |
| Text size | **The participant's own normal setting.** Ask in the screener or warm-up what size they use on their phone; set the test phone to match before they arrive, and write it on the sheet | Real use, not our choice. (The 2.0x layout defects are tested separately by the accessibility tester) |
| Brightness | **Maximum**, auto-brightness off | Shop daylight is the real condition |
| Theme | The app's default (do not pick light or dark for them) | |
| Screen timeout | 10 minutes; lock screen off | The phone must not lock mid-task |
| Notifications / Do not disturb | On (Do not disturb), SIM removed or calls blocked | No call may pop up on top of a timed task |
| Other apps | None open; the app launcher shows only what you want | |
| Battery | Above 60% and a power bank ready | |
| Screen protector, case | A plain case with grip | A cheap phone is held, not placed |
| Language of the phone | Set to the participant's first language, if the phone allows | |
| Stopwatch | **Not** on the test phone (see section 4) | |
| Developer options, USB debugging | Moderator keys and test mode only; no adb needed in the field | |

Place and light: in or next to the shop, off-peak. Sit beside the participant, slightly behind, so you can see the screen and hands but they are not performing for you. Phone held in hand as in real use, not on a stand. Count the glare: note if you move into shade.

## 2. Requirement for the CTO: a reset path (do NOT rely on uninstall)

**Why:** each participant must start from the same first-launch state, and tasks may fail mid-session. Uninstalling and reinstalling takes minutes, needs a laptop and cable, and breaks the flow. A closed day is frozen by a database trigger (D7), and entries are append-only (D1), so a moderator cannot "undo" a session by hand.

**Requirements** (acceptance in the right-hand column):

| ID | Requirement | Acceptance |
|---|---|---|
| REQ-1 | **Checkpoints, loadable on the phone with no laptop.** R1 first launch, nothing saved; R2 seeded day for T1; R2b seeded day with T1 entry present (for T2 recovery); R3 day ready to close (T1 to T5 entries all present); R4 same as R3 but app language English (for T7). Optional: R5 closed day, to see the locked state | Each loads in 30 s or less, from a moderator-only screen, with no adb, no laptop, no uninstall |
| REQ-2 | **Moderator-only entry** (a long press or a code that a participant cannot stumble on). Not shown in any screen a participant sees | A participant cannot reach it in a normal session |
| REQ-3 | **Hard wipe, not an edit.** Reset drops the whole local database and the app's local settings (language, onboarding state, consents given in the app), then reseeds. It **does not** try to update or delete rows in an append-only or frozen table (D1, D7). Reset also clears the unsynced queue and the "waiting to sync" counter | After reset, no entry from the previous participant is readable anywhere in the app |
| REQ-4 | **Test build only.** The reset and seed path is compiled out of, or never ships in, the production build. If any repo check (`check:all`) needs an allowlist entry to permit it, that entry carries a written reason. No check is weakened. Run `npm run check:all` and `npx vitest run`, and `prove:verifiers` if a check changes | The release APK contains no way to wipe data |
| REQ-5 | **Test sign-in, offline, no real number.** The first-launch flow in the app asks for a phone number and a code. In the test build this must work with a fixed test number and code printed on a card, with the network off. The participant types the test number, not their own. **No SMS is sent** | T0 can be run offline, end to end, with no real data typed |
| REQ-6 | **Outbound actions are inert in the test build:** "Remind on WhatsApp", "Share statement", accountant export, any share sheet: either disabled or going to a dead-end. A participant who types a real phone number must not cause a real message | No outbound message can be sent from a test build |
| REQ-7 | **State proof screen.** The moderator screen shows: checkpoint id, build id, today's date, the shop name, opening cash, number of entries, language, and "network: off". A **checksum** or short code is enough | The moderator can confirm before handing over the phone that the state is right |
| REQ-8 | **Seed relative to the phone's date.** Seed values (below) must be written for "today" on the phone, so the date-mismatch notice (QA-06) does not appear and the day is open | Seeding on any date puts an open day on that date |
| REQ-9 | **Shop day times set to avoid midnight cases** (the shop's own day start, per decision 1 of 2026-10-22), so sessions at any time of day fall in the seeded open day | Sessions at 11:00 and at 17:00 both show the same open day |
| REQ-10 | **Customer names in the participant's script.** The seeded customers appear as "Ramesh" and "Sunita" in English, "ରମେଶ", "ସୁନୀତା" in Odia, and "रमेश", "सुनीता" in Hindi, according to the session language (or CTO says if the app cannot) | The names read natively on the screen |
| REQ-11 | **A visible "TEST" marker** on every screen of the test build | Cannot be mistaken for a live shop |

CTO to answer: can this be done before M4? Where is the data layer reset hook best placed? Who owns the seed file (suggested: one JSON or TypeScript fixture, versioned, with money in **integer paise** like everything else)? Do not use floats; the money rules apply to fixtures and tests.

**Until REQ-1 exists, the fall-back is poor and slow:** `adb shell pm clear <package>` plus a seed script from a laptop between participants. That means a laptop, a cable and 2 to 3 minutes per reset and every task failure. It also needs the test account route in REQ-5. Do not run the sessions on a phone that holds any real account. Do not uninstall (the build must stay).

## 3. The seeded test shop: "Demo Kirana"

All values below are **test fixtures**, proposed, not measured. Amounts in rupees here (store as paise).

| Item | Value |
|---|---|
| Shop name | Demo Kirana |
| Customers | Ramesh, Sunita, and three fillers (suggest: Geeta, Bijay, Anita) so the list is not two names |
| Ramesh's balance | Rs 500 owed |
| Sunita's balance | Rs 1,270 owed, from two earlier udhar entries on different days (so it must be derived, not a single number typed) |
| Fillers | Small balances or zero, none equal to 1,270 |
| Opening cash today | Rs 2,000, from yesterday's closed day |
| Today | Open, with no entries |
| UPI, purchases, expenses, adjustments | none yet |
| Suppliers | one or two named suppliers, in case a participant opens "pay" |
| Day-close | all sections empty |
| Language of the app | the participant's first language |
| Consent state in the app | none given (so T0 shows the real first-time flow) |

Checkpoints R1 to R4 are defined in `TASKS.md` and in REQ-1. Expected cash at T6 is 2,280 and the participant "counts" 2,270.

**No real data, ever:** do not import a real shop's data, real customer names or a real phone number. Do not seed with any person's real name. If a participant starts typing real names, see `SCRIPT.md` section 7.

## 4. How to time (stopwatch)

Timing is on a **separate stopwatch**, not on the test phone and not by counting in your head.

- Use a cheap digital stopwatch or a second phone's stopwatch with lap function. Test it before the visit.
- **Start** at "start", with the phone in their hand and the card in front of them.
- **Stop** at the moments defined in `TASKS.md` (entry shown as saved; participant says the figure; day shown closed).
- One lap per task. Write the time on the sheet immediately; do not rely on memory.
- If you cannot stop in time, write "about" and the moment, and use the recording to re-time later (if they said yes to screen recording). Mark the **source**: `SW` or `REC`.
- Precision is about 1 second. The 10-second targets (T1, T4) are therefore at the edge of stopwatch accuracy. Report these two times as "whole seconds".
- Do not tell them the time or the target. Do not hurry them. The targets are ours, not theirs.
- A single moderator cannot moderate, write and time at the same time. **Strongly recommended: a note-taker** (a second person, with the participant's agreement, who sits behind). If alone: time only T1, T3, T4 and T6 with the stopwatch, and write other notes after each task during the SEQ question.

## 5. Photo, video and recording rules

These follow the consent boxes in `CONSENT.md`. Nothing is recorded without that participant's tick for that item.

| Rule | Detail |
|---|---|
| **Hands and screen only** | Frame the phone and the hands. No face. Shoot from behind and slightly above the shoulder. If the face enters the frame, stop and re-frame |
| **Faces only if separately consented** | Box (6) in the consent is separate and defaults to No. Without a tick for (6), nothing with a face is kept: delete at once any frame that has a face |
| **No bystanders** | No customers, passers-by or staff in frame or in the audio. Pause the recorder if someone comes to the counter |
| **No paper books, signboards, price lists, ID cards, UPI QR codes** | These carry other people's data or the shop's identity. If one is in the frame, re-frame, do not use it |
| **No real data on the screen** | If the participant typed a real name or number, delete that clip |
| **Screen recording** | The phone's own recorder or a second phone. It records taps. Check that no notification showing a real phone number is visible |
| **Voice recording** | Separate recorder. Only after the tick |
| **Naming** | Files named `P03_T1_screen.mp4`. No names in filenames |
| **Where it goes** | Move the files to [SECURE STORE] the same day, then delete from the recording device. No WhatsApp, no personal Google Drive, no cloud AI or auto-transcription service. If transcription is needed, use a local tool only, after Saket agrees |
| **Retention** | As in the consent form (PROPOSED 60 days after the report, no later than [DATE]). Keep a deletion log: file, date, who |
| **Withdrawal** | If a participant withdraws, delete their recordings and notes within the promised days, update the deletion log, tell them |
| **Stills for the report** | Only from consented clips, only hands and screen, with no real data, and with the participant's tick on box (5) |

## 6. Where the participant's name and phone number live

One sheet, kept **separately** (paper or an encrypted file), with: P-number, name or nickname, phone number, visit date, thank-you paid (yes/no, date), consent copy given (yes/no). Never in the observation sheet, the recordings, the quotes, the synthesis, or a shared chat. Delete the number as stated in the consent form (PROPOSED 30 days after payment). Keep the signed consent tick sheets with this sheet.

## 7. Kit to bring (checklist)

- [ ] Test phone, charged, state R1 confirmed on the moderator screen, TEST marker visible
- [ ] Power bank, plain case
- [ ] Stopwatch (tested) and a spare
- [ ] Printed: consent in the participant's language (2 copies, one to leave), tick sheet, screener answers sheet, observation sheet with P-number, task cards (digits only), SEQ card, short-form card, test sign-in card
- [ ] Pens, clipboard, small bag for paper
- [ ] Second phone or recorder, a small clip or tripod, and a cloth to clean the screen
- [ ] Thank-you [AMOUNT TBD BY SAKET] in small notes, a simple receipt
- [ ] Contact number and grievance contact written on the leave-behind copy
- [ ] A water bottle and patience: shops are busy
- [ ] Offline copy of this kit (no signal in some markets)

## 8. After each participant (5 minutes)

1. Turn off recorders. Move files; delete originals.
2. Load R1 (reset). Confirm on the state proof screen.
3. Write the 5-line first impressions on the sheet (see `OBSERVATION-SHEET.md` I).
4. Put the name and phone sheet away from the observation sheets.
5. Note build bugs in a list for the CTO (file them through the normal bug-report route, not in the synthesis).
