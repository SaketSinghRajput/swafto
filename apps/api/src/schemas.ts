/**
 * Schema fragments shared by routes that take nothing.
 *
 * A route with no input says so. Without it Fastify ignores whatever arrives: a
 * `?shopId=` on a read, a stray body on a POST. Ignored is not refused, and only
 * refusal tells a client it is wrong (see `shopOf`, S-11). `removeAdditional` is off in
 * `buildApp`, so `additionalProperties: false` is a 400 and not a quiet strip.
 */
export const NO_QUERY = { type: 'object', additionalProperties: false, properties: {} } as const;

/** A POST that takes no arguments. The phone still sends `{}` (a POST always carries a body). */
export const NO_BODY = { type: 'object', additionalProperties: false, properties: {} } as const;
