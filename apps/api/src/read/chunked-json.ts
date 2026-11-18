/**
 * RT-W3-1 · JSON.stringify THAT YIELDS. `JSON.stringify` of a shop's whole ledger is one synchronous
 * call: 114 ms and 22 MB at 100,000 entries, and 40 concurrent exports stalled the event loop for
 * 5.3 s - for every tenant. This produces the SAME text, slice by slice (2000 array elements per native stringify), handing the event loop back
 * between slices (`setImmediate`), so no single stretch of work is longer than one slice.
 *
 * It is exactly `JSON.stringify(value)` for the data this API holds (plain objects, arrays, strings,
 * numbers, booleans, null, and anything with `toJSON`); a test compares the two. Arrays are the
 * unit sliced (one native stringify per slice, so the CPU cost stays close to the plain call),
 * objects recurse, and leaves go to `JSON.stringify` untouched.
 */
const yieldToLoop = () => new Promise<void>((resolve) => setImmediate(resolve));

export async function chunkedJson(value: unknown, sliceSize = 2000): Promise<string> {
  const out: string[] = [];

  const emit = async (v: unknown): Promise<void> => {
    const j =
      v !== null && typeof v === 'object' && typeof (v as { toJSON?: unknown }).toJSON === 'function'
        ? (v as { toJSON(): unknown }).toJSON()
        : v;
    if (Array.isArray(j)) {
      if (j.length <= sliceSize) {
        out.push(JSON.stringify(j));
        return;
      }
      // Each slice is ONE native stringify (fast); the brackets are trimmed and the slices joined.
      out.push('[');
      for (let i = 0; i < j.length; i += sliceSize) {
        if (i > 0) out.push(',');
        out.push(JSON.stringify(j.slice(i, i + sliceSize)).slice(1, -1));
        await yieldToLoop();
      }
      out.push(']');
      return;
    }
    if (j !== null && typeof j === 'object') {
      out.push('{');
      let first = true;
      for (const [k, child] of Object.entries(j as Record<string, unknown>)) {
        if (child === undefined || typeof child === 'function' || typeof child === 'symbol') continue;
        if (!first) out.push(',');
        first = false;
        out.push(JSON.stringify(k), ':');
        await emit(child);
      }
      out.push('}');
      return;
    }
    out.push(JSON.stringify(j) ?? 'null');
  };

  await emit(value);
  return out.join('');
}
