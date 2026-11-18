/**
 * THE ASK MATCHER - FR-8 and PR-5 (docs/research/R5-free-premium-plan.md), built
 * to R3 §2: no language model, a deterministic trilingual intent matcher.
 *
 * WHAT IT DOES. A question becomes normalised tokens; the slots (period, payment
 * mode, party, a number of days) are lifted out of it; what is left is scored
 * against the intent bank (bank.ts) by cosine similarity over IDF-weighted word
 * tokens and character trigrams. Above the confidence floor, and clear of the
 * runner-up by the margin, it answers. Otherwise it offers its top three intents
 * as chips - never a guess. A wrong confident answer is worse than a choice.
 *
 * WHAT IT NEVER DOES. It answers a question; it never enters, fills or suggests a
 * figure to be entered (CLAUDE.md, "No inference in data entry"). Nothing here
 * produces a number at all: a resolution is an intent and its slots, and every
 * figure in an answer comes from the formula engine (answer.ts).
 *
 * PURE, CLOCK-FREE AND DEPENDENCY-FREE. Its one import is its own data. "This
 * week" stays a symbol here; it becomes dates only in answer.ts, against the
 * business day the store holds, so the same question resolves the same way on
 * any phone at any hour.
 *
 * EXPLAINABLE. Every resolution carries the bank phrase it was closest to and the
 * words the two share, so a misroute can be traced to the line of data that
 * caused it.
 */
import { INTENTS, LEXICON, type IntentId } from './bank.ts';

export type { IntentId } from './bank.ts';

export type PeriodKind =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'month'
  | 'all';

export interface Period {
  readonly kind: PeriodKind;
  /** 1-12, only on `month`: a named month, its most recent occurrence. */
  readonly month?: number;
}

export type ChatMode = 'cash' | 'upi' | 'udhar';

export interface Slots {
  readonly period?: Period;
  readonly mode?: ChatMode;
  readonly partyId?: string;
  /** "older than 30 days" - a count of days, never money. */
  readonly days?: number;
}

/** What a question was understood to ask. Data, not an answer: no figure is in it. */
export interface Resolution {
  readonly intent: IntentId;
  readonly slots: Slots;
}

export interface Why {
  /** The bank phrase the question scored closest to. */
  readonly example: string;
  /** Word tokens the question and that phrase share. */
  readonly shared: readonly string[];
  readonly score: number;
  readonly runnerUp: number;
}

export type MatchResult =
  | {
      readonly kind: 'resolved';
      readonly resolution: Resolution;
      readonly why: Why;
      readonly followUp: boolean;
    }
  /** Below the floor, too close to call, or two parties fit: these, as chips. */
  | { readonly kind: 'unsure'; readonly options: readonly Resolution[] };

export interface PartyName {
  readonly id: string;
  readonly name: string;
}

/**
 * THE TWO CONSTANTS THAT DECIDE "ANSWER OR ASK BACK". Design parameters of the
 * matcher, not benchmarks: R3 sets no accuracy target and none is set here.
 * Chosen by leave-one-out over the BANK (match.test.ts prints it), never over the
 * labelled corpus the accuracy is reported on.
 */
export const CONFIDENCE_FLOOR = 0.35;
export const CONFIDENCE_MARGIN = 0.04;

/* ------------------------------------------------------------------ *
 * Normalisation
 * ------------------------------------------------------------------ */

/** Precomposed nukta letters to their base letter, so क़ and क score alike. */
const NUKTA_BASE: Readonly<Record<string, string>> = {
  'क़': 'क',
  'ख़': 'ख',
  'ग़': 'ग',
  'ज़': 'ज',
  'ड़': 'ड',
  'ढ़': 'ढ',
  'फ़': 'फ',
  'य़': 'य',
  'ଡ଼': 'ଡ',
  'ଢ଼': 'ଢ',
};

const keeps = (c: number): boolean =>
  (c >= 0x61 && c <= 0x7a) ||
  (c >= 0x30 && c <= 0x39) ||
  (c >= 0x900 && c <= 0x963) || // Devanagari letters and signs, not the dandas
  (c >= 0x970 && c <= 0x97f) ||
  (c >= 0xb00 && c <= 0xb65) || // Odia letters and signs
  (c >= 0xb70 && c <= 0xb7f);

/**
 * Romanised Hindi and Odia are spelt the way each person hears them: aaj and aj,
 * baaki and baki, pichhle and pichle, zyada and jyada. Folding the common
 * variants onto one spelling lets the trigrams do the rest.
 */
const foldLatin = (tok: string): string =>
  /^[a-z]+$/.test(tok)
    ? tok
        .replace(/ee/g, 'i')
        .replace(/oo/g, 'u')
        .replace(/w/g, 'v')
        .replace(/z/g, 'j')
        .replace(/q/g, 'k')
        .replace(/ph/g, 'f')
        .replace(/(.)\1+/g, '$1')
    : tok;

/**
 * Text to tokens: lowercase, Devanagari and Odia digits to ASCII, nukta and
 * joiners dropped, chandrabindu read as anusvara, everything that is not a
 * letter or digit of the three scripts treated as a space.
 */
export function normalise(text: string): string[] {
  let s = text;
  try {
    s = s.normalize('NFC');
  } catch {
    // A runtime without normalisation still gets every step below.
  }
  s = s.toLowerCase();
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0) as number;
    if (c >= 0x966 && c <= 0x96f) out += String(c - 0x966);
    else if (c >= 0xb66 && c <= 0xb6f) out += String(c - 0xb66);
    else if (NUKTA_BASE[ch] !== undefined) out += NUKTA_BASE[ch];
    else if (c === 0x93c || c === 0xb3c || c === 0x200c || c === 0x200d) continue;
    else if (c === 0x901) out += 'ं';
    else if (c === 0xb01) out += 'ଂ';
    else if (keeps(c)) out += ch;
    else out += ' ';
  }
  return out
    .split(' ')
    .filter((t) => t.length > 0)
    .map(foldLatin);
}

/* ------------------------------------------------------------------ *
 * Slots
 * ------------------------------------------------------------------ */

const codePoints = (t: string): number => Array.from(t).length;

/**
 * One phrase token against one question token. Indic words inflect at the end -
 * ମାସରେ "in the month", ସପ୍ତାହର "of the week" - so a token of three or more
 * letters also matches as a prefix. Shorter ones must match exactly, or ମେ (May)
 * would match every word that starts with it.
 */
const tokenFits = (phraseTok: string, tok: string): boolean =>
  tok === phraseTok || (codePoints(phraseTok) >= 3 && tok.startsWith(phraseTok));

interface Hit {
  readonly at: number;
  readonly len: number;
}

/** Where a multi-token phrase first occurs among the tokens not yet taken. */
function find(tokens: readonly string[], phrase: readonly string[], taken: ReadonlySet<number>): Hit | null {
  for (let i = 0; i + phrase.length <= tokens.length; i += 1) {
    let ok = true;
    for (let k = 0; k < phrase.length; k += 1) {
      if (taken.has(i + k) || !tokenFits(phrase[k] as string, tokens[i + k] as string)) {
        ok = false;
        break;
      }
    }
    if (ok) return { at: i, len: phrase.length };
  }
  return null;
}

const mark = (taken: Set<number>, hit: Hit): void => {
  for (let k = 0; k < hit.len; k += 1) taken.add(hit.at + k);
};

/** Lexicon phrases, normalised once, longest first so "last week" is taken before "week". */
const prepared = <T>(rows: readonly (readonly [string, T])[]): readonly (readonly [string[], T])[] =>
  rows.map(([p, v]) => [normalise(p), v] as const).sort((a, b) => b[0].length - a[0].length);

const PERIODS = prepared(LEXICON.periods);
const MONTHS = prepared(LEXICON.months);
const MODES = prepared(LEXICON.modes);
const DAY_WORDS = LEXICON.dayWords.flatMap((w) => normalise(w));
const FOLLOW = prepared(LEXICON.followUp.map((w) => [w, true] as const));
const FILLER = new Set(LEXICON.filler.flatMap((w) => normalise(w)));

interface Lifted {
  readonly slots: Slots;
  /** Indices of tokens that were slots, so the intent is scored on the rest. */
  readonly taken: ReadonlySet<number>;
  /** Two or more parties fit equally well: the question cannot say which. */
  readonly partyChoices: readonly string[];
  readonly followMarker: boolean;
}

function lift(tokens: readonly string[], parties: readonly PartyName[]): Lifted {
  const taken = new Set<number>();
  let period: Period | undefined;
  let mode: ChatMode | undefined;
  let days: number | undefined;

  // Period: the first one named wins; a second ("this week vs last week") is the comparison's own.
  let firstPeriodAt = Infinity;
  const takePeriod = (hit: Hit, p: Period) => {
    mark(taken, hit);
    if (hit.at < firstPeriodAt) {
      firstPeriodAt = hit.at;
      period = p;
    }
  };
  for (const [phrase, kind] of PERIODS) {
    for (let hit = find(tokens, phrase, taken); hit !== null; hit = find(tokens, phrase, taken)) {
      takePeriod(hit, { kind });
    }
  }
  for (const [phrase, month] of MONTHS) {
    for (let hit = find(tokens, phrase, taken); hit !== null; hit = find(tokens, phrase, taken)) {
      takePeriod(hit, { kind: 'month', month });
    }
  }
  // A mode word is ALSO what several questions are about ("udhar"), so it is
  // read as a slot and left in the text the intent is scored on.
  for (const [phrase, m] of MODES) {
    if (mode === undefined && find(tokens, phrase, taken) !== null) mode = m;
  }
  // "30 din", "30 days", "୩୦ ଦିନରୁ": a number directly before a day word.
  for (let i = 0; i + 1 < tokens.length; i += 1) {
    const n = tokens[i] as string;
    const next = tokens[i + 1] as string;
    if (/^\d{1,3}$/.test(n) && DAY_WORDS.some((w) => tokenFits(w, next))) {
      days = parseInt(n, 10);
      taken.add(i);
      taken.add(i + 1);
      break;
    }
  }

  // Party: the shop's own names, matched word by word in the script they were typed in.
  let best = 0;
  let choices: { id: string; hit: number[] }[] = [];
  for (const p of parties) {
    const allToks = normalise(p.name);
    const nameToks = allToks.filter((nt) => codePoints(nt) >= 3);
    const first = nameToks[0];
    // The first word of the name has to be there: "Devi" alone names nobody.
    if (first === undefined || !tokens.some((t, i) => !taken.has(i) && tokenFits(first, t))) continue;
    /*
     * HT-42: EVERY WORD OF THE NAME COUNTS, the short ones too - matched whole,
     * as tokenFits does under three letters. Counting only the long ones made
     * "Test Customer 2" and "Test Customer 1" the same name. And a name typed
     * in full beats one that only starts the same way: "Ramesh Kumar" is not
     * "Ramesh Kumar Sahu".
     */
    const hit: number[] = [];
    for (const nt of allToks) {
      const at = tokens.findIndex((t, i) => !taken.has(i) && !hit.includes(i) && tokenFits(nt, t));
      if (at >= 0) hit.push(at);
    }
    const score = hit.length * 2 + (hit.length === allToks.length ? 1 : 0);
    if (score > best) {
      best = score;
      choices = [{ id: p.id, hit }];
    } else if (score === best) {
      choices.push({ id: p.id, hit });
    }
  }
  for (const c of choices) for (const i of c.hit) taken.add(i);

  let followMarker = false;
  for (const [phrase] of FOLLOW) {
    const hit = find(tokens, phrase, taken);
    if (hit !== null && hit.at === 0) {
      followMarker = true;
      mark(taken, hit);
      break;
    }
  }

  const only = choices.length === 1 ? choices[0] : undefined;
  const slots: Slots = {
    ...(period ? { period } : {}),
    ...(mode ? { mode } : {}),
    ...(only ? { partyId: only.id } : {}),
    ...(days !== undefined ? { days } : {}),
  };
  return {
    slots,
    taken,
    partyChoices: choices.length > 1 ? choices.map((c) => c.id) : [],
    followMarker,
  };
}

/** The slots alone - for the slot tests, and for anything that wants them without an intent. */
export function slotsOf(text: string, parties: readonly PartyName[] = []): Slots {
  return lift(normalise(text), parties).slots;
}

/* ------------------------------------------------------------------ *
 * Scoring: TF-IDF over word tokens and character trigrams, cosine.
 * ------------------------------------------------------------------ */

/** A word counts for more than any one of its trigrams. */
const WORD_WEIGHT = 2;

type Vec = Map<string, number>;

function features(tokens: readonly string[]): Vec {
  const v: Vec = new Map();
  const bump = (f: string, by: number) => v.set(f, (v.get(f) ?? 0) + by);
  for (const tok of tokens) {
    bump('w:' + tok, WORD_WEIGHT);
    const cps = [' ', ...Array.from(tok), ' '];
    for (let i = 0; i + 3 <= cps.length; i += 1) bump('t:' + cps.slice(i, i + 3).join(''), 1);
  }
  return v;
}

export interface Example {
  readonly intent: IntentId;
  readonly text: string;
  readonly tokens: readonly string[];
  readonly vec: Vec;
  readonly norm: number;
}

/** What is left of a question once its slot words are lifted out. */
const residual = (tokens: readonly string[], taken: ReadonlySet<number>): string[] =>
  tokens.filter((_, i) => !taken.has(i));

/** The bank's phrases go through exactly the pipeline a question does. */
const RAW = INTENTS.flatMap((intent) =>
  intent.examples.map((text) => {
    const tokens = normalise(text);
    return { intent: intent.id, text, tokens: residual(tokens, lift(tokens, []).taken) };
  }),
);

/** Document frequency over INTENTS, not phrases: a word every intent uses tells nothing. */
const IDF: ReadonlyMap<string, number> = (() => {
  const df = new Map<string, Set<IntentId>>();
  for (const ex of RAW) {
    for (const f of features(ex.tokens).keys()) {
      const set = df.get(f) ?? new Set<IntentId>();
      set.add(ex.intent);
      df.set(f, set);
    }
  }
  const n = INTENTS.length;
  const idf = new Map<string, number>();
  for (const [f, set] of df) idf.set(f, Math.log((n + 1) / set.size));
  return idf;
})();

/** A word the bank never uses dilutes the score as much as the rarest one would. */
const UNSEEN_IDF = Math.log(INTENTS.length + 1);

function weigh(v: Vec): { vec: Vec; norm: number } {
  const out: Vec = new Map();
  let sq = 0;
  for (const [f, tf] of v) {
    const w = tf * (IDF.get(f) ?? UNSEEN_IDF);
    out.set(f, w);
    sq += w * w;
  }
  return { vec: out, norm: Math.sqrt(sq) };
}

export const EXAMPLES: readonly Example[] = RAW.map((ex) => ({ ...ex, ...weigh(features(ex.tokens)) }));

function cosine(a: Vec, an: number, b: Vec, bn: number): number {
  if (an === 0 || bn === 0) return 0;
  let dot = 0;
  for (const [f, w] of a) {
    const o = b.get(f);
    if (o !== undefined) dot += w * o;
  }
  return dot / (an * bn);
}

export interface Ranked {
  readonly intent: IntentId;
  readonly score: number;
  readonly example: Example;
}

/**
 * Every intent, best first, each scored by its closest bank phrase.
 * `exclude` drops phrases - the leave-one-out test uses it to score a bank
 * phrase against everything except itself.
 */
export function rank(tokens: readonly string[], exclude?: (ex: Example) => boolean): Ranked[] {
  const q = weigh(features(tokens));
  const best = new Map<IntentId, { cos: number; example: Example }>();
  // How many of the intent's phrases carry each feature, so one can be left out.
  const pools = new Map<IntentId, Map<string, number>>();
  for (const ex of EXAMPLES) {
    if (exclude?.(ex)) continue;
    const pool = pools.get(ex.intent) ?? new Map<string, number>();
    for (const f of ex.vec.keys()) pool.set(f, (pool.get(f) ?? 0) + 1);
    pools.set(ex.intent, pool);
    const cos = cosine(q.vec, q.norm, ex.vec, ex.norm);
    const cur = best.get(ex.intent);
    if (cur === undefined || cos > cur.cos) best.set(ex.intent, { cos, example: ex });
  }
  const qsq = q.norm * q.norm;
  return [...best.entries()]
    .map(([intent, { cos, example }]) => {
      // COVERAGE: the share of the question's weight that this intent's phrases know at all.
      let known = 0;
      const pool = pools.get(intent) as Map<string, number>;
      for (const [f, w] of q.vec) if (pool.has(f)) known += w * w;
      const coverage = qsq === 0 ? 0 : known / qsq;
      return { intent, score: POOL_SHARE * coverage + (1 - POOL_SHARE) * cos, example };
    })
    .sort((a, b) => b.score - a.score || (a.intent < b.intent ? -1 : 1));
}

/** How much of a score is coverage of the intent's whole vocabulary, against its closest phrase. */
const POOL_SHARE = 0.5;

/** The floor and the margin, applied to a ranking. */
export const isConfident = (ranked: readonly Ranked[]): boolean => {
  const top = ranked[0];
  const second = ranked[1];
  if (top === undefined) return false;
  return top.score >= CONFIDENCE_FLOOR && top.score - (second?.score ?? 0) >= CONFIDENCE_MARGIN;
};

/* ------------------------------------------------------------------ *
 * The whole question
 * ------------------------------------------------------------------ */

export interface MatchContext {
  /** The shop's own parties. Names are matched in the script they were typed in. */
  readonly parties: readonly PartyName[];
  /** The last resolution in this conversation, for "and last month?". */
  readonly previous?: Resolution | undefined;
}

export function match(text: string, ctx: MatchContext): MatchResult {
  const tokens = normalise(text);
  const lifted = lift(tokens, ctx.parties);
  const rest = residual(tokens, lifted.taken);
  const ranked = rank(rest);
  const top = ranked[0] as Ranked;

  /*
   * A FOLLOW-UP KEEPS THE LAST QUESTION AND CHANGES ONLY WHAT WAS NAMED.
   * "And last month?" has a slot and nothing else - once the slot and the
   * "and" are lifted out, no word is left to score. Or it opens with "and"
   * and the rest is too weak to stand as a new question.
   */
  const hasSlot = Object.keys(lifted.slots).length > 0 || lifted.partyChoices.length > 0;
  const bare = rest.every((t) => FILLER.has(t));
  const prev = ctx.previous;
  /*
   * HT-40: ONLY A QUESTION WITH NO INTENT OF ITS OWN INHERITS ONE. "Sales" is
   * filler for "and last month's sales?", but "sales yesterday" after "best day"
   * names sales, and kept "best day" because every word left was filler.
   */
  const ownIntent = isConfident(ranked) && top.intent !== prev?.intent;
  if (prev && hasSlot && !ownIntent && (bare || lifted.followMarker)) {
    const merged: Slots = { ...prev.slots, ...lifted.slots };
    if (lifted.partyChoices.length > 1) {
      return {
        kind: 'unsure',
        options: lifted.partyChoices.map((partyId) => ({ intent: prev.intent, slots: { ...merged, partyId } })),
      };
    }
    return {
      kind: 'resolved',
      resolution: { intent: prev.intent, slots: merged },
      why: { example: '', shared: [], score: top.score, runnerUp: 0 },
      followUp: true,
    };
  }

  if (!isConfident(ranked)) {
    return {
      kind: 'unsure',
      options: ranked.slice(0, 3).map((r) => ({ intent: r.intent, slots: lifted.slots })),
    };
  }
  if (lifted.partyChoices.length > 1) {
    return {
      kind: 'unsure',
      options: lifted.partyChoices.map((partyId) => ({
        intent: top.intent,
        slots: { ...lifted.slots, partyId },
      })),
    };
  }
  const exampleWords = new Set(top.example.tokens);
  return {
    kind: 'resolved',
    resolution: { intent: top.intent, slots: lifted.slots },
    why: {
      example: top.example.text,
      shared: [...new Set(rest.filter((t) => exampleWords.has(t)))],
      score: top.score,
      runnerUp: (ranked[1] as Ranked).score,
    },
    followUp: false,
  };
}
