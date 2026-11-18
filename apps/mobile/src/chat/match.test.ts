/**
 * THE ASK MATCHER: normalisation, slots, follow-ups, the confidence floor, and
 * the measured accuracy on the labelled corpus.
 *
 * THE ACCURACY IS PINNED, NOT THRESHOLDED. R3 sets no accuracy target and none
 * belongs here (thresholds are BENCHMARKS.md's, by the human process). The
 * counts below are what was measured, so any change to the bank, the scoring or
 * the constants changes them and has to be re-recorded in the diff, up or down,
 * where a reviewer sees it. A number that moves silently is not a measurement.
 */
import { describe, it, expect } from 'vitest';
import { INTENTS, INTENT_IDS } from './bank.ts';
import {
  CONFIDENCE_FLOOR,
  CONFIDENCE_MARGIN,
  EXAMPLES,
  isConfident,
  match,
  normalise,
  rank,
  slotsOf,
  type PartyName,
} from './match.ts';
import { CORPUS } from '../../test/chat-corpus.ts';
import { STRINGS, type StringKey } from '../i18n/strings.ts';

const PARTIES: readonly PartyName[] = [
  { id: 'p-ramesh', name: 'Ramesh' },
  { id: 'p-sunita', name: 'Sunita Devi' },
  { id: 'p-wholesale', name: 'Gupta Wholesale' },
  { id: 'p-dairy', name: 'Anand Dairy' },
  { id: 'p-odia', name: 'ବିଶ୍ୱନାଥ ମହାପାତ୍ର' },
];

describe('normalisation', () => {
  it('Devanagari and Odia digits become ASCII; punctuation is a space', () => {
    expect(normalise('३० दिन')).toEqual(['30', 'दिन']);
    expect(normalise('୩୦ ଦିନ')).toEqual(['30', 'ଦିନ']);
    expect(normalise("Today's sales?!")).toEqual(['today', 's', 'sales']);
    expect(normalise('बिक्री। कितनी॥')).toEqual(['बिक्री', 'कितनी']);
  });

  it('nukta, joiners and chandrabindu do not split one word into two spellings', () => {
    expect(normalise('ज़्यादा')).toEqual(normalise('ज्यादा'));
    expect(normalise('ज़')).toEqual(['ज']); // precomposed ज़ to ज
    expect(normalise('ଓଡ଼ିଆ')).toEqual(normalise('ଓଡିଆ'));
    expect(normalise('हँ')).toEqual(normalise('हं'));
    expect(normalise('ab‍c')).toEqual(['abc']);
  });

  it('romanised spellings fold together: aaj/aj, baaki/baki, pichhle/pichle, zyada/jyada', () => {
    expect(normalise('aaj baaki pichhle zyada')).toEqual(normalise('aj baki pichle jyada'));
  });
});

describe('slots', () => {
  it('periods in each language and script', () => {
    const cases: readonly (readonly [string, string])[] = [
      ['sales today', 'today'],
      ['aaj ki bikri', 'today'],
      ['आज कितना', 'today'],
      ['ଆଜିର ବିକ୍ରି', 'today'],
      ['yesterday', 'yesterday'],
      ['कल कितना', 'yesterday'],
      ['ଗତକାଲି', 'yesterday'],
      ['this week', 'thisWeek'],
      ['is hafte', 'thisWeek'],
      ['इस हफ़्ते', 'thisWeek'],
      ['ଏହି ସପ୍ତାହରେ', 'thisWeek'],
      ['last week', 'lastWeek'],
      ['pichhle hafte', 'lastWeek'],
      ['पिछले सप्ताह', 'lastWeek'],
      ['ଗତ ସପ୍ତାହର', 'lastWeek'],
      ['this month', 'thisMonth'],
      ['इस महीने', 'thisMonth'],
      ['ei masa re', 'thisMonth'],
      ['last month', 'lastMonth'],
      ['pichle mahine', 'lastMonth'],
      ['ଗତ ମାସରେ', 'lastMonth'],
      ['ab tak', 'all'],
    ];
    for (const [text, kind] of cases) expect(slotsOf(text).period?.kind, text).toBe(kind);
  });

  it('a named month, in three scripts', () => {
    expect(slotsOf('sales in march').period).toEqual({ kind: 'month', month: 3 });
    expect(slotsOf('sept').period).toEqual({ kind: 'month', month: 9 });
    expect(slotsOf('अगस्त में बिक्री').period).toEqual({ kind: 'month', month: 8 });
    expect(slotsOf('ଜୁଲାଇରେ ବିକ୍ରି').period).toEqual({ kind: 'month', month: 7 });
    // ମେ is two letters: matched whole, never as the start of another word.
    expect(slotsOf('ମେଣ୍ଟ').period).toBeUndefined();
    expect(slotsOf('ମେ ମାସ').period).toEqual({ kind: 'month', month: 5 });
  });

  it('the first period named is the question; a second is what it is compared against', () => {
    expect(slotsOf('this week vs last week').period?.kind).toBe('thisWeek');
    expect(slotsOf('last week vs this week').period?.kind).toBe('lastWeek');
  });

  it('payment mode', () => {
    expect(slotsOf('UPI sales').mode).toBe('upi');
    expect(slotsOf('phonepe').mode).toBe('upi');
    expect(slotsOf('nakad bikri').mode).toBe('cash');
    expect(slotsOf('ନଗଦ ବିକ୍ରି').mode).toBe('cash');
    expect(slotsOf('उधार बिक्री').mode).toBe('udhar');
    expect(slotsOf('how much did i sell').mode).toBeUndefined();
  });

  it('a count of days, in any script of digits', () => {
    expect(slotsOf('older than 45 days').days).toBe(45);
    expect(slotsOf('60 din se purana').days).toBe(60);
    expect(slotsOf('୯୦ ଦିନରୁ ପୁରୁଣା').days).toBe(90);
    expect(slotsOf('45 rupees').days).toBeUndefined();
  });

  it('party: the shop own names, inflected, first word required', () => {
    expect(slotsOf('how much did Ramesh pay', PARTIES).partyId).toBe('p-ramesh');
    expect(slotsOf("Ramesh's udhar", PARTIES).partyId).toBe('p-ramesh');
    expect(slotsOf('sunita ne kitna diya', PARTIES).partyId).toBe('p-sunita');
    expect(slotsOf('gupta wholesale ko', PARTIES).partyId).toBe('p-wholesale');
    // An Odia name, inflected with the genitive.
    expect(slotsOf('ବିଶ୍ୱନାଥଙ୍କ ବାକି', PARTIES).partyId).toBe('p-odia');
    // "Devi" alone names nobody; "Dairy" alone names nobody.
    expect(slotsOf('devi', PARTIES).partyId).toBeUndefined();
    expect(slotsOf('dairy', PARTIES).partyId).toBeUndefined();
  });
});

describe('the whole question', () => {
  it('a confident question resolves, and says which bank phrase it was closest to', () => {
    const r = match('how much did Ramesh pay last month', { parties: PARTIES });
    expect(r.kind).toBe('resolved');
    if (r.kind !== 'resolved') return;
    expect(r.resolution).toEqual({
      intent: 'paid',
      slots: { period: { kind: 'lastMonth' }, partyId: 'p-ramesh' },
    });
    expect(INTENTS.find((i) => i.id === 'paid')?.examples).toContain(r.why.example);
    expect(r.why.shared.length).toBeGreaterThan(0);
    expect(r.why.score).toBeGreaterThanOrEqual(CONFIDENCE_FLOOR);
    expect(r.why.score - r.why.runnerUp).toBeGreaterThanOrEqual(CONFIDENCE_MARGIN);
  });

  it('below the floor it never guesses: three intents, as chips', () => {
    for (const text of ['tell me something', 'xyzzy plugh', '']) {
      const r = match(text, { parties: PARTIES });
      expect(r.kind, text).toBe('unsure');
      if (r.kind === 'unsure') expect(r.options, text).toHaveLength(3);
    }
  });

  it('two parties that fit equally are offered, not chosen between', () => {
    const twins: PartyName[] = [
      { id: 'p-r1', name: 'Ramesh Kumar' },
      { id: 'p-r2', name: 'Ramesh Gupta' },
    ];
    const r = match('how much did Ramesh pay', { parties: twins });
    expect(r.kind).toBe('unsure');
    if (r.kind === 'unsure') {
      expect(r.options.map((o) => o.slots.partyId)).toEqual(['p-r1', 'p-r2']);
      expect(new Set(r.options.map((o) => o.intent))).toEqual(new Set(['paid']));
    }
    // The fuller name settles it.
    const sure = match('how much did Ramesh Gupta pay', { parties: twins });
    expect(sure.kind === 'resolved' && sure.resolution.slots.partyId).toBe('p-r2');
  });

  it('a follow-up keeps the last question and changes only what it names', () => {
    const previous = { intent: 'sales', slots: { period: { kind: 'thisWeek' }, mode: 'upi' } } as const;
    for (const text of ['and last month?', 'aur pichle mahine?', 'और पिछले महीने', 'ଆଉ ଗତ ମାସ?', 'last month']) {
      const r = match(text, { parties: PARTIES, previous });
      expect(r.kind, text).toBe('resolved');
      if (r.kind !== 'resolved') continue;
      expect(r.followUp, text).toBe(true);
      expect(r.resolution, text).toEqual({ intent: 'sales', slots: { period: { kind: 'lastMonth' }, mode: 'upi' } });
    }
    // A party is a slot too: "and Sunita?" after a Ramesh question.
    const paid = { intent: 'paid', slots: { partyId: 'p-ramesh' } } as const;
    const r = match('and Sunita?', { parties: PARTIES, previous: paid });
    expect(r.kind === 'resolved' && r.resolution).toEqual({ intent: 'paid', slots: { partyId: 'p-sunita' } });
  });

  it('a new question after an old one is a new question, not a follow-up', () => {
    const previous = { intent: 'sales', slots: { period: { kind: 'thisWeek' } } } as const;
    const r = match('how much did i spend last month', { parties: PARTIES, previous });
    expect(r.kind === 'resolved' && r.followUp).toBe(false);
    expect(r.kind === 'resolved' && r.resolution.intent).toBe('expenses');
  });

  it('with no previous question, a bare period is not a follow-up of nothing', () => {
    const r = match('last month', { parties: PARTIES });
    expect(r.kind === 'resolved' && r.followUp).not.toBe(true);
  });
});

describe('human-tester pass 6 (HT-39, HT-40, HT-42)', () => {
  it('HT-39: "which item sells the most" is about items, not the best day', () => {
    const r = match('which item sells the most', { parties: PARTIES });
    expect(r.kind === 'resolved' && r.resolution.intent).toBe('topItems');
  });

  it('HT-40: a question with an intent of its own does not inherit the last one', () => {
    for (const intent of ['bestDay', 'topItems'] as const) {
      const r = match('sales yesterday', { parties: PARTIES, previous: { intent, slots: {} } });
      expect(r.kind === 'resolved' && r.followUp, intent).toBe(false);
      expect(r.kind === 'resolved' && r.resolution, intent).toEqual({
        intent: 'sales',
        slots: { period: { kind: 'yesterday' } },
      });
    }
    // The same words after a sales question still carry its mode over.
    const upi = { intent: 'sales', slots: { period: { kind: 'thisWeek' }, mode: 'upi' } } as const;
    const r = match('and sales last week', { parties: PARTIES, previous: upi });
    expect(r.kind === 'resolved' && r.resolution).toEqual({
      intent: 'sales',
      slots: { period: { kind: 'lastWeek' }, mode: 'upi' },
    });
  });

  it('HT-42: "how much will I sell next week" is the forecast', () => {
    const r = match('how much will I sell next week', { parties: PARTIES });
    expect(r.kind === 'resolved' && r.resolution.intent).toBe('forecast');
  });

  it('HT-42: a party name typed exactly wins over names it shares words with', () => {
    const tests: PartyName[] = [
      { id: 'p-t1', name: 'Test Customer 1' },
      { id: 'p-t2', name: 'Test Customer 2' },
    ];
    const r = match('how much does Test Customer 2 owe', { parties: tests });
    expect(r.kind === 'resolved' && r.resolution).toEqual({ intent: 'owed', slots: { partyId: 'p-t2' } });
    expect(slotsOf('TEST CUSTOMER 1 ka udhar', tests).partyId).toBe('p-t1');
    // The full name beats a longer one that merely starts the same way.
    const nested: PartyName[] = [
      { id: 'p-short', name: 'Ramesh Kumar' },
      { id: 'p-long', name: 'Ramesh Kumar Sahu' },
    ];
    expect(slotsOf('how much did ramesh kumar pay', nested).partyId).toBe('p-short');
    // And a bare shared word is still a choice, not a guess.
    expect(match('how much does Test Customer owe', { parties: tests }).kind).toBe('unsure');
  });
});

describe('the bank and the corpus are honest data', () => {
  it('every intent has phrasings in English, Devanagari, Odia script and romanised text', () => {
    const latin = /^[\x20-\x7e]+$/;
    for (const intent of INTENTS) {
      const ex = intent.examples;
      expect(ex.some((x) => /[ऀ-ॿ]/.test(x)), intent.id + ' Devanagari').toBe(true);
      expect(ex.some((x) => /[଀-୿]/.test(x)), intent.id + ' Odia').toBe(true);
      expect(ex.filter((x) => latin.test(x)).length, intent.id + ' Latin').toBeGreaterThanOrEqual(4);
    }
    expect(INTENTS.map((i) => i.id).sort()).toEqual([...INTENT_IDS].sort());
  });

  it('every intent has its chip label, and every word answer its copy, in the bundle', () => {
    const keys = new Set(Object.keys(STRINGS));
    for (const id of INTENT_IDS) expect(keys.has(`c1.i.${id}`), id).toBe(true);
    const figures = new Set(['sales', 'expected', 'owed', 'paid', 'bestDay', 'olderUdhar', 'compare', 'expenses', 'topItems', 'forecast']);
    for (const id of INTENT_IDS.filter((i) => !figures.has(i))) {
      expect(keys.has(`c1.a.${id}` as StringKey), id).toBe(true);
    }
  });

  it('no corpus phrase is a bank phrase - the corpus measures, it does not rehearse', () => {
    const bank = new Set(EXAMPLES.map((e) => normalise(e.text).join(' ')));
    const rehearsed = Object.entries(CORPUS).flatMap(([language, rows]) =>
      rows.filter(([text]) => bank.has(normalise(text).join(' '))).map(([text]) => language + ': ' + text),
    );
    expect(rehearsed).toEqual([]);
  });

  it('every intent is in every language of the corpus', () => {
    for (const [language, rows] of Object.entries(CORPUS)) {
      expect(new Set(rows.map(([, id]) => id)), language).toEqual(new Set(INTENT_IDS));
    }
  });
});

describe('measured accuracy - pinned, not a threshold', () => {
  /*
   * MEASURED ON THIS BUILD, 2026-10-26. A builder-written corpus against a
   * builder-written bank (see chat-corpus.ts), measured once and not tuned
   * against: the corpus misroutes were left as they fell. Optimistic for real
   * shop phrasing, which R3 says must be collected before launch.
   *
   * The "rehearse" test above found two phrases in both lists on its first run;
   * the bank's copy of one was removed and the corpus's copy of the other was
   * rephrased. Both were answered right before and after, so these counts did
   * not move - but a measurement that includes its own training data is not
   * one, and the test now keeps it that way.
   *
   * ONE FIX WAS INFORMED BY THE CORPUS, and is stated so the English figure is
   * not read as held-out. C1's own demonstration question, "what were today's
   * sales", went to Expenses on the word "were"; it is also an English corpus
   * line. Two "what were" phrasings were added to the sales bank. English was
   * { right: 51, wrong: 3 } before that fix and is { right: 52, wrong: 2 } after;
   * Hindi and Odia did not move.
   *
   * HUMAN-TESTER PASS 6 (HT-39, HT-42) added two intents, topItems and
   * forecast, and four corpus lines per language - the tester's own two
   * questions in English and their like in Hindi and Odia, written before the
   * bank phrases and not tuned to. Before the new intents those twelve lines
   * were all misses. Two NEW bank phrases were then swapped because the corpus
   * showed them pulling OLD lines away ("which item sold most" took "how much
   * have i sold today" to unsure; "agle hafte ki bikri" took "pichle mahine ki
   * bikri" to forecast) - corpus-informed, and stated so. Measured after:
   *   en  { n: 58 -> 62, right: 52 -> 55, wrong: 2 -> 2, unsure: 4 -> 5 }
   *   hi  { n: 57 -> 61, right: 50 -> 53, wrong: 2 -> 2, unsure: 5 -> 6 }
   *   or  { n: 57 -> 61, right: 50 -> 53, wrong: 4 -> 4, unsure: 3 -> 4 }
   * Of the old lines, English lost one ("who sees my information" is now
   * unsure, the right intent in its chips) to the shift in word weights a new
   * intent brings; and "anumanit labh kya hai", already unsure, now has
   * forecast ("anuman") in its chips instead of termProfit. Two of the twelve
   * new lines are unsure with topItems the first chip: the Devanagari "कौन सा
   * सामान सबसे ज्यादा बिकता है" and "sabuthu besi kana bikuchhi".
   *
   *   right   - answered, and the intent was the labelled one
   *   wrong   - answered confidently with another intent
   *   unsure  - offered three chips instead; `inChips` of those held the right one
   */
  const MEASURED = {
    en: { n: 62, right: 55, wrong: 2, unsure: 5, inChips: 5 },
    hi: { n: 61, right: 53, wrong: 2, unsure: 6, inChips: 5 },
    or: { n: 61, right: 53, wrong: 4, unsure: 4, inChips: 4 },
  } as const;

  for (const language of ['en', 'hi', 'or'] as const) {
    it(language, () => {
      let right = 0;
      let wrong = 0;
      let unsure = 0;
      let inChips = 0;
      for (const [text, want] of CORPUS[language]) {
        const r = match(text, { parties: PARTIES });
        if (r.kind === 'resolved') {
          if (r.resolution.intent === want) right += 1;
          else wrong += 1;
        } else {
          unsure += 1;
          if (r.options.some((o) => o.intent === want)) inChips += 1;
        }
      }
      const got = { n: CORPUS[language].length, right, wrong, unsure, inChips };
      console.log(`ask matcher, ${language}: ${JSON.stringify(got)}`);
      expect(got).toEqual(MEASURED[language]);
    });
  }

  it('leave-one-out over the bank, where the floor and margin were chosen', () => {
    /*
     * Each bank phrase scored against every other phrase. At the chosen floor
     * and margin this is the trade the constants were picked for: the fewest
     * confident wrong answers before "unsure" climbs steeply (match.ts).
     */
    let right = 0;
    let wrong = 0;
    let unsure = 0;
    for (const ex of EXAMPLES) {
      const ranked = rank(ex.tokens, (other) => other === ex);
      if (!isConfident(ranked)) unsure += 1;
      else if (ranked[0]?.intent === ex.intent) right += 1;
      else wrong += 1;
    }
    // Was { n: 559, right: 427, wrong: 28, unsure: 104 } before HT-39/HT-42 added 42 phrases.
    expect({ n: EXAMPLES.length, right, wrong, unsure }).toEqual({ n: 601, right: 446, wrong: 33, unsure: 122 });
  });
});
