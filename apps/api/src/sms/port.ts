/**
 * SmsPort - the ONLY way this system sends an SMS.
 *
 * IT DOES NOT ACCEPT A MESSAGE STRING, and that is the whole point.
 *
 * India's DLT framework requires content templates to be pre-registered; operators
 * scrub anything that does not match. If this interface took a string, every call
 * site would be unregistrable and we would find out weeks later when registration was
 * rejected. There is deliberately NO free-text path - not even for development,
 * because a free-text path in dev is how a free-text call site reaches production.
 */

import {
  DLT_LIMITS,
  TEMPLATES,
  countSlots,
  renderedLength,
  segmentLimit,
  type Language,
  type TemplateId,
} from './templates.ts';

export interface SmsRequest {
  readonly phone: string;
  readonly templateId: TemplateId;
  /** Ordered, one per `{#var#}` slot. */
  readonly variables: readonly string[];
  readonly languageTag: Language;
}

export interface SmsPort {
  send(req: SmsRequest): Promise<void>;
}

export function SmsTemplateError(message: string): Error {
  const e = new Error(message);
  e.name = 'SmsTemplateError';
  return e;
}

/**
 * Validates a request against the registry and the DLT caps. Every adapter - stub and
 * real alike - calls this FIRST, so an unregistrable message cannot be sent by any
 * route.
 */
export function assertSendable(req: SmsRequest): void {
  const def = TEMPLATES[req.templateId];
  if (!def) {
    throw SmsTemplateError(
      `Unregistered templateId "${req.templateId}". Every message must use a template ` +
        `from SMS-TEMPLATES.md - DLT rejects anything else.`,
    );
  }

  const body = def.text[req.languageTag];
  if (!body) {
    throw SmsTemplateError(`Template "${req.templateId}" has no "${req.languageTag}" text.`);
  }

  const slots = countSlots(body);
  if (slots !== req.variables.length) {
    throw SmsTemplateError(
      `Template "${req.templateId}" (${req.languageTag}) has ${slots} variable slot(s) ` +
        `but ${req.variables.length} were supplied.`,
    );
  }
  if (slots !== def.variableCount) {
    throw SmsTemplateError(
      `Template "${req.templateId}" (${req.languageTag}) declares ${def.variableCount} ` +
        `variable(s) but its text contains ${slots}. The registry is inconsistent.`,
    );
  }
  if (slots > DLT_LIMITS.maxVariablesPerTemplate) {
    throw SmsTemplateError(
      `Template "${req.templateId}" uses ${slots} variables; the tightest operator cap ` +
        `is ${DLT_LIMITS.maxVariablesPerTemplate}.`,
    );
  }

  for (const v of req.variables) {
    if (v.length > DLT_LIMITS.maxVariableValueChars) {
      throw SmsTemplateError(
        `Variable value is ${v.length} characters; DLT caps it at ` +
          `${DLT_LIMITS.maxVariableValueChars}.`,
      );
    }
  }

  // A template must not END with a variable - it must close on fixed text.
  if (body.trimEnd().endsWith('{#var#}')) {
    throw SmsTemplateError(`Template "${req.templateId}" ends with a variable; DLT forbids it.`);
  }

  // Variable content must be <= 40% of the message.
  // `messageChars`, not `total` - ADR-003's lint reserves the money vocabulary for
  // money, and this is a character count.
  const messageChars = renderedLength(body, req.variables);
  const varChars = req.variables.reduce((n, v) => n + v.length, 0);
  const share = (varChars / messageChars) * 100;
  if (share > DLT_LIMITS.maxVariableSharePercent) {
    throw SmsTemplateError(
      `Variable content is ${Math.round(share * 10) / 10}% of the message; DLT caps it at ` +
        `${DLT_LIMITS.maxVariableSharePercent}%.`,
    );
  }

  // Cost guard: Odia and Hindi are Unicode, so a segment is 70 characters.
  const limit = segmentLimit(body);
  if (messageChars > limit) {
    throw SmsTemplateError(
      `Rendered message is ${messageChars} characters against a ${limit}-character segment ` +
        `for this script - it would cost two segments on every send.`,
    );
  }
}
