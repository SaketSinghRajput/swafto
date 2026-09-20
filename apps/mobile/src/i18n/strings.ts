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
