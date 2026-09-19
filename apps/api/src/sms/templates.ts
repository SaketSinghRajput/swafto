/**
 * The DLT content-template registry.
 *
 * MUST stay in lockstep with SMS-TEMPLATES.md, which is the registration submission.
 * `tools/check-sms-templates.mjs` fails the build if they diverge.
 *
 * India's TRAI DLT framework does not permit free-form transactional SMS: operators
 * scrub anything that does not match a pre-registered template. That is why SmsPort
 * takes a templateId and an ordered variable array, and why there is no code path in
 * this repo - not even in development - that can send an arbitrary string.
 */

export const LANGUAGES = ['en', 'hi', 'od'] as const;
export type Language = (typeof LANGUAGES)[number];

export const TEMPLATE_IDS = [
  'otp_signin',
  'otp_number_change_old',
  'otp_number_change_new',
  'otp_pin_reset',
] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

/** DLT caps, designed to the TIGHTEST figure found (SMS-TEMPLATES.md §1). */
export const DLT_LIMITS = {
  maxVariablesPerTemplate: 2,
  maxVariableValueChars: 30,
  maxVariableSharePercent: 40,
  gsm7SegmentChars: 160,
  unicodeSegmentChars: 70,
} as const;

export interface TemplateDef {
  readonly id: TemplateId;
  readonly variableCount: number;
  readonly text: Readonly<Record<Language, string>>;
}

export const TEMPLATES: Readonly<Record<TemplateId, TemplateDef>> = {
  otp_signin: {
    id: 'otp_signin',
    variableCount: 1,
    text: {
      en: '{#var#} is your SWAFTO code. Valid 10 min. Never share it. SWAFTO will never ask for it.',
      hi: '{#var#} आपका SWAFTO कोड है। 10 मिनट वैध। किसी को न बताएं।',
      od: '{#var#} ଆପଣଙ୍କ SWAFTO କୋଡ୍। 10 ମିନିଟ୍ ବୈଧ। କାହାକୁ କୁହନ୍ତୁ ନାହିଁ।',
    },
  },
  otp_number_change_old: {
    id: 'otp_number_change_old',
    variableCount: 1,
    text: {
      en: '{#var#} is your SWAFTO code to verify your current number. Valid 10 min. Never share it.',
      hi: '{#var#} SWAFTO नंबर बदलने का कोड। 10 मिनट वैध। किसी को न बताएं।',
      od: '{#var#} SWAFTO ନମ୍ବର ବଦଳାଇବା କୋଡ୍। 10 ମିନିଟ୍ ବୈଧ। କାହାକୁ କୁହନ୍ତୁ ନାହିଁ।',
    },
  },
  otp_number_change_new: {
    id: 'otp_number_change_new',
    variableCount: 1,
    text: {
      en: '{#var#} is your SWAFTO code to confirm your new number. Valid 10 min. Never share it.',
      hi: '{#var#} SWAFTO नए नंबर की पुष्टि का कोड। 10 मिनट वैध। न बताएं।',
      od: '{#var#} SWAFTO ନୂଆ ନମ୍ବର ନିଶ୍ଚିତ କୋଡ୍। 10 ମିନିଟ୍ ବୈଧ। କୁହନ୍ତୁ ନାହିଁ।',
    },
  },
  otp_pin_reset: {
    id: 'otp_pin_reset',
    variableCount: 1,
    text: {
      en: '{#var#} is your SWAFTO code to reset your app lock. Valid 10 min. Never share it.',
      hi: '{#var#} SWAFTO ऐप लॉक रीसेट कोड। 10 मिनट वैध। किसी को न बताएं।',
      od: '{#var#} SWAFTO ଆପ୍ ଲକ୍ ରିସେଟ୍ କୋଡ୍। 10 ମିନିଟ୍ ବୈଧ। କୁହନ୍ତୁ ନାହିଁ।',
    },
  },
};

export const VARIABLE_TOKEN = '{#var#}';

/** How many `{#var#}` slots a template body actually contains. */
export function countSlots(text: string): number {
  return text.split(VARIABLE_TOKEN).length - 1;
}

/** Unicode text costs 70 chars per segment; GSM-7 costs 160. */
export function isUnicode(text: string): boolean {
  // Anything outside the basic GSM-7 range forces UCS-2 for the whole message.
  return /[^\u0000-\u007F]/.test(text);
}

export function segmentLimit(text: string): number {
  return isUnicode(text) ? DLT_LIMITS.unicodeSegmentChars : DLT_LIMITS.gsm7SegmentChars;
}

/** Rendered length with variables substituted, for the segment-count check. */
export function renderedLength(text: string, variables: readonly string[]): number {
  let out = text;
  for (const v of variables) out = out.replace(VARIABLE_TOKEN, v);
  return out.length;
}
