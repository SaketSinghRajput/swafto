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

  /* ---- shared by every screen frame -------------------------------- */
  'common.loading': { en: 'Opening', hi: 'खुल रहा है', or: 'ଖୋଲୁଛି' },
  'common.error': {
    en: 'Could not open this. Nothing you entered is lost.',
    hi: 'यह नहीं खुल सका। आपका दर्ज किया कुछ भी नहीं गया।',
    or: 'ଏହା ଖୋଲିପାରିଲା ନାହିଁ। ଆପଣ ଲେଖିଥିବା କିଛି ହଜିନାହିଁ।',
  },
  'common.retry': { en: 'Try again', hi: 'फिर कोशिश करें', or: 'ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ' },
  'common.empty': { en: 'Nothing here yet', hi: 'अभी यहाँ कुछ नहीं', or: 'ଏଠାରେ ଏପର୍ଯ୍ୟନ୍ତ କିଛି ନାହିଁ' },
  'common.save': { en: 'Save', hi: 'सहेजें', or: 'ସଞ୍ଚୟ କରନ୍ତୁ' },

  /* ---- the nine sections of the paper sheet -------------------------- */
  'section.cash_sales': { en: 'Cash sales', hi: 'नकद बिक्री', or: 'ନଗଦ ବିକ୍ରି' },
  'section.upi_sales': { en: 'UPI sales', hi: 'UPI बिक्री', or: 'UPI ବିକ୍ରି' },
  'section.udhar_sales': { en: 'Credit sales', hi: 'उधार बिक्री', or: 'ଉଧାର ବିକ୍ରି' },
  'section.purchase': { en: 'Purchases', hi: 'खरीद', or: 'କିଣା' },
  'section.expense': { en: 'Expenses', hi: 'खर्च', or: 'ଖର୍ଚ୍ଚ' },
  'section.udhar_collection': { en: 'Udhar collected', hi: 'उधार वसूली', or: 'ଉଧାର ଆଦାୟ' },
  'section.party_payment': { en: 'Paid to suppliers', hi: 'आपूर्तिकर्ता को भुगतान', or: 'ଯୋଗାଣକାରୀଙ୍କୁ ଦିଆଗଲା' },
  'section.withdrawal': { en: 'Taken by owner', hi: 'मालिक ने लिया', or: 'ମାଲିକ ନେଇଛନ୍ତି' },

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
  't8.collect': { en: 'Collected', hi: 'वसूली', or: 'ଆଦାୟ' },
  't8.pay': { en: 'Paid out', hi: 'भुगतान', or: 'ଦେଲି' },
  't8.credit': { en: 'On credit', hi: 'उधार', or: 'ଉଧାର' },
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
  't12.reason.change': { en: 'Gave change from my pocket', hi: 'अपनी जेब से छुट्टा दिया', or: 'ନିଜ ପକେଟରୁ ଖୁଚୁରା ଦେଲି' },
  't12.reason.missed': { en: 'Forgot to write something', hi: 'कुछ लिखना भूल गया', or: 'କିଛି ଲେଖିବାକୁ ଭୁଲିଗଲି' },

  /* ---- T14 · the day, closed ----------------------------------------- */
  't14.title': { en: 'Day closed', hi: 'दिन बंद हुआ', or: 'ଦିନ ବନ୍ଦ ହେଲା' },
  't14.profit': { en: 'Estimated profit', hi: 'अनुमानित लाभ', or: 'ଆନୁମାନିକ ଲାଭ' },
  't14.withdrawalNote': {
    en: 'Money you took is shown separately and is not counted against profit.',
    hi: 'आपने जो लिया वह अलग दिखाया है और लाभ में से नहीं घटाया।',
    or: 'ଆପଣ ନେଇଥିବା ଟଙ୍କା ଅଲଗା ଦେଖାଯାଇଛି ଏବଂ ଲାଭରୁ ହଟାଯାଇନାହିଁ।',
  },

  /* ---- the cash-check working, line by line -------------------------- */
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
