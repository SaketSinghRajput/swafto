/**
 * THE SCREEN COPY, IN THREE LANGUAGES - AND A FOURTH THAT IS NOT A LANGUAGE.
 *
 * ODIA AND HINDI HERE ARE DRAFTS AND ARE MARKED AS SUCH. Nobody on this build reads
 * Odia. A translation that looks plausible to someone who cannot read it is exactly
 * the artifact this project has refused to produce elsewhere (H10, the SMS
 * templates), so the same rule applies: these strings render, they are laid out
 * against, and they are NOT approved copy. `reviewState` says so in the data rather
 * than in a comment, so a check can read it and HUMAN-ACTIONS can count it.
 *
 * WHY A FOURTH "LANGUAGE". `longest` is a pseudo-locale that returns, for each key
 * independently, whichever of the three real strings is longest. No shop will ever
 * run it. It exists because a layout proven in English and spot-checked in Hindi is
 * a layout that breaks on the one Odia label that happens to be longer than both -
 * and testing "all three languages" one at a time does not catch the combination
 * where several long labels land on the same row. This does, in one render.
 *
 * It is deliberately not the same as "the Odia column", which would be the tempting
 * shortcut. Odia is usually longest but not always, and a per-key maximum is the
 * only honest upper bound on what the layout must survive.
 */
export type Language = 'en' | 'hi' | 'or';

/** The pseudo-locale is addressable but is not a Language: no shop can be set to it. */
export type RenderLanguage = Language | 'longest';

export interface Phrase {
  readonly en: string;
  readonly hi: string;
  readonly or: string;
}

/**
 * Drafted, not approved. Every Odia and Hindi string in this file carries this
 * state until a native reader signs it off; HUMAN-ACTIONS H10 tracks that.
 */
export const COPY_REVIEW_STATE = 'DRAFT-PENDING-NATIVE-REVIEW' as const;

export const STRINGS = {
  'formA.title': {
    en: 'Sales',
    hi: 'बिक्री',
    or: 'ବିକ୍ରି',
  },
  'formA.amount': {
    en: 'Amount',
    hi: 'रकम',
    or: 'ପରିମାଣ',
  },
  'formA.mode.cash': {
    en: 'Cash',
    hi: 'नकद',
    or: 'ନଗଦ',
  },
  'formA.mode.upi': {
    en: 'UPI',
    hi: 'UPI',
    or: 'UPI',
  },
  'formA.mode.udhar': {
    en: 'Udhar',
    hi: 'उधार',
    or: 'ଉଧାର',
  },
  'formA.customer': {
    en: 'Customer',
    hi: 'ग्राहक',
    or: 'ଗ୍ରାହକ',
  },
  'formA.runningTotal': {
    en: 'Total so far',
    hi: 'अब तक कुल',
    or: 'ଏପର୍ଯ୍ୟନ୍ତ ମୋଟ',
  },
  'formA.add': {
    en: 'Add line',
    hi: 'लाइन जोड़ें',
    or: 'ଧାଡ଼ି ଯୋଡ଼ନ୍ତୁ',
  },
  'formA.empty': {
    en: 'No sales entered yet today',
    hi: 'आज अभी तक कोई बिक्री दर्ज नहीं',
    or: 'ଆଜି ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ବିକ୍ରି ଲେଖା ହୋଇନାହିଁ',
  },
  'formA.loading': {
    en: 'Opening the day',
    hi: 'दिन खोला जा रहा है',
    or: 'ଦିନ ଖୋଲାଯାଉଛି',
  },
  'formA.error': {
    en: 'Could not open the day. Nothing you entered is lost.',
    hi: 'दिन नहीं खुल सका। आपका दर्ज किया कुछ भी नहीं गया।',
    or: 'ଦିନ ଖୋଲିପାରିଲା ନାହିଁ। ଆପଣ ଲେଖିଥିବା କିଛି ହଜିନାହିଁ।',
  },
  'formA.retry': {
    en: 'Try again',
    hi: 'फिर कोशिश करें',
    or: 'ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ',
  },
  'keypad.clear': {
    en: 'Clear',
    hi: 'मिटाएँ',
    or: 'ଖାଲି କରନ୍ତୁ',
  },
  'keypad.back': {
    en: 'Back',
    hi: 'पीछे',
    or: 'ପଛକୁ',
  },
  /*
   * The keypad's delete key, spoken. NOT "Back": the header's navigate-back
   * already says that, and TalkBack read the same word for opposite actions on
   * every keypad screen. The reference labels it "Delete digit"
   * (Phone.dc.html:1246). hi/or are DRAFT, awaiting the native review (H13).
   */
  'keypad.delete': {
    en: 'Delete last digit',
    hi: 'आखिरी अंक मिटाएँ',
    or: 'ଶେଷ ଅଙ୍କ ଲିଭାନ୍ତୁ',
  },

  /* ---- shared by every screen frame -------------------------------- */
  'common.loading': { en: 'Opening', hi: 'खुल रहा है', or: 'ଖୋଲୁଛି' },
  'common.error': {
    en: 'Could not open this. Nothing you entered is lost.',
    hi: 'यह नहीं खुल सका। आपका दर्ज किया कुछ भी नहीं गया।',
    or: 'ଏହା ଖୋଲିପାରିଲା ନାହିଁ। ଆପଣ ଲେଖିଥିବା କିଛି ହଜିନାହିଁ।',
  },
  'common.retry': { en: 'Try again', hi: 'फिर कोशिश करें', or: 'ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ' },
  /* The top-level error screen (ErrorBoundary). Nothing is lost: the book is in the phone's database. */
  'crash.title': { en: 'Something went wrong', hi: 'कुछ गड़बड़ हो गई', or: 'କିଛି ଗୋଟିଏ ଭୁଲ ହୋଇଗଲା' },
  'crash.body': {
    en: 'Your entries are safe on this phone. Please restart the app.',
    hi: 'आपकी एंट्री इस फ़ोन में सुरक्षित हैं। कृपया ऐप दोबारा शुरू करें।',
    or: 'ଆପଣଙ୍କ ଏଣ୍ଟ୍ରି ଏହି ଫୋନରେ ସୁରକ୍ଷିତ ଅଛି। ଦୟାକରି ଆପ୍ ପୁଣି ଆରମ୍ଭ କରନ୍ତୁ।',
  },
  'crash.restart': { en: 'Restart', hi: 'दोबारा शुरू करें', or: 'ପୁଣି ଆରମ୍ଭ କରନ୍ତୁ' },
  /* A refused write, said out loud. It used to land in a field nothing drew. */
  'refusal.title': { en: 'Not saved', hi: 'सहेजा नहीं गया', or: 'ସଞ୍ଚୟ ହେଲା ନାହିଁ' },
  // HT-43: the heading when nothing was being saved (a reminder, a share). hi / or DRAFT, H13.
  'refusal.titleNotDone': { en: 'Could not do that', hi: 'यह नहीं हो सका', or: 'ଏହା ହୋଇପାରିଲା ନାହିଁ' },
  'refusal.amount': { en: 'Type an amount first.', hi: 'पहले रकम लिखें।', or: 'ପ୍ରଥମେ ରାଶି ଲେଖନ୍ତୁ।' },
  /*
   * QA-04 (CTO decision, 2026-11-18): AN ENTRY OF Rs 0 IS NOT AN ENTRY. Points at
   * the day-close list's "Nothing to enter" (`t5.skip`), which is how a section
   * with nothing in it is recorded. hi / or are a DRAFT (H13).
   */
  'refusal.amountZero': {
    en: 'An amount of ₹0 is not saved. If there is nothing to enter, tap "Nothing to enter" on the day-close list.',
    hi: '₹0 की रकम सहेजी नहीं जाती। अगर दर्ज करने को कुछ नहीं है, तो दिन बंद करने की सूची में "दर्ज करने को कुछ नहीं" दबाएँ।',
    or: '₹0 ରାଶି ସଞ୍ଚୟ ହୁଏ ନାହିଁ। ଯଦି ଲେଖିବାକୁ କିଛି ନାହିଁ, ଦିନ ବନ୍ଦ ତାଲିକାରେ "ଲେଖିବାକୁ କିଛି ନାହିଁ" ଦାବନ୍ତୁ।',
  },
  /*
   * QA-06 (CTO decision, 2026-11-18): THE PHONE'S DATE IS BEHIND THE BOOK'S OPEN
   * DAY. Same calm words as `t1.future.body` without the date, for the refusal
   * banner, as `refusal.dayStale` is to `t1.stale.body`. hi / or are a DRAFT (H13).
   */
  'refusal.dayFuture': {
    en: "This phone's date looks wrong. Your book is ahead of today. Nothing is lost. Check the phone's date and time.",
    hi: 'इस फ़ोन की तारीख़ गलत लगती है। आपकी बही आज से आगे है। कुछ भी खोया नहीं है। फ़ोन की तारीख़ और समय जाँचें।',
    or: 'ଏହି ଫୋନର ତାରିଖ ଭୁଲ ଲାଗୁଛି। ଆପଣଙ୍କ ଖାତା ଆଜିଠାରୁ ଆଗରେ। କିଛି ହଜିନାହିଁ। ଫୋନର ତାରିଖ ଓ ସମୟ ଯାଞ୍ଚ କରନ୍ତୁ।',
  },
  /*
   * QA-03 (CTO decision, 2026-11-18): A COLLECTION OR PAYMENT ABOVE WHAT IS OWED
   * IS ASKED ABOUT, NEVER REFUSED AND NEVER SILENT. {extra} is the excess, filled
   * as formatted money. Confirmed, it is kept as an advance: the shop then owes
   * that person. hi / or are a DRAFT (H13).
   */
  'advance.confirm': {
    en: 'This is {extra} more than they owe. Record {extra} as advance?',
    hi: 'यह उनके बकाया से {extra} ज़्यादा है। {extra} को अग्रिम के रूप में दर्ज करें?',
    or: 'ଏହା ସେମାନଙ୍କ ବକେୟାଠାରୁ {extra} ଅଧିକ। {extra} କୁ ଅଗ୍ରୀମ ଭାବରେ ଲେଖିବେ?',
  },
  'advance.yes': { en: 'Record as advance', hi: 'अग्रिम दर्ज करें', or: 'ଅଗ୍ରୀମ ଲେଖନ୍ତୁ' },
  'advance.no': { en: 'No, go back', hi: 'नहीं, पीछे जाएँ', or: 'ନା, ପଛକୁ ଯାଆନ୍ତୁ' },
  'advance.label': { en: 'Advance', hi: 'अग्रिम', or: 'ଅଗ୍ରୀମ' },
  /*
   * C-09: THE PER-ENTRY CEILING (Rs 1 crore). The figure is in the words rather
   * than filled in, so the string cannot disagree with ENTRY_MAX_PAISE by
   * formatting. hi / or are a DRAFT (H13) - not reviewed by a native reader.
   */
  'refusal.amountTooLarge': {
    en: 'One entry can be at most ₹1 crore. Check the digits.',
    hi: 'एक एंट्री अधिकतम ₹1 करोड़ की हो सकती है। अंक जाँचें।',
    or: 'ଗୋଟିଏ ଏଣ୍ଟ୍ରି ଅଧିକରୁ ଅଧିକ ₹1 କୋଟି ହୋଇପାରିବ। ଅଙ୍କ ଯାଞ୍ଚ କରନ୍ତୁ।',
  },
  /*
   * C-17: AN OPEN BOOK WHOSE DAY HAS ENDED. Calm, not an alarm; the action goes
   * to day close. `refusal.dayStale` is the same words without the date, for
   * the refusal banner. C-19: a book dated ahead of the phone's clock.
   * hi / or are a DRAFT (H13).
   */
  't1.stale.body': {
    en: 'This book is still open for {date}. Close it to start today.',
    hi: 'यह बही अभी {date} के लिए खुली है। आज शुरू करने के लिए इसे बंद करें।',
    or: 'ଏହି ଖାତା ଏବେ ବି {date} ପାଇଁ ଖୋଲା ଅଛି। ଆଜି ଆରମ୍ଭ କରିବାକୁ ଏହାକୁ ବନ୍ଦ କରନ୍ତୁ।',
  },
  't1.stale.action': { en: 'Close it now', hi: 'अभी बंद करें', or: 'ବର୍ତ୍ତମାନ ବନ୍ଦ କରନ୍ତୁ' },
  'refusal.dayStale': {
    en: 'This book is still open for an earlier day. Close it to start today.',
    hi: 'यह बही अभी पिछले दिन के लिए खुली है। आज शुरू करने के लिए इसे बंद करें।',
    or: 'ଏହି ଖାତା ଏବେ ବି ପୂର୍ବ ଦିନ ପାଇଁ ଖୋଲା ଅଛି। ଆଜି ଆରମ୍ଭ କରିବାକୁ ଏହାକୁ ବନ୍ଦ କରନ୍ତୁ।',
  },
  't1.future.body': {
    en: "This phone's date looks wrong. Your book is on {date}, which is ahead of today. Nothing is lost. Check the phone's date and time.",
    hi: 'इस फ़ोन की तारीख़ गलत लगती है। आपकी बही {date} पर है, जो आज से आगे है। कुछ भी खोया नहीं है। फ़ोन की तारीख़ और समय जाँचें।',
    or: 'ଏହି ଫୋନର ତାରିଖ ଭୁଲ ଲାଗୁଛି। ଆପଣଙ୍କ ଖାତା {date} ରେ ଅଛି, ଯାହା ଆଜିଠାରୁ ଆଗରେ। କିଛି ହଜିନାହିଁ। ଫୋନର ତାରିଖ ଓ ସମୟ ଯାଞ୍ଚ କରନ୍ତୁ।',
  },
  // C-19: a closed day saved under a wrong phone date. hi / or DRAFT, H13.
  't1.misdated.body': {
    en: 'One day was saved under a wrong phone date ({date}). It is kept as recorded.',
    hi: 'एक दिन फ़ोन की गलत तारीख़ ({date}) के साथ सहेजा गया था। वह जैसा दर्ज हुआ वैसा ही रखा गया है।',
    or: 'ଗୋଟିଏ ଦିନ ଫୋନର ଭୁଲ ତାରିଖ ({date}) ସହ ସାଇତା ହୋଇଥିଲା। ଏହା ଯେପରି ଲେଖାଯାଇଥିଲା ସେହିପରି ରଖାଯାଇଛି।',
  },
  // C-19 residual: today's book was closed under a wrong phone date. hi / or DRAFT, H13.
  't3.wrongDate.body': {
    en: "Today's book ({date}) was already closed earlier, while the phone's date was wrong. New entries can start again tomorrow.",
    hi: 'आज की बही ({date}) पहले ही बंद हो चुकी थी, जब फ़ोन की तारीख़ गलत थी। नई एंट्री कल से फिर शुरू हो सकती है।',
    or: 'ଆଜିର ଖାତା ({date}) ଆଗରୁ ବନ୍ଦ ହୋଇସାରିଥିଲା, ଯେତେବେଳେ ଫୋନର ତାରିଖ ଭୁଲ ଥିଲା। ନୂଆ ଏଣ୍ଟ୍ରି କାଲିଠାରୁ ପୁଣି ଆରମ୍ଭ ହୋଇପାରିବ।',
  },
  'refusal.dayClosedWrongDate': {
    en: "Today's book was already closed earlier, while the phone's date was wrong. New entries can start again tomorrow.",
    hi: 'आज की बही पहले ही बंद हो चुकी थी, जब फ़ोन की तारीख़ गलत थी। नई एंट्री कल से फिर शुरू हो सकती है।',
    or: 'ଆଜିର ଖାତା ଆଗରୁ ବନ୍ଦ ହୋଇସାରିଥିଲା, ଯେତେବେଳେ ଫୋନର ତାରିଖ ଭୁଲ ଥିଲା। ନୂଆ ଏଣ୍ଟ୍ରି କାଲିଠାରୁ ପୁଣି ଆରମ୍ଭ ହୋଇପାରିବ।',
  },
  // FE-11: rows the server refused, parked. hi / or DRAFT, H13.
  't1.parked': {
    en: '{n} could not be sent - contact us',
    hi: '{n} भेजा नहीं जा सका - हमसे संपर्क करें',
    or: '{n} ପଠାଯାଇପାରିଲା ନାହିଁ - ଆମକୁ ଜଣାନ୍ତୁ',
  },
  'refusal.partyId': { en: 'Choose the person first.', hi: 'पहले व्यक्ति चुनें।', or: 'ପ୍ରଥମେ ବ୍ୟକ୍ତି ବାଛନ୍ତୁ।' },
  'refusal.consent': {
    en: 'Could not reach the server, so your choice was not changed. Try again with signal.',
    hi: 'सर्वर से संपर्क नहीं हुआ, आपकी पसंद नहीं बदली। नेटवर्क मिलने पर फिर कोशिश करें।',
    or: 'ସର୍ଭର ସହ ଯୋଗାଯୋଗ ହେଲା ନାହିଁ, ଆପଣଙ୍କ ପସନ୍ଦ ବଦଳିଲା ନାହିଁ। ନେଟୱର୍କ ମିଳିଲେ ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
  },
  'refusal.other': {
    en: 'Nothing was recorded. Check and try again.',
    hi: 'कुछ दर्ज नहीं हुआ। जाँचकर फिर कोशिश करें।',
    or: 'କିଛି ଲେଖା ହେଲା ନାହିଁ। ଯାଞ୍ଚ କରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
  },
  /*
   * F-22: deleting the account did not happen, said as plainly. Each says
   * NOTHING WAS DELETED, because that is true and is what he needs to know.
   * hi / or are a DRAFT (H13).
   */
  'refusal.erase': {
    en: 'The server did not accept the request, so nothing was deleted. Try again later.',
    hi: 'सर्वर ने अनुरोध स्वीकार नहीं किया, इसलिए कुछ नहीं मिटा। बाद में फिर कोशिश करें।',
    or: 'ସର୍ଭର ଅନୁରୋଧ ଗ୍ରହଣ କଲା ନାହିଁ, ତେଣୁ କିଛି ମିଟିଲା ନାହିଁ। ପରେ ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
  },
  'refusal.eraseOffline': {
    en: 'No connection, so nothing was deleted - not on this phone and not on our server. Try again with signal.',
    hi: 'नेटवर्क नहीं है, इसलिए कुछ नहीं मिटा - न इस फ़ोन पर, न हमारे सर्वर पर। नेटवर्क मिलने पर फिर कोशिश करें।',
    or: 'ନେଟୱର୍କ ନାହିଁ, ତେଣୁ କିଛି ମିଟିଲା ନାହିଁ - ଏହି ଫୋନରେ ନୁହେଁ, ଆମ ସର୍ଭରରେ ମଧ୍ୟ ନୁହେଁ। ନେଟୱର୍କ ମିଳିଲେ ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
  },
  'refusal.eraseSignIn': {
    en: 'Your sign-in has expired, so nothing was deleted. Sign in again, then delete.',
    hi: 'आपका साइन इन खत्म हो गया है, इसलिए कुछ नहीं मिटा। फिर से साइन इन करें, फिर मिटाएँ।',
    or: 'ଆପଣଙ୍କ ସାଇନ୍ ଇନ୍ ଶେଷ ହୋଇଯାଇଛି, ତେଣୁ କିଛି ମିଟିଲା ନାହିଁ। ପୁଣି ସାଇନ୍ ଇନ୍ କରି ତା ପରେ ମିଟାନ୍ତୁ।',
  },
  'refusal.eraseLocal': {
    en: 'The book on this phone could not be cleared, so it is still here. Press Delete everything again.',
    hi: 'इस फ़ोन की बही साफ़ नहीं हो सकी, वह अभी भी यहीं है। "सब कुछ मिटाएँ" फिर दबाएँ।',
    or: 'ଏହି ଫୋନର ଖାତା ସଫା ହୋଇପାରିଲା ନାହିଁ, ତାହା ଏବେ ବି ଏଠାରେ ଅଛି। "ସବୁ ମିଟାନ୍ତୁ" ପୁଣି ଦବାନ୍ତୁ।',
  },
  /* HT-31: the consent screen could not be loaded. hi / or are a DRAFT (H13). */
  'refusal.consentRead': {
    en: 'Could not reach the server, so what you agreed to cannot be shown. Try again with signal.',
    hi: 'सर्वर से जुड़ नहीं सके, इसलिए आपकी दी हुई सहमति नहीं दिख सकती। नेटवर्क मिलने पर फिर कोशिश करें।',
    or: 'ସର୍ଭର ସହ ଯୋଗାଯୋଗ ହେଲା ନାହିଁ, ତେଣୁ ଆପଣ କଣ ରାଜି ହୋଇଛନ୍ତି ଦେଖାଯାଇପାରିବ ନାହିଁ। ନେଟୱର୍କ ମିଳିଲେ ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
  },
  /* HT-13: a sign-in with a number that is not this book's. hi / or are a DRAFT (H13). */
  'refusal.wrongShop': {
    en: 'The book on this phone belongs to a different number, so you were not signed in. Sign in with that number.',
    hi: 'इस फ़ोन की बही किसी दूसरे नंबर की है, इसलिए साइन इन नहीं हुआ। उसी नंबर से साइन इन करें।',
    or: 'ଏହି ଫୋନର ଖାତା ଅନ୍ୟ ଏକ ନମ୍ବରର, ତେଣୁ ସାଇନ୍ ଇନ୍ ହେଲା ନାହିଁ। ସେହି ନମ୍ବରରେ ସାଇନ୍ ଇନ୍ କରନ୍ତୁ।',
  },
  'refusal.openUrl': {
    en: 'This page could not be opened. Check that a web browser is installed.',
    hi: 'यह पेज नहीं खुल सका। देखें कि फ़ोन में वेब ब्राउज़र है।',
    or: 'ଏହି ପେଜ ଖୋଲିପାରିଲା ନାହିଁ। ଫୋନରେ ୱେବ ବ୍ରାଉଜର ଅଛି କି ଦେଖନ୍ତୁ।',
  },
  'common.empty': { en: 'Nothing here yet', hi: 'अभी यहाँ कुछ नहीं', or: 'ଏଠାରେ ଏପର୍ଯ୍ୟନ୍ତ କିଛି ନାହିଁ' },
  'common.save': { en: 'Save', hi: 'सहेजें', or: 'ସଞ୍ଚୟ କରନ୍ତୁ' },
  /**
   * BACK IS A WORD, NOT AN ARROW, AND THAT IS DELIBERATE.
   *
   * A glyph has to come from somewhere. The Anek faces are bundled precisely
   * because a budget handset may carry no Odia font at all (DC-004), and a back
   * chevron borrowed from whatever fallback the handset happens to have is the
   * same missing-glyph risk the money had - a box where the way out should be.
   * The word is in the font this app ships.
   */
  'common.back': { en: 'Back', hi: 'पीछे', or: 'ପଛକୁ ଯାଆନ୍ତୁ' },
  /** The commit key on an entry form - the words on the one marigold key. */
  'common.add': { en: 'Add', hi: 'जोड़ें', or: 'ଯୋଡ଼ନ୍ତୁ' },
  /*
   * THE FOUR TABS. Named `nav.*` rather than reusing `t1.title` and `p1.title`,
   * because a tab label and a screen title are different jobs that happen to
   * agree today: a tab has one line at the foot of every screen, a title has a
   * canvas to itself. The day one of them needs shortening, a shared key would
   * shorten both.
   */
  'nav.today': { en: 'Today', hi: 'आज', or: 'ଆଜି' },
  'nav.parties': { en: 'Ledger', hi: 'खाता', or: 'ଖାତା' },
  'nav.reports': { en: 'Reports', hi: 'रिपोर्ट', or: 'ରିପୋର୍ଟ' },
  /*
   * NOT A FOURTH TAB. SPEC-DIGEST C-5 rules three - Today, Parties, Reports -
   * and this is the Today canvas affordance that reaches settings instead.
   */
  'nav.settings': { en: 'Settings', hi: 'सेटिंग', or: 'ସେଟିଂ' },

  /* ---- the nine sections of the paper sheet -------------------------- */
  'section.cash_sales': { en: 'Cash sales', hi: 'नकद बिक्री', or: 'ନଗଦ ବିକ୍ରି' },
  'section.upi_sales': { en: 'UPI sales', hi: 'UPI बिक्री', or: 'UPI ବିକ୍ରି' },
  'section.udhar_sales': { en: 'Credit sales', hi: 'उधार बिक्री', or: 'ଉଧାର ବିକ୍ରି' },
  'section.purchase': { en: 'Purchases', hi: 'खरीद', or: 'କିଣା' },
  'section.expense': { en: 'Expenses', hi: 'खर्च', or: 'ଖର୍ଚ୍ଚ' },
  'section.udhar_collection': { en: 'Udhar collected', hi: 'उधार वसूली', or: 'ଉଧାର ଆଦାୟ' },
  'section.party_payment': { en: 'Paid to suppliers', hi: 'आपूर्तिकर्ता को भुगतान', or: 'ଯୋଗାଣକାରୀଙ୍କୁ ଦିଆଗଲା' },
  'section.withdrawal': { en: 'Taken by owner', hi: 'मालिक ने लिया', or: 'ମାଲିକ ନେଇଛନ୍ତି' },

  /* ---- the ACT zone on Today ------------------------------------------
   *
   * SHORT, AND IN THE TENSE OF SOMETHING ABOUT TO HAPPEN.
   *
   * The `section.*` labels above name what a row of the day-close sheet
   * RECORDS, in the past: "Paid to suppliers". On a button the shopkeeper
   * presses before paying anybody, that is the wrong tense and the wrong
   * length - the Odia for it, `ଯୋଗାଣକାରୀଙ୍କୁ ଦିଆଗଲା`, ran 19px outside a
   * third-width button at font scale 1.5 and broke B31's zero-overflow rule
   * in the one language the product is least able to shorten by guessing.
   *
   * So each of these is the ROOT WORD of the section label it opens, kept
   * deliberately rather than invented: बिक्री from नकद बिक्री, खरीद from
   * खरीद, वसूली from उधार वसूली. The terminology cannot drift from the
   * summary rows, because it is the same vocabulary.
   *
   * STILL A DRAFT, like every other Hindi and Odia string here. H13 is open
   * and this does not close it.
   */
  'act.sale': { en: 'Sale', hi: 'बिक्री', or: 'ବିକ୍ରି' },
  'act.credit': { en: 'Udhar sale', hi: 'उधार बिक्री', or: 'ଉଧାର ବିକ୍ରି' },
  'act.purchase': { en: 'Purchase', hi: 'खरीद', or: 'କିଣା' },
  'act.expense': { en: 'Expense', hi: 'खर्च', or: 'ଖର୍ଚ୍ଚ' },
  'act.collect': { en: 'Collect', hi: 'वसूली', or: 'ଆଦାୟ' },
  'act.pay': { en: 'Pay', hi: 'भुगतान', or: 'ଦେୟ' },

  /* ---- T1 · Today, the front door ------------------------------------ */
  't1.title': { en: 'Today', hi: 'आज', or: 'ଆଜି' },
  't1.cashInHand': { en: 'Cash should be', hi: 'नकद होना चाहिए', or: 'ନଗଦ ରହିବା ଉଚିତ' },
  't1.empty': {
    en: 'Nothing entered yet today. Start with a sale.',
    hi: 'आज अभी कुछ दर्ज नहीं। बिक्री से शुरू करें।',
    or: 'ଆଜି ଏପର୍ଯ୍ୟନ୍ତ କିଛି ଲେଖା ହୋଇନାହିଁ। ବିକ୍ରିରୁ ଆରମ୍ଭ କରନ୍ତୁ।',
  },
  't1.closeDay': { en: 'Close the day', hi: 'दिन बंद करें', or: 'ଦିନ ବନ୍ଦ କରନ୍ତୁ' },
  't1.profit': { en: 'Estimated profit', hi: 'अनुमानित लाभ', or: 'ଆନୁମାନିକ ଲାଭ' },

  /* ---- T5 · the nine-section day close list -------------------------- */
  't5.title': { en: 'Day close', hi: 'दिन बंद', or: 'ଦିନ ବନ୍ଦ' },
  't5.total': { en: 'Day total', hi: 'दिन का कुल', or: 'ଦିନର ମୋଟ' },

  /* ---- T6 · opening cash --------------------------------------------- */
  't6.title': { en: 'Opening cash', hi: 'शुरुआती नकद', or: 'ଆରମ୍ଭ ନଗଦ' },
  't6.prompt': {
    en: 'How much cash is in the box before you start?',
    hi: 'शुरू करने से पहले बॉक्स में कितना नकद है?',
    or: 'ଆରମ୍ଭ କରିବା ପୂର୍ବରୁ ବାକ୍ସରେ କେତେ ନଗଦ ଅଛି?',
  },

  /* ---- T8 · Form B, a party and an amount ---------------------------- */
  /* Short, because it is a TITLE at up to 1.5x on a 360dp screen. The long form
     wrapped to four lines in Focus mode and pushed the keypad off the bottom. */
  't8.title': { en: 'Udhar book', hi: 'उधार खाता', or: 'ଉଧାର ଖାତା' },
  /* Button labels are SHORT. A three-across row is about 100dp wide, and an Odia
     word longer than that cannot break - it overflows the button rather than
     wrapping inside it, which check:layout caught on this exact row. The full
     phrasing lives on the line the entry produces, where there is room for it. */
  't8.collect': { en: 'Collect', hi: 'वसूली', or: 'ଆଦାୟ' },
  't8.pay': { en: 'Pay supplier', hi: 'भुगतान', or: 'ଦେଲି' },
  't8.credit': { en: 'Udhar sale', hi: 'उधार बिक्री', or: 'ଉଧାର ବିକ୍ରି' },
  /* The headline on T8 is P7 - what customers OWE - not what was sold on credit
     today. It was labelled 'Credit sales', which named a different figure
     entirely. Caught while trimming the header to fit; wrong for longer. */
  't8.outstanding': { en: 'Owed to you', hi: 'आपको मिलना है', or: 'ଆପଣଙ୍କୁ ମିଳିବାର' },

  /* ---- T9 · Form C, a label and a mode ------------------------------- */
  't9.title': { en: 'Expense', hi: 'खर्च', or: 'ଖର୍ଚ୍ଚ' },
  't9.label': { en: 'What for?', hi: 'किसलिए?', or: 'କାହିଁକି?' },
  't9.mode.other': { en: 'Other', hi: 'अन्य', or: 'ଅନ୍ୟ' },
  't9.mode.shop_stock': { en: 'Shop stock', hi: 'दुकान माल', or: 'ଦୋକାନ ମାଲ' },

  /* ---- T10 · Form D, the owner taking money -------------------------- */
  't10.title': { en: 'Money you took', hi: 'आपने जो लिया', or: 'ଆପଣ ନେଇଥିବା ଟଙ୍କା' },
  't10.note': {
    en: 'This leaves the cash box but is not a shop cost, so it does not change profit.',
    hi: 'यह नकद से जाता है पर दुकान का खर्च नहीं, इसलिए लाभ नहीं बदलता।',
    or: 'ଏହା ନଗଦରୁ ଯାଏ କିନ୍ତୁ ଦୋକାନର ଖର୍ଚ୍ଚ ନୁହେଁ, ତେଣୁ ଲାଭ ବଦଳେ ନାହିଁ।',
  },

  /* ---- T11 · cash check, counting ------------------------------------ */
  't11.title': { en: 'Count the cash', hi: 'नकद गिनें', or: 'ନଗଦ ଗଣନ୍ତୁ' },
  't11.expected': { en: 'Should be', hi: 'होना चाहिए', or: 'ରହିବା ଉଚିତ' },
  't11.counted': { en: 'You counted', hi: 'आपने गिना', or: 'ଆପଣ ଗଣିଲେ' },

  /* ---- T12 · cash check, the difference ------------------------------ */
  't12.title': { en: 'The difference', hi: 'अंतर', or: 'ପାର୍ଥକ୍ୟ' },
  't12.difference': { en: 'Difference', hi: 'अंतर', or: 'ପାର୍ଥକ୍ୟ' },
  't12.reasonPrompt': {
    en: 'What do you think happened?',
    hi: 'आपको क्या लगता है हुआ?',
    or: 'ଆପଣ ଭାବୁଛନ୍ତି କଣ ହୋଇଛି?',
  },
  /*
   * The reasons are a FIXED LIST and the list depends on the sign. Short in the
   * box offers four, over offers three. `unknown` is what replaced the free-text
   * box (co-founder review 2026-10-22, decision 2): a shopkeeper who does not
   * know why is entitled to say so, and saying so must still be a value an
   * instrument can count rather than a sentence it cannot read.
   */
  't12.reason.change': { en: 'Gave change from my pocket', hi: 'अपनी जेब से छुट्टा दिया', or: 'ନିଜ ପକେଟରୁ ଖୁଚୁରା ଦେଲି' },
  't12.reason.missed': { en: 'Forgot to write something', hi: 'कुछ लिखना भूल गया', or: 'କିଛି ଲେଖିବାକୁ ଭୁଲିଗଲି' },
  't12.reason.sale': { en: 'Forgot to write a sale', hi: 'कोई बिक्री लिखना भूल गया', or: 'ଗୋଟିଏ ବିକ୍ରି ଲେଖିବାକୁ ଭୁଲିଗଲି' },
  't12.reason.miscount': { en: 'Counted wrong', hi: 'गिनती में गलती', or: 'ଗଣିବାରେ ଭୁଲ' },
  't12.reason.unknown': { en: "Don't know", hi: 'पता नहीं', or: 'ଜାଣିନାହିଁ' },
  /*
   * HT-23 (product owner, 2026-10-25): SHORT IN THE BOX IS CHECKED, THEN IT IS A
   * LOSS. The four short-side causes above are no longer offered - they stay so a
   * day closed with one still reads. hi / or are a DRAFT (H13).
   */
  't12.check.prompt': {
    en: 'Before you record this, check two things:',
    hi: 'दर्ज करने से पहले दो चीज़ें जाँचें:',
    or: 'ଲେଖିବା ପୂର୍ବରୁ ଦୁଇଟି କଥା ଯାଞ୍ଚ କରନ୍ତୁ:',
  },
  't12.check.payments': {
    en: '1. Open your UPI or payment app. Is every payment there written here too - as UPI, not as cash?',
    hi: '1. अपना UPI या पेमेंट ऐप खोलें। क्या वहाँ का हर भुगतान यहाँ भी लिखा है - UPI में, नकद में नहीं?',
    or: '1. ଆପଣଙ୍କ UPI ବା ପେମେଣ୍ଟ ଆପ୍ ଖୋଲନ୍ତୁ। ସେଠାର ପ୍ରତ୍ୟେକ ପେମେଣ୍ଟ ଏଠାରେ ବି ଲେଖାଯାଇଛି କି - UPI ରେ, ନଗଦରେ ନୁହେଁ?',
  },
  't12.check.count': {
    en: '2. Count the cash in the drawer again.',
    hi: '2. दराज़ का नकद फिर से गिनें।',
    or: '2. ଡ୍ରୟରର ନଗଦ ପୁଣି ଗଣନ୍ତୁ।',
  },
  't12.recount': { en: 'Count again', hi: 'फिर से गिनें', or: 'ପୁଣି ଗଣନ୍ତୁ' },
  't12.markLoss': {
    en: "Still short - record as today's loss",
    hi: 'अब भी कम है - आज का नुकसान दर्ज करें',
    or: 'ଏବେ ବି କମ୍ - ଆଜିର କ୍ଷତି ଭାବେ ଲେଖନ୍ତୁ',
  },
  't12.reason.loss': { en: 'Loss for the day', hi: 'आज का नुकसान', or: 'ଆଜିର କ୍ଷତି' },

  /* ---- T14 · the day, closed ----------------------------------------- */
  't14.title': { en: 'Day closed', hi: 'दिन बंद हुआ', or: 'ଦିନ ବନ୍ଦ ହେଲା' },
  't14.profit': { en: 'Estimated profit', hi: 'अनुमानित लाभ', or: 'ଆନୁମାନିକ ଲାଭ' },
  't14.withdrawalNote': {
    en: 'Money you took is shown separately and is not counted against profit.',
    hi: 'आपने जो लिया वह अलग दिखाया है और लाभ में से नहीं घटाया।',
    or: 'ଆପଣ ନେଇଥିବା ଟଙ୍କା ଅଲଗା ଦେଖାଯାଇଛି ଏବଂ ଲାଭରୁ ହଟାଯାଇନାହିଁ।',
  },
  /* T14 regrouped to the reference (F-9 and fidelity). Hindi/Odia DRAFT (H13). */
  't14.netSales': { en: 'Net sales', hi: 'कुल बिक्री', or: 'ମୋଟ ବିକ୍ରି' },
  't14.purchases': { en: 'Purchase · all modes', hi: 'खरीद · सभी तरीके', or: 'କିଣା · ସବୁ ମାଧ୍ୟମ' },
  't14.expenses': { en: 'Expenses · all modes', hi: 'खर्च · सभी तरीके', or: 'ଖର୍ଚ୍ଚ · ସବୁ ମାଧ୍ୟମ' },
  't14.withdrawal': { en: 'Personal withdrawal', hi: 'निजी निकासी', or: 'ବ୍ୟକ୍ତିଗତ ଉଠାଣ' },
  't14.cashCheck': { en: 'Cash check', hi: 'नकद जाँच', or: 'ନଗଦ ଯାଞ୍ଚ' },
  't14.expected': { en: 'Expected', hi: 'अपेक्षित', or: 'ଆଶା କରାଯାଇଥିବା' },
  't14.counted': { en: 'Counted', hi: 'गिना गया', or: 'ଗଣାଯାଇଛି' },
  /* HT-23: profit once the cash gap is taken as loss or income. hi / or are a DRAFT (H13). */
  't14.profitAfterCash': {
    en: 'Profit after cash difference',
    hi: 'नकद अंतर के बाद लाभ',
    or: 'ନଗଦ ପାର୍ଥକ୍ୟ ପରେ ଲାଭ',
  },
  't14.done': { en: 'Done', hi: 'हो गया', or: 'ହୋଇଗଲା' },

  /* ---- the cash-check working, line by line -------------------------- */
  'working.estimated_profit': { en: 'Estimated profit', hi: 'अनुमानित लाभ', or: 'ଆନୁମାନିକ ଲାଭ' },
  'working.cash_short': { en: 'Cash short (loss)', hi: 'नकद कम (नुकसान)', or: 'ନଗଦ କମ୍ (କ୍ଷତି)' },
  'working.cash_excess': { en: 'Cash extra (income)', hi: 'नकद ज़्यादा (आय)', or: 'ନଗଦ ଅଧିକ (ଆୟ)' },
  'working.opening_cash': { en: 'Cash you started with', hi: 'शुरू का नकद', or: 'ଆରମ୍ଭର ନଗଦ' },
  'working.cash_sales': { en: 'Cash sales', hi: 'नकद बिक्री', or: 'ନଗଦ ବିକ୍ରି' },
  'working.udhar_collected_cash': { en: 'Udhar collected in cash', hi: 'नकद में उधार वसूली', or: 'ନଗଦରେ ଉଧାର ଆଦାୟ' },
  'working.cash_purchase': { en: 'Purchases paid in cash', hi: 'नकद में खरीद', or: 'ନଗଦରେ କିଣା' },
  'working.cash_expenses': { en: 'Expenses paid in cash', hi: 'नकद में खर्च', or: 'ନଗଦରେ ଖର୍ଚ୍ଚ' },
  'working.cash_party_payment': { en: 'Paid to suppliers in cash', hi: 'नकद में आपूर्तिकर्ता को', or: 'ନଗଦରେ ଯୋଗାଣକାରୀଙ୍କୁ' },
  'working.withdrawal_cash': { en: 'Cash you took', hi: 'आपने लिया नकद', or: 'ଆପଣ ନେଇଥିବା ନଗଦ' },

  /* ---- the three states a section can be in (D8) ---------------------- */
  'state.entered': { en: 'entered', hi: 'दर्ज', or: 'ଲେଖାଯାଇଛି' },
  'state.skipped': { en: 'nothing today', hi: 'आज कुछ नहीं', or: 'ଆଜି କିଛି ନାହିଁ' },
  'state.untouched': { en: 'not yet', hi: 'अभी नहीं', or: 'ଏପର୍ଯ୍ୟନ୍ତ ନୁହେଁ' },

  /* ---- X0 · the consent notice, shown before an account exists -------- */
  'consent.title': { en: 'Before we start', hi: 'शुरू करने से पहले', or: 'ଆରମ୍ଭ ପୂର୍ବରୁ' },
  'consent.intro': {
    en: 'This is what SWAFTO keeps, and why. Nothing is kept for any other reason.',
    hi: 'SWAFTO यह रखता है, और इसीलिए रखता है। किसी और कारण से कुछ नहीं रखा जाता।',
    or: 'SWAFTO ଏହା ରଖେ, ଏବଂ ଏଥିପାଇଁ ରଖେ। ଅନ୍ୟ କୌଣସି କାରଣରୁ କିଛି ରଖାଯାଏ ନାହିଁ।',
  },
  'consent.required': { en: 'Needed to keep your book', hi: 'खाता रखने के लिए ज़रूरी', or: 'ଖାତା ରଖିବାକୁ ଆବଶ୍ୟକ' },
  'consent.optional': { en: 'Your choice', hi: 'आपकी मर्ज़ी', or: 'ଆପଣଙ୍କ ଇଚ୍ଛା' },
  'consent.purpose.account_and_ledger': {
    en: 'Your number, your shop name, and the entries you type',
    hi: 'आपका नंबर, दुकान का नाम, और आपकी दर्ज की गई बातें',
    or: 'ଆପଣଙ୍କ ନମ୍ବର, ଦୋକାନ ନାମ, ଏବଂ ଆପଣ ଲେଖିଥିବା ବିଷୟ',
  },
  'consent.purpose.sms_reminders': {
    en: 'Send me reminders by SMS',
    hi: 'मुझे SMS से याद दिलाएँ',
    or: 'ମୋତେ SMS ରେ ମନେ ପକାନ୍ତୁ',
  },
  'consent.purpose.crash_diagnostics': {
    en: 'Send crash reports, never with money or names',
    hi: 'क्रैश रिपोर्ट भेजें, पैसे या नाम कभी नहीं',
    or: 'କ୍ରାସ ରିପୋର୍ଟ ପଠାନ୍ତୁ, ଟଙ୍କା କିମ୍ବା ନାମ କେବେ ନୁହେଁ',
  },
  'consent.rights': {
    en: 'You can see everything we hold, correct it, or have it erased. You can change any of these choices later, as easily as now.',
    hi: 'आप सब कुछ देख सकते हैं, सुधार सकते हैं, या मिटवा सकते हैं। ये चुनाव बाद में भी उतनी ही आसानी से बदल सकते हैं।',
    or: 'ଆପଣ ସବୁକିଛି ଦେଖିପାରିବେ, ସଂଶୋଧନ କରିପାରିବେ, କିମ୍ବା ହଟାଇପାରିବେ। ଏହି ପସନ୍ଦ ପରେ ମଧ୍ୟ ସହଜରେ ବଦଳାଇପାରିବେ।',
  },
  'consent.agree': { en: 'I agree', hi: 'मैं सहमत हूँ', or: 'ମୁଁ ସହମତ' },
  'consent.on': { en: 'Yes', hi: 'हाँ', or: 'ହଁ' },
  'consent.off': { en: 'No', hi: 'नहीं', or: 'ନା' },

  /* ---- X0 again, reached from Today: withdrawal must be as easy ------- */
  'consent.manage.title': {
    en: 'What you agreed to',
    hi: 'आपने किसके लिए हाँ कहा',
    or: 'ଆପଣ କ’ଣ ପାଇଁ ହଁ କହିଥିଲେ',
  },
  'consent.save': { en: 'Save', hi: 'सहेजें', or: 'ସାଇତନ୍ତୁ' },
  't1.privacy': {
    en: 'Privacy and what you agreed to',
    hi: 'निजता और आपकी सहमति',
    or: 'ଗୋପନୀୟତା ଓ ଆପଣଙ୍କ ସହମତି',
  },

  /* ---- T2 · Today, the first run ------------------------------------- */
  't2.title': { en: "Today's book", hi: 'आज की किताब', or: 'ଆଜିର ବହି' },
  't2.notStarted': { en: 'Not started', hi: 'शुरू नहीं हुआ', or: 'ଆରମ୍ଭ ହୋଇନାହିଁ' },
  't2.prompt': {
    en: 'Count the cash in the box before the first sale.',
    hi: 'पहली बिक्री से पहले बॉक्स का नकद गिनें।',
    or: 'ପ୍ରଥମ ବିକ୍ରି ପୂର୍ବରୁ ବାକ୍ସର ନଗଦ ଗଣନ୍ତୁ।',
  },
  't2.carried': {
    en: 'From tomorrow this is carried from your own count, and never asked again.',
    hi: 'कल से यह आपकी अपनी गिनती से आएगा, और फिर कभी नहीं पूछा जाएगा।',
    or: 'ଆସନ୍ତାକାଲିଠାରୁ ଏହା ଆପଣଙ୍କ ନିଜ ଗଣନାରୁ ଆସିବ, ଏବଂ ପୁଣି ପଚରାଯିବ ନାହିଁ।',
  },
  't2.enterOpening': {
    en: 'Enter opening cash',
    hi: 'शुरुआती नकद दर्ज करें',
    or: 'ଆରମ୍ଭ ନଗଦ ଲେଖନ୍ତୁ',
  },
  't2.empty': {
    en: "Today's figures appear here after the first entry.",
    hi: 'पहली प्रविष्टि के बाद आज के आँकड़े यहाँ दिखेंगे।',
    or: 'ପ୍ରଥମ ଏଣ୍ଟ୍ରି ପରେ ଆଜିର ହିସାବ ଏଠାରେ ଦେଖାଯିବ।',
  },

  /* ---- T3 · Today, already closed ------------------------------------ */
  't3.title': { en: 'Today is closed', hi: 'आज बंद है', or: 'ଆଜି ବନ୍ଦ ଅଛି' },
  't3.closedAt': { en: 'Closed', hi: 'बंद हुआ', or: 'ବନ୍ଦ ହେଲା' },
  't3.banner': {
    en: 'Today is closed. Post a correction instead.',
    hi: 'आज बंद है। इसके बदले सुधार दर्ज करें।',
    or: 'ଆଜି ବନ୍ଦ ଅଛି। ଏହା ବଦଳରେ ସଂଶୋଧନ ଲେଖନ୍ତୁ।',
  },
  't3.correction': { en: 'Post a correction', hi: 'सुधार दर्ज करें', or: 'ସଂଶୋଧନ ଲେଖନ୍ତୁ' },
  't3.summary': {
    en: 'See the day summary',
    hi: 'दिन का सारांश देखें',
    or: 'ଦିନର ସାରାଂଶ ଦେଖନ୍ତୁ',
  },
  't3.empty': {
    en: 'This day was closed with nothing entered.',
    hi: 'यह दिन बिना कुछ दर्ज किए बंद हुआ।',
    or: 'ଏହି ଦିନ କିଛି ନଲେଖି ବନ୍ଦ ହେଲା।',
  },

  /* ---- T13 · Cash check, balanced ------------------------------------ */
  't13.title': { en: 'Cash check', hi: 'नकद जाँच', or: 'ନଗଦ ଯାଞ୍ଚ' },
  't13.matches': { en: 'It matches.', hi: 'यह मिल गया।', or: 'ଏହା ମିଶିଲା।' },
  't13.everyRupee': {
    en: 'Every rupee in the box is in the book.',
    hi: 'बॉक्स का हर रुपया किताब में है।',
    or: 'ବାକ୍ସର ପ୍ରତ୍ୟେକ ଟଙ୍କା ବହିରେ ଅଛି।',
  },
  't13.carry': {
    en: "This becomes tomorrow's opening cash.",
    hi: 'यही कल का शुरुआती नकद बनेगा।',
    or: 'ଏହା ଆସନ୍ତାକାଲିର ଆରମ୍ଭ ନଗଦ ହେବ।',
  },

  /* ---- X1 · Onboarding, four questions and no more -------------------- */
  'x1.title': { en: 'Set up your shop', hi: 'अपनी दुकान सेट करें', or: 'ଆପଣଙ୍କ ଦୋକାନ ସେଟ୍ କରନ୍ତୁ' },
  'x1.shopName': { en: 'Shop name', hi: 'दुकान का नाम', or: 'ଦୋକାନର ନାମ' },
  'x1.shopNamePrompt': {
    en: 'What is your shop called?',
    hi: 'आपकी दुकान का नाम क्या है?',
    or: "ଆପଣଙ୍କ ଦୋକାନର ନାମ କ'ଣ?",
  },
  'x1.language': { en: 'Language', hi: 'भाषा', or: 'ଭାଷା' },
  'x1.continue': { en: 'Continue', hi: 'आगे बढ़ें', or: 'ଆଗକୁ ଯାଆନ୍ତୁ' },
  'x1.finish': { en: 'Finish setup', hi: 'सेटअप पूरा करें', or: 'ସେଟଅପ୍ ସମାପ୍ତ କରନ୍ତୁ' },
  'x1.empty': {
    en: 'Four questions, and then you are working.',
    hi: 'चार सवाल, और फिर आप काम पर।',
    or: 'ଚାରିଟି ପ୍ରଶ୍ନ, ତା ପରେ ଆପଣ କାମରେ।',
  },
  /* X1 as drawn in docs/design-reference/comfort/X1.png. hi/or are DRAFT (H13). */
  'x1.heading': {
    en: 'Four questions, then your book.',
    hi: 'चार सवाल, फिर आपकी किताब।',
    or: 'ଚାରିଟି ପ୍ରଶ୍ନ, ତା ପରେ ଆପଣଙ୍କ ବହି।',
  },
  'x1.languageHelp': {
    en: 'Words change. Amounts stay in the same numerals everywhere.',
    hi: 'शब्द बदलते हैं। रकम हर जगह एक ही अंकों में रहती है।',
    or: 'ଶବ୍ଦ ବଦଳେ। ରାଶି ସବୁଠି ସମାନ ଅଙ୍କରେ ରହେ।',
  },
  'x1.cashNow': {
    en: 'Cash in the box right now',
    hi: 'अभी गल्ले में नकद',
    or: 'ଏବେ ବାକ୍ସରେ ନଗଦ',
  },
  'x1.cashHelp': {
    en: 'Optional. Leave it and Today will ask before your first sale.',
    hi: 'ज़रूरी नहीं। छोड़ दें तो "आज" पहली बिक्री से पहले पूछेगा।',
    or: 'ବାଧ୍ୟତାମୂଳକ ନୁହେଁ। ଛାଡ଼ିଦେଲେ "ଆଜି" ପ୍ରଥମ ବିକ୍ରି ପୂର୍ବରୁ ପଚାରିବ।',
  },
  'x1.start': { en: 'Start the day', hi: 'दिन शुरू करें', or: 'ଦିନ ଆରମ୍ଭ କରନ୍ତୁ' },
  'x1.refusal.shopName': {
    en: 'Type the shop name first.',
    hi: 'पहले दुकान का नाम लिखें।',
    or: 'ପ୍ରଥମେ ଦୋକାନର ନାମ ଲେଖନ୍ତୁ।',
  },

  /* ---- P1 · Parties list ---------------------------------------------- */
  'p1.title': { en: 'Ledger', hi: 'खाता', or: 'ଖାତା' },
  'p1.toCollect': { en: 'Udhar to collect', hi: 'वसूली बाकी', or: 'ଆଦାୟ ବାକି' },
  'p1.youOwe': { en: 'You owe suppliers', hi: 'आपको देना है', or: 'ଆପଣଙ୍କୁ ଦେବାର' },
  'p1.customers': { en: 'Customers', hi: 'ग्राहक', or: 'ଗ୍ରାହକ' },
  'p1.suppliers': { en: 'Suppliers', hi: 'आपूर्तिकर्ता', or: 'ଯୋଗାଣକାରୀ' },
  'p1.changeToday': { en: 'Change today', hi: 'आज का बदलाव', or: 'ଆଜିର ପରିବର୍ତ୍ତନ' },
  'p1.shopTotals': {
    en: 'For the whole shop, not split by party',
    hi: 'पूरी दुकान के लिए, खाते अनुसार नहीं',
    or: 'ସମଗ୍ର ଦୋକାନ ପାଇଁ, ଖାତା ଅନୁସାରେ ନୁହେଁ',
  },
  'p1.overdue': { en: '31+ days', hi: '31+ दिन', or: '31+ ଦିନ' },
  'p1.empty': {
    en: 'No customers or suppliers yet.',
    hi: 'अभी कोई ग्राहक या आपूर्तिकर्ता नहीं।',
    or: 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଗ୍ରାହକ କିମ୍ବା ଯୋଗାଣକାରୀ ନାହାନ୍ତି।',
  },

  /* ---- P2 · Customer detail ------------------------------------------- */
  'p2.title': { en: 'Customer', hi: 'ग्राहक', or: 'ଗ୍ରାହକ' },
  'p2.ledger': { en: 'Ledger', hi: 'खाता', or: 'ଖାତା' },
  'p2.recordCollection': { en: 'Record a collection', hi: 'वसूली दर्ज करें', or: 'ଆଦାୟ ଲେଖନ୍ତୁ' },
  'p2.newUdhar': { en: 'New udhar sale', hi: 'नई उधार बिक्री', or: 'ନୂଆ ଉଧାର ବିକ୍ରି' },
  'p2.empty': {
    en: 'Nothing recorded for this customer yet.',
    hi: 'इस ग्राहक के लिए अभी कुछ दर्ज नहीं।',
    or: 'ଏହି ଗ୍ରାହକ ପାଇଁ ଏପର୍ଯ୍ୟନ୍ତ କିଛି ଲେଖା ହୋଇନାହିଁ।',
  },

  /* ---- P3 · Supplier detail ------------------------------------------- */
  'p3.title': { en: 'Supplier', hi: 'आपूर्तिकर्ता', or: 'ଯୋଗାଣକାରୀ' },
  'p3.owed': { en: 'You owe', hi: 'आपको देना है', or: 'ଆପଣଙ୍କୁ ଦେବାର' },
  'p3.recordPayment': { en: 'Record a payment', hi: 'भुगतान दर्ज करें', or: 'ଦେୟ ଲେଖନ୍ତୁ' },
  'p3.dueSoon': { en: 'Due soon', hi: 'जल्द देय', or: 'ଶୀଘ୍ର ଦେୟ' },
  'p3.empty': {
    en: 'Nothing recorded for this supplier yet.',
    hi: 'इस आपूर्तिकर्ता के लिए अभी कुछ दर्ज नहीं।',
    or: 'ଏହି ଯୋଗାଣକାରୀ ପାଇଁ ଏପର୍ଯ୍ୟନ୍ତ କିଛି ଲେଖା ହୋଇନାହିଁ।',
  },
  /* ---- R1 · Reports --------------------------------------------------- */
  /*
   * S05's activation ladder has the first close "reveal Reports", so the empty
   * state here is not a failure - it is the honest answer before a single day
   * has been closed, and it says what will make it fill.
   */
  'r1.title': { en: 'Reports', hi: 'रिपोर्ट', or: 'ରିପୋର୍ଟ' },
  'r1.empty': {
    en: 'Reports open after you close your first day.',
    hi: 'पहला दिन बंद करने पर रिपोर्ट खुलेगी।',
    or: 'ପ୍ରଥମ ଦିନ ବନ୍ଦ କଲେ ରିପୋର୍ଟ ଖୁଲିବ।',
  },
  'r1.daysClosed': { en: 'Days closed', hi: 'बंद दिन', or: 'ବନ୍ଦ ଦିନ' },
  'r1.totalSales': { en: 'Sales so far', hi: 'अब तक बिक्री', or: 'ଏପର୍ଯ୍ୟନ୍ତ ବିକ୍ରି' },
  'r1.totalExpenses': { en: 'Expenses so far', hi: 'अब तक खर्च', or: 'ଏପର୍ଯ୍ୟନ୍ତ ଖର୍ଚ୍ଚ' },
  'r1.creditOutstanding': {
    en: 'Owed to you',
    hi: 'आपको मिलना है',
    or: 'ଆପଣଙ୍କୁ ମିଳିବାକୁ ଅଛି',
  },
  'r1.note': {
    en: 'Figures are recomputed from your entries every time you open this.',
    hi: 'हर बार खोलने पर आंकड़े आपकी प्रविष्टियों से फिर से गिने जाते हैं।',
    or: 'ପ୍ରତିଥର ଖୋଲିଲା ବେଳେ ଆପଣଙ୍କ ଲେଖରୁ ସଂଖ୍ୟା ପୁଣି ଗଣା ହୁଏ।',
  },

  /*
   * R1's readings - BI1-BI6 and the two scores of docs/spec/SCORES.md. Every
   * line STATES a reading; none tells him what to do (SCORES.md §6, BE-12).
   * The gate line is the one sentence a reading shows before it has the days
   * to mean anything: never a zero, never an empty chart.
   */
  'r1.gate': {
    en: 'After {need} closed days, {have} so far',
    hi: '{need} बंद दिनों के बाद, अभी {have}',
    or: '{need}ଟି ବନ୍ଦ ଦିନ ପରେ, ଏପର୍ଯ୍ୟନ୍ତ {have}',
  },
  'r1.ofDays': { en: '{n} of {w} days', hi: '{w} में से {n} दिन', or: '{w} ରୁ {n} ଦିନ' },
  'r1.changing': { en: 'What is changing', hi: 'क्या बदल रहा है', or: 'କଣ ବଦଳୁଛି' },
  'r1.pressure': {
    en: 'Where pressure is building',
    hi: 'दबाव कहाँ बन रहा है',
    or: 'ଚାପ କେଉଁଠି ବଢୁଛି',
  },
  'r1.bi1': { en: 'Profit trend', hi: 'लाभ का रुख', or: 'ଲାଭର ଧାରା' },
  'r1.bi1.up': { en: 'Rising', hi: 'बढ़ रहा है', or: 'ବଢୁଛି' },
  'r1.bi1.down': { en: 'Falling', hi: 'घट रहा है', or: 'କମୁଛି' },
  'r1.bi1.flat': { en: 'Steady', hi: 'स्थिर', or: 'ସ୍ଥିର' },
  'r1.bi1.earlier': {
    en: 'Average daily profit, earlier half',
    hi: 'रोज़ का औसत लाभ, पहला आधा',
    or: 'ହାରାହାରି ଦୈନିକ ଲାଭ, ପ୍ରଥମ ଅଧା',
  },
  'r1.bi1.later': {
    en: 'Average daily profit, later half',
    hi: 'रोज़ का औसत लाभ, बाद का आधा',
    or: 'ହାରାହାରି ଦୈନିକ ଲାଭ, ଶେଷ ଅଧା',
  },
  'r1.bi2': {
    en: 'Day-to-day sales variation',
    hi: 'रोज़ की बिक्री में उतार-चढ़ाव',
    or: 'ଦୈନିକ ବିକ୍ରିରେ ଉଠାଣି-ପଡ଼ାଣି',
  },
  'r1.bi3': {
    en: 'Closing cash variation',
    hi: 'बंद के समय नकद में उतार-चढ़ाव',
    or: 'ବନ୍ଦ ବେଳର ନଗଦରେ ଉଠାଣି-ପଡ଼ାଣି',
  },
  'r1.bi3.short': {
    en: 'Days the box came up short',
    hi: 'जिन दिनों बॉक्स में कम निकला',
    or: 'ଯେଉଁ ଦିନ ବାକ୍ସରେ କମ୍ ବାହାରିଲା',
  },
  'r1.bi4': {
    en: 'Owed to you and by you, against cash',
    hi: 'लेना और देना, नकद के मुकाबले',
    or: 'ପାଇବା ଓ ଦେବା, ନଗଦ ତୁଳନାରେ',
  },
  'r1.bi6': {
    en: 'Credit held by your 3 largest customers',
    hi: '3 सबसे बड़े ग्राहकों के पास उधार',
    or: '3 ଜଣ ବଡ଼ ଗ୍ରାହକଙ୍କ ପାଖରେ ଉଧାର',
  },
  'r1.bi6.compared': {
    en: 'Compared with recent closes',
    hi: 'हाल के बंद दिनों की तुलना में',
    or: 'ଗତ ବନ୍ଦ ଦିନ ତୁଳନାରେ',
  },
  'r1.bi6.worsening': { en: 'More concentrated', hi: 'ज़्यादा केंद्रित', or: 'ଅଧିକ କେନ୍ଦ୍ରିତ' },
  'r1.bi6.improving': { en: 'Less concentrated', hi: 'कम केंद्रित', or: 'କମ୍ କେନ୍ଦ୍ରିତ' },
  'r1.bi6.stable': { en: 'No change', hi: 'कोई बदलाव नहीं', or: 'କିଛି ବଦଳି ନାହିଁ' },
  'r1.bi6.no_baseline': {
    en: 'Nothing earlier to compare',
    hi: 'तुलना के लिए पहले का कुछ नहीं',
    or: 'ତୁଳନା ପାଇଁ ପୂର୍ବର କିଛି ନାହିଁ',
  },
  'r1.cc.title': { en: 'Cash confidence', hi: 'नकद भरोसा', or: 'ନଗଦ ଭରସା' },
  'r1.cc.match': { en: 'Cash matched exactly', hi: 'नकद ठीक-ठीक मिला', or: 'ନଗଦ ଠିକ୍ ମେଳ ଖାଇଲା' },
  'r1.cc.gap': {
    en: "Typical cash gap, as a share of a day's sales",
    hi: 'आम नकद अंतर, एक दिन की बिक्री के हिस्से के रूप में',
    or: 'ସାଧାରଣ ନଗଦ ଫରକ, ଦିନର ବିକ୍ରିର ଅଂଶ ଭାବେ',
  },
  'r1.cc.notYet': {
    en: 'UPI matching and the reasons for gaps are not counted yet.',
    hi: 'UPI मिलान और अंतर के कारण अभी नहीं गिने जाते।',
    or: 'UPI ମେଳ ଓ ଫରକର କାରଣ ଏବେ ଗଣାଯାଉନାହିଁ।',
  },
  'r1.oc.title': { en: 'Operational consistency', hi: 'कामकाज की नियमितता', or: 'କାମର ନିୟମିତତା' },
  'r1.oc.closing': {
    en: 'Days closed, of days opened',
    hi: 'खुले दिनों में से बंद दिन',
    or: 'ଖୋଲା ଦିନ ମଧ୍ୟରୁ ବନ୍ଦ ଦିନ',
  },
  'r1.oc.recording': {
    en: 'Sections filled in or marked empty',
    hi: 'भरे गए या खाली बताए गए हिस्से',
    or: 'ଭରାଯାଇଥିବା କିମ୍ବା ଖାଲି କୁହାଯାଇଥିବା ଭାଗ',
  },
  'r1.oc.corrections': {
    en: 'Entries that are corrections',
    hi: 'सुधार वाली प्रविष्टियाँ',
    or: 'ସଂଶୋଧନ ଏଣ୍ଟ୍ରି',
  },
  'r1.bh': {
    en: 'Business health is not shown as one number. How to weigh these readings against each other has not been measured, so each one stands on its own.',
    hi: 'व्यापार की सेहत एक अंक में नहीं दिखाई जाती। इन पढ़ाइयों को आपस में कैसे तौलें, यह मापा नहीं गया है, इसलिए हर एक अपने आप में है।',
    or: 'ବ୍ୟବସାୟର ସ୍ୱାସ୍ଥ୍ୟ ଗୋଟିଏ ସଂଖ୍ୟାରେ ଦେଖାଯାଏ ନାହିଁ। ଏହି ପଢ଼ାଗୁଡ଼ିକୁ ପରସ୍ପର ସହ କିପରି ତଉଲିବେ, ତାହା ମପାଯାଇନାହିଁ, ତେଣୁ ପ୍ରତ୍ୟେକଟି ନିଜେ ଅଲଗା।',
  },

  /*
   * FR-7 - THE FREE BASIC REPORTS on R1 (R5, R2 §3). Each line states what the
   * book says; none tells him what to do, and the notes say the figures are only
   * as complete as what was entered.
   */
  'rep.dues.title': { en: 'Who owes you, oldest first', hi: 'किससे लेना है, सबसे पुराना पहले', or: 'କାହାଠାରୁ ମିଳିବ, ପୁରୁଣା ଆଗରେ' },
  'rep.owe.title': {
    en: 'What you owe suppliers, oldest first',
    hi: 'आपूर्तिकर्ताओं को देना है, सबसे पुराना पहले',
    or: 'ଯୋଗାଣକାରୀଙ୍କୁ ଦେବାକୁ ଅଛି, ପୁରୁଣା ଆଗରେ',
  },
  'rep.bucket.0': { en: '0 to 30 days', hi: '0 से 30 दिन', or: '0 ରୁ 30 ଦିନ' },
  'rep.bucket.1': { en: '31 to 60 days', hi: '31 से 60 दिन', or: '31 ରୁ 60 ଦିନ' },
  'rep.bucket.2': { en: '61 to 90 days', hi: '61 से 90 दिन', or: '61 ରୁ 90 ଦିନ' },
  'rep.bucket.3': { en: 'Over 90 days', hi: '90 दिन से ज़्यादा', or: '90 ଦିନରୁ ଅଧିକ' },
  'rep.party.age': {
    en: '{name} · {n|since today|# day|# days}',
    hi: '{name} · {n|आज से|# दिन|# दिन}',
    or: '{name} · {n|ଆଜିଠାରୁ|# ଦିନ|# ଦିନ}',
  },
  'rep.dues.none': { en: 'No udhar is open.', hi: 'कोई उधार बाकी नहीं।', or: 'କୌଣସି ଉଧାର ବାକି ନାହିଁ।' },
  'rep.owe.none': {
    en: 'Nothing is owed to suppliers.',
    hi: 'आपूर्तिकर्ताओं का कुछ बाकी नहीं।',
    or: 'ଯୋଗାଣକାରୀଙ୍କର କିଛି ବାକି ନାହିଁ।',
  },
  'rep.dues.note': {
    en: 'Named parties only; the oldest udhar counts as paid first. Only as complete as what was entered.',
    hi: 'केवल नाम वाले लोग; पहले पुराना उधार चुका माना गया। जितना लिखा गया, उतना ही पूरा।',
    or: 'କେବଳ ନାମ ଥିବା ଲୋକ; ପୁରୁଣା ଉଧାର ଆଗ ସୁଝା ଧରାଯାଇଛି। ଯେତିକି ଲେଖାଯାଇଛି, ସେତିକି ପୂରା।',
  },
  'rep.month.this': { en: 'This month so far', hi: 'इस महीने अब तक', or: 'ଏହି ମାସ ଏପର୍ଯ୍ୟନ୍ତ' },
  'rep.month.last': { en: 'Last month', hi: 'पिछला महीना', or: 'ଗତ ମାସ' },
  'rep.month.netSales': { en: 'Net sales', hi: 'शुद्ध बिक्री', or: 'ନିଟ୍ ବିକ୍ରି' },
  'rep.month.cash': { en: 'Cash sales', hi: 'नकद बिक्री', or: 'ନଗଦ ବିକ୍ରି' },
  'rep.month.upi': { en: 'UPI sales', hi: 'UPI बिक्री', or: 'UPI ବିକ୍ରି' },
  'rep.month.udhar': { en: 'Udhar sales', hi: 'उधार बिक्री', or: 'ଉଧାର ବିକ୍ରି' },
  'rep.month.expenses': { en: 'Expenses', hi: 'खर्च', or: 'ଖର୍ଚ୍ଚ' },
  'rep.month.purchases': { en: 'Purchases', hi: 'खरीद', or: 'କିଣା' },
  'rep.month.profit': { en: 'Estimated profit', hi: 'अनुमानित लाभ', or: 'ଆନୁମାନିକ ଲାଭ' },
  'rep.month.takenHome': { en: 'Taken home', hi: 'घर ले गए', or: 'ଘରକୁ ନେଲେ' },
  'rep.month.left': { en: 'Profit left in the shop', hi: 'दुकान में बचा लाभ', or: 'ଦୋକାନରେ ରହିଥିବା ଲାଭ' },
  'rep.month.note': {
    en: 'What you took home is not taken off profit. It is shown beside it.',
    hi: 'घर ले गई रकम लाभ से नहीं घटाई जाती। वह उसके साथ दिखाई जाती है।',
    or: 'ଘରକୁ ନେଇଥିବା ଟଙ୍କା ଲାଭରୁ କଟାଯାଏ ନାହିଁ। ତାହା ପାଖରେ ଦେଖାଯାଏ।',
  },
  'rep.cash.title': { en: 'Cash checks', hi: 'नकद जाँच', or: 'ନଗଦ ଯାଞ୍ଚ' },
  'rep.cash.balanced': { en: 'Matched', hi: 'मिला', or: 'ମେଳ ଖାଇଲା' },
  'rep.cash.short': { en: 'Less than expected', hi: 'उम्मीद से कम', or: 'ଆଶାରୁ କମ୍' },
  'rep.cash.extra': { en: 'More than expected', hi: 'उम्मीद से ज़्यादा', or: 'ଆଶାରୁ ଅଧିକ' },
  'rep.upi.title': { en: 'UPI you confirmed', hi: 'आपने पक्का किया UPI', or: 'ଆପଣ ନିଶ୍ଚିତ କରିଥିବା UPI' },
  'rep.upi.receipts': {
    en: '{n} of {w} receipts confirmed',
    hi: '{w} में से {n} रसीदें पक्की',
    or: '{w} ରୁ {n}ଟି ରସିଦ ନିଶ୍ଚିତ',
  },
  'rep.dashboard': { en: 'Premium dashboard', hi: 'प्रीमियम डैशबोर्ड', or: 'ପ୍ରିମିୟମ ଡ୍ୟାସବୋର୍ଡ' },
  'rep.dashboard.detail': {
    en: 'Sales estimate and comparisons',
    hi: 'बिक्री का अनुमान और तुलना',
    or: 'ବିକ୍ରିର ଆକଳନ ଓ ତୁଳନା',
  },

  /*
   * M1 - THE PREMIUM DASHBOARD (PR-3, PR-4, PR-6). Every prediction says
   * "estimate" and how it was made; every comparison is something to look at.
   */
  'm1.title': { en: 'Dashboard', hi: 'डैशबोर्ड', or: 'ଡ୍ୟାସବୋର୍ଡ' },
  'm1.empty': {
    en: 'The dashboard fills in once you have closed days.',
    hi: 'दिन बंद करने के बाद डैशबोर्ड भरेगा।',
    or: 'ଦିନ ବନ୍ଦ କଲା ପରେ ଡ୍ୟାସବୋର୍ଡ ଭରିବ।',
  },
  'm1.locked.title': { en: 'This is part of Premium', hi: 'यह प्रीमियम का हिस्सा है', or: 'ଏହା ପ୍ରିମିୟମର ଅଂଶ' },
  'm1.locked.body': {
    en: 'Premium adds a sales estimate for the coming week, and comparisons with last year and with festival weeks. Everything you have recorded stays yours and readable in every plan.',
    hi: 'प्रीमियम में आने वाले हफ़्ते की बिक्री का अनुमान, और पिछले साल व त्योहार के हफ़्तों से तुलना मिलती है। आपने जो भी लिखा है वह हर प्लान में आपका है और पढ़ा जा सकता है।',
    or: 'ପ୍ରିମିୟମରେ ଆସନ୍ତା ସପ୍ତାହର ବିକ୍ରି ଆକଳନ, ଏବଂ ଗତ ବର୍ଷ ଓ ପର୍ବ ସପ୍ତାହ ସହ ତୁଳନା ମିଳେ। ଆପଣ ଯାହା ଲେଖିଛନ୍ତି ତାହା ସବୁ ପ୍ଲାନରେ ଆପଣଙ୍କର ଓ ପଢ଼ିହେବ।',
  },
  'm1.upgrade': { en: 'See Premium', hi: 'प्रीमियम देखें', or: 'ପ୍ରିମିୟମ ଦେଖନ୍ତୁ' },
  'm1.forecast.title': { en: 'Sales estimate, next 7 days', hi: 'बिक्री का अनुमान, अगले 7 दिन', or: 'ବିକ୍ରି ଆକଳନ, ଆସନ୍ତା 7 ଦିନ' },
  'm1.forecast.seasonal_naive': {
    en: 'Method: the same as the last same weekday you closed.',
    hi: 'तरीका: पिछली बार उसी वार जितनी बिक्री हुई।',
    or: 'ପଦ୍ଧତି: ଗତଥର ସେହି ବାରରେ ଯେତିକି ବିକ୍ରି ହୋଇଥିଲା।',
  },
  'm1.forecast.holt_winters': {
    en: 'Method: your weekday pattern and trend. It beat "same as last week" on your own past days.',
    hi: 'तरीका: आपके वार का ढर्रा और रुख। आपके पिछले दिनों पर यह "पिछले हफ़्ते जितना" से बेहतर रहा।',
    or: 'ପଦ୍ଧତି: ଆପଣଙ୍କ ବାରର ଧାରା ଓ ଗତି। ଆପଣଙ୍କ ପୁରୁଣା ଦିନରେ ଏହା "ଗତ ସପ୍ତାହ ଯେତିକି" ଠାରୁ ଭଲ ରହିଲା।',
  },
  'm1.forecast.window': {
    en: 'From {n|# closed day|# closed days}, {from} to {to}.',
    hi: '{n} बंद दिनों से, {from} से {to} तक।',
    or: '{n}ଟି ବନ୍ଦ ଦିନରୁ, {from} ରୁ {to} ପର୍ଯ୍ୟନ୍ତ।',
  },
  'm1.forecast.range': { en: 'Likely range', hi: 'संभावित दायरा', or: 'ସମ୍ଭାବ୍ୟ ପରିସର' },
  'm1.forecast.miss': { en: 'Typical miss on past days', hi: 'पिछले दिनों पर आम चूक', or: 'ପୁରୁଣା ଦିନରେ ସାଧାରଣ ଭୁଲ' },
  'm1.forecast.mase': {
    en: 'Its error against "same as last week"',
    hi: '"पिछले हफ़्ते जितना" के मुकाबले इसकी चूक',
    or: '"ଗତ ସପ୍ତାହ ଯେତିକି" ତୁଳନାରେ ଏହାର ଭୁଲ',
  },
  'm1.forecast.hwGate': {
    en: 'Weekday-and-trend method: after {need} closed days, {have} so far',
    hi: 'वार-और-रुख वाला तरीका: {need} बंद दिनों के बाद, अभी {have}',
    or: 'ବାର-ଓ-ଗତି ପଦ୍ଧତି: {need}ଟି ବନ୍ଦ ଦିନ ପରେ, ଏପର୍ଯ୍ୟନ୍ତ {have}',
  },
  'm1.forecast.hwLost': {
    en: 'The weekday-and-trend method was tried and did not beat "same as last week", so it is not shown.',
    hi: 'वार-और-रुख वाला तरीका आज़माया गया, "पिछले हफ़्ते जितना" से बेहतर नहीं रहा, इसलिए नहीं दिखाया।',
    or: 'ବାର-ଓ-ଗତି ପଦ୍ଧତି ପରଖାଗଲା, "ଗତ ସପ୍ତାହ ଯେତିକି" ଠାରୁ ଭଲ ହେଲା ନାହିଁ, ତେଣୁ ଦେଖାଯାଉନାହିଁ।',
  },
  'm1.forecast.noRange': {
    en: 'No range yet: too few recent closed days to test it on.',
    hi: 'अभी कोई दायरा नहीं: परखने के लिए हाल के बंद दिन कम हैं।',
    or: 'ଏବେ କୌଣସି ପରିସର ନାହିଁ: ପରଖିବାକୁ ନିକଟର ବନ୍ଦ ଦିନ କମ୍।',
  },
  'm1.forecast.estimate': {
    en: 'An estimate from your own past sales, never a promise. The range holds 8 in 10 of its past misses. Only as complete as what was entered.',
    hi: 'आपकी अपनी पिछली बिक्री से अनुमान, वादा नहीं। दायरे में इसकी पिछली 10 में से 8 चूकें आती हैं। जितना लिखा गया, उतना ही पूरा।',
    or: 'ଆପଣଙ୍କ ନିଜ ପୁରୁଣା ବିକ୍ରିରୁ ଆକଳନ, ପ୍ରତିଶ୍ରୁତି ନୁହେଁ। ପରିସରରେ ଏହାର ପୁରୁଣା 10ରୁ 8ଟି ଭୁଲ ଆସେ। ଯେତିକି ଲେଖାଯାଇଛି, ସେତିକି ପୂରା।',
  },
  'm1.lastYear.title': { en: 'This month against last year', hi: 'यह महीना पिछले साल से', or: 'ଏହି ମାସ ଗତ ବର୍ଷ ସହ' },
  'm1.lastYear.this': {
    en: 'This month so far ({n|# closed day|# closed days})',
    hi: 'इस महीने अब तक ({n} बंद दिन)',
    or: 'ଏହି ମାସ ଏପର୍ଯ୍ୟନ୍ତ ({n}ଟି ବନ୍ଦ ଦିନ)',
  },
  'm1.lastYear.last': {
    en: 'Same dates last year ({n|# closed day|# closed days})',
    hi: 'पिछले साल इन्हीं तारीखों में ({n} बंद दिन)',
    or: 'ଗତ ବର୍ଷ ଏହି ତାରିଖରେ ({n}ଟି ବନ୍ଦ ଦିନ)',
  },
  'm1.lastYear.none': {
    en: 'No closed day on these dates last year yet.',
    hi: 'पिछले साल इन तारीखों में अभी कोई बंद दिन नहीं।',
    or: 'ଗତ ବର୍ଷ ଏହି ତାରିଖରେ ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ବନ୍ଦ ଦିନ ନାହିଁ।',
  },
  'm1.festival.title': { en: 'Festival weeks', hi: 'त्योहार के हफ़्ते', or: 'ପର୍ବ ସପ୍ତାହ' },
  'm1.festival.week': { en: '{name} week ({n|# closed day|# closed days})', hi: '{name} का हफ़्ता ({n} बंद दिन)', or: '{name} ସପ୍ତାହ ({n}ଟି ବନ୍ଦ ଦିନ)' },
  'm1.festival.before': { en: 'Week before ({n|# closed day|# closed days})', hi: 'उससे पहले का हफ़्ता ({n} बंद दिन)', or: 'ତା ଆଗ ସପ୍ତାହ ({n}ଟି ବନ୍ଦ ଦିନ)' },
  'm1.festival.none': {
    en: 'No festival week among your closed days yet.',
    hi: 'आपके बंद दिनों में अभी कोई त्योहार का हफ़्ता नहीं।',
    or: 'ଆପଣଙ୍କ ବନ୍ଦ ଦିନରେ ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ପର୍ବ ସପ୍ତାହ ନାହିଁ।',
  },
  'm1.festival.source': {
    en: "Festival dates: the central government's holiday list for 2025 and 2026.",
    hi: 'त्योहार की तारीखें: 2025 और 2026 की केंद्र सरकार की छुट्टी सूची।',
    or: 'ପର୍ବ ତାରିଖ: 2025 ଓ 2026ର କେନ୍ଦ୍ର ସରକାରଙ୍କ ଛୁଟି ତାଲିକା।',
  },
  'festival.holi': { en: 'Holi', hi: 'होली', or: 'ହୋଲି' },
  'festival.id_ul_fitr': { en: 'Id-ul-Fitr', hi: 'ईद-उल-फ़ित्र', or: 'ଇଦ୍-ଉଲ୍-ଫିତର' },
  'festival.id_ul_zuha': { en: 'Id-ul-Zuha', hi: 'ईद-उल-ज़ुहा', or: 'ଇଦ୍-ଉଲ୍-ଜୁହା' },
  'festival.dussehra': { en: 'Dussehra', hi: 'दशहरा', or: 'ଦଶହରା' },
  'festival.diwali': { en: 'Diwali', hi: 'दिवाली', or: 'ଦୀପାବଳି' },
  'm1.pay.title': { en: 'How long customers take to pay', hi: 'ग्राहक चुकाने में कितने दिन लेते हैं', or: 'ଗ୍ରାହକ ସୁଝିବାକୁ କେତେ ଦିନ ନିଅନ୍ତି' },
  'm1.pay.value': { en: 'usually {n} days', hi: 'आमतौर पर {n} दिन', or: 'ସାଧାରଣତଃ {n} ଦିନ' },
  'm1.pay.note': {
    en: 'From udhar paid off in full. Something to look at, not a judgement of the customer.',
    hi: 'पूरे चुकाए गए उधार से। देखने की बात है, ग्राहक पर फ़ैसला नहीं।',
    or: 'ପୂରା ସୁଝାଯାଇଥିବା ଉଧାରରୁ। ଦେଖିବା କଥା, ଗ୍ରାହକଙ୍କ ଉପରେ ବିଚାର ନୁହେଁ।',
  },
  'm1.pay.none': {
    en: 'No udhar has been paid off in full yet.',
    hi: 'अभी कोई उधार पूरा नहीं चुकाया गया।',
    or: 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଉଧାର ପୂରା ସୁଝା ହୋଇନାହିଁ।',
  },
  'm1.returns.title': {
    en: 'Returns and adjustments, week by week',
    hi: 'वापसी और समायोजन, हफ़्ते दर हफ़्ते',
    or: 'ଫେରସ୍ତ ଓ ସମନ୍ୱୟ, ସପ୍ତାହ ପରେ ସପ୍ତାହ',
  },
  'm1.returns.returns': { en: 'Week to {date}: returns ({n})', hi: '{date} तक का हफ़्ता: वापसी ({n})', or: '{date} ପର୍ଯ୍ୟନ୍ତ ସପ୍ତାହ: ଫେରସ୍ତ ({n})' },
  'm1.returns.adjustments': { en: 'Adjustments ({n})', hi: 'समायोजन ({n})', or: 'ସମନ୍ୱୟ ({n})' },

  /* ---- S1 · Settings hub ---------------------------------------------- */
  's1.title': { en: 'Settings', hi: 'सेटिंग', or: 'ସେଟିଂ' },
  's1.shop': { en: 'Your shop', hi: 'आपकी दुकान', or: 'ଆପଣଙ୍କ ଦୋକାନ' },
  's1.language': { en: 'Language and screen', hi: 'भाषा और स्क्रीन', or: 'ଭାଷା ଓ ସ୍କ୍ରୀନ' },
  's1.privacy': { en: 'Privacy and consent', hi: 'निजता और सहमति', or: 'ଗୋପନୀୟତା ଓ ସହମତି' },
  's1.about': { en: 'About this app', hi: 'इस ऐप के बारे में', or: 'ଏହି ଆପ୍ ବିଷୟରେ' },
  's1.help': { en: 'Help and contact', hi: 'सहायता और संपर्क', or: 'ସହାୟତା ଓ ଯୋଗାଯୋଗ' },
  's1.deleteAccount': { en: 'Delete this account', hi: 'यह खाता मिटाएँ', or: 'ଏହି ଖାତା ମିଟାନ୍ତୁ' },
  /*
   * R5 FR-3 - THE APP LOCK, which is the phone's own screen lock. hi / or DRAFT (H13).
   * The copy never says "PIN": the phone may use a pattern, a password or a finger.
   */
  's1.appLock': { en: 'App lock', hi: 'ऐप लॉक', or: 'ଆପ୍ ଲକ୍' },
  's1.appLockOn': {
    en: 'On - asks for your phone lock',
    hi: 'चालू - फ़ोन का लॉक माँगता है',
    or: 'ଚାଲୁ - ଫୋନ୍ ଲକ୍ ମାଗେ',
  },
  's1.appLockOff': { en: 'Off', hi: 'बंद', or: 'ବନ୍ଦ' },
  's1.appLockNoScreenLock': {
    en: 'This phone has no screen lock, so the app lock cannot be turned on. Set a screen lock in the phone settings first.',
    hi: 'इस फ़ोन में स्क्रीन लॉक नहीं है, इसलिए ऐप लॉक चालू नहीं हो सकता। पहले फ़ोन की सेटिंग में स्क्रीन लॉक लगाएँ।',
    or: 'ଏହି ଫୋନରେ ସ୍କ୍ରୀନ୍ ଲକ୍ ନାହିଁ, ତେଣୁ ଆପ୍ ଲକ୍ ଚାଲୁ ହୋଇପାରିବ ନାହିଁ। ପ୍ରଥମେ ଫୋନ୍ ସେଟିଂରେ ସ୍କ୍ରୀନ୍ ଲକ୍ ଲଗାନ୍ତୁ।',
  },
  /* HT-45: the phone's prompt when S1's switch is pressed - not the locked cover's words. hi / or DRAFT, H13. */
  's1.appLockOnTitle': { en: 'Turn on app lock', hi: 'ऐप लॉक चालू करें', or: 'ଆପ୍ ଲକ୍ ଚାଲୁ କରନ୍ତୁ' },
  's1.appLockOffTitle': { en: 'Turn off app lock', hi: 'ऐप लॉक बंद करें', or: 'ଆପ୍ ଲକ୍ ବନ୍ଦ କରନ୍ତୁ' },
  's1.appLockConfirmBody': {
    en: 'Confirm with your phone lock',
    hi: 'फ़ोन के लॉक से पुष्टि करें',
    or: 'ଫୋନ୍ ଲକ୍ ଦେଇ ନିଶ୍ଚିତ କରନ୍ତୁ',
  },
  's11.title': { en: 'SWAFTO is locked', hi: 'SWAFTO लॉक है', or: 'SWAFTO ଲକ୍ ଅଛି' },
  's11.body': {
    en: 'Your shop book is hidden. Unlock with your phone lock to continue.',
    hi: 'आपकी दुकान की बही छिपी है। आगे बढ़ने के लिए फ़ोन के लॉक से खोलें।',
    or: 'ଆପଣଙ୍କ ଦୋକାନ ଖାତା ଲୁଚି ରହିଛି। ଆଗକୁ ବଢ଼ିବାକୁ ଫୋନ୍ ଲକ୍ ଦେଇ ଖୋଲନ୍ତୁ।',
  },
  's11.unlock': { en: 'Unlock', hi: 'खोलें', or: 'ଖୋଲନ୍ତୁ' },
  's11.confirmBody': {
    en: 'Use your phone lock to open your shop book',
    hi: 'अपनी दुकान की बही खोलने के लिए फ़ोन का लॉक इस्तेमाल करें',
    or: 'ଦୋକାନ ଖାତା ଖୋଲିବାକୁ ଫୋନ୍ ଲକ୍ ବ୍ୟବହାର କରନ୍ତୁ',
  },
  's11.paused': {
    en: 'App lock is paused: this phone has no screen lock now. Set one in the phone settings to use it again.',
    hi: 'ऐप लॉक रुका है: इस फ़ोन में अभी स्क्रीन लॉक नहीं है। फिर से इस्तेमाल के लिए फ़ोन की सेटिंग में लगाएँ।',
    or: 'ଆପ୍ ଲକ୍ ବନ୍ଦ ରହିଛି: ଏହି ଫୋନରେ ଏବେ ସ୍କ୍ରୀନ୍ ଲକ୍ ନାହିଁ। ପୁଣି ବ୍ୟବହାର ପାଇଁ ଫୋନ୍ ସେଟିଂରେ ଲଗାନ୍ତୁ।',
  },

  /* ---- R5 FR-1, FR-2, FR-4, FR-5, FR-6 (2026-10-26). hi / or DRAFT, H13. ---- */
  'p2.balanceAll': {
    en: 'Owed to you, all days on this phone',
    hi: 'आपको मिलना है, इस फ़ोन के सभी दिनों का',
    or: 'ଆପଣ ପାଇବେ, ଏହି ଫୋନର ସବୁ ଦିନର',
  },
  'p2.share': { en: 'Remind and share', hi: 'याद दिलाएँ और भेजें', or: 'ମନେ ପକାନ୍ତୁ ଓ ପଠାନ୍ତୁ' },
  'p2.remind': { en: 'Remind on WhatsApp', hi: 'WhatsApp पर याद दिलाएँ', or: 'WhatsAppରେ ମନେ ପକାନ୍ତୁ' },
  'p2.remindNote': {
    en: 'Opens your WhatsApp with a polite message. You press send.',
    hi: 'आपका WhatsApp एक विनम्र संदेश के साथ खुलेगा। भेजना आप दबाएँ।',
    or: 'ଆପଣଙ୍କ WhatsApp ଏକ ଭଦ୍ର ବାର୍ତ୍ତା ସହ ଖୋଲିବ। ପଠାଇବା ଆପଣ ଦବାନ୍ତୁ।',
  },
  'p2.noPhone': {
    en: 'No phone number saved for this customer.',
    hi: 'इस ग्राहक का फ़ोन नंबर सेव नहीं है।',
    or: 'ଏହି ଗ୍ରାହକଙ୍କ ଫୋନ୍ ନମ୍ବର ସେଭ୍ ହୋଇନାହିଁ।',
  },
  // HT-43: a number for a customer saved without one. hi / or DRAFT, H13.
  'p2.addPhone': {
    en: 'Add a mobile number for reminders',
    hi: 'याद दिलाने के लिए मोबाइल नंबर जोड़ें',
    or: 'ମନେ ପକାଇବା ପାଇଁ ମୋବାଇଲ୍ ନମ୍ବର ଯୋଡ଼ନ୍ତୁ',
  },
  'p2.savePhone': { en: 'Save number', hi: 'नंबर सेव करें', or: 'ନମ୍ବର ସେଭ୍ କରନ୍ତୁ' },
  'p2.statement': { en: 'Share statement', hi: 'खाते का ब्योरा भेजें', or: 'ଖାତା ବିବରଣୀ ପଠାନ୍ତୁ' },
  'p2.limit': { en: 'Credit limit', hi: 'उधार सीमा', or: 'ଉଧାର ସୀମା' },
  'p2.noLimit': { en: 'Not set', hi: 'तय नहीं', or: 'ଧାର୍ଯ୍ୟ ହୋଇନାହିଁ' },
  'remind.text': {
    en: 'Namaste {name}. This is {shop}. Your account with us shows {amount} due. Please pay when you can. Thank you.',
    hi: 'नमस्ते {name}। यह {shop} से है। हमारे यहाँ आपके खाते में {amount} बाकी है। सुविधा हो तब चुका दें। धन्यवाद।',
    or: 'ନମସ୍କାର {name}। ଏହା {shop}ରୁ। ଆମ ପାଖରେ ଆପଣଙ୍କ ଖାତାରେ {amount} ବାକି ଅଛି। ସୁବିଧା ହେଲେ ଦେଇଦେବେ। ଧନ୍ୟବାଦ।',
  },
  'remind.textNoShop': {
    en: 'Namaste {name}. Your account with us shows {amount} due. Please pay when you can. Thank you.',
    hi: 'नमस्ते {name}। हमारे यहाँ आपके खाते में {amount} बाकी है। सुविधा हो तब चुका दें। धन्यवाद।',
    or: 'ନମସ୍କାର {name}। ଆମ ପାଖରେ ଆପଣଙ୍କ ଖାତାରେ {amount} ବାକି ଅଛି। ସୁବିଧା ହେଲେ ଦେଇଦେବେ। ଧନ୍ୟବାଦ।',
  },
  'statement.title': { en: 'Account of {name}', hi: '{name} का खाता', or: '{name}ଙ୍କ ଖାତା' },
  'statement.asOf': { en: 'As on {date}', hi: '{date} तक', or: '{date} ସୁଦ୍ଧା' },
  'statement.balance': { en: 'Balance', hi: 'बाकी', or: 'ବାକି' },
  'statement.due': { en: 'Balance due: {amount}', hi: 'कुल बाकी: {amount}', or: 'ମୋଟ ବାକି: {amount}' },
  'statement.none': { en: 'No entries yet.', hi: 'अभी कोई एंट्री नहीं।', or: 'ଏପର୍ଯ୍ୟନ୍ତ କିଛି ଏଣ୍ଟ୍ରି ନାହିଁ।' },
  'limit.observation': {
    en: "{name}'s udhar would be {would}, above the limit {limit} you set.",
    hi: '{name} का उधार {would} हो जाएगा, आपकी तय सीमा {limit} से ऊपर।',
    or: '{name}ଙ୍କ ଉଧାର {would} ହେବ, ଆପଣ ଧାର୍ଯ୍ୟ କରିଥିବା ସୀମା {limit}ରୁ ଅଧିକ।',
  },
  'collect.title': { en: 'Udhar to collect', hi: 'वसूलने वाला उधार', or: 'ଆଦାୟ କରିବାକୁ ଥିବା ଉଧାର' },
  // HT-46: `{n|zero|one|other}`, filled by `fill` (DayParts). hi / or DRAFT, H13.
  'collect.days': {
    en: '{n|Owing since today|Owing for # day|Owing for # days}',
    hi: '{n|आज से बाकी|# दिन से बाकी|# दिन से बाकी}',
    or: '{n|ଆଜିଠାରୁ ବାକି|# ଦିନ ହେଲା ବାକି|# ଦିନ ହେଲା ବାକି}',
  },
  'collect.note': {
    en: 'Oldest first. Only you see this; nothing is sent to anyone.',
    hi: 'सबसे पुराना पहले। यह सिर्फ़ आप देखते हैं; किसी को कुछ नहीं भेजा जाता।',
    or: 'ସବୁଠୁ ପୁରୁଣା ପ୍ରଥମେ। ଏହା କେବଳ ଆପଣ ଦେଖନ୍ତି; କାହାକୁ କିଛି ପଠାଯାଏ ନାହିଁ।',
  },
  'p6.title': { en: 'Credit limit', hi: 'उधार सीमा', or: 'ଉଧାର ସୀମା' },
  'p6.prompt': {
    en: 'The most udhar you want {name} to carry. When a sale would go above it the app tells you. It never stops a sale.',
    hi: '{name} पर आप ज़्यादा से ज़्यादा कितना उधार रखना चाहते हैं। कोई बिक्री इससे ऊपर ले जाए तो ऐप बताएगा। बिक्री कभी नहीं रोकेगा।',
    or: '{name}ଙ୍କ ଉପରେ ଆପଣ ସର୍ବାଧିକ କେତେ ଉଧାର ରଖିବାକୁ ଚାହାଁନ୍ତି। କୌଣସି ବିକ୍ରି ଏହାଠାରୁ ଅଧିକ ନେଲେ ଆପ୍ କହିବ। ବିକ୍ରି କେବେ ବି ଅଟକାଇବ ନାହିଁ।',
  },
  'p6.current': { en: 'Limit now', hi: 'अभी की सीमा', or: 'ଏବର ସୀମା' },
  'p6.amount': { en: 'New limit', hi: 'नई सीमा', or: 'ନୂଆ ସୀମା' },
  'p6.save': { en: 'Save limit', hi: 'सीमा सेव करें', or: 'ସୀମା ସେଭ୍ କରନ୍ତୁ' },
  'p6.clear': { en: 'Remove the limit', hi: 'सीमा हटाएँ', or: 'ସୀମା ହଟାନ୍ତୁ' },
  's1.export': { en: 'Entries for your accountant', hi: 'अपने अकाउंटेंट के लिए एंट्री', or: 'ଆପଣଙ୍କ ହିସାବରକ୍ଷକଙ୍କ ପାଇଁ ଏଣ୍ଟ୍ରି' },
  's12.title': { en: 'Entries for your accountant', hi: 'अकाउंटेंट के लिए एंट्री', or: 'ହିସାବରକ୍ଷକଙ୍କ ପାଇଁ ଏଣ୍ଟ୍ରି' },
  's12.body': {
    en: "Choose a month. The phone makes a spreadsheet file (CSV) of that month's entries and every party's balance, and opens the share sheet. Nothing is sent to our server.",
    hi: 'महीना चुनें। फ़ोन उस महीने की एंट्री और हर पार्टी के बाकी की स्प्रेडशीट फ़ाइल (CSV) बनाकर शेयर खोलेगा। हमारे सर्वर पर कुछ नहीं जाता।',
    or: 'ମାସ ବାଛନ୍ତୁ। ଫୋନ୍ ସେହି ମାସର ଏଣ୍ଟ୍ରି ଓ ପ୍ରତି ପାର୍ଟିର ବାକିର ସ୍ପ୍ରେଡସିଟ୍ ଫାଇଲ୍ (CSV) ତିଆରି କରି ସେୟାର ଖୋଲିବ। ଆମ ସର୍ଭରକୁ କିଛି ଯାଏ ନାହିଁ।',
  },
  's12.months': { en: 'Months', hi: 'महीने', or: 'ମାସ' },
  's12.empty': {
    en: 'No entries yet, so there is nothing to share.',
    hi: 'अभी कोई एंट्री नहीं, इसलिए भेजने को कुछ नहीं।',
    or: 'ଏପର୍ଯ୍ୟନ୍ତ ଏଣ୍ଟ୍ରି ନାହିଁ, ତେଣୁ ପଠାଇବାକୁ କିଛି ନାହିଁ।',
  },
  's12.chooser': { en: 'Share entries', hi: 'एंट्री भेजें', or: 'ଏଣ୍ଟ୍ରି ପଠାନ୍ତୁ' },
  'refusal.noPhone': {
    en: 'This customer has no phone number saved, so WhatsApp cannot be opened for them. Add the number on this page.',
    hi: 'इस ग्राहक का फ़ोन नंबर सेव नहीं है, इसलिए WhatsApp नहीं खुल सकता। इसी पेज पर नंबर जोड़ें।',
    or: 'ଏହି ଗ୍ରାହକଙ୍କ ଫୋନ୍ ନମ୍ବର ସେଭ୍ ହୋଇନାହିଁ, ତେଣୁ WhatsApp ଖୋଲିପାରିବ ନାହିଁ। ଏହି ପୃଷ୍ଠାରେ ନମ୍ବର ଯୋଡ଼ନ୍ତୁ।',
  },
  'refusal.nothingDue': {
    en: 'Nothing is due from this customer, so there is nothing to remind.',
    hi: 'इस ग्राहक पर कुछ बाकी नहीं, इसलिए याद दिलाने को कुछ नहीं।',
    or: 'ଏହି ଗ୍ରାହକଙ୍କ ଉପରେ କିଛି ବାକି ନାହିଁ, ତେଣୁ ମନେ ପକାଇବାକୁ କିଛି ନାହିଁ।',
  },
  'refusal.share': {
    en: 'The share could not be opened. Nothing was sent.',
    hi: 'शेयर नहीं खुल सका। कुछ नहीं भेजा गया।',
    or: 'ସେୟାର ଖୋଲିପାରିଲା ନାହିଁ। କିଛି ପଠାଯାଇନାହିଁ।',
  },
  'refusal.creditLimit': {
    en: 'The limit was not saved. Type an amount above zero.',
    hi: 'सीमा सेव नहीं हुई। शून्य से ऊपर रकम लिखें।',
    or: 'ସୀମା ସେଭ୍ ହେଲା ନାହିଁ। ଶୂନରୁ ଅଧିକ ପରିମାଣ ଲେଖନ୍ତୁ।',
  },
  /* HT-37, HT-47: the item refusals, with their reason. hi / or DRAFT, H13. The figure follows as <Money>. */
  'refusal.itemOverSale': {
    en: 'That is more than what is left of the sale. Left to record:',
    hi: 'यह बिक्री में बची रकम से ज़्यादा है। दर्ज करने को बचा:',
    or: 'ଏହା ବିକ୍ରିରେ ବାକି ଥିବା ରାଶିଠାରୁ ଅଧିକ। ଲେଖିବାକୁ ବାକି:',
  },
  'refusal.itemDuplicate': {
    en: 'That item is already on your list.',
    hi: 'यह आइटम पहले से आपकी सूची में है।',
    or: 'ଏହି ଆଇଟମ୍ ଆଗରୁ ଆପଣଙ୍କ ତାଲିକାରେ ଅଛି।',
  },

  /* ---- S2 · The shop --------------------------------------------------- */
  's2.title': { en: 'Your shop', hi: 'आपकी दुकान', or: 'ଆପଣଙ୍କ ଦୋକାନ' },
  's2.name': { en: 'Shop name', hi: 'दुकान का नाम', or: 'ଦୋକାନ ନାମ' },
  's2.unnamed': { en: 'Not set', hi: 'निर्धारित नहीं', or: 'ନିର୍ଧାରିତ ନୁହଁ' },
  's2.note': {
    en: 'Your shop name appears on anything you export.',
    hi: 'आपकी दुकान का नाम हर निर्यात पर दिखता है।',
    or: 'ଆପଣଙ୍କ ଦୋକାନ ନାମ ପ୍ରତ୍ୟେକ ରପ୍ତାନିରେ ଦେଖାଯିବ।',
  },
  /*
   * Decision 1: the retailer-defined business day. hi / or are a DRAFT (H13).
   * The note says the two things he has to know: which day a late sale lands
   * in, and that a day already in the book keeps its hours.
   */
  's2.dayStart': { en: 'Day starts at', hi: 'दिन शुरू होता है', or: 'ଦିନ ଆରମ୍ଭ ହୁଏ' },
  's2.dayStartNote': {
    en: 'A sale before this time counts in the day before. Applies from the next day you open; days already recorded keep their hours.',
    hi: 'इस समय से पहले की बिक्री पिछले दिन में गिनी जाती है। अगले खुलने वाले दिन से लागू; पहले से दर्ज दिन अपने समय पर रहते हैं।',
    or: 'ଏହି ସମୟ ପୂର୍ବର ବିକ୍ରି ପୂର୍ବ ଦିନରେ ଗଣାଯିବ। ପରବର୍ତ୍ତୀ ଖୋଲୁଥିବା ଦିନଠାରୁ ଲାଗୁ; ପୂର୍ବରୁ ଲେଖାଥିବା ଦିନ ନିଜ ସମୟରେ ରହିବ।',
  },

  /* ---- S3 · Language and display --------------------------------------- */
  's3.title': { en: 'Language and screen', hi: 'भाषा और स्क्रीन', or: 'ଭାଷା ଓ ସ୍କ୍ରୀନ' },
  's3.language': { en: 'Language', hi: 'भाषा', or: 'ଭାଷା' },
  's3.display': { en: 'Screen', hi: 'स्क्रीन', or: 'ସ୍କ୍ରୀନ' },
  /*
   * Focus is NOT "the mode for old people". It exists because a cheap screen in
   * shop daylight is hard to read - a fact about the shop, not about the user.
   * Framing it as an accessibility setting is how people are made to refuse it,
   * so the words on the control name the SCREEN and never the eyesight.
   *
   * HT-29: X1 called this "Text size: Comfort / Focus" and Settings called it
   * "Screen: Normal / Bright sunlight" under a title about text size, and
   * "Bright sunlight" turned the screen dark. One setting, one name, on both
   * screens (X1 reads these keys too), and the options say what each one
   * does: Focus is the dark palette with larger type (tokens.ts). Internal ids
   * stay `comfort` / `focus`. hi / or are a DRAFT (H13).
   */
  's3.comfort': { en: 'Light', hi: 'हल्की', or: 'ହାଲୁକା' },
  's3.focus': { en: 'Dark, bigger text', hi: 'गहरी, बड़े अक्षर', or: 'ଗାଢ଼, ବଡ଼ ଅକ୍ଷର' },

  /* ---- S4 · Privacy and consent ---------------------------------------- */
  's4.title': { en: 'Privacy and consent', hi: 'निजता और सहमति', or: 'ଗୋପନୀୟତା ଓ ସହମତି' },
  's4.review': {
    en: 'What you agreed to',
    hi: 'आपने किस पर सहमति दी',
    or: 'ଆପଣ କାହାକୁ ସହମତି ଦେଇଛନ୍ତି',
  },
  /*
   * DPDP: withdrawal must be as easy as giving. One tap from the hub reaches
   * the same screen that took the consent, with every purpose still switchable.
   */
  's4.withdraw': {
    en: 'You can turn any of these off at any time. Turning one off is as easy as turning it on.',
    hi: 'आप इनमें से किसी को कभी भी बंद कर सकते हैं।',
    or: 'ଆପଣ ଏମାନଙ୍କ ମଧ୍ୟରୁ ଯେକୌଣସିକୁ ଯେକୌଣସି ସମୟରେ ବନ୍ଦ କରିପାରିବେ।',
  },

  /* ---- S5 · About ------------------------------------------------------ */
  's5.title': { en: 'About this app', hi: 'इस ऐप के बारे में', or: 'ଏହି ଆପ୍ ବିଷୟରେ' },
  's5.version': { en: 'Version', hi: 'संस्करण', or: 'ସଂସ୍କରଣ' },
  's5.licences': {
    en: 'Open-source licences',
    hi: 'ओपन-सोर्स लाइसेंस',
    or: 'ଓପେନ୍-ସୋର୍ସ ଲାଇସେନ୍ସ',
  },
  /*
   * L-15. LEGAL-AUDIT §7 requires this sentence on the export screen and in the
   * header of every exported file. It is here too, because About is the screen
   * a shopkeeper's accountant opens first.
   */
  's5.notTax': {
    en: 'This is a record of entries made in your shop book. It is not a tax document.',
    hi: 'यह आपकी दुकान की बही का रिकॉर्ड है। यह कर दस्तावेज़ नहीं है।',
    or: 'ଏହା ଆପଣଙ୍କ ଦୋକାନ ଖାତାର ଲେଖା। ଏହା ଟ୍ୟାକ୍ସ ଦଲିଲ ନୁହେଁ।',
  },
  /* F-23: the policy link Play requires in the app (reference S10). hi / or DRAFT. */
  's5.privacy': { en: 'Privacy policy', hi: 'गोपनीयता नीति', or: 'ଗୋପନୀୟତା ନୀତି' },
  's5.terms': { en: 'Terms of service', hi: 'सेवा की शर्तें', or: 'ସେବା ସର୍ତ୍ତାବଳୀ' },
  's5.webDelete': {
    en: 'You can also delete your account from the web:',
    hi: 'आप वेब से भी अपना खाता मिटा सकते हैं:',
    or: 'ଆପଣ ୱେବରୁ ମଧ୍ୟ ନିଜ ଖାତା ମିଟାଇପାରିବେ:',
  },

  /* ---- S6 · Help and the grievance officer ----------------------------- */
  's6.title': { en: 'Help and contact', hi: 'सहायता और संपर्क', or: 'ସହାୟତା ଓ ଯୋଗାଯୋଗ' },
  /*
   * DPDP requires a NAMED grievance officer who can actually be reached. The
   * name and the address are human-blocked, and this screen renders what it is
   * given rather than inventing a contact - a fabricated officer is worse than
   * an obviously missing one, and it is the kind of detail that gets invented
   * to make a screen look finished.
   */
  's6.grievance': { en: 'Grievance officer', hi: 'शिकायत अधिकारी', or: 'ଅଭିଯୋଗ ଅଧିକାରୀ' },
  's6.pending': {
    en: 'Not yet published. This app will not show a contact it has not been given.',
    hi: 'अभी प्रकाशित नहीं।',
    or: 'ଏପର୍ଯ୍ୟନ୍ତ ପ୍ରକାଶିତ ନୁହେଁ।',
  },

  /* ---- S7, S8 · Deleting the account ----------------------------------- */
  's7.title': { en: 'Delete this account', hi: 'यह खाता मिटाएँ', or: 'ଏହି ଖାତା ମିଟାନ୍ତୁ' },
  's7.what': {
    en: 'Everything in your shop book is deleted: every day, every entry, and every name you have recorded.',
    hi: 'आपकी बही का सब कुछ मिट जाएगा।',
    or: 'ଆପଣଙ୍କ ଖାତାର ସବୁ କିଛି ମିଟିଯିବ।',
  },
  's7.grace': {
    en: 'Signing in again within 30 days cancels the deletion. After that it cannot be undone.',
    hi: '30 दिन के भीतर फिर से साइन इन करने पर यह रद्द हो जाता है।',
    or: '30 ଦିନ ଭିତରେ ପୁଣି ସାଇନ୍ ଇନ୍ କଲେ ଏହା ବାତିଲ୍ ହୋଇଯାଏ।',
  },
  's7.continue': { en: 'Continue', hi: 'जारी रखें', or: 'ଜାରି ରଖନ୍ତୁ' },
  's8.title': { en: 'Are you sure?', hi: 'क्या आप निश्चित हैं?', or: 'ଆପଣ ନିଶ୍ଚିତ କି?' },
  's8.confirm': { en: 'Delete everything', hi: 'सब कुछ मिटाएँ', or: 'ସବୁ ମିଟାନ୍ତୁ' },
  's8.cancel': { en: 'Keep my book', hi: 'मेरी बही रहने दें', or: 'ମୋ ଖାତା ରହୁ' },
  /*
   * WHAT HE LOSES, NAMED. A confirmation that only asks "are you sure" is a
   * speed bump; one that says he is still owed money this book is the only
   * record of is a reason. It is shown only when it is TRUE.
   */
  's8.owed': {
    en: 'You are still owed money that this book is the only record of.',
    hi: 'इस बही में अभी भी उधार दर्ज है।',
    or: 'ଏହି ଖାତାରେ ଏପର୍ଯ୍ୟନ୍ତ ଉଧାର ଲେଖା ଅଛି।',
  },
  /*
   * F-22: what pressing it will do, and then what it did. The phone's book is
   * wiped once the server accepts, and no sign-in brings it back to this phone,
   * so the reference's "nothing is lost until the 30 days pass" is NOT said:
   * it is true of the server and false of the phone. hi / or DRAFT (H13).
   */
  's8.phoneNow': {
    en: 'The book on this phone is deleted as soon as our server accepts the request.',
    hi: 'हमारा सर्वर अनुरोध स्वीकार करते ही इस फ़ोन की बही मिट जाती है।',
    or: 'ଆମ ସର୍ଭର ଅନୁରୋଧ ଗ୍ରହଣ କରିବା ମାତ୍ରେ ଏହି ଫୋନର ଖାତା ମିଟିଯାଏ।',
  },
  's8.localOnly': {
    en: 'This phone is not signed in. Only the book on this phone is deleted - no account on our server is touched. To delete that too, sign in first, or use the web page listed in About.',
    hi: 'यह फ़ोन साइन इन नहीं है। सिर्फ़ इस फ़ोन की बही मिटेगी - हमारे सर्वर पर कोई खाता नहीं छुआ जाएगा। उसे भी मिटाने के लिए पहले साइन इन करें, या "इस ऐप के बारे में" में दिया वेब पेज इस्तेमाल करें।',
    or: 'ଏହି ଫୋନ୍ ସାଇନ୍ ଇନ୍ ହୋଇନାହିଁ। କେବଳ ଏହି ଫୋନର ଖାତା ମିଟିବ - ଆମ ସର୍ଭରରେ କୌଣସି ଖାତା ଛୁଆଁଯିବ ନାହିଁ। ତାହାକୁ ମଧ୍ୟ ମିଟାଇବାକୁ ପ୍ରଥମେ ସାଇନ୍ ଇନ୍ କରନ୍ତୁ, କିମ୍ବା "ଏହି ଆପ୍ ବିଷୟରେ"ରେ ଥିବା ୱେବ ପେଜ ବ୍ୟବହାର କରନ୍ତୁ।',
  },
  's8.scheduledTitle': { en: 'Deletion requested', hi: 'मिटाने का अनुरोध हो गया', or: 'ମିଟାଇବା ଅନୁରୋଧ ହୋଇଗଲା' },
  's8.scheduled': {
    en: 'Your account is deleted after 30 days. Sign in again any time before then to cancel.',
    hi: 'आपका खाता 30 दिन बाद मिटेगा। उससे पहले कभी भी फिर से साइन इन करके इसे रद्द करें।',
    or: 'ଆପଣଙ୍କ ଖାତା 30 ଦିନ ପରେ ମିଟିବ। ତା ପୂର୍ବରୁ ଯେକୌଣସି ସମୟରେ ପୁଣି ସାଇନ୍ ଇନ୍ କରି ଏହାକୁ ବାତିଲ୍ କରନ୍ତୁ।',
  },
  's8.erasesOn': { en: 'Erased on', hi: 'मिटने की तारीख', or: 'ମିଟିବା ତାରିଖ' },
  's8.phoneWiped': {
    en: 'The book on this phone has been deleted now. Cancelling keeps your account on our server, but does not bring the book back to this phone.',
    hi: 'इस फ़ोन की बही अभी मिटा दी गई है। रद्द करने पर हमारे सर्वर पर आपका खाता बचा रहता है, पर बही इस फ़ोन पर वापस नहीं आती।',
    or: 'ଏହି ଫୋନର ଖାତା ଏବେ ମିଟାଇ ଦିଆଗଲା। ବାତିଲ୍ କଲେ ଆମ ସର୍ଭରରେ ଆପଣଙ୍କ ଖାତା ରହିବ, କିନ୍ତୁ ଖାତା ଏହି ଫୋନକୁ ଫେରିବ ନାହିଁ।',
  },
  's8.localTitle': { en: 'Deleted from this phone', hi: 'इस फ़ोन से मिटाया गया', or: 'ଏହି ଫୋନରୁ ମିଟାଗଲା' },
  's8.localDone': {
    en: 'The book on this phone has been deleted. This did not send a deletion request to our server.',
    hi: 'इस फ़ोन की बही मिटा दी गई है। इससे हमारे सर्वर को मिटाने का कोई अनुरोध नहीं गया।',
    or: 'ଏହି ଫୋନର ଖାତା ମିଟାଇ ଦିଆଗଲା। ଏଥିରୁ ଆମ ସର୍ଭରକୁ କୌଣସି ମିଟାଇବା ଅନୁରୋଧ ଯାଇନାହିଁ।',
  },
  's8.done': { en: 'Done', hi: 'ठीक है', or: 'ଠିକ ଅଛି' },

  /* ---- the party picker, and the reason a commit is not yet reachable ---- */
  /*
   * THIS COPY EXISTS BECAUSE THE APP USED TO SAY NOTHING AT ALL.
   *
   * Credit, Collect and Pay all commit to sections the engine refuses without a
   * named person. Nothing could name one, `Session.commit` swallowed the
   * refusal into `lastRefusal`, and no screen rendered it. The shopkeeper tapped
   * Add and the app did nothing - silently, every time. `party.required` is the
   * sentence that was missing, and it belongs BESIDE the disabled button rather
   * than after a tap that was never going to work.
   */
  'party.chooseCustomer': {
    en: 'Choose the customer',
    hi: 'ग्राहक चुनें',
    or: 'ଗ୍ରାହକ ବାଛନ୍ତୁ',
  },
  'party.chooseSupplier': {
    en: 'Choose the supplier',
    hi: 'आपूर्तिकर्ता चुनें',
    or: 'ଯୋଗାଣକାରୀ ବାଛନ୍ତୁ',
  },
  'party.customer': { en: 'Customer', hi: 'ग्राहक', or: 'ଗ୍ରାହକ' },
  'party.supplier': { en: 'Supplier', hi: 'आपूर्तिकर्ता', or: 'ଯୋଗାଣକାରୀ' },
  /** Shown on the row when the entry may name somebody but does not have to. */
  'party.optional': { en: 'Optional', hi: 'वैकल्पिक', or: 'ବୈକଳ୍ପିକ' },
  'party.required': {
    en: 'Choose who this is for before adding it.',
    hi: 'जोड़ने से पहले चुनें कि यह किसके लिए है।',
    or: 'ଯୋଡ଼ିବା ପୂର୍ବରୁ ବାଛନ୍ତୁ ଏହା କାହା ପାଇଁ।',
  },
  'party.noCustomers': {
    en: 'No customers in the book yet.',
    hi: 'अभी खाते में कोई ग्राहक नहीं।',
    or: 'ଖାତାରେ ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଗ୍ରାହକ ନାହାଁନ୍ତି।',
  },
  'party.noSuppliers': {
    en: 'No suppliers in the book yet.',
    hi: 'अभी खाते में कोई आपूर्तिकर्ता नहीं।',
    or: 'ଖାତାରେ ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଯୋଗାଣକାରୀ ନାହାଁନ୍ତି।',
  },
  'party.cancel': { en: 'Cancel', hi: 'रद्द करें', or: 'ବାତିଲ୍ କରନ୍ତୁ' },

  /*
   * F-10 - adding a party from the picker. Hindi and Odia are DRAFT (H13),
   * written by an agent, not reviewed by a native speaker.
   */
  'party.addCustomer': { en: 'Add new customer', hi: 'नया ग्राहक जोड़ें', or: 'ନୂଆ ଗ୍ରାହକ ଯୋଡ଼ନ୍ତୁ' },
  'party.addSupplier': {
    en: 'Add new supplier',
    hi: 'नया आपूर्तिकर्ता जोड़ें',
    or: 'ନୂଆ ଯୋଗାଣକାରୀ ଯୋଡ଼ନ୍ତୁ',
  },
  'party.newCustomer': { en: 'New customer', hi: 'नया ग्राहक', or: 'ନୂଆ ଗ୍ରାହକ' },
  'party.newSupplier': { en: 'New supplier', hi: 'नया आपूर्तिकर्ता', or: 'ନୂଆ ଯୋଗାଣକାରୀ' },
  'party.name': { en: 'Name', hi: 'नाम', or: 'ନାମ' },
  'party.phone': {
    en: 'Mobile number (optional)',
    hi: 'मोबाइल नंबर (वैकल्पिक)',
    or: 'ମୋବାଇଲ୍ ନମ୍ବର (ବୈକଳ୍ପିକ)',
  },
  'party.save': { en: 'Save and choose', hi: 'सहेजें और चुनें', or: 'ସଞ୍ଚୟ କରି ବାଛନ୍ତୁ' },
  'party.backToList': { en: 'Back to the list', hi: 'सूची पर वापस', or: 'ତାଲିକାକୁ ଫେରନ୍ତୁ' },
  'party.refusal.name': {
    en: 'Type the name first.',
    hi: 'पहले नाम लिखें।',
    or: 'ପ୍ରଥମେ ନାମ ଲେଖନ୍ତୁ।',
  },
  'party.refusal.phone': {
    en: 'A mobile number is 10 digits, starting 6, 7, 8 or 9. Or leave it empty.',
    hi: 'मोबाइल नंबर 10 अंकों का होता है, 6, 7, 8 या 9 से शुरू। या खाली छोड़ें।',
    or: 'ମୋବାଇଲ୍ ନମ୍ବର 10 ଅଙ୍କର, 6, 7, 8 କିମ୍ବା 9ରୁ ଆରମ୍ଭ। କିମ୍ବା ଖାଲି ଛାଡ଼ନ୍ତୁ।',
  },

  /* ---- shared across the settings family -------------------------------- */
  'settings.open': { en: 'Open', hi: 'खोलें', or: 'ଖୋଲନ୍ତୁ' },
  /* ---- the A-series: sign-in. English from Phone.dc.html / store.js; Hindi
   * and Odia are DRAFTS like every other string here (H13). Two lines differ
   * from the reference on purpose: `a5.mismatch.body` drops "3 attempts left"
   * (a count the server never sends), and `a8.pending` says the entries STAY,
   * because logging out here does not delete them. ---- */
  'a1.continue': { en: 'Continue', hi: 'आगे बढ़ें', or: 'ଆଗକୁ ବଢ଼ନ୍ତୁ' },
  'a2.title': { en: 'Choose your language', hi: 'अपनी भाषा चुनें', or: 'ଆପଣଙ୍କ ଭାଷା ବାଛନ୍ତୁ' },
  'a3.bar': { en: 'Your phone number', hi: 'आपका फ़ोन नंबर', or: 'ଆପଣଙ୍କ ଫୋନ୍ ନମ୍ବର' },
  'a3.step': { en: 'Step 1 of 2', hi: 'चरण 1 / 2', or: 'ପର୍ଯ୍ୟାୟ 1 / 2' },
  'a3.help': {
    en: 'We will send a {digits}-digit code to confirm it is you.',
    hi: 'यह आप ही हैं, यह पक्का करने के लिए हम {digits} अंकों का कोड भेजेंगे।',
    or: 'ଏହା ଆପଣ ବୋଲି ନିଶ୍ଚିତ କରିବାକୁ ଆମେ {digits} ଅଙ୍କର କୋଡ୍ ପଠାଇବୁ।',
  },
  /* HT-25: ten digits that are not a mobile number, said quietly. hi / or are a DRAFT (H13). */
  'a3.notMobile': {
    en: 'An Indian mobile number starts with 6, 7, 8 or 9. Check the first digit.',
    hi: 'भारतीय मोबाइल नंबर 6, 7, 8 या 9 से शुरू होता है। पहला अंक जाँचें।',
    or: 'ଭାରତୀୟ ମୋବାଇଲ୍ ନମ୍ବର 6, 7, 8 କିମ୍ବା 9 ରେ ଆରମ୍ଭ ହୁଏ। ପ୍ରଥମ ଅଙ୍କ ଯାଞ୍ଚ କରନ୍ତୁ।',
  },
  'a3.send': { en: 'Send code', hi: 'कोड भेजें', or: 'କୋଡ୍ ପଠାନ୍ତୁ' },
  'a3.sending': { en: 'Sending…', hi: 'भेज रहे हैं…', or: 'ପଠାଉଛୁ…' },
  'a3.changed': {
    en: 'I changed my number.',
    hi: 'मैंने अपना नंबर बदल लिया है।',
    or: 'ମୁଁ ମୋ ନମ୍ବର ବଦଳାଇଛି।',
  },
  'a4.bar': { en: 'Verify your number', hi: 'अपना नंबर पक्का करें', or: 'ଆପଣଙ୍କ ନମ୍ବର ଯାଞ୍ଚ କରନ୍ତୁ' },
  'a4.step': { en: 'Step 2 of 2', hi: 'चरण 2 / 2', or: 'ପର୍ଯ୍ୟାୟ 2 / 2' },
  'a4.title': { en: 'Enter the code', hi: 'कोड डालें', or: 'କୋଡ୍ ଦିଅନ୍ତୁ' },
  'a4.sentTo': {
    en: 'Sent to +91 {phone}',
    hi: '+91 {phone} पर भेजा गया',
    or: '+91 {phone} କୁ ପଠାଗଲା',
  },
  'a4.edit': { en: 'Edit', hi: 'बदलें', or: 'ବଦଳାନ୍ତୁ' },
  'a4.checking': { en: 'Checking…', hi: 'जाँच रहे हैं…', or: 'ଯାଞ୍ଚ କରୁଛୁ…' },
  'a4.resend': { en: 'Resend code', hi: 'कोड दोबारा भेजें', or: 'କୋଡ୍ ପୁଣି ପଠାନ୍ତୁ' },
  'a4.trouble': {
    en: 'Trouble? I changed my number.',
    hi: 'दिक्कत? मैंने अपना नंबर बदल लिया है।',
    or: 'ଅସୁବିଧା? ମୁଁ ମୋ ନମ୍ବର ବଦଳାଇଛି।',
  },
  'a5.bar': { en: 'OTP problems', hi: 'OTP में दिक्कत', or: 'OTP ସମସ୍ୟା' },
  'a5.mismatch.title': {
    en: "That code doesn't match.",
    hi: 'यह कोड मेल नहीं खाता।',
    or: 'ଏହି କୋଡ୍ ମେଳ ଖାଉନାହିଁ।',
  },
  'a5.mismatch.body': {
    en: 'Check the {digits} digits and try again.',
    hi: '{digits} अंक जाँचें और फिर कोशिश करें।',
    or: '{digits}ଟି ଅଙ୍କ ଯାଞ୍ଚ କରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
  },
  'a5.expired.title': {
    en: 'This code expired.',
    hi: 'इस कोड का समय खत्म हो गया।',
    or: 'ଏହି କୋଡ୍‌ର ସମୟ ସରିଗଲା।',
  },
  'a5.expired.body': {
    en: "Codes are valid for {minutes} minutes. We'll send a new one.",
    hi: 'कोड {minutes} मिनट तक चलता है। हम नया भेज देंगे।',
    or: 'କୋଡ୍ {minutes} ମିନିଟ୍ ପର୍ଯ୍ୟନ୍ତ ଚାଲେ। ଆମେ ନୂଆ ପଠାଇଦେବୁ।',
  },
  'a5.expired.cta': { en: 'Send a new code', hi: 'नया कोड भेजें', or: 'ନୂଆ କୋଡ୍ ପଠାନ୍ତୁ' },
  'a5.locked.title': { en: 'Too many tries.', hi: 'बहुत बार कोशिश हुई।', or: 'ବହୁତ ଥର ଚେଷ୍ଟା ହେଲା।' },
  'a5.locked.body': {
    en: 'For your safety, try again in {minutes} minutes.',
    hi: 'आपकी सुरक्षा के लिए {minutes} मिनट बाद फिर कोशिश करें।',
    or: 'ଆପଣଙ୍କ ସୁରକ୍ଷା ପାଇଁ {minutes} ମିନିଟ୍ ପରେ ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
  },
  'a5.locked.later': {
    en: 'For your safety, try again later.',
    hi: 'आपकी सुरक्षा के लिए बाद में फिर कोशिश करें।',
    or: 'ଆପଣଙ୍କ ସୁରକ୍ଷା ପାଇଁ ପରେ ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
  },
  'a5.noCode.title': { en: 'Still no code?', hi: 'अब भी कोड नहीं आया?', or: 'ଏବେ ବି କୋଡ୍ ଆସିନାହିଁ?' },
  'a5.noCode.body': {
    en: 'This can happen with some networks after two resends. We can help over WhatsApp.',
    hi: 'कुछ नेटवर्क पर दो बार दोबारा भेजने के बाद भी ऐसा हो सकता है। हम WhatsApp पर मदद कर सकते हैं।',
    or: 'କିଛି ନେଟୱର୍କରେ ଦୁଇ ଥର ପୁଣି ପଠାଇବା ପରେ ବି ଏପରି ହୋଇପାରେ। ଆମେ WhatsApp ରେ ସାହାଯ୍ୟ କରିପାରିବୁ।',
  },
  'a6.bar': { en: 'Session expired', hi: 'सत्र समाप्त', or: 'ସେସନ୍ ଶେଷ' },
  'a6.body': {
    en: 'This device signed out — usually because you signed in somewhere else. Your book is untouched and safe on our server.',
    hi: 'यह फ़ोन साइन आउट हो गया — अक्सर इसलिए कि आपने कहीं और साइन इन किया। आपका खाता सुरक्षित है और हमारे सर्वर पर है।',
    or: 'ଏହି ଫୋନ୍ ସାଇନ୍ ଆଉଟ୍ ହୋଇଗଲା — ସାଧାରଣତଃ ଆପଣ ଅନ୍ୟ କେଉଁଠି ସାଇନ୍ ଇନ୍ କରିଥିବାରୁ। ଆପଣଙ୍କ ଖାତା ସୁରକ୍ଷିତ ଓ ଆମ ସର୍ଭରରେ ଅଛି।',
  },
  'a6.verify': {
    en: 'Verify with +91 {phone}',
    hi: '+91 {phone} से पक्का करें',
    or: '+91 {phone} ସହ ଯାଞ୍ଚ କରନ୍ତୁ',
  },
  'a7.bar': { en: 'Change your number', hi: 'अपना नंबर बदलें', or: 'ଆପଣଙ୍କ ନମ୍ବର ବଦଳାନ୍ତୁ' },
  'a7.sub': { en: 'Two ways to fix this', hi: 'ठीक करने के दो तरीके', or: 'ଠିକ୍ କରିବାର ଦୁଇଟି ଉପାୟ' },
  'a7.intro': {
    en: 'SIM changed, phone lost, or a new device — pick what fits.',
    hi: 'सिम बदला, फ़ोन खोया, या नया फ़ोन — जो सही हो वह चुनें।',
    or: 'SIM ବଦଳିଲା, ଫୋନ୍ ହଜିଲା, କିମ୍ବା ନୂଆ ଫୋନ୍ — ଯାହା ଠିକ୍ ତାହା ବାଛନ୍ତୁ।',
  },
  'a7.haveOld': {
    en: 'I still have my old number',
    hi: 'मेरे पास पुराना नंबर अभी भी है',
    or: 'ମୋ ପାଖରେ ପୁରୁଣା ନମ୍ବର ଏବେ ବି ଅଛି',
  },
  'a7.haveOld.sub': {
    en: 'Verify it, then add the new one · a few minutes',
    hi: 'उसे पक्का करें, फिर नया जोड़ें · कुछ मिनट',
    or: 'ତାହା ଯାଞ୍ଚ କରନ୍ତୁ, ତାପରେ ନୂଆଟି ଯୋଡ଼ନ୍ତୁ · କିଛି ମିନିଟ୍',
  },
  'a7.noOld': {
    en: "I don't have it anymore",
    hi: 'अब वह नंबर मेरे पास नहीं है',
    or: 'ସେ ନମ୍ବର ଆଉ ମୋ ପାଖରେ ନାହିଁ',
  },
  /*
   * HT-20: "Message us" named no contact. There is no support number or
   * monitored mailbox yet (H6, human-blocked), so the copy says so and points
   * at the one real route: the privacy page served by the API. No WhatsApp
   * promise, no time promise, no invented address. hi / or are a DRAFT (H13).
   */
  'a7.noOld.sub': {
    en: 'We check it is you by hand',
    hi: 'हम आपको खुद जाँचते हैं',
    or: 'ଆମେ ଆପଣଙ୍କୁ ହାତରେ ଯାଞ୍ଚ କରୁ',
  },
  'a7.handoff': {
    en: 'Without the old number we have to check it is you by hand. A support line for this is not set up yet. Until it is, the privacy page says how to write to us: give your shop name and your old number.',
    hi: 'पुराने नंबर के बिना हमें आपको खुद जाँचना होगा। इसके लिए सहायता लाइन अभी शुरू नहीं हुई है। तब तक निजता पेज पर लिखा है कि हमें कैसे लिखें: अपनी दुकान का नाम और पुराना नंबर बताएँ।',
    or: 'ପୁରୁଣା ନମ୍ବର ବିନା ଆମକୁ ଆପଣଙ୍କୁ ହାତରେ ଯାଞ୍ଚ କରିବାକୁ ପଡ଼ିବ। ଏଥିପାଇଁ ସହାୟତା ଲାଇନ୍ ଏପର୍ଯ୍ୟନ୍ତ ଆରମ୍ଭ ହୋଇନାହିଁ। ସେପର୍ଯ୍ୟନ୍ତ ଗୋପନୀୟତା ପୃଷ୍ଠାରେ ଆମକୁ କିପରି ଲେଖିବେ ଲେଖାଅଛି: ଦୋକାନ ନାମ ଓ ପୁରୁଣା ନମ୍ବର ଦିଅନ୍ତୁ।',
  },
  'a7.help': { en: 'Open the privacy page', hi: 'निजता पेज खोलें', or: 'ଗୋପନୀୟତା ପୃଷ୍ଠା ଖୋଲନ୍ତୁ' },
  'a8.bar': { en: 'Log out?', hi: 'लॉग आउट करें?', or: 'ଲଗ୍ ଆଉଟ୍ କରିବେ?' },
  'a8.title': { en: 'Log out of {shop}?', hi: '{shop} से लॉग आउट करें?', or: '{shop} ରୁ ଲଗ୍ ଆଉଟ୍ କରିବେ?' },
  'a8.body': {
    en: 'Signing back in needs a new SMS code to +91 {phone}.',
    hi: 'फिर से साइन इन के लिए +91 {phone} पर नया SMS कोड चाहिए।',
    or: 'ପୁଣି ସାଇନ୍ ଇନ୍ ପାଇଁ +91 {phone} କୁ ନୂଆ SMS କୋଡ୍ ଦରକାର।',
  },
  'a8.pending': {
    en: '{n} entries not yet synced — they stay on this phone and upload when you sign in again with this number.',
    hi: '{n} एंट्री अभी सिंक नहीं हुईं — वे इसी फ़ोन पर रहेंगी और इसी नंबर से फिर साइन इन करने पर अपलोड होंगी।',
    or: '{n}ଟି ଏଣ୍ଟ୍ରି ଏପର୍ଯ୍ୟନ୍ତ ସିଙ୍କ୍ ହୋଇନାହିଁ — ସେଗୁଡ଼ିକ ଏହି ଫୋନରେ ରହିବ ଓ ଏହି ନମ୍ବରରେ ପୁଣି ସାଇନ୍ ଇନ୍ କଲେ ଅପଲୋଡ୍ ହେବ।',
  },
  'a8.pendingOne': {
    en: '1 entry not yet synced — it stays on this phone and uploads when you sign in again with this number.',
    hi: '1 एंट्री अभी सिंक नहीं हुई — वह इसी फ़ोन पर रहेगी और इसी नंबर से फिर साइन इन करने पर अपलोड होगी।',
    or: '1ଟି ଏଣ୍ଟ୍ରି ଏପର୍ଯ୍ୟନ୍ତ ସିଙ୍କ୍ ହୋଇନାହିଁ — ତାହା ଏହି ଫୋନରେ ରହିବ ଓ ଏହି ନମ୍ବରରେ ପୁଣି ସାଇନ୍ ଇନ୍ କଲେ ଅପଲୋଡ୍ ହେବ।',
  },
  'a8.saved': {
    en: 'Everything is saved. Nothing will be lost.',
    hi: 'सब कुछ सहेजा हुआ है। कुछ नहीं खोएगा।',
    or: 'ସବୁକିଛି ସଞ୍ଚିତ ଅଛି। କିଛି ହଜିବ ନାହିଁ।',
  },
  'a8.stay': { en: 'Stay signed in', hi: 'साइन इन रहें', or: 'ସାଇନ୍ ଇନ୍ ରୁହନ୍ତୁ' },
  'a8.logout': { en: 'Log out', hi: 'लॉग आउट', or: 'ଲଗ୍ ଆଉଟ୍' },
  'auth.offline': {
    en: "You're offline — a code can't be sent or checked without signal. Nothing you typed is lost. Try again when you're back.",
    hi: 'आप ऑफ़लाइन हैं — सिग्नल के बिना कोड भेजा या जाँचा नहीं जा सकता। आपने जो लिखा वह नहीं खोया। सिग्नल आने पर फिर कोशिश करें।',
    or: 'ଆପଣ ଅଫଲାଇନ୍ ଅଛନ୍ତି — ସିଗ୍ନାଲ୍ ବିନା କୋଡ୍ ପଠାଇବା କିମ୍ବା ଯାଞ୍ଚ କରିହେବ ନାହିଁ। ଆପଣ ଯାହା ଲେଖିଛନ୍ତି ତାହା ହଜିନାହିଁ। ସିଗ୍ନାଲ୍ ଆସିଲେ ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
  },
  'auth.failed': {
    en: 'Something went wrong on our side. Nothing you typed is lost. Try again.',
    hi: 'हमारी तरफ़ से कुछ गड़बड़ हुई। आपने जो लिखा वह नहीं खोया। फिर कोशिश करें।',
    or: 'ଆମ ପଟରୁ କିଛି ଭୁଲ୍ ହେଲା। ଆପଣ ଯାହା ଲେଖିଛନ୍ତି ତାହା ହଜିନାହିଁ। ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
  },
  's1.signIn': { en: 'Sign in', hi: 'साइन इन करें', or: 'ସାଇନ୍ ଇନ୍ କରନ୍ତୁ' },

  /*
   * ---- 2026-10-25 · the Today flow rebuilt to the Claude Design reference ----
   *
   * DRAFT, like every Hindi and Odia line above (COPY_REVIEW_STATE). `{done}`,
   * `{total}`, `{n}` and `{section}` are filled by the screen with Latin digits
   * or another phrase from this table; the word order around them is per
   * language because "8 of 10" is "10 में से 8" in Hindi.
   */
  't1.progress': { en: '{done} of {total}', hi: '{total} में से {done}', or: '{total} ରୁ {done}' },
  't1.checkPending': {
    en: 'Cash check not done yet',
    hi: 'नकद जाँच अभी बाकी है',
    or: 'ନଗଦ ଯାଞ୍ଚ ଏପର୍ଯ୍ୟନ୍ତ ବାକି',
  },
  't1.checkReady': {
    en: 'All sections in · cash check unlocked',
    hi: 'सभी हिस्से भरे · नकद जाँच खुली',
    or: 'ସବୁ ଭାଗ ପୂରା · ନଗଦ ଯାଞ୍ଚ ଖୋଲା',
  },
  't1.openingMissing': {
    en: 'Opening cash not entered',
    hi: 'शुरुआती नकद दर्ज नहीं',
    or: 'ଆରମ୍ଭ ନଗଦ ଲେଖାଯାଇନାହିଁ',
  },
  't1.continueClose': {
    en: 'Continue day close',
    hi: 'दिन बंद करना जारी रखें',
    or: 'ଦିନ ବନ୍ଦ ଜାରି ରଖନ୍ତୁ',
  },
  't1.soFar': { en: 'Today so far', hi: 'आज अब तक', or: 'ଆଜି ଏପର୍ଯ୍ୟନ୍ତ' },
  't1.saved': { en: 'All saved on phone', hi: 'सब फ़ोन में सहेजा', or: 'ସବୁ ଫୋନରେ ସାଇତା' },
  't1.toSync': { en: '{n} waiting to sync', hi: '{n} सिंक होना बाकी', or: '{n} ସିଙ୍କ ବାକି' },
  't1.cashReceived': { en: 'Cash received', hi: 'नकद मिला', or: 'ନଗଦ ମିଳିଲା' },
  't1.cashPaid': { en: 'Cash paid', hi: 'नकद दिया', or: 'ନଗଦ ଦିଆଗଲା' },
  't1.expected': { en: 'Expected in box', hi: 'बॉक्स में होना चाहिए', or: 'ବାକ୍ସରେ ରହିବା ଉଚିତ' },
  't1.netSales': { en: 'Net sales', hi: 'कुल बिक्री', or: 'ମୋଟ ବିକ୍ରି' },
  't1.toCollect': { en: 'Udhar to collect', hi: 'वसूलने को उधार', or: 'ଆଦାୟ ବାକି ଉଧାର' },
  't1.owed': { en: 'You owe suppliers', hi: 'आपूर्तिकर्ताओं को देना', or: 'ଯୋଗାଣକାରୀଙ୍କୁ ଦେବାକୁ' },
  't1.addToToday': { en: 'Add to today', hi: 'आज में जोड़ें', or: 'ଆଜିରେ ଯୋଡ଼ନ୍ତୁ' },
  't1.pill.open': { en: 'Open', hi: 'खुला', or: 'ଖୋଲା' },
  't1.pill.ready': { en: 'Ready', hi: 'तैयार', or: 'ପ୍ରସ୍ତୁତ' },
  't1.pill.closed': { en: 'Closed', hi: 'बंद', or: 'ବନ୍ଦ' },
  /*
   * A DERIVED OBSERVATION, NOT AN INSTRUCTION (CLAUDE.md, "No inference in
   * data entry"). It is shown only when cash paid exceeds cash received - two
   * engine figures already on the screen - and it asks him to look, never to act.
   */
  't1.obs.title': {
    en: 'More cash went out than came in today.',
    hi: 'आज जितना नकद आया, उससे ज़्यादा गया।',
    or: 'ଆଜି ଯେତେ ନଗଦ ଆସିଲା, ତାଠୁ ଅଧିକ ଗଲା।',
  },
  't1.obs.body': {
    en: 'Worth a look before you count the box.',
    hi: 'बॉक्स गिनने से पहले एक बार देख लें।',
    or: 'ବାକ୍ସ ଗଣିବା ପୂର୍ବରୁ ଥରେ ଦେଖିନିଅନ୍ତୁ।',
  },
  /* The date line, from the stored ISO date. Sunday is 0, as `getUTCDay` has it. */
  't1.day.0': { en: 'Sunday', hi: 'रविवार', or: 'ରବିବାର' },
  't1.day.1': { en: 'Monday', hi: 'सोमवार', or: 'ସୋମବାର' },
  't1.day.2': { en: 'Tuesday', hi: 'मंगलवार', or: 'ମଙ୍ଗଳବାର' },
  't1.day.3': { en: 'Wednesday', hi: 'बुधवार', or: 'ବୁଧବାର' },
  't1.day.4': { en: 'Thursday', hi: 'गुरुवार', or: 'ଗୁରୁବାର' },
  't1.day.5': { en: 'Friday', hi: 'शुक्रवार', or: 'ଶୁକ୍ରବାର' },
  't1.day.6': { en: 'Saturday', hi: 'शनिवार', or: 'ଶନିବାର' },
  't1.month.1': { en: 'January', hi: 'जनवरी', or: 'ଜାନୁଆରୀ' },
  't1.month.2': { en: 'February', hi: 'फ़रवरी', or: 'ଫେବୃଆରୀ' },
  't1.month.3': { en: 'March', hi: 'मार्च', or: 'ମାର୍ଚ୍ଚ' },
  't1.month.4': { en: 'April', hi: 'अप्रैल', or: 'ଅପ୍ରେଲ' },
  't1.month.5': { en: 'May', hi: 'मई', or: 'ମଇ' },
  't1.month.6': { en: 'June', hi: 'जून', or: 'ଜୁନ' },
  't1.month.7': { en: 'July', hi: 'जुलाई', or: 'ଜୁଲାଇ' },
  't1.month.8': { en: 'August', hi: 'अगस्त', or: 'ଅଗଷ୍ଟ' },
  't1.month.9': { en: 'September', hi: 'सितंबर', or: 'ସେପ୍ଟେମ୍ବର' },
  't1.month.10': { en: 'October', hi: 'अक्टूबर', or: 'ଅକ୍ଟୋବର' },
  't1.month.11': { en: 'November', hi: 'नवंबर', or: 'ନଭେମ୍ବର' },
  't1.month.12': { en: 'December', hi: 'दिसंबर', or: 'ଡିସେମ୍ବର' },

  't2.nothingCarried': {
    en: 'Nothing carried over yet',
    hi: 'अभी कुछ आगे नहीं आया',
    or: 'ଏପର୍ଯ୍ୟନ୍ତ କିଛି ଆଗକୁ ଆସିନାହିଁ',
  },

  't5.done': {
    en: '{done} of {total} done',
    hi: '{total} में से {done} पूरे',
    or: '{total} ରୁ {done} ସମ୍ପୂର୍ଣ୍ଣ',
  },
  't5.entry': { en: '1 entry', hi: '1 प्रविष्टि', or: '1ଟି ଏଣ୍ଟ୍ରି' },
  't5.entries': { en: '{n} entries', hi: '{n} प्रविष्टियाँ', or: '{n}ଟି ଏଣ୍ଟ୍ରି' },
  't5.skip': { en: 'Nothing to enter', hi: 'दर्ज करने को कुछ नहीं', or: 'ଲେଖିବାକୁ କିଛି ନାହିଁ' },
  't5.cashCheck': { en: 'Cash check', hi: 'नकद जाँच', or: 'ନଗଦ ଯାଞ୍ଚ' },
  't5.lockLine': {
    en: 'Enter or skip {section} first',
    hi: 'पहले {section} दर्ज करें या छोड़ें',
    or: 'ପ୍ରଥମେ {section} ଲେଖନ୍ତୁ କିମ୍ବା ଛାଡ଼ନ୍ତୁ',
  },
  't5.countBox': { en: 'Count the box', hi: 'बॉक्स गिनें', or: 'ବାକ୍ସ ଗଣନ୍ତୁ' },
  't5.next': { en: 'Enter {section}', hi: '{section} दर्ज करें', or: '{section} ଲେଖନ୍ତୁ' },
  't5.openCheck': { en: 'Open cash check', hi: 'नकद जाँच खोलें', or: 'ନଗଦ ଯାଞ୍ଚ ଖୋଲନ୍ତୁ' },

  't6.sub': { en: 'Before the first sale', hi: 'पहली बिक्री से पहले', or: 'ପ୍ରଥମ ବିକ୍ରି ପୂର୍ବରୁ' },
  't6.question': {
    en: "What's in the box right now?",
    hi: 'अभी बॉक्स में कितना है?',
    or: 'ବର୍ତ୍ତମାନ ବାକ୍ସରେ କେତେ ଅଛି?',
  },
  't6.body': {
    en: "Count the notes and coins before the first sale. Tomorrow onwards this is carried from tonight's count - you won't be asked.",
    hi: 'पहली बिक्री से पहले नोट और सिक्के गिनें। कल से यह आज रात की गिनती से आएगा - आपसे नहीं पूछा जाएगा।',
    or: 'ପ୍ରଥମ ବିକ୍ରି ପୂର୍ବରୁ ନୋଟ ଓ ମୁଦ୍ରା ଗଣନ୍ତୁ। ଆସନ୍ତାକାଲିଠାରୁ ଏହା ଆଜି ରାତିର ଗଣନାରୁ ଆସିବ - ଆପଣଙ୍କୁ ପଚରାଯିବ ନାହିଁ।',
  },
  't6.save': { en: 'Save opening cash', hi: 'शुरुआती नकद सहेजें', or: 'ଆରମ୍ଭ ନଗଦ ସାଇତନ୍ତୁ' },

  /*
   * ---- returns, exchanges and corrections (review §6-§7, HT-11) ----------
   *
   * DRAFT, like every Hindi and Odia line above (COPY_REVIEW_STATE, H13). The
   * four event sections, review §7's four settlement states in its own words,
   * and the working lines the engine emits only on a day that has a return.
   *
   * "YOU CONFIRM", NEVER "VERIFIED" (EX-11). There is no item data in V1, so
   * nothing in the app can establish that the goods came from this sale; the
   * link and the cap are the only controls and the confirmation is his.
   */
  'section.sales_return': { en: 'Goods returned', hi: 'लौटाया माल', or: 'ଫେରସ୍ତ ମାଲ' },
  'section.exchange_out': { en: 'Goods given in exchange', hi: 'बदले में दिया माल', or: 'ବଦଳରେ ଦିଆଯାଇଥିବା ମାଲ' },
  'section.exchange_receipt': {
    en: 'Exchange difference received',
    hi: 'बदली का अंतर मिला',
    or: 'ବଦଳର ପାର୍ଥକ୍ୟ ମିଳିଲା',
  },
  'section.refund_paid': { en: 'Refund paid', hi: 'रिफंड दिया', or: 'ଟଙ୍କା ଫେରାଇଦିଆଗଲା' },

  'settlement.refund_paid': { en: 'Returned + Refund paid', hi: 'लौटाया + रिफंड दिया', or: 'ଫେରସ୍ତ + ଟଙ୍କା ଫେରାଇଦିଆଗଲା' },
  'settlement.credit_issued': { en: 'Returned + Credit issued', hi: 'लौटाया + उधार में जमा', or: 'ଫେରସ୍ତ + ଉଧାରରେ ଜମା' },
  'settlement.replacement': { en: 'Returned + Replacement', hi: 'लौटाया + बदले में माल', or: 'ଫେରସ୍ତ + ବଦଳ ମାଲ' },
  'settlement.pending_settlement': {
    en: 'Returned + Pending settlement',
    hi: 'लौटाया + हिसाब बाकी',
    or: 'ଫେରସ୍ତ + ହିସାବ ବାକି',
  },

  'working.exchange_received_cash': {
    en: 'Exchange difference received in cash',
    hi: 'नकद में बदली का अंतर मिला',
    or: 'ନଗଦରେ ବଦଳ ପାର୍ଥକ୍ୟ ମିଳିଲା',
  },
  'working.refund_paid_cash': { en: 'Refunds paid in cash', hi: 'नकद में रिफंड', or: 'ନଗଦରେ ଫେରାଇଥିବା ଟଙ୍କା' },
  'working.sales_returned': { en: 'Goods returned', hi: 'लौटाया माल', or: 'ଫେରସ୍ତ ମାଲ' },
  'working.exchange_goods_out': { en: 'Goods given in exchange', hi: 'बदले में दिया माल', or: 'ବଦଳରେ ଦିଆଯାଇଥିବା ମାଲ' },
  'working.exchange_on_udhar': {
    en: 'Exchange difference on udhar',
    hi: 'बदली का अंतर उधार में',
    or: 'ବଦଳ ପାର୍ଥକ୍ୟ ଉଧାରରେ',
  },
  'working.credit_issued_on_return': {
    en: 'Credit issued for returns',
    hi: 'वापसी पर उधार में जमा',
    or: 'ଫେରସ୍ତ ପାଇଁ ଉଧାରରେ ଜମା',
  },

  /* T18 · return or exchange a sale. Reached from the sales form only (EX-7). */
  't18.open': { en: 'Return or exchange a sale', hi: 'बिक्री की वापसी या बदली', or: 'ବିକ୍ରିର ଫେରସ୍ତ କିମ୍ବା ବଦଳ' },
  't18.title': { en: 'Return or exchange', hi: 'वापसी या बदली', or: 'ଫେରସ୍ତ କିମ୍ବା ବଦଳ' },
  't18.sales': {
    en: 'Choose the sale that came back',
    hi: 'जो बिक्री लौटी, वह चुनें',
    or: 'ଯେଉଁ ବିକ୍ରି ଫେରିଲା, ତାହା ବାଛନ୍ତୁ',
  },
  't18.partReturned': { en: 'part returned', hi: 'कुछ लौटा', or: 'କିଛି ଫେରିଛି' },
  't18.pending': { en: 'Returns still to settle', hi: 'जिन वापसी का हिसाब बाकी है', or: 'ଯେଉଁ ଫେରସ୍ତର ହିସାବ ବାକି' },
  't18.empty': {
    en: 'No sale to return yet. A return is always recorded against a sale.',
    hi: 'अभी लौटाने को कोई बिक्री नहीं। वापसी हमेशा किसी बिक्री के सामने दर्ज होती है।',
    or: 'ଏପର୍ଯ୍ୟନ୍ତ ଫେରାଇବାକୁ କୌଣସି ବିକ୍ରି ନାହିଁ। ଫେରସ୍ତ ସବୁବେଳେ ଏକ ବିକ୍ରି ବିରୁଦ୍ଧରେ ଲେଖାଯାଏ।',
  },
  't18.recorded': { en: 'Recorded · {state}', hi: 'दर्ज हुआ · {state}', or: 'ଲେଖାହେଲା · {state}' },
  't18.sale': { en: 'The sale', hi: 'बिक्री', or: 'ବିକ୍ରି' },
  't18.returnable': { en: 'Can still come back', hi: 'अभी लौट सकता है', or: 'ଏବେ ବି ଫେରିପାରିବ' },
  't18.how': { en: 'How was it settled?', hi: 'हिसाब कैसे हुआ?', or: 'ହିସାବ କିପରି ହେଲା?' },
  't18.opt.cash': { en: 'Refund cash', hi: 'नकद लौटाया', or: 'ନଗଦ ଫେରାଇଲେ' },
  't18.opt.upi': { en: 'Refund UPI', hi: 'UPI से लौटाया', or: 'UPIରେ ଫେରାଇଲେ' },
  't18.opt.udhar': { en: 'Credit issued', hi: 'उधार में जमा', or: 'ଉଧାରରେ ଜମା' },
  't18.opt.pending': { en: 'Pending', hi: 'बाकी', or: 'ବାକି' },
  't18.opt.exchange': { en: 'Exchange', hi: 'बदली', or: 'ବଦଳ' },
  't18.returned': { en: 'Value of what came back', hi: 'लौटे माल का मूल्य', or: 'ଫେରିଥିବା ମାଲର ମୂଲ୍ୟ' },
  't18.replacement': { en: 'Price of what went out', hi: 'दिए माल का दाम', or: 'ଦିଆଯାଇଥିବା ମାଲର ଦାମ' },
  't18.diffFrom': { en: 'The customer pays the difference', hi: 'ग्राहक अंतर देगा', or: 'ଗ୍ରାହକ ପାର୍ଥକ୍ୟ ଦେବେ' },
  't18.diffTo': { en: 'The shop pays back the difference', hi: 'दुकान अंतर लौटाएगी', or: 'ଦୋକାନ ପାର୍ଥକ୍ୟ ଫେରାଇବ' },
  't18.diffNone': {
    en: 'Same price. No money changes hands.',
    hi: 'बराबर दाम। कोई पैसा नहीं लेना-देना।',
    or: 'ସମାନ ଦାମ। କୌଣସି ଟଙ୍କା ଦିଆନିଆ ନାହିଁ।',
  },
  't18.diffHow': { en: 'How was the difference paid?', hi: 'अंतर कैसे दिया गया?', or: 'ପାର୍ଥକ୍ୟ କିପରି ଦିଆଗଲା?' },
  't18.tooMuch': {
    en: 'That is more than this sale can still take back.',
    hi: 'यह इस बिक्री में लौट सकने वाली रकम से ज़्यादा है।',
    or: 'ଏହି ବିକ୍ରିରୁ ଫେରିପାରୁଥିବା ରାଶିଠାରୁ ଏହା ଅଧିକ।',
  },
  't18.confirm': {
    en: 'You confirm these goods came back from this sale. The app cannot check the goods themselves.',
    hi: 'आप पुष्टि करते हैं कि यह माल इसी बिक्री से लौटा। ऐप माल को खुद नहीं जाँच सकता।',
    or: 'ଆପଣ ନିଶ୍ଚିତ କରୁଛନ୍ତି ଯେ ଏହି ମାଲ ଏହି ବିକ୍ରିରୁ ଫେରିଛି। ଆପ୍ ମାଲକୁ ନିଜେ ଯାଞ୍ଚ କରିପାରେ ନାହିଁ।',
  },
  't18.save': { en: 'Save return', hi: 'वापसी सहेजें', or: 'ଫେରସ୍ତ ସଞ୍ଚୟ କରନ୍ତୁ' },
  't18.outstanding': { en: 'Still to pay back', hi: 'अभी लौटाना बाकी', or: 'ଏବେ ଫେରାଇବା ବାକି' },
  't18.settleHow': { en: 'Paid back by', hi: 'कैसे लौटाया', or: 'କିପରି ଫେରାଇଲେ' },
  't18.settleAmount': { en: 'Paying back now', hi: 'अभी लौटा रहे हैं', or: 'ଏବେ ଫେରାଉଛନ୍ତି' },
  't18.tooMuchSettle': {
    en: 'That is more than is still owed on this return.',
    hi: 'यह इस वापसी पर बाकी रकम से ज़्यादा है।',
    or: 'ଏହି ଫେରସ୍ତରେ ବାକି ଥିବା ରାଶିଠାରୁ ଏହା ଅଧିକ।',
  },

  /* T16 · post a correction to a closed day (HT-11, D1, D7). */
  't16.frozen': {
    en: 'The closed day stays exactly as it was and cannot be reopened. A correction adds what was missed, as a new entry.',
    hi: 'बंद दिन जैसा था वैसा ही रहेगा और फिर खोला नहीं जा सकता। सुधार छूटी रकम को एक नई प्रविष्टि के रूप में जोड़ता है।',
    or: 'ବନ୍ଦ ଦିନ ଯେପରି ଥିଲା ସେପରି ରହିବ ଏବଂ ପୁଣି ଖୋଲାଯାଇପାରିବ ନାହିଁ। ସଂଶୋଧନ ଛାଡ଼ିଯାଇଥିବା ରାଶିକୁ ଏକ ନୂଆ ଏଣ୍ଟ୍ରି ଭାବେ ଯୋଡ଼େ।',
  },
  't16.nextDay': {
    en: 'It will be recorded on the next business day, when that day starts at {time}.',
    hi: 'यह अगले कारोबारी दिन में दर्ज होगा, जब वह दिन {time} बजे शुरू होगा।',
    or: 'ଏହା ପରବର୍ତ୍ତୀ କାରବାର ଦିନରେ ଲେଖାଯିବ, ଯେତେବେଳେ ସେହି ଦିନ {time}ରେ ଆରମ୍ଭ ହେବ।',
  },
  't16.entries': { en: 'Choose the entry that was short', hi: 'जो प्रविष्टि कम थी, वह चुनें', or: 'ଯେଉଁ ଏଣ୍ଟ୍ରି କମ୍ ଥିଲା, ତାହା ବାଛନ୍ତୁ' },
  't16.addsTo': { en: 'Adds to: {section} of {date}', hi: 'इसमें जुड़ेगा: {date} की {section}', or: 'ଏଥିରେ ଯୋଡ଼ାଯିବ: {date}ର {section}' },
  't16.amount': { en: 'Amount missed', hi: 'छूटी रकम', or: 'ଛାଡ଼ିଯାଇଥିବା ରାଶି' },
  't16.held': {
    en: 'Saved. It is waiting, and will be added when the next day starts.',
    hi: 'सहेजा गया। यह इंतज़ार में है, और अगला दिन शुरू होते ही जुड़ेगा।',
    or: 'ସଞ୍ଚୟ ହେଲା। ଏହା ଅପେକ୍ଷାରେ ଅଛି, ଏବଂ ପରଦିନ ଆରମ୍ଭ ହେଲେ ଯୋଡ଼ାଯିବ।',
  },
  't16.recorded': { en: 'Added to today.', hi: 'आज में जोड़ा गया।', or: 'ଆଜିରେ ଯୋଡ଼ାଗଲା।' },
  't16.waiting': { en: 'Waiting for the next day', hi: 'अगले दिन की प्रतीक्षा में', or: 'ପରଦିନ ପାଇଁ ଅପେକ୍ଷାରେ' },
  't16.empty': {
    en: 'No closed day to correct.',
    hi: 'सुधारने को कोई बंद दिन नहीं।',
    or: 'ସଂଶୋଧନ ପାଇଁ କୌଣସି ବନ୍ଦ ଦିନ ନାହିଁ।',
  },

  /*
   * DECISION 3 - THE UPI CHECK. hi/or are DRAFT like every other line here (H13).
   * "Not checked" is said plainly; nothing on this card claims a confidence the
   * shopkeeper has not given it.
   */
  'upi.title': { en: 'UPI check', hi: 'UPI जाँच', or: 'UPI ଯାଞ୍ଚ' },
  'upi.status.no_upi': { en: 'No UPI received today', hi: 'आज कोई UPI नहीं आया', or: 'ଆଜି କୌଣସି UPI ଆସିନାହିଁ' },
  'upi.status.not_checked': { en: 'UPI not checked', hi: 'UPI जाँचा नहीं गया', or: 'UPI ଯାଞ୍ଚ ହୋଇନାହିଁ' },
  'upi.status.partly_checked': {
    en: '{done} of {n} UPI payments checked',
    hi: '{n} में से {done} UPI भुगतान जाँचे गए',
    or: '{n} ରୁ {done} UPI ପେମେଣ୍ଟ ଯାଞ୍ଚ ହେଲା',
  },
  'upi.status.checked': { en: 'All UPI payments checked', hi: 'सभी UPI भुगतान जाँचे गए', or: 'ସବୁ UPI ପେମେଣ୍ଟ ଯାଞ୍ଚ ହେଲା' },
  'upi.expected': { en: 'UPI received, as entered', hi: 'दर्ज किया गया UPI', or: 'ଲେଖାଯାଇଥିବା UPI' },
  'upi.confirmed': { en: 'UPI you confirmed', hi: 'आपने पक्का किया UPI', or: 'ଆପଣ ନିଶ୍ଚିତ କରିଥିବା UPI' },
  'upi.note': {
    en: 'Tick each payment you can see arrived in your UPI app. Not your bank balance.',
    hi: 'जो भुगतान आपके UPI ऐप में आया दिखे, उसे टिक करें। यह बैंक बैलेंस नहीं है।',
    or: 'ଆପଣଙ୍କ UPI ଆପରେ ଆସିଥିବା ଦେଖାଯାଉଥିବା ପ୍ରତ୍ୟେକ ପେମେଣ୍ଟକୁ ଟିକ୍ କରନ୍ତୁ। ଏହା ବ୍ୟାଙ୍କ ବାଲାନ୍ସ ନୁହେଁ।',
  },
  'upi.all': {
    en: 'All {n} received · {amount}',
    hi: 'सभी {n} आ गए · {amount}',
    or: 'ସବୁ {n}ଟି ଆସିଗଲା · {amount}',
  },
  'upi.tick': { en: 'Received', hi: 'आ गया', or: 'ଆସିଗଲା' },

  /*
   * DECISION 2 - TYPED ADJUSTMENTS. Each name doubles as its working-line label
   * on the cash check, so it reads as a cause rather than as a category code.
   */
  'adjust.title': { en: 'Adjustments', hi: 'समायोजन', or: 'ସମନ୍ୱୟ' },
  'adjust.none': { en: 'None today', hi: 'आज कोई नहीं', or: 'ଆଜି କିଛି ନାହିଁ' },
  'adjust.add': { en: 'Add adjustment', hi: 'समायोजन जोड़ें', or: 'ସମନ୍ୱୟ ଯୋଡ଼ନ୍ତୁ' },
  'adjustment.counterfeit_note': { en: 'Fake note received', hi: 'नकली नोट मिला', or: 'ନକଲି ନୋଟ ମିଳିଲା' },
  'adjustment.rounding_given': {
    en: 'Chhutta: gave extra change',
    hi: 'छुट्टा: ज़्यादा लौटाया',
    or: 'ଖୁଚୁରା: ଅଧିକ ଫେରାଇଲି',
  },
  'adjustment.rounding_kept': {
    en: 'Chhutta: customer left the change',
    hi: 'छुट्टा: ग्राहक ने छोड़ दिया',
    or: 'ଖୁଚୁରା: ଗ୍ରାହକ ଛାଡ଼ିଦେଲେ',
  },
  'adjustment.home_use': {
    en: 'Goods taken for home (at cost)',
    hi: 'घर के लिए लिया सामान (खरीद दाम पर)',
    or: 'ଘର ପାଇଁ ନେଇଥିବା ଜିନିଷ (କିଣା ଦରରେ)',
  },
  'adjustment.stock_written_off': {
    en: 'Damaged or expired stock thrown away',
    hi: 'खराब या एक्सपायर सामान फेंका',
    or: 'ଖରାପ କିମ୍ବା ମିଆଦ ସରିଥିବା ଜିନିଷ ଫିଙ୍ଗିଲି',
  },
  'adjust.effect.counterfeit_note': {
    en: 'Takes it off expected cash and off profit.',
    hi: 'अपेक्षित नकद और लाभ दोनों से घटता है।',
    or: 'ଆଶା କରାଯାଇଥିବା ନଗଦ ଓ ଲାଭ ଦୁଇଟିରୁ କମେ।',
  },
  'adjust.effect.rounding_given': {
    en: 'Takes it off expected cash and off profit.',
    hi: 'अपेक्षित नकद और लाभ दोनों से घटता है।',
    or: 'ଆଶା କରାଯାଇଥିବା ନଗଦ ଓ ଲାଭ ଦୁଇଟିରୁ କମେ।',
  },
  'adjust.effect.rounding_kept': {
    en: 'Adds it to expected cash and to profit.',
    hi: 'अपेक्षित नकद और लाभ दोनों में जुड़ता है।',
    or: 'ଆଶା କରାଯାଇଥିବା ନଗଦ ଓ ଲାଭ ଦୁଇଟିରେ ଯୋଡ଼ାହୁଏ।',
  },
  'adjust.effect.home_use': {
    en: 'No cash moves. Its cost comes out of purchase, so it does not lower profit.',
    hi: 'नकद नहीं बदलता। इसका दाम खरीद से हटता है, इसलिए लाभ नहीं घटता।',
    or: 'ନଗଦ ବଦଳେ ନାହିଁ। ଏହାର ଦାମ କିଣାରୁ ବାହାରେ, ତେଣୁ ଲାଭ କମେ ନାହିଁ।',
  },
  'adjust.effect.stock_written_off': {
    en: 'No cash moves, and profit already counts its purchase. Recorded only.',
    hi: 'नकद नहीं बदलता, और लाभ में इसकी खरीद पहले से गिनी है। सिर्फ दर्ज होता है।',
    or: 'ନଗଦ ବଦଳେ ନାହିଁ, ଲାଭରେ ଏହାର କିଣା ଆଗରୁ ଗଣାଯାଇଛି। କେବଳ ଲେଖାଯାଏ।',
  },
  't19.title': { en: 'Adjustment', hi: 'समायोजन', or: 'ସମନ୍ୱୟ' },
  't19.type': { en: 'What happened?', hi: 'क्या हुआ?', or: 'କଣ ହେଲା?' },
  't19.amount': { en: 'Amount', hi: 'रकम', or: 'ପରିମାଣ' },
  't19.save': { en: 'Save adjustment', hi: 'समायोजन सहेजें', or: 'ସମନ୍ୱୟ ସାଇତନ୍ତୁ' },

  /*
   * PR-1 / PR-2 (Premium): items. Names only, amounts always typed. hi/or DRAFT (H13).
   * NO word here may imply a stock figure: "slow" is how often it sold, never
   * what is on the shelf (R5 decision 3).
   */
  's1.items': { en: 'Your items', hi: 'आपकी चीज़ें', or: 'ଆପଣଙ୍କ ଜିନିଷ' },
  's9.title': { en: 'Your items', hi: 'आपकी चीज़ें', or: 'ଆପଣଙ୍କ ଜିନିଷ' },
  's9.intro': {
    en: 'The things you sell, by name. No price is kept: you type the amount on each sale.',
    hi: 'आप जो बेचते हैं, उनके नाम। कोई दाम नहीं रखा जाता: हर बिक्री पर रकम आप लिखते हैं।',
    or: 'ଆପଣ ଯାହା ବିକନ୍ତି, ସେଗୁଡ଼ିକର ନାମ। କୌଣସି ଦାମ ରଖାଯାଏ ନାହିଁ: ପ୍ରତି ବିକ୍ରିରେ ପରିମାଣ ଆପଣ ଲେଖନ୍ତି।',
  },
  's9.name': { en: 'Item name', hi: 'चीज़ का नाम', or: 'ଜିନିଷର ନାମ' },
  's9.add': { en: 'Add to list', hi: 'सूची में जोड़ें', or: 'ତାଲିକାରେ ଯୋଡ଼ନ୍ତୁ' },
  's9.empty': {
    en: 'No items yet. Add the ones you sell most.',
    hi: 'अभी कोई चीज़ नहीं। जो सबसे ज़्यादा बिकती हैं, वे जोड़ें।',
    or: 'ଏପର୍ଯ୍ୟନ୍ତ କିଛି ଜିନିଷ ନାହିଁ। ଯାହା ଅଧିକ ବିକେ, ସେଗୁଡ଼ିକ ଯୋଡ଼ନ୍ତୁ।',
  },
  's9.premium': {
    en: 'Adding items is part of Premium. Items already recorded stay here to read.',
    hi: 'चीज़ें जोड़ना प्रीमियम में है। पहले दर्ज चीज़ें यहाँ पढ़ने को रहती हैं।',
    or: 'ଜିନିଷ ଯୋଡ଼ିବା ପ୍ରିମିୟମରେ ଅଛି। ଆଗରୁ ଲେଖାଥିବା ଜିନିଷ ପଢ଼ିବାକୁ ଏଠାରେ ରହେ।',
  },
  /* R4 §7.1: a one-line notice he can show or read to a customer. DRAFT; counsel to read before launch. */
  's9.noticeTitle': { en: 'Tell your customers', hi: 'अपने ग्राहकों को बताएँ', or: 'ଆପଣଙ୍କ ଗ୍ରାହକଙ୍କୁ କୁହନ୍ତୁ' },
  's9.notice': {
    en: 'I record what you buy on credit in the SWAFTO app, to keep your account.',
    hi: 'आपका हिसाब रखने के लिए, आप उधार में जो लेते हैं वह मैं SWAFTO ऐप में लिखता हूँ।',
    or: 'ଆପଣଙ୍କ ହିସାବ ରଖିବା ପାଇଁ, ଆପଣ ଉଧାରରେ ଯାହା ନିଅନ୍ତି ମୁଁ SWAFTO ଆପରେ ଲେଖେ।',
  },
  't7.items': { en: 'Add items to a sale', hi: 'बिक्री में चीज़ें जोड़ें', or: 'ବିକ୍ରିରେ ଜିନିଷ ଯୋଡ଼ନ୍ତୁ' },
  'i1.title': { en: 'Items in a sale', hi: 'बिक्री की चीज़ें', or: 'ବିକ୍ରିର ଜିନିଷ' },
  'i1.pickSale': { en: 'Which of today’s sales?', hi: 'आज की कौन सी बिक्री?', or: 'ଆଜିର କେଉଁ ବିକ୍ରି?' },
  'i1.empty': { en: 'No sales today yet.', hi: 'आज अभी कोई बिक्री नहीं।', or: 'ଆଜି ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ବିକ୍ରି ନାହିଁ।' },
  'i1.optional': {
    // HT-59: it said "The sale is saved already" while a typed sale sat unsaved on the form.
    en: 'Optional. Only sales already added are listed, and items never hold up closing the day.',
    hi: 'ज़रूरी नहीं। यहाँ सिर्फ़ जोड़ी जा चुकी बिक्री दिखती है, और चीज़ें दिन बंद करने से नहीं रोकतीं।',
    or: 'ବାଧ୍ୟତାମୂଳକ ନୁହେଁ। ଏଠାରେ କେବଳ ଯୋଡ଼ାଯାଇଥିବା ବିକ୍ରି ଦେଖାଯାଏ, ଜିନିଷ ଦିନ ବନ୍ଦ କରିବାକୁ ଅଟକାଏ ନାହିଁ।',
  },
  'i1.recorded': { en: 'Items recorded for', hi: 'चीज़ें दर्ज', or: 'ଜିନିଷ ଲେଖାହୋଇଛି' },
  'i1.of': { en: 'of the sale', hi: 'बिक्री में से', or: 'ବିକ୍ରିରୁ' },
  'i1.item': { en: 'Which item?', hi: 'कौन सी चीज़?', or: 'କେଉଁ ଜିନିଷ?' },
  'i1.other': { en: 'Other', hi: 'अन्य', or: 'ଅନ୍ୟ' },
  'i1.quantity': { en: 'How many', hi: 'कितने', or: 'କେତୋଟି' },
  'i1.amount': { en: 'Amount', hi: 'रकम', or: 'ପରିମାଣ' },
  'i1.save': { en: 'Save item', hi: 'चीज़ सहेजें', or: 'ଜିନିଷ ସାଇତନ୍ତୁ' },
  /* HT-61 and the pass-9 note. hi / or are a DRAFT (H13). */
  'i1.change': { en: 'Change', hi: 'बदलें', or: 'ବଦଳାନ୍ତୁ' },
  'i1.changeItem': { en: 'Change item', hi: 'चीज़ बदलें', or: 'ଜିନିଷ ବଦଳାନ୍ତୁ' },
  'i1.needQuantity': {
    en: 'Type how many',
    hi: 'कितने, यह लिखें',
    or: 'କେତୋଟି ଲେଖନ୍ତୁ',
  },
  'i1.noList': {
    en: 'Your list is empty. Add items in Settings, or use Other.',
    hi: 'आपकी सूची खाली है। सेटिंग में चीज़ें जोड़ें, या अन्य चुनें।',
    or: 'ଆପଣଙ୍କ ତାଲିକା ଖାଲି। ସେଟିଂସରେ ଜିନିଷ ଯୋଡ଼ନ୍ତୁ, କିମ୍ବା ଅନ୍ୟ ବାଛନ୍ତୁ।',
  },
  'i1.premium': {
    en: 'Items per sale are part of Premium.',
    hi: 'बिक्री की चीज़ें प्रीमियम में हैं।',
    or: 'ବିକ୍ରିର ଜିନିଷ ପ୍ରିମିୟମରେ ଅଛି।',
  },
  'i1.times': { en: '× {n}', hi: '{n} नग', or: '{n}ଟି' },
  'items.coverage': {
    en: 'Items are recorded for {pct}% of sales value in this period. Every item figure is only as complete as that.',
    hi: 'इस अवधि की बिक्री के {pct}% मूल्य की चीज़ें दर्ज हैं। हर आंकड़ा उतना ही पूरा है।',
    or: 'ଏହି ସମୟର ବିକ୍ରି ମୂଲ୍ୟର {pct}% ର ଜିନିଷ ଲେଖାହୋଇଛି। ପ୍ରତି ସଂଖ୍ୟା ସେତିକି ହିଁ ସମ୍ପୂର୍ଣ୍ଣ।',
  },
  'items.none': {
    en: 'No items recorded in this period.',
    hi: 'इस अवधि में कोई चीज़ दर्ज नहीं।',
    or: 'ଏହି ସମୟରେ କୌଣସି ଜିନିଷ ଲେଖାହୋଇନାହିଁ।',
  },
  'items.readOnly': {
    en: 'Recorded while on Premium. Shown to read.',
    hi: 'प्रीमियम के समय दर्ज। पढ़ने के लिए दिखाया गया।',
    or: 'ପ୍ରିମିୟମ ସମୟରେ ଲେଖାହୋଇଥିଲା। ପଢ଼ିବା ପାଇଁ ଦେଖାଯାଉଛି।',
  },
  'items.topValue': { en: 'Top items by value', hi: 'मूल्य से सबसे ऊपर', or: 'ମୂଲ୍ୟରେ ଶୀର୍ଷ ଜିନିଷ' },
  'items.topCount': { en: 'Sold most often', hi: 'सबसे ज़्यादा बार बिकी', or: 'ସବୁଠୁ ଅଧିକ ଥର ବିକିଲା' },
  'items.slow': { en: 'Sold least often', hi: 'सबसे कम बार बिकी', or: 'ସବୁଠୁ କମ୍ ଥର ବିକିଲା' },
  'items.slowNote': {
    en: 'How often each sold here - not what is on your shelf.',
    hi: 'हर चीज़ कितनी बार बिकी - दुकान में कितनी है, यह नहीं।',
    or: 'ପ୍ରତି ଜିନିଷ କେତେ ଥର ବିକିଲା - ଦୋକାନରେ କେତେ ଅଛି, ତାହା ନୁହେଁ।',
  },
  'items.sales': { en: '{n|# sale|# sales}', hi: '{n} बिक्री', or: '{n}ଟି ବିକ୍ରି' },
  'items.customer': { en: 'Usually buys', hi: 'अक्सर लेते हैं', or: 'ସାଧାରଣତଃ ନିଅନ୍ତି' },
  'items.pairs': { en: 'Bought together', hi: 'साथ में ली गईं', or: 'ଏକାଠି କିଣାହେଲା' },
  'items.pairLine': {
    en: '{a} with {b}: on {n|# sale|# sales}',
    hi: '{a} के साथ {b}: {n} बिक्री में',
    or: '{a} ସହ {b}: {n}ଟି ବିକ୍ରିରେ',
  },
  'items.pairsGate': {
    en: 'Shown after {required} sales with items. {soFar} so far.',
    hi: 'चीज़ों वाली {required} बिक्री के बाद दिखेगा। अब तक {soFar}।',
    or: 'ଜିନିଷ ଥିବା {required}ଟି ବିକ୍ରି ପରେ ଦେଖାଯିବ। ଏପର୍ଯ୍ୟନ୍ତ {soFar}।',
  },
  'items.pairsNone': {
    en: 'No pair seen together often enough yet.',
    hi: 'अभी कोई जोड़ी काफ़ी बार साथ नहीं दिखी।',
    or: 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଯୋଡ଼ି ଯଥେଷ୍ଟ ଥର ଏକାଠି ଦେଖାଯାଇନାହିଁ।',
  },
  'items.demand': { en: 'Likely to sell - estimate', hi: 'बिकने का अनुमान', or: 'ବିକ୍ରିର ଅନୁମାନ' },
  'items.demandLine': {
    en: '{name}: about {q} a week (estimate)',
    hi: '{name}: लगभग {q} प्रति सप्ताह (अनुमान)',
    or: '{name}: ପ୍ରାୟ {q} ସପ୍ତାହକୁ (ଅନୁମାନ)',
  },
  'items.demandGate': {
    // HT-55: the count chooses its form (`fill`, DayParts); hi / or use one word.
    en: '{name}: sold on {n|# day|# days} in 90. An estimate needs {required}.',
    hi: '{name}: 90 में {n} दिन बिकी। अनुमान को {required} चाहिए।',
    or: '{name}: 90ରେ {n} ଦିନ ବିକିଲା। ଅନୁମାନ ପାଇଁ {required} ଦରକାର।',
  },
  'items.demandMethod': {
    en: 'Method: TSB, from the last 90 days. Something to review, not an order to place.',
    hi: 'तरीका: TSB, पिछले 90 दिनों से। देखने की बात, ऑर्डर देने का निर्देश नहीं।',
    or: 'ପଦ୍ଧତି: TSB, ଗତ 90 ଦିନରୁ। ଦେଖିବା କଥା, ଅର୍ଡର ଦେବାର ନିର୍ଦ୍ଦେଶ ନୁହେଁ।',
  },

  // The UPI ledger's own working lines (expectedUpi) - the cash ones exist above.
  'working.upi_sales': { en: 'UPI sales', hi: 'UPI बिक्री', or: 'UPI ବିକ୍ରି' },
  'working.udhar_collected_upi': { en: 'Udhar collected by UPI', hi: 'UPI से उधार वसूली', or: 'UPI ରେ ଉଧାର ଆଦାୟ' },
  'working.expense_upi': { en: 'Expenses paid by UPI', hi: 'UPI से खर्च', or: 'UPI ରେ ଖର୍ଚ୍ଚ' },
  'working.purchase_upi': { en: 'Purchases paid by UPI', hi: 'UPI से खरीद', or: 'UPI ରେ କିଣା' },
  'working.party_payment_upi': { en: 'Paid to suppliers by UPI', hi: 'UPI से आपूर्तिकर्ता को', or: 'UPI ରେ ଯୋଗାଣକାରୀଙ୍କୁ' },
  'working.withdrawal_upi': { en: 'UPI you took', hi: 'आपने लिया UPI', or: 'ଆପଣ ନେଇଥିବା UPI' },
  // §2.3 on the UPI ledger: present only on a day with that return event.
  'working.exchange_received_upi': {
    en: 'Exchange difference received by UPI',
    hi: 'UPI से बदली का अंतर मिला',
    or: 'UPI ରେ ବଦଳ ପାର୍ଥକ୍ୟ ମିଳିଲା',
  },
  'working.refund_paid_upi': { en: 'Refunds paid by UPI', hi: 'UPI से रिफंड', or: 'UPI ରେ ଫେରାଇଥିବା ଟଙ୍କା' },

  /*
   * C1 - ASK (FR-8, PR-5). Questions are answered; nothing here fills a figure.
   * Every rupee figure an answer carries is drawn by `<Money>`, never put inside
   * one of these sentences, which is why none of them has an {amount}.
   */
  'c1.title': { en: 'Ask', hi: 'पूछें', or: 'ପଚାରନ୍ତୁ' },
  'c1.open': { en: 'Ask a question', hi: 'सवाल पूछें', or: 'ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ' },
  'c1.empty': {
    en: 'Ask how to do something, what a word means, or about your figures. Answers come only from what has been entered.',
    hi: 'कुछ कैसे करें, किसी शब्द का मतलब, या अपने आंकड़ों के बारे में पूछें। जवाब सिर्फ दर्ज की गई बातों से आते हैं।',
    or: 'କିଛି କେମିତି କରିବେ, କୌଣସି ଶବ୍ଦର ଅର୍ଥ, କିମ୍ବା ଆପଣଙ୍କ ହିସାବ ବିଷୟରେ ପଚାରନ୍ତୁ। ଉତ୍ତର କେବଳ ଲେଖାଯାଇଥିବା କଥାରୁ ଆସେ।',
  },
  'c1.placeholder': { en: 'Type your question', hi: 'अपना सवाल लिखें', or: 'ଆପଣଙ୍କ ପ୍ରଶ୍ନ ଲେଖନ୍ତୁ' },
  'c1.ask': { en: 'Ask', hi: 'पूछें', or: 'ପଚାରନ୍ତୁ' },
  'c1.suggested': { en: 'You could ask', hi: 'आप पूछ सकते हैं', or: 'ଆପଣ ପଚାରିପାରିବେ' },
  'c1.heard': { en: 'Understood as: {what}', hi: 'समझा गया: {what}', or: 'ବୁଝାଗଲା: {what}' },
  'c1.didYouMean': {
    en: 'I am not sure what you mean. Is it one of these?',
    hi: 'मैं ठीक से नहीं समझा। क्या इनमें से कोई है?',
    or: 'ମୁଁ ଠିକ ବୁଝିଲି ନାହିଁ। ଏଥିରୁ କୌଣସିଟି କି?',
  },
  'c1.covers': {
    en: 'This covers only what was entered on this phone.',
    hi: 'यह सिर्फ इस फ़ोन में दर्ज बातों पर है।',
    or: 'ଏହା କେବଳ ଏହି ଫୋନରେ ଲେଖାଯାଇଥିବା କଥା ଉପରେ।',
  },
  'c1.premium': {
    en: 'That answer needs Premium. The free plan can show this:',
    hi: 'इस जवाब के लिए प्रीमियम चाहिए। फ्री प्लान यह दिखा सकता है:',
    or: 'ଏହି ଉତ୍ତର ପାଇଁ ପ୍ରିମିୟମ ଦରକାର। ମାଗଣା ପ୍ଲାନ ଏହା ଦେଖାଇପାରେ:',
  },
  'c1.next': { en: 'Ask next', hi: 'आगे पूछें', or: 'ପରେ ପଚାରନ୍ତୁ' },

  'c1.i.howClose': { en: 'How to close the day', hi: 'दिन कैसे बंद करें', or: 'ଦିନ କେମିତି ବନ୍ଦ କରିବେ' },
  'c1.i.howUdhar': { en: 'How to record udhar', hi: 'उधार कैसे लिखें', or: 'ଉଧାର କେମିତି ଲେଖିବେ' },
  'c1.i.howUpi': { en: 'How to tick UPI', hi: 'UPI कैसे टिक करें', or: 'UPI କେମିତି ଟିକ୍ କରିବେ' },
  'c1.i.howReturn': { en: 'How to record a return', hi: 'वापसी कैसे लिखें', or: 'ଫେରସ୍ତ କେମିତି ଲେଖିବେ' },
  'c1.i.howAdjust': { en: 'How to add an adjustment', hi: 'समायोजन कैसे जोड़ें', or: 'ସମନ୍ୱୟ କେମିତି ଯୋଡ଼ିବେ' },
  'c1.i.howCorrect': { en: 'How to correct a mistake', hi: 'गलती कैसे सुधारें', or: 'ଭୁଲ କେମିତି ସୁଧାରିବେ' },
  'c1.i.howLanguage': { en: 'How to change the language', hi: 'भाषा कैसे बदलें', or: 'ଭାଷା କେମିତି ବଦଳାଇବେ' },
  'c1.i.howDelete': { en: 'How to delete the account', hi: 'खाता कैसे मिटाएँ', or: 'ଖାତା କେମିତି ମିଟାଇବେ' },
  'c1.i.howPrivacy': { en: 'Privacy and consent', hi: 'निजता और सहमति', or: 'ଗୋପନୀୟତା ଓ ସହମତି' },
  'c1.i.howPlan': { en: 'Free and Premium', hi: 'फ्री और प्रीमियम', or: 'ମାଗଣା ଓ ପ୍ରିମିୟମ' },
  'c1.i.termUdhar': { en: 'What udhar means', hi: 'उधार का मतलब', or: 'ଉଧାରର ଅର୍ଥ' },
  'c1.i.termExpected': { en: 'What expected cash means', hi: 'अपेक्षित नकद का मतलब', or: 'ଆଶା କରାଯାଇଥିବା ନଗଦର ଅର୍ଥ' },
  'c1.i.termProfit': { en: 'What the profit estimate means', hi: 'अनुमानित लाभ का मतलब', or: 'ଆନୁମାନିକ ଲାଭର ଅର୍ଥ' },
  'c1.i.termWithdrawal': { en: 'What taken by owner means', hi: 'मालिक ने लिया का मतलब', or: 'ମାଲିକ ନେଇଛନ୍ତିର ଅର୍ଥ' },
  'c1.i.noStock': { en: 'Stock', hi: 'स्टॉक', or: 'ଷ୍ଟକ' },
  'c1.i.sales': { en: 'Sales', hi: 'बिक्री', or: 'ବିକ୍ରି' },
  'c1.i.expected': { en: 'Expected cash', hi: 'अपेक्षित नकद', or: 'ଆଶା କରାଯାଇଥିବା ନଗଦ' },
  'c1.i.owed': { en: 'Udhar to collect', hi: 'वसूलने को उधार', or: 'ଆଦାୟ କରିବାକୁ ଉଧାର' },
  'c1.i.paid': { en: 'Payments', hi: 'भुगतान', or: 'ପଇଠ' },
  'c1.i.bestDay': { en: 'Best day', hi: 'सबसे अच्छा दिन', or: 'ସବୁଠୁ ଭଲ ଦିନ' },
  'c1.i.olderUdhar': { en: 'Old udhar', hi: 'पुराना उधार', or: 'ପୁରୁଣା ଉଧାର' },
  'c1.i.compare': { en: 'Compare sales', hi: 'बिक्री की तुलना', or: 'ବିକ୍ରିର ତୁଳନା' },
  'c1.i.expenses': { en: 'Expenses', hi: 'खर्च', or: 'ଖର୍ଚ୍ଚ' },
  'c1.i.topItems': { en: 'Top items', hi: 'सबसे ज़्यादा बिकी चीज़ें', or: 'ସବୁଠୁ ଅଧିକ ବିକା ଜିନିଷ' },
  'c1.i.forecast': { en: 'Sales estimate', hi: 'बिक्री का अनुमान', or: 'ବିକ୍ରି ଆକଳନ' },
  'c1.forecast.note': {
    en: 'An estimate of the next 7 days from your closed days, never a promise.',
    hi: 'आपके बंद दिनों से अगले 7 दिनों का अनुमान, वादा नहीं।',
    or: 'ଆପଣଙ୍କ ବନ୍ଦ ଦିନରୁ ଆସନ୍ତା 7 ଦିନର ଆକଳନ, ପ୍ରତିଶ୍ରୁତି ନୁହେଁ।',
  },

  'c1.a.howClose': {
    en: 'Tap Continue day close on Today. Go down the list: enter each section, or tap Nothing to enter. Then count the cash in the box and type it. If it is not what was expected, choose a reason. Then close the day.',
    hi: 'आज पर "दिन बंद करना जारी रखें" दबाएँ। सूची में हर हिस्सा भरें, या "दर्ज करने को कुछ नहीं" दबाएँ। फिर गल्ले का नकद गिनकर लिखें। अगर अपेक्षित से अलग हो, तो कारण चुनें। फिर दिन बंद करें।',
    or: 'ଆଜିରେ "ଦିନ ବନ୍ଦ ଜାରି ରଖନ୍ତୁ" ଦବାନ୍ତୁ। ତାଲିକାରେ ପ୍ରତି ଭାଗ ଲେଖନ୍ତୁ, କିମ୍ବା "ଲେଖିବାକୁ କିଛି ନାହିଁ" ଦବାନ୍ତୁ। ତାପରେ ବାକ୍ସର ନଗଦ ଗଣି ଲେଖନ୍ତୁ। ଆଶାଠୁ ଅଲଗା ହେଲେ କାରଣ ବାଛନ୍ତୁ। ତାପରେ ଦିନ ବନ୍ଦ କରନ୍ତୁ।',
  },
  'c1.a.howUdhar': {
    en: 'On Today, tap Credit, choose the customer and type the amount. When the customer pays some back, tap Collect, choose the same customer and type what was paid. Udhar puts no cash in the box.',
    hi: 'आज पर "उधार" दबाएँ, ग्राहक चुनें और रकम लिखें। जब ग्राहक कुछ लौटाए, "वसूली" दबाएँ, वही ग्राहक चुनें और मिली रकम लिखें। उधार से गल्ले में नकद नहीं आता।',
    or: 'ଆଜିରେ "ଉଧାର" ଦବାନ୍ତୁ, ଗ୍ରାହକ ବାଛନ୍ତୁ ଓ ପରିମାଣ ଲେଖନ୍ତୁ। ଗ୍ରାହକ କିଛି ଫେରାଇଲେ "ଆଦାୟ" ଦବାନ୍ତୁ, ସେହି ଗ୍ରାହକ ବାଛି ମିଳିଥିବା ପରିମାଣ ଲେଖନ୍ତୁ। ଉଧାରରେ ବାକ୍ସକୁ ନଗଦ ଆସେ ନାହିଁ।',
  },
  'c1.a.howUpi': {
    en: 'Open the day close list. In UPI check, tick Received against each UPI payment you can see arrived on your phone. Only what you tick counts as confirmed.',
    hi: 'दिन बंद की सूची खोलें। "UPI जाँच" में हर उस UPI भुगतान पर "आ गया" टिक करें जो आपके फ़ोन पर आया दिखे। सिर्फ टिक किया हुआ ही पक्का माना जाता है।',
    or: 'ଦିନ ବନ୍ଦ ତାଲିକା ଖୋଲନ୍ତୁ। "UPI ଯାଞ୍ଚ"ରେ ଆପଣଙ୍କ ଫୋନରେ ଆସିଥିବା ପ୍ରତି UPI ପଇଠରେ "ଆସିଗଲା" ଟିକ୍ କରନ୍ତୁ। କେବଳ ଟିକ୍ କରିଥିବା ହିଁ ନିଶ୍ଚିତ ବୋଲି ଗଣାଯାଏ।',
  },
  'c1.a.howReturn': {
    en: 'Open Sale from Today and tap Return or exchange a sale. Choose the sale, type what came back, and say how it was settled: cash, UPI, udhar, an exchange, or not yet.',
    hi: 'आज से "बिक्री" खोलें और "बिक्री की वापसी या बदली" दबाएँ। बिक्री चुनें, जो वापस आया उसकी रकम लिखें, और बताएँ कैसे निपटा: नकद, UPI, उधार, बदली, या अभी नहीं।',
    or: 'ଆଜିରୁ "ବିକ୍ରି" ଖୋଲି "ବିକ୍ରିର ଫେରସ୍ତ କିମ୍ବା ବଦଳ" ଦବାନ୍ତୁ। ବିକ୍ରି ବାଛନ୍ତୁ, ଯାହା ଫେରିଲା ତାର ପରିମାଣ ଲେଖନ୍ତୁ, ଓ କେମିତି ମେଣ୍ଟିଲା କୁହନ୍ତୁ: ନଗଦ, UPI, ଉଧାର, ବଦଳ, କିମ୍ବା ଏବେ ନୁହେଁ।',
  },
  'c1.a.howAdjust': {
    en: 'Open the day close list and tap Add adjustment. Choose what happened from the list - a fake note, change given or kept, goods used at home, goods written off - and type the amount.',
    hi: 'दिन बंद की सूची खोलें और "समायोजन जोड़ें" दबाएँ। सूची से चुनें क्या हुआ - नकली नोट, छुट्टा दिया या रखा, घर में इस्तेमाल किया सामान, खराब हुआ सामान - और रकम लिखें।',
    or: 'ଦିନ ବନ୍ଦ ତାଲିକା ଖୋଲି "ସମନ୍ୱୟ ଯୋଡ଼ନ୍ତୁ" ଦବାନ୍ତୁ। ତାଲିକାରୁ କଣ ହେଲା ବାଛନ୍ତୁ - ନକଲି ନୋଟ, ଖୁଚୁରା ଦେଲେ କି ରଖିଲେ, ଘରେ ବ୍ୟବହାର ହୋଇଥିବା ଜିନିଷ, ନଷ୍ଟ ଜିନିଷ - ଓ ପରିମାଣ ଲେଖନ୍ତୁ।',
  },
  'c1.a.howCorrect': {
    en: 'A closed day is never changed. On Today, tap Post a correction: it is added to the next open day and points back to the day it corrects.',
    hi: 'बंद दिन कभी बदला नहीं जाता। आज पर "सुधार दर्ज करें" दबाएँ: यह अगले खुले दिन में जुड़ता है और उस दिन की ओर इशारा करता है जिसे यह सुधारता है।',
    or: 'ବନ୍ଦ ଦିନ କେବେ ବଦଳେ ନାହିଁ। ଆଜିରେ "ସଂଶୋଧନ ଲେଖନ୍ତୁ" ଦବାନ୍ତୁ: ଏହା ପରବର୍ତ୍ତୀ ଖୋଲା ଦିନରେ ଯୋଡ଼ାହୁଏ ଓ ଯେଉଁ ଦିନକୁ ସୁଧାରେ ତାକୁ ଦର୍ଶାଏ।',
  },
  'c1.a.howLanguage': {
    en: 'Open Settings from Today, then Language and screen, and choose Odia, Hindi or English.',
    hi: 'आज से "सेटिंग" खोलें, फिर "भाषा और स्क्रीन", और ओड़िया, हिंदी या अंग्रेज़ी चुनें।',
    or: 'ଆଜିରୁ "ସେଟିଂ" ଖୋଲନ୍ତୁ, ତାପରେ "ଭାଷା ଓ ସ୍କ୍ରୀନ", ଓ ଓଡ଼ିଆ, ହିନ୍ଦୀ କିମ୍ବା ଇଂରାଜୀ ବାଛନ୍ତୁ।',
  },
  'c1.a.howDelete': {
    en: 'Open Settings from Today, then Delete this account. It says what is removed and asks you to confirm.',
    hi: 'आज से "सेटिंग" खोलें, फिर "यह खाता मिटाएँ"। वहाँ बताया जाता है क्या हटेगा, और पक्का करने को कहा जाता है।',
    or: 'ଆଜିରୁ "ସେଟିଂ" ଖୋଲନ୍ତୁ, ତାପରେ "ଏହି ଖାତା ମିଟାନ୍ତୁ"। କଣ ହଟିବ ତାହା କୁହାଯାଏ ଓ ନିଶ୍ଚିତ କରିବାକୁ ପଚରାଯାଏ।',
  },
  'c1.a.howPrivacy': {
    en: 'On Today, tap Privacy and what you agreed to. It lists what you agreed to, and you can turn any optional item off there as easily as you turned it on.',
    hi: 'आज पर "निजता और आपकी सहमति" दबाएँ। वहाँ लिखा है आपने किस बात पर सहमति दी, और कोई भी वैकल्पिक बात उतनी ही आसानी से बंद कर सकते हैं जितनी आसानी से चालू की थी।',
    or: 'ଆଜିରେ "ଗୋପନୀୟତା ଓ ଆପଣଙ୍କ ସହମତି" ଦବାନ୍ତୁ। ଆପଣ କଣରେ ସହମତି ଦେଇଛନ୍ତି ତାହା ସେଠାରେ ଅଛି, ଓ ଯେକୌଣସି ଇଚ୍ଛାଧୀନ କଥା ଚାଲୁ କରିବା ପରି ସହଜରେ ବନ୍ଦ କରିପାରିବେ।',
  },
  'c1.a.howPlan': {
    en: 'The free plan keeps the daily book, with no ads: entries, the cash check and close, UPI, udhar, returns and corrections. Premium adds item sales and item reports, forecasts, comparisons and answers from your own figures. The price is shown before you buy.',
    hi: 'फ्री प्लान में रोज़ का पूरा हिसाब है, बिना विज्ञापन: एंट्री, नकद जाँच और दिन बंद, UPI, उधार, वापसी और सुधार। प्रीमियम में सामान के हिसाब से बिक्री और रिपोर्ट, अनुमान, तुलना और आपके अपने आंकड़ों से जवाब जुड़ते हैं। दाम खरीदने से पहले दिखाया जाता है।',
    or: 'ମାଗଣା ପ୍ଲାନରେ ଦୈନିକ ହିସାବ ଅଛି, ବିଜ୍ଞାପନ ବିନା: ଏଣ୍ଟ୍ରି, ନଗଦ ଯାଞ୍ଚ ଓ ଦିନ ବନ୍ଦ, UPI, ଉଧାର, ଫେରସ୍ତ ଓ ସଂଶୋଧନ। ପ୍ରିମିୟମରେ ଜିନିଷ ଅନୁସାରେ ବିକ୍ରି ଓ ରିପୋର୍ଟ, ଅନୁମାନ, ତୁଳନା ଓ ଆପଣଙ୍କ ନିଜ ହିସାବରୁ ଉତ୍ତର ଯୋଡ଼ାହୁଏ। କିଣିବା ଆଗରୁ ଦାମ ଦେଖାଯାଏ।',
  },
  'c1.a.termUdhar': {
    en: 'Udhar is goods given now and paid for later. It is written against the customer and adds to what they owe you. It puts no cash in the box until they pay.',
    hi: 'उधार यानी सामान अभी दिया, पैसा बाद में। यह ग्राहक के नाम लिखा जाता है और उस पर बाकी बढ़ाता है। जब तक वह न दे, गल्ले में नकद नहीं आता।',
    or: 'ଉଧାର ମାନେ ଜିନିଷ ଏବେ ଦେଲେ, ଟଙ୍କା ପରେ। ଏହା ଗ୍ରାହକଙ୍କ ନାମରେ ଲେଖାଯାଏ ଓ ତାଙ୍କ ବାକି ବଢ଼ାଏ। ସେ ନ ଦେବା ଯାଏଁ ବାକ୍ସକୁ ନଗଦ ଆସେ ନାହିଁ।',
  },
  'c1.a.termExpected': {
    en: 'Expected cash is what should be in the box: the opening cash, plus cash that came in, minus cash that went out. Only cash counts - UPI never goes into the box. It is set against the cash you count.',
    hi: 'अपेक्षित नकद वह है जो गल्ले में होना चाहिए: शुरुआती नकद, जमा आया नकद, घटा गया नकद। सिर्फ नकद गिना जाता है - UPI गल्ले में नहीं आता। इसे आपकी गिनती से मिलाया जाता है।',
    or: 'ଆଶା କରାଯାଇଥିବା ନଗଦ ହେଉଛି ବାକ୍ସରେ ଯାହା ରହିବା କଥା: ଆରମ୍ଭ ନଗଦ, ଆସିଥିବା ନଗଦ ଯୋଗ, ଯାଇଥିବା ନଗଦ ବିୟୋଗ। କେବଳ ନଗଦ ଗଣାଯାଏ - UPI ବାକ୍ସକୁ ଆସେ ନାହିଁ। ଏହାକୁ ଆପଣଙ୍କ ଗଣନା ସହ ମିଳାଯାଏ।',
  },
  'c1.a.termProfit': {
    en: "The profit estimate is sales, minus purchases, minus expenses, for what was entered. Money you take home is not in it. It is an estimate, not an accountant's figure.",
    hi: 'अनुमानित लाभ यानी दर्ज बातों में बिक्री, घटा खरीद, घटा खर्च। घर ले गया पैसा इसमें नहीं है। यह अनुमान है, हिसाबकिताब वाले का आंकड़ा नहीं।',
    or: 'ଆନୁମାନିକ ଲାଭ ମାନେ ଲେଖାଯାଇଥିବା କଥାରେ ବିକ୍ରି, ବିୟୋଗ କିଣା, ବିୟୋଗ ଖର୍ଚ୍ଚ। ଘରକୁ ନେଇଥିବା ଟଙ୍କା ଏଥିରେ ନାହିଁ। ଏହା ଅନୁମାନ, ହିସାବରକ୍ଷକଙ୍କ ସଂଖ୍ୟା ନୁହେଁ।',
  },
  'c1.a.termWithdrawal': {
    en: 'Taken by owner is money you take out of the shop for yourself. It lowers the cash in the box, but it is not an expense and does not lower profit.',
    hi: '"मालिक ने लिया" वह पैसा है जो आप दुकान से अपने लिए निकालते हैं। इससे गल्ले का नकद घटता है, पर यह खर्च नहीं है और लाभ नहीं घटाता।',
    or: '"ମାଲିକ ନେଇଛନ୍ତି" ହେଉଛି ଆପଣ ଦୋକାନରୁ ନିଜ ପାଇଁ ନେଇଥିବା ଟଙ୍କା। ଏହା ବାକ୍ସର ନଗଦ କମାଏ, କିନ୍ତୁ ଏହା ଖର୍ଚ୍ଚ ନୁହେଁ ଓ ଲାଭ କମାଏ ନାହିଁ।',
  },
  'c1.a.noStock': {
    en: 'This app does not keep stock. It cannot say what is on the shelf or what is running out.',
    hi: 'यह ऐप स्टॉक नहीं रखता। यह नहीं बता सकता कि शेल्फ पर क्या है या क्या खत्म हो रहा है।',
    or: 'ଏହି ଆପ୍ ଷ୍ଟକ ରଖେ ନାହିଁ। ତାକରେ କଣ ଅଛି କି କଣ ସରୁଛି, ଏହା କହିପାରିବ ନାହିଁ।',
  },

  'c1.p.today': { en: 'today', hi: 'आज', or: 'ଆଜି' },
  'c1.p.yesterday': { en: 'yesterday', hi: 'कल', or: 'ଗତକାଲି' },
  'c1.p.thisWeek': { en: 'this week', hi: 'इस हफ्ते', or: 'ଏହି ସପ୍ତାହ' },
  'c1.p.lastWeek': { en: 'last week', hi: 'पिछले हफ्ते', or: 'ଗତ ସପ୍ତାହ' },
  'c1.p.thisMonth': { en: 'this month', hi: 'इस महीने', or: 'ଏହି ମାସ' },
  'c1.p.lastMonth': { en: 'last month', hi: 'पिछले महीने', or: 'ଗତ ମାସ' },
  'c1.p.all': { en: 'so far', hi: 'अब तक', or: 'ଏପର୍ଯ୍ୟନ୍ତ' },
  'c1.p.before': { en: 'the same days before', hi: 'पहले के उतने ही दिन', or: 'ଆଗର ସେତିକି ଦିନ' },
  'c1.on': { en: 'On {date}.', hi: '{date} को।', or: '{date} ରେ।' },
  'c1.range': { en: 'From {from} to {to}.', hi: '{from} से {to} तक।', or: '{from} ରୁ {to} ପର୍ଯ୍ୟନ୍ତ।' },
  'c1.against': {
    en: 'Set against the same days before. {range}',
    hi: 'पहले के उतने ही दिनों से मिलाया। {range}',
    or: 'ଆଗର ସେତିକି ଦିନ ସହ ମିଳାଗଲା। {range}',
  },
  'c1.days': { en: 'over {n} days', hi: '{n} दिन से ज़्यादा', or: '{n} ଦିନରୁ ଅଧିକ' },

  'c1.f.expected': { en: 'Expected cash in the box now', hi: 'अभी गल्ले में अपेक्षित नकद', or: 'ଏବେ ବାକ୍ସରେ ଆଶା କରାଯାଇଥିବା ନଗଦ' },
  'c1.f.owed': { en: 'Udhar to collect', hi: 'वसूलने को उधार', or: 'ଆଦାୟ କରିବାକୁ ଉଧାର' },
  'c1.f.salesToday': { en: 'Sales today', hi: 'आज की बिक्री', or: 'ଆଜିର ବିକ୍ରି' },
  'c1.f.sales': { en: 'Sales, {period}', hi: 'बिक्री, {period}', or: 'ବିକ୍ରି, {period}' },
  'c1.f.salesMode': { en: '{mode} sales, {period}', hi: '{mode} बिक्री, {period}', or: '{mode} ବିକ୍ରି, {period}' },
  'c1.f.salesParty': { en: 'Sales to {party}, {period}', hi: '{party} को बिक्री, {period}', or: '{party}ଙ୍କୁ ବିକ୍ରି, {period}' },
  'c1.f.difference': { en: 'Difference', hi: 'अंतर', or: 'ପାର୍ଥକ୍ୟ' },
  'c1.f.expenses': { en: 'Expenses, {period}', hi: 'खर्च, {period}', or: 'ଖର୍ଚ୍ଚ, {period}' },
  'c1.f.bestDay': { en: 'Sales that day', hi: 'उस दिन की बिक्री', or: 'ସେଦିନର ବିକ୍ରି' },
  'c1.f.older': { en: 'Udhar unpaid for over {n} days', hi: '{n} दिन से ज़्यादा का बाकी उधार', or: '{n} ଦିନରୁ ଅଧିକ ବାକି ଉଧାର' },
  'c1.f.customerOwes': { en: '{party} owes you', hi: '{party} पर आपका बाकी', or: '{party}ଙ୍କଠାରୁ ଆପଣ ପାଇବେ' },
  'c1.f.youOwe': { en: 'You owe {party}', hi: 'आपको {party} को देना है', or: 'ଆପଣ {party}ଙ୍କୁ ଦେବେ' },
  'c1.f.paidYou': { en: '{party} paid you, {period}', hi: '{party} ने आपको दिया, {period}', or: '{party} ଆପଣଙ୍କୁ ଦେଲେ, {period}' },
  'c1.f.youPaid': { en: 'You paid {party}, {period}', hi: 'आपने {party} को दिया, {period}', or: 'ଆପଣ {party}ଙ୍କୁ ଦେଲେ, {period}' },

  'c1.best': { en: 'The best day was {date}.', hi: 'सबसे अच्छा दिन {date} था।', or: 'ସବୁଠୁ ଭଲ ଦିନ {date} ଥିଲା।' },
  'c1.daysLooked': { en: '{n|# day looked at.|# days looked at.}', hi: '{n} दिन देखे गए।', or: '{n} ଦିନ ଦେଖାଗଲା।' },
  'c1.older': {
    en: '{count|# customer has|# customers have} udhar unpaid for over {n} days.',
    hi: '{count} ग्राहकों का उधार {n} दिन से ज़्यादा से बाकी है।',
    or: '{count} ଜଣ ଗ୍ରାହକଙ୍କ ଉଧାର {n} ଦିନରୁ ଅଧିକ ବାକି ଅଛି।',
  },
  'c1.payments': { en: '{n} payments.', hi: '{n} भुगतान।', or: '{n}ଟି ପଇଠ।' },
  'c1.noDays': {
    en: 'Nothing is recorded on this phone for that time. {range}',
    hi: 'उस समय का इस फ़ोन में कुछ दर्ज नहीं है। {range}',
    or: 'ସେହି ସମୟର ଏହି ଫୋନରେ କିଛି ଲେଖା ନାହିଁ। {range}',
  },
  'c1.needParty': {
    en: 'Name the customer or supplier as they are written in Parties.',
    hi: 'ग्राहक या आपूर्तिकर्ता का नाम वैसे लिखें जैसे खातों में लिखा है।',
    or: 'ଗ୍ରାହକ କିମ୍ବା ଯୋଗାଣକାରୀଙ୍କ ନାମ ଖାତାରେ ଯେମିତି ଲେଖା ଅଛି ସେମିତି ଲେଖନ୍ତୁ।',
  },
  'c1.note.todayOnly': {
    en: 'This figure is for now; it is not worked out for another day.',
    hi: 'यह आंकड़ा अभी का है; किसी और दिन का नहीं निकाला जाता।',
    or: 'ଏହି ସଂଖ୍ୟା ଏବେର; ଅନ୍ୟ ଦିନ ପାଇଁ ବାହାର କରାଯାଏ ନାହିଁ।',
  },
  'c1.note.beforeReturns': {
    en: 'Sales by payment type are counted before any returns.',
    hi: 'भुगतान के तरीके से बिक्री वापसी से पहले गिनी गई है।',
    or: 'ପଇଠ ପ୍ରକାର ଅନୁସାରେ ବିକ୍ରି ଫେରସ୍ତ ଆଗରୁ ଗଣାଯାଇଛି।',
  },
  'c1.note.noCompare': {
    en: 'There is no earlier time to compare that with.',
    hi: 'इससे मिलाने को पहले का कोई समय नहीं है।',
    or: 'ଏହା ସହ ମିଳାଇବାକୁ ଆଗର କୌଣସି ସମୟ ନାହିଁ।',
  },
  'c1.note.notUsed': {
    en: 'This answer is for the whole shop, not only {party}.',
    hi: 'यह जवाब पूरी दुकान का है, सिर्फ {party} का नहीं।',
    or: 'ଏହି ଉତ୍ତର ପୂରା ଦୋକାନର, କେବଳ {party}ଙ୍କ ନୁହେଁ।',
  },
  'c1.note.thisPhone': {
    en: 'From the entries on this phone. Anything owed from before them is not included.',
    hi: 'इस फ़ोन की एंट्री से। उनसे पहले का बाकी इसमें नहीं है।',
    or: 'ଏହି ଫୋନର ଏଣ୍ଟ୍ରିରୁ। ସେଗୁଡ଼ିକ ଆଗର ବାକି ଏଥିରେ ନାହିଁ।',
  },
  /*
   * ---- S10 · Your plan (PR-7, R4 §5.4) ---------------------------------
   *
   * Plain facts, no urgency and no guilt (R4 §5.2). The "14" in the preview
   * lines is the server's PREVIEW_DAYS; S10.test.tsx binds the two. Hindi and
   * Odia are DRAFTS like everything else here (H13) - and R4 §5.4.7 says a
   * cancel flow clear only in English is not clear to this user, so these
   * lines especially need the native read.
   */
  's1.plan': { en: 'Your plan', hi: 'आपका प्लान', or: 'ଆପଣଙ୍କ ପ୍ଲାନ' },
  's10.title': { en: 'Your plan', hi: 'आपका प्लान', or: 'ଆପଣଙ୍କ ପ୍ଲାନ' },
  's10.status.preview': {
    en: 'Premium preview ends on {date}.',
    hi: 'मुफ़्त प्रीमियम {date} को खत्म होगा।',
    or: 'ମାଗଣା ପ୍ରିମିୟମ {date} ରେ ଶେଷ ହେବ।',
  },
  's10.status.renews': {
    en: 'Premium renews on {date}.',
    hi: 'प्रीमियम {date} को अपने-आप रिन्यू होगा।',
    or: 'ପ୍ରିମିୟମ {date} ରେ ନିଜେ ନବୀକରଣ ହେବ।',
  },
  's10.status.ends': {
    en: 'Premium ends on {date}. It will not renew.',
    hi: 'प्रीमियम {date} को खत्म होगा। यह फिर रिन्यू नहीं होगा।',
    or: 'ପ୍ରିମିୟମ {date} ରେ ଶେଷ ହେବ। ଏହା ପୁଣି ନବୀକରଣ ହେବ ନାହିଁ।',
  },
  's10.status.on': { en: 'Premium is on.', hi: 'प्रीमियम चालू है।', or: 'ପ୍ରିମିୟମ ଚାଲୁ ଅଛି।' },
  's10.status.onHold': {
    en: 'Google Play could not take the payment. Premium is paused until it does.',
    hi: 'Google Play भुगतान नहीं ले पाया। भुगतान होने तक प्रीमियम रुका है।',
    or: 'Google Play ଦେୟ ନେଇପାରିଲା ନାହିଁ। ଦେୟ ନହେବା ପର୍ଯ୍ୟନ୍ତ ପ୍ରିମିୟମ ବନ୍ଦ ରହିବ।',
  },
  's10.status.lapsed': {
    en: 'Premium has ended. Everything recorded under Premium stays readable and can be exported. Nothing was deleted.',
    hi: 'प्रीमियम खत्म हो गया है। प्रीमियम में दर्ज सब कुछ पढ़ा जा सकता है और निर्यात हो सकता है। कुछ भी मिटाया नहीं गया।',
    or: 'ପ୍ରିମିୟମ ଶେଷ ହୋଇଛି। ପ୍ରିମିୟମରେ ଲେଖାଯାଇଥିବା ସବୁକିଛି ପଢ଼ିହେବ ଓ ରପ୍ତାନି କରିହେବ। କିଛି ମିଟାଯାଇନାହିଁ।',
  },
  's10.status.free': { en: 'You are on Free.', hi: 'आप मुफ़्त प्लान पर हैं।', or: 'ଆପଣ ମାଗଣା ପ୍ଲାନରେ ଅଛନ୍ତି।' },
  's10.free.title': { en: 'Free, for ever', hi: 'मुफ़्त, हमेशा के लिए', or: 'ମାଗଣା, ସବୁଦିନ ପାଇଁ' },
  's10.free.promise': {
    en: 'No ads and no time limit. All of this stays free, also after Premium ends.',
    hi: 'कोई विज्ञापन नहीं, कोई समय-सीमा नहीं। यह सब मुफ़्त रहता है, प्रीमियम खत्म होने के बाद भी।',
    or: 'କୌଣସି ବିଜ୍ଞାପନ ନାହିଁ, କୌଣସି ସମୟ ସୀମା ନାହିଁ। ଏସବୁ ମାଗଣା ରହେ, ପ୍ରିମିୟମ ଶେଷ ହେବା ପରେ ବି।',
  },
  's10.free.close': {
    en: 'Closing the day and the cash check',
    hi: 'दिन बंद करना और नकद जाँच',
    or: 'ଦିନ ବନ୍ଦ କରିବା ଓ ନଗଦ ଯାଞ୍ଚ',
  },
  's10.free.entries': {
    en: 'Every entry, and every correction',
    hi: 'हर एंट्री, और हर सुधार',
    or: 'ପ୍ରତ୍ୟେକ ଏଣ୍ଟ୍ରି, ଓ ପ୍ରତ୍ୟେକ ସଂଶୋଧନ',
  },
  's10.free.parties': { en: 'Parties and udhar', hi: 'खाते और उधार', or: 'ଖାତା ଓ ଉଧାର' },
  's10.free.history': {
    en: 'Reading every past day, with no limit',
    hi: 'हर पिछला दिन पढ़ना, बिना किसी सीमा के',
    or: 'ପ୍ରତ୍ୟେକ ପୁରୁଣା ଦିନ ପଢ଼ିବା, କୌଣସି ସୀମା ବିନା',
  },
  's10.free.data': {
    en: 'Exporting and deleting your data',
    hi: 'अपना डेटा निर्यात करना और मिटाना',
    or: 'ଆପଣଙ୍କ ଡାଟା ରପ୍ତାନି ଓ ମିଟାଇବା',
  },
  's10.free.rights': {
    en: 'Your consents, and the grievance officer',
    hi: 'आपकी सहमतियाँ, और शिकायत अधिकारी',
    or: 'ଆପଣଙ୍କ ସହମତି, ଓ ଅଭିଯୋଗ ଅଧିକାରୀ',
  },
  's10.premium.title': { en: 'Premium adds', hi: 'प्रीमियम में और', or: 'ପ୍ରିମିୟମରେ ଅଧିକ' },
  's10.premium.items': {
    en: 'Items on each sale, from your own short list',
    hi: 'हर बिक्री में सामान, आपकी अपनी छोटी सूची से',
    or: 'ପ୍ରତ୍ୟେକ ବିକ୍ରିରେ ଜିନିଷ, ଆପଣଙ୍କ ନିଜ ଛୋଟ ତାଲିକାରୁ',
  },
  's10.premium.itemReports': {
    en: 'Item reports: what sells most, what sells slowly, what a customer usually buys',
    hi: 'सामान की रिपोर्ट: क्या सबसे ज़्यादा बिकता है, क्या धीरे बिकता है, ग्राहक आमतौर पर क्या लेता है',
    or: 'ଜିନିଷ ରିପୋର୍ଟ: କଣ ବେଶି ବିକେ, କଣ ଧୀରେ ବିକେ, ଗ୍ରାହକ ସାଧାରଣତଃ କଣ କିଣନ୍ତି',
  },
  's10.premium.forecast': {
    en: 'A sales estimate for the coming days. It is an estimate, never a promise.',
    hi: 'आने वाले दिनों की बिक्री का अनुमान। यह अनुमान है, वादा नहीं।',
    or: 'ଆଗାମୀ ଦିନର ବିକ୍ରି ଅନୁମାନ। ଏହା ଅନୁମାନ, ପ୍ରତିଶ୍ରୁତି ନୁହେଁ।',
  },
  's10.premium.comparisons': {
    en: 'Comparisons: the same time last year, festival weeks, how long each customer takes to pay',
    hi: 'तुलना: पिछले साल का यही समय, त्योहार के हफ़्ते, हर ग्राहक भुगतान में कितना समय लेता है',
    or: 'ତୁଳନା: ଗତ ବର୍ଷର ଏହି ସମୟ, ପର୍ବ ସପ୍ତାହ, ପ୍ରତ୍ୟେକ ଗ୍ରାହକ ଦେୟ ଦେବାକୁ କେତେ ସମୟ ନିଅନ୍ତି',
  },
  's10.premium.chat': {
    en: 'Questions answered from your own shop figures',
    hi: 'आपकी दुकान के अपने आँकड़ों से सवालों के जवाब',
    or: 'ଆପଣଙ୍କ ଦୋକାନର ନିଜ ହିସାବରୁ ପ୍ରଶ୍ନର ଉତ୍ତର',
  },
  's10.premium.dashboard': {
    en: 'One screen that brings these together',
    hi: 'एक स्क्रीन जिसमें ये सब साथ हों',
    or: 'ଗୋଟିଏ ସ୍କ୍ରୀନ ଯେଉଁଥିରେ ଏସବୁ ଏକାଠି',
  },
  's10.price.title': { en: 'Price of Premium', hi: 'प्रीमियम का दाम', or: 'ପ୍ରିମିୟମର ଦାମ' },
  's10.price.monthly': { en: 'Monthly', hi: 'मासिक', or: 'ମାସିକ' },
  's10.price.yearly': { en: 'Yearly', hi: 'सालाना', or: 'ବାର୍ଷିକ' },
  's10.price.perMonth': { en: 'a month, GST included', hi: 'प्रति माह, GST सहित', or: 'ପ୍ରତି ମାସ, GST ସହିତ' },
  's10.price.perYear': { en: 'a year, GST included', hi: 'प्रति वर्ष, GST सहित', or: 'ପ୍ରତି ବର୍ଷ, GST ସହିତ' },
  's10.renew.monthly': {
    en: 'Renews automatically every month until you cancel.',
    hi: 'रद्द करने तक हर महीने अपने-आप रिन्यू होता है।',
    or: 'ବାତିଲ ନକରିବା ପର୍ଯ୍ୟନ୍ତ ପ୍ରତି ମାସ ନିଜେ ନବୀକରଣ ହୁଏ।',
  },
  's10.renew.yearly': {
    en: 'Renews automatically every year until you cancel.',
    hi: 'रद्द करने तक हर साल अपने-आप रिन्यू होता है।',
    or: 'ବାତିଲ ନକରିବା ପର୍ଯ୍ୟନ୍ତ ପ୍ରତି ବର୍ଷ ନିଜେ ନବୀକରଣ ହୁଏ।',
  },
  's10.cancelTerms': {
    en: 'Cancel any time in Google Play. Premium stays on to the end of the period already paid.',
    hi: 'Google Play में कभी भी रद्द करें। जितने समय का भुगतान हो चुका है, उसके अंत तक प्रीमियम चालू रहता है।',
    or: 'Google Play ରେ ଯେକୌଣସି ସମୟରେ ବାତିଲ କରନ୍ତୁ। ଦେୟ ହୋଇସାରିଥିବା ସମୟର ଶେଷ ପର୍ଯ୍ୟନ୍ତ ପ୍ରିମିୟମ ଚାଲୁ ରହେ।',
  },
  's10.buy.monthly': { en: 'Buy monthly', hi: 'मासिक खरीदें', or: 'ମାସିକ କିଣନ୍ତୁ' },
  's10.buy.yearly': { en: 'Buy yearly', hi: 'सालाना खरीदें', or: 'ବାର୍ଷିକ କିଣନ୍ତୁ' },
  's10.notOpen': {
    en: 'Buying Premium is not open yet.',
    hi: 'प्रीमियम खरीदना अभी शुरू नहीं हुआ है।',
    or: 'ପ୍ରିମିୟମ କିଣିବା ଏପର୍ଯ୍ୟନ୍ତ ଖୋଲିନାହିଁ।',
  },
  's10.preview': {
    en: 'Try Premium free for 14 days, no payment details',
    hi: 'प्रीमियम 14 दिन मुफ़्त आज़माएँ, कोई भुगतान विवरण नहीं',
    or: 'ପ୍ରିମିୟମ 14 ଦିନ ମାଗଣା ଦେଖନ୍ତୁ, କୌଣସି ଦେୟ ବିବରଣୀ ନାହିଁ',
  },
  's10.preview.note': {
    en: 'It simply ends after 14 days. Nothing is charged, and nothing renews.',
    hi: 'यह 14 दिन बाद अपने-आप खत्म हो जाता है। कोई पैसा नहीं कटता, और कुछ रिन्यू नहीं होता।',
    or: 'ଏହା 14 ଦିନ ପରେ ନିଜେ ଶେଷ ହୋଇଯାଏ। କିଛି ଟଙ୍କା କଟେ ନାହିଁ, କିଛି ନବୀକରଣ ହୁଏ ନାହିଁ।',
  },
  's10.cancel': { en: 'Cancel Premium', hi: 'प्रीमियम रद्द करें', or: 'ପ୍ରିମିୟମ ବାତିଲ କରନ୍ତୁ' },
  's10.cancel.note': {
    en: 'Opens your subscription in Google Play.',
    hi: 'Google Play में आपकी सदस्यता खोलता है।',
    or: 'Google Play ରେ ଆପଣଙ୍କ ସଦସ୍ୟତା ଖୋଲେ।',
  },
  's10.notice.previewStarted': {
    en: 'Premium preview has started. It ends by itself after 14 days, and nothing is charged.',
    hi: 'मुफ़्त प्रीमियम शुरू हो गया। यह 14 दिन बाद अपने-आप खत्म होगा, और कोई पैसा नहीं कटेगा।',
    or: 'ମାଗଣା ପ୍ରିମିୟମ ଆରମ୍ଭ ହେଲା। ଏହା 14 ଦିନ ପରେ ନିଜେ ଶେଷ ହେବ, କିଛି ଟଙ୍କା କଟିବ ନାହିଁ।',
  },
  's10.notice.notOpen': {
    en: 'Buying Premium is not open yet. Nothing was charged.',
    hi: 'प्रीमियम खरीदना अभी शुरू नहीं हुआ है। कोई पैसा नहीं कटा।',
    or: 'ପ୍ରିମିୟମ କିଣିବା ଏପର୍ଯ୍ୟନ୍ତ ଖୋଲିନାହିଁ। କିଛି ଟଙ୍କା କଟିନାହିଁ।',
  },
  's10.notice.offline': {
    en: 'No connection. Nothing changed. Try again when the phone is online.',
    hi: 'कनेक्शन नहीं है। कुछ नहीं बदला। फ़ोन ऑनलाइन होने पर फिर कोशिश करें।',
    or: 'ସଂଯୋଗ ନାହିଁ। କିଛି ବଦଳିନାହିଁ। ଫୋନ ଅନଲାଇନ ହେଲେ ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
  },
  's10.notice.failed': {
    en: 'That did not go through. Your plan has not changed.',
    hi: 'यह पूरा नहीं हुआ। आपका प्लान नहीं बदला।',
    or: 'ଏହା ହୋଇପାରିଲା ନାହିଁ। ଆପଣଙ୍କ ପ୍ଲାନ ବଦଳିନାହିଁ।',
  },
  's10.notice.pending': {
    en: 'Google Play is still processing the payment. Premium starts when it is done.',
    hi: 'Google Play अभी भुगतान पूरा कर रहा है। पूरा होने पर प्रीमियम शुरू होगा।',
    or: 'Google Play ଏବେ ବି ଦେୟ ପ୍ରକ୍ରିୟା କରୁଛି। ଶେଷ ହେଲେ ପ୍ରିମିୟମ ଆରମ୍ଭ ହେବ।',
  },
  's10.notice.verifyLater': {
    en: 'Google Play took the purchase. It will be confirmed when the phone is online, and it is kept on this phone until then.',
    hi: 'Google Play ने खरीद ले ली है। फ़ोन ऑनलाइन होने पर इसकी पुष्टि होगी, तब तक यह इसी फ़ोन पर रखी है।',
    or: 'Google Play କିଣା ନେଇସାରିଛି। ଫୋନ ଅନଲାଇନ ହେଲେ ଏହା ନିଶ୍ଚିତ ହେବ, ସେପର୍ଯ୍ୟନ୍ତ ଏହା ଏହି ଫୋନରେ ରଖାଯାଇଛି।',
  },
  's10.notice.purchased': { en: 'Premium is on.', hi: 'प्रीमियम चालू हो गया।', or: 'ପ୍ରିମିୟମ ଚାଲୁ ହେଲା।' },
  /*
   * USABILITY PASS (wave 5, 2026-11-18, `qa/swafto-retail-desk/USABILITY.md` §4).
   * Hindi and Odia below are DRAFTS like every other line in this file (H13):
   * where an existing phrase already said the same thing it is reused verbatim,
   * and the rest are new drafts awaiting the native reader. None is reviewed.
   */
  'sync.saved': { en: 'Saved', hi: 'सहेजा गया', or: 'ସାଇତା ହେଲା' },
  'sync.savedLong': {
    en: 'Saved. Everything on this phone has been sent.',
    hi: 'सहेजा गया। इस फ़ोन का सब कुछ भेज दिया गया है।',
    or: 'ସାଇତା ହେଲା। ଏହି ଫୋନର ସବୁକିଛି ପଠାଯାଇଛି।',
  },
  'sync.waiting': {
    en: '{n} waiting · safe on phone',
    hi: '{n} बाकी · फ़ोन में सुरक्षित',
    or: '{n} ବାକି · ଫୋନରେ ସୁରକ୍ଷିତ',
  },
  'sync.waitingLong': {
    en: '{n} waiting to send. Safe on this phone; it goes when the network is back.',
    hi: '{n} भेजना बाकी। इस फ़ोन में सुरक्षित है; नेटवर्क आने पर चला जाएगा।',
    or: '{n} ପଠାଇବା ବାକି। ଏହି ଫୋନରେ ସୁରକ୍ଷିତ; ନେଟୱର୍କ ଆସିଲେ ଚାଲିଯିବ।',
  },
  'box.title': { en: 'In the box now', hi: 'अभी बॉक्स में', or: 'ଏବେ ବାକ୍ସରେ' },
  'box.opening': { en: 'Opening', hi: 'शुरुआत', or: 'ଆରମ୍ଭ' },
  'box.in': { en: 'cash in', hi: 'नकद आया', or: 'ନଗଦ ଆସିଲା' },
  'box.out': { en: 'cash out', hi: 'नकद गया', or: 'ନଗଦ ଗଲା' },
  'box.adjust': { en: 'adjustment', hi: 'समायोजन', or: 'ସମନ୍ୱୟ' },
  'box.sales': { en: 'Sales today', hi: 'आज की बिक्री', or: 'ଆଜିର ବିକ୍ରି' },
  'box.noSales': { en: 'No sales yet today', hi: 'आज अभी कोई बिक्री नहीं', or: 'ଆଜି ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ବିକ୍ରି ନାହିଁ' },
  'box.nothingOut': { en: 'Nothing paid out yet', hi: 'अभी कुछ नहीं दिया', or: 'ଏପର୍ଯ୍ୟନ୍ତ କିଛି ଦିଆଯାଇନାହିଁ' },
  't1.more': { en: 'More', hi: 'और', or: 'ଅଧିକ' },
  't5.nothingToday': { en: 'Nothing today', hi: 'आज कुछ नहीं', or: 'ଆଜି କିଛି ନାହିଁ' },
  't5.undo': { en: 'Undo', hi: 'वापस लें', or: 'ଫେରାଇ ନିଅନ୍ତୁ' },
  't5.skippedCount': {
    en: '{n} marked "nothing today"',
    hi: '{n} में "आज कुछ नहीं"',
    or: '{n}ଟିରେ "ଆଜି କିଛି ନାହିଁ"',
  },
  't5.openingStep': { en: 'Counts as step 1', hi: 'पहला कदम गिना गया', or: 'ପ୍ରଥମ ପାଦ ଭାବେ ଗଣାଯାଏ' },
  't5.locked': { en: 'Locked', hi: 'बंद है', or: 'ତାଲା ପଡ଼ିଛି' },
  't5.closeLocked': {
    en: 'After the cash check',
    hi: 'नकद जाँच के बाद',
    or: 'ନଗଦ ଯାଞ୍ଚ ପରେ',
  },
  't8.title.collect': { en: 'Collect', hi: 'वसूली', or: 'ଆଦାୟ' },
  't8.title.pay': { en: 'Pay supplier', hi: 'आपूर्तिकर्ता को भुगतान', or: 'ଯୋଗାଣକାରୀଙ୍କୁ ଦେୟ' },
  't8.title.credit': { en: 'Udhar sale', hi: 'उधार बिक्री', or: 'ଉଧାର ବିକ୍ରି' },
  'picker.owes': { en: 'owes', hi: 'देना है', or: 'ଦେବାର ଅଛି' },
  'picker.youOwe': { en: 'you owe', hi: 'आपको देना है', or: 'ଆପଣଙ୍କୁ ଦେବାର' },
  'picker.settled': { en: 'nothing owed', hi: 'कुछ बाकी नहीं', or: 'କିଛି ବାକି ନାହିଁ' },
  // Word order follows each language: "Ramesh, owes ₹450" / "रमेश, ₹450 देना है" / "ରମେଶ, ₹450 ଦେବାର ଅଛି".
  'picker.name': { en: '{name}, {state} {amount}', hi: '{name}, {amount} {state}', or: '{name}, {amount} {state}' },
  'entry.saved': { en: 'Saved', hi: 'सहेजा गया', or: 'ସାଇତା ହେଲା' },
  'entry.savedLong': {
    en: 'Saved {amount}, {mode}',
    hi: '{amount} सहेजा गया, {mode}',
    or: '{amount} ସାଇତା ହେଲା, {mode}',
  },
  'p1.changedToday': { en: 'changed today', hi: 'आज बदला', or: 'ଆଜି ବଦଳିଲା' },
  /* ==== M3 "Mitra" (2026-11-18): the 62 FLOWS.md copy gaps, plus the few words the
   * v2 components need. English is the FLOWS copy verbatim. Hindi and Odia are
   * DRAFTS written for this build, like every other hi/or string here: they
   * render and are laid out against, and NOBODY HAS REVIEWED THEM (H13). ==== */

  /* ---- shared words ---- */
  'common.close': { en: 'Close', hi: 'बंद करें', or: 'ବନ୍ଦ କରନ୍ତୁ' },
  'common.on': { en: 'On', hi: 'चालू', or: 'ଚାଲୁ' },
  'common.off': { en: 'Off', hi: 'बंद', or: 'ବନ୍ଦ' },
  'common.chosen': { en: 'Chosen', hi: 'चुना गया', or: 'ବଛାଯାଇଛି' },
  'common.offline': { en: 'Offline', hi: 'नेटवर्क नहीं', or: 'ନେଟୱର୍କ ନାହିଁ' },

  /* ---- X0, refusing the required purpose ---- */
  'x0.refuse.title': { en: 'No account without this', hi: 'इसके बिना खाता नहीं बनेगा', or: 'ଏହା ବିନା ଖାତା ହେବ ନାହିଁ' },
  'x0.refuse.body': {
    en: 'SWAFTO cannot keep a book for you without the first item. Nothing has been sent or saved. You can come back any time.',
    hi: 'पहली बात के बिना SWAFTO आपकी बही नहीं रख सकता। कुछ भी भेजा या सहेजा नहीं गया है। आप कभी भी वापस आ सकते हैं।',
    or: 'ପ୍ରଥମ କଥା ବିନା SWAFTO ଆପଣଙ୍କ ଖାତା ରଖିପାରିବ ନାହିଁ। କିଛି ପଠାଯାଇ ନାହିଁ କି ସାଇତାଯାଇ ନାହିଁ। ଆପଣ ଯେକୌଣସି ସମୟରେ ଫେରି ଆସିପାରିବେ।',
  },
  'x0.refuse.language': { en: 'Choose language again', hi: 'भाषा फिर से चुनें', or: 'ଭାଷା ପୁଣି ବାଛନ୍ତୁ' },

  /* ---- the text-size picker (V2 3.15) ---- */
  'textSize.title': { en: 'Text size', hi: 'अक्षरों का आकार', or: 'ଅକ୍ଷରର ଆକାର' },
  'textSize.preview': { en: 'Preview', hi: 'नमूना', or: 'ନମୁନା' },
  'textSize.normal': { en: 'Normal', hi: 'सामान्य', or: 'ସାଧାରଣ' },
  'textSize.large': { en: 'Large', hi: 'बड़ा', or: 'ବଡ଼' },
  'textSize.xlarge': { en: 'Extra large', hi: 'और बड़ा', or: 'ଆହୁରି ବଡ଼' },
  'textSize.hint': {
    en: 'Words and figures grow. The header and the buttons stay the same size.',
    hi: 'शब्द और रकम बड़े होते हैं। ऊपर की पट्टी और बटन उतने ही रहते हैं।',
    or: 'ଶବ୍ଦ ଓ ଅଙ୍କ ବଡ଼ ହୁଏ। ଉପର ପଟି ଓ ବଟନ ସେତିକି ରହେ।',
  },

  /* ---- Today ---- */
  't1.future.openSettings': { en: 'Open date settings', hi: 'तारीख़ की सेटिंग खोलें', or: 'ତାରିଖ ସେଟିଂ ଖୋଲନ୍ତୁ' },
  /*
   * The FLOWS "Open date settings" button needs an Android intent the host does
   * not have yet. Until it does, this sentence is drawn instead of a button
   * that would do nothing (reported, M3).
   */
  't1.future.howTo': {
    en: "Open the phone's Settings, then Date and time.",
    hi: 'फ़ोन की सेटिंग खोलें, फिर तारीख़ और समय।',
    or: 'ଫୋନର ସେଟିଂ ଖୋଲନ୍ତୁ, ତା’ପରେ ତାରିଖ ଓ ସମୟ।',
  },
  'act.return': { en: 'Return', hi: 'वापसी', or: 'ଫେରସ୍ତ' },
  'act.adjustment': { en: 'Adjustment', hi: 'समायोजन', or: 'ସମାୟୋଜନ' },

  /* ---- hardware Back from Today ---- */
  'exit.title': { en: 'Exit the app?', hi: 'ऐप से बाहर निकलें?', or: 'ଆପରୁ ବାହାରିବେ?' },
  'exit.body': {
    en: 'Your entries stay safe on this phone.',
    hi: 'आपकी एंट्री इस फ़ोन पर सुरक्षित रहती हैं।',
    or: 'ଆପଣଙ୍କ ଏଣ୍ଟ୍ରି ଏହି ଫୋନରେ ସୁରକ୍ଷିତ ରହେ।',
  },
  'exit.stay': { en: 'Stay', hi: 'रुकें', or: 'ରୁହନ୍ତୁ' },
  'exit.exit': { en: 'Exit', hi: 'बाहर निकलें', or: 'ବାହାରନ୍ତୁ' },

  /* ---- day close ---- */
  't12.chooseFirst': {
    en: 'Choose an answer above to close the day.',
    hi: 'दिन बंद करने के लिए ऊपर एक जवाब चुनें।',
    or: 'ଦିନ ବନ୍ଦ କରିବାକୁ ଉପରେ ଗୋଟିଏ ଉତ୍ତର ବାଛନ୍ତୁ।',
  },
  't14.closing': { en: 'Closing the day', hi: 'दिन बंद हो रहा है', or: 'ଦିନ ବନ୍ଦ ହେଉଛି' },

  /* ---- ledger and parties ---- */
  'p1.advance.note': {
    en: 'This person paid more than was owed. The extra is an advance you hold for them. It is not udhar to collect.',
    hi: 'इस व्यक्ति ने बकाया से ज़्यादा दिया। ज़्यादा रकम उनकी अग्रिम है जो आपके पास है। यह वसूलने वाला उधार नहीं है।',
    or: 'ଏହି ବ୍ୟକ୍ତି ବାକିଠାରୁ ଅଧିକ ଦେଇଛନ୍ତି। ଅଧିକ ଟଙ୍କା ତାଙ୍କ ଅଗ୍ରିମ, ଯାହା ଆପଣଙ୍କ ପାଖରେ ଅଛି। ଏହା ଆଦାୟ କରିବାକୁ ଥିବା ଉଧାର ନୁହେଁ।',
  },
  'p2.whatsapp.outside': {
    en: 'WhatsApp opens here, outside the app',
    hi: 'WhatsApp यहाँ खुलता है, ऐप के बाहर',
    or: 'WhatsApp ଏଠାରେ ଖୋଲେ, ଆପ ବାହାରେ',
  },
  'p2.changePhone': { en: 'Change mobile number', hi: 'मोबाइल नंबर बदलें', or: 'ମୋବାଇଲ ନମ୍ବର ବଦଳାନ୍ତୁ' },
  'p2.advance.note': {
    en: 'You hold this for them. They paid more than they owed. Nothing is due from them.',
    hi: 'यह रकम आपके पास उनकी है। उन्होंने बकाया से ज़्यादा दिया। उनसे कुछ लेना बाकी नहीं है।',
    or: 'ଏହି ଟଙ୍କା ଆପଣଙ୍କ ପାଖରେ ତାଙ୍କର। ସେ ବାକିଠାରୁ ଅଧିକ ଦେଇଛନ୍ତି। ତାଙ୍କଠାରୁ କିଛି ପାଇବାକୁ ନାହିଁ।',
  },
  'p2.correction.note': {
    en: "The original stays in the book. A correction is added as a new entry with today's date that points to it.",
    hi: 'मूल एंट्री बही में रहती है। सुधार आज की तारीख़ की नई एंट्री के रूप में जुड़ता है, जो उसी की ओर इशारा करती है।',
    or: 'ମୂଳ ଏଣ୍ଟ୍ରି ଖାତାରେ ରହେ। ସଂଶୋଧନ ଆଜିର ତାରିଖର ନୂଆ ଏଣ୍ଟ୍ରି ଭାବେ ଯୋଡ଼ାଯାଏ, ଯାହା ସେହି ଏଣ୍ଟ୍ରିକୁ ଦର୍ଶାଏ।',
  },
  'p2.correction.thisEntry': { en: 'This entry', hi: 'यह एंट्री', or: 'ଏହି ଏଣ୍ଟ୍ରି' },
  'p6.clear.note': {
    en: 'Removing the limit only stops the warning. No entry changes. You can set a limit again at any time.',
    hi: 'सीमा हटाने से सिर्फ़ चेतावनी रुकती है। कोई एंट्री नहीं बदलती। आप कभी भी फिर से सीमा रख सकते हैं।',
    or: 'ସୀମା ହଟାଇଲେ କେବଳ ସତର୍କତା ବନ୍ଦ ହୁଏ। କୌଣସି ଏଣ୍ଟ୍ରି ବଦଳେ ନାହିଁ। ଆପଣ ଯେକୌଣସି ସମୟରେ ପୁଣି ସୀମା ରଖିପାରିବେ।',
  },

  /* ---- reports ---- */
  'r1.gate.closer': {
    en: 'Each day you close brings these readings closer.',
    hi: 'हर बंद किया गया दिन इन आँकड़ों को पास लाता है।',
    or: 'ଆପଣ ବନ୍ଦ କରୁଥିବା ପ୍ରତିଟି ଦିନ ଏହି ହିସାବକୁ ପାଖକୁ ଆଣେ।',
  },
  'm1.items.placeholder': {
    en: 'Item cards appear here (drawn in the items area).',
    hi: 'सामान के कार्ड यहाँ दिखते हैं (सामान वाले भाग में)।',
    or: 'ଜିନିଷର କାର୍ଡ ଏଠାରେ ଦେଖାଯାଏ (ଜିନିଷ ଭାଗରେ)।',
  },
  's12.explain.plain': {
    en: "Choose a month. The phone makes a file of that month's entries and every party's balance, one you can open in a spreadsheet, and opens the share sheet. Nothing is sent to our server.",
    hi: 'एक महीना चुनें। फ़ोन उस महीने की एंट्री और हर व्यक्ति की बाकी रकम की एक फ़ाइल बनाता है, जिसे स्प्रेडशीट में खोला जा सकता है, और भेजने का विकल्प खोलता है। हमारे सर्वर पर कुछ नहीं भेजा जाता।',
    or: 'ଗୋଟିଏ ମାସ ବାଛନ୍ତୁ। ଫୋନ ସେହି ମାସର ଏଣ୍ଟ୍ରି ଓ ପ୍ରତ୍ୟେକ ବ୍ୟକ୍ତିଙ୍କ ବାକିର ଏକ ଫାଇଲ ତିଆରି କରେ, ଯାହା ସ୍ପ୍ରେଡସିଟରେ ଖୋଲିହେବ, ଏବଂ ପଠାଇବା ବିକଳ୍ପ ଖୋଲେ। ଆମ ସର୍ଭରକୁ କିଛି ପଠାଯାଏ ନାହିଁ।',
  },

  /* ---- settings hub, grouped ---- */
  's1.group.account': { en: 'Account', hi: 'खाता', or: 'ଖାତା' },
  's1.group.yourAccount': { en: 'Your account', hi: 'आपका खाता', or: 'ଆପଣଙ୍କ ଖାତା' },
  's1.group.shop': { en: 'Your shop', hi: 'आपकी दुकान', or: 'ଆପଣଙ୍କ ଦୋକାନ' },
  's1.group.legal': { en: 'Legal and help', hi: 'कानूनी बातें और मदद', or: 'ଆଇନଗତ କଥା ଓ ସାହାଯ୍ୟ' },
  's1.group.danger': { en: 'Danger zone', hi: 'सावधान', or: 'ସାବଧାନ' },
  's1.delete.detail': {
    en: 'Deletes your book. You can undo for 30 days.',
    hi: 'आपकी बही मिटाता है। 30 दिन तक वापस ले सकते हैं।',
    or: 'ଆପଣଙ୍କ ଖାତା ମିଟାଏ। 30 ଦିନ ଯାଏ ଫେରାଇ ପାରିବେ।',
  },
  's2.dayStart.changed': {
    en: 'Day now starts at {time}',
    hi: 'अब दिन {time} बजे शुरू होता है',
    or: 'ଏବେ ଦିନ {time} ରେ ଆରମ୍ଭ ହୁଏ',
  },
  'consent.withdrawn': {
    en: 'Turned off. This takes effect now.',
    hi: 'बंद कर दिया। यह अभी से लागू है।',
    or: 'ବନ୍ଦ ହେଲା। ଏହା ଏବେଠାରୁ ଲାଗୁ।',
  },
  's6.web': {
    en: 'Request help or deletion on the web',
    hi: 'वेब पर मदद या मिटाने का अनुरोध करें',
    or: 'ୱେବରେ ସାହାଯ୍ୟ ବା ମିଟାଇବା ପାଇଁ ଅନୁରୋଧ କରନ୍ତୁ',
  },
  's6.web.detail': { en: 'Opens the privacy page', hi: 'निजता का पेज खोलता है', or: 'ଗୋପନୀୟତା ପୃଷ୍ଠା ଖୋଲେ' },
  's6.specimen': { en: 'SPECIMEN, not a real contact', hi: 'नमूना, असली संपर्क नहीं', or: 'ନମୁନା, ପ୍ରକୃତ ଯୋଗାଯୋଗ ନୁହେଁ' },
  's7.copyFirst': { en: 'Take a copy of my data first', hi: 'पहले मेरे डेटा की कॉपी लें', or: 'ପ୍ରଥମେ ମୋ ଡାଟାର କପି ନିଅନ୍ତୁ' },
  's8.deleting': { en: 'Deleting', hi: 'मिटाया जा रहा है', or: 'ମିଟାଯାଉଛି' },

  /* ---- S13 Your data (DPDP access) ---- */
  's13.title': { en: 'Your data', hi: 'आपका डेटा', or: 'ଆପଣଙ୍କ ଡାଟା' },
  's13.body': {
    en: 'This is a copy of everything we hold about you: your number, shop name, every entry and every party.',
    hi: 'यह आपके बारे में हमारे पास जो कुछ है उसकी कॉपी है: आपका नंबर, दुकान का नाम, हर एंट्री और हर व्यक्ति।',
    or: 'ଏହା ଆପଣଙ୍କ ବିଷୟରେ ଆମ ପାଖରେ ଥିବା ସବୁକିଛିର କପି: ଆପଣଙ୍କ ନମ୍ବର, ଦୋକାନର ନାମ, ପ୍ରତିଟି ଏଣ୍ଟ୍ରି ଓ ପ୍ରତ୍ୟେକ ବ୍ୟକ୍ତି।',
  },
  's13.download': {
    en: 'Download everything we hold',
    hi: 'हमारे पास जो कुछ है, सब डाउनलोड करें',
    or: 'ଆମ ପାଖରେ ଥିବା ସବୁକିଛି ଡାଉନଲୋଡ କରନ୍ତୁ',
  },
  's13.correct': {
    en: 'To correct something, add a dated correction on the day. To erase it all, use Delete this account.',
    hi: 'कुछ सुधारना हो तो उस दिन तारीख़ वाला सुधार जोड़ें। सब मिटाने के लिए "यह खाता मिटाएँ" का उपयोग करें।',
    or: 'କିଛି ସଂଶୋଧନ କରିବାକୁ ସେହି ଦିନ ତାରିଖ ସହ ସଂଶୋଧନ ଯୋଡ଼ନ୍ତୁ। ସବୁ ମିଟାଇବାକୁ "ଏହି ଖାତା ମିଟାନ୍ତୁ" ବ୍ୟବହାର କରନ୍ତୁ।',
  },
  's13.offline': {
    en: 'No connection, so nothing was downloaded. Try again with signal.',
    hi: 'नेटवर्क नहीं है, इसलिए कुछ डाउनलोड नहीं हुआ। सिग्नल आने पर फिर कोशिश करें।',
    or: 'ନେଟୱର୍କ ନାହିଁ, ତେଣୁ କିଛି ଡାଉନଲୋଡ ହେଲା ନାହିଁ। ସିଗନାଲ ଆସିଲେ ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
  },
  's13.chooser': { en: 'Share your data', hi: 'अपना डेटा भेजें', or: 'ଆପଣଙ୍କ ଡାଟା ପଠାନ୍ତୁ' },

  /* ---- S14 Signed-in phones (C-21: list + revoke, no new backend) ---- */
  's14.title': { en: 'Signed-in phones', hi: 'साइन-इन फ़ोन', or: 'ସାଇନ୍-ଇନ୍ ଫୋନ' },
  's14.detail': { en: 'Sign out a lost phone', hi: 'खोया फ़ोन साइन आउट करें', or: 'ହଜିଥିବା ଫୋନ ସାଇନ୍ ଆଉଟ୍ କରନ୍ତୁ' },
  's14.body': {
    en: 'Phones that can open this shop book. Sign out one you no longer have.',
    hi: 'वे फ़ोन जो यह बही खोल सकते हैं। जो फ़ोन अब आपके पास नहीं है, उसे साइन आउट करें।',
    or: 'ଯେଉଁ ଫୋନ ଏହି ଖାତା ଖୋଲିପାରେ। ଯେଉଁ ଫୋନ ଆଉ ଆପଣଙ୍କ ପାଖରେ ନାହିଁ, ତାକୁ ସାଇନ୍ ଆଉଟ୍ କରନ୍ତୁ।',
  },
  's14.android': { en: 'Android phone', hi: 'Android फ़ोन', or: 'Android ଫୋନ' },
  's14.thisPhone': { en: 'This phone', hi: 'यह फ़ोन', or: 'ଏହି ଫୋନ' },
  's14.lastUsed.now': { en: 'Last used: now', hi: 'आख़िरी बार: अभी', or: 'ଶେଷ ଥର: ଏବେ' },
  's14.lastUsed.days': {
    en: 'Last used: {n} days ago',
    hi: 'आख़िरी बार: {n} दिन पहले',
    or: 'ଶେଷ ଥର: {n} ଦିନ ଆଗରୁ',
  },
  's14.lastUsed.today': { en: 'Last used: today', hi: 'आख़िरी बार: आज', or: 'ଶେଷ ଥର: ଆଜି' },
  's14.revoked': { en: 'Signed out', hi: 'साइन आउट हो चुका', or: 'ସାଇନ୍ ଆଉଟ୍ ହୋଇସାରିଛି' },
  's14.signOut': { en: 'Sign out this phone', hi: 'यह फ़ोन साइन आउट करें', or: 'ଏହି ଫୋନ ସାଇନ୍ ଆଉଟ୍ କରନ୍ତୁ' },
  's14.confirm.title': { en: 'Sign out that phone?', hi: 'वह फ़ोन साइन आउट करें?', or: 'ସେହି ଫୋନ ସାଇନ୍ ଆଉଟ୍ କରିବେ?' },
  's14.confirm.body': {
    en: 'It will need a new SMS code to open this book again. Entries already saved are not removed.',
    hi: 'यह बही फिर से खोलने के लिए उसे नया SMS कोड चाहिए होगा। पहले से सहेजी एंट्री नहीं हटेंगी।',
    or: 'ଏହି ଖାତା ପୁଣି ଖୋଲିବାକୁ ତାକୁ ନୂଆ SMS କୋଡ୍ ଦରକାର ହେବ। ଆଗରୁ ସାଇତା ଏଣ୍ଟ୍ରି ହଟିବ ନାହିଁ।',
  },
  's14.confirm.keep': { en: 'Keep it signed in', hi: 'साइन इन रहने दें', or: 'ସାଇନ୍ ଇନ୍ ରହିବାକୁ ଦିଅନ୍ତୁ' },
  's14.confirm.yes': { en: 'Sign out that phone', hi: 'वह फ़ोन साइन आउट करें', or: 'ସେହି ଫୋନ ସାଇନ୍ ଆଉଟ୍ କରନ୍ତୁ' },
  's14.done': { en: 'That phone is signed out', hi: 'वह फ़ोन साइन आउट हो गया', or: 'ସେହି ଫୋନ ସାଇନ୍ ଆଉଟ୍ ହୋଇଗଲା' },
  's14.error': {
    en: 'The list of phones could not be loaded. Try again with signal.',
    hi: 'फ़ोन की सूची नहीं खुल सकी। सिग्नल आने पर फिर कोशिश करें।',
    or: 'ଫୋନ ତାଲିକା ଖୋଲିପାରିଲା ନାହିଁ। ସିଗନାଲ ଆସିଲେ ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
  },
} as const satisfies Record<string, Phrase>;

export type StringKey = keyof typeof STRINGS;

/**
 * One string, in the language asked for.
 *
 * `longest` resolves per key, which is the whole point - see the file header.
 * Compared by code-point count rather than by UTF-16 length: Odia is outside the
 * BMP for some conjuncts, and counting UTF-16 units would score it long for the
 * wrong reason and pick it when it does not deserve picking.
 */
export function phrase(key: StringKey, language: RenderLanguage): string {
  const p: Phrase = STRINGS[key];
  if (language !== 'longest') return p[language];
  const candidates = [p.en, p.hi, p.or];
  let best = candidates[0] as string;
  for (const c of candidates) {
    if ([...c].length > [...best].length) best = c;
  }
  return best;
}

/** A bound lookup, so a screen reads `s('formA.title')` and never carries the language around. */
export const strings =
  (language: RenderLanguage) =>
  (key: StringKey): string =>
    phrase(key, language);

export type Strings = ReturnType<typeof strings>;
