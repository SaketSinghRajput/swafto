// Entry point bundled by esbuild and executed by the Hermes VM.
// Hermes has no filesystem and no `process`, so the vectors are inlined at build
// time and the result is emitted on stdout via Hermes' global `print`.
import vectorFile from '../packages/formula-engine/vectors.json';
import { evaluateAll } from './vector-harness.ts';

declare const print: (s: string) => void;

const results = evaluateAll(vectorFile as never);
print(JSON.stringify(results, null, 2));
