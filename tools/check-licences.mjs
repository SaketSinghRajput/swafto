/**
 * L-21 and L-22 - THE LICENCE MANIFEST, GENERATED, AND THE COPYLEFT GATE.
 *
 * TWO OBLIGATIONS, ONE TOOL.
 *
 * L-21 says the manifest is generated from the installed tree rather than
 * maintained by hand, because a hand-maintained list of dependencies is wrong in
 * the first week and nobody notices for a year. The About screen has to show what
 * this app is built from, and it has to be true.
 *
 * L-22 says the build fails on GPL or AGPL anywhere in the MOBILE tree. Not a
 * matter of taste: those licences condition distribution of the whole combined
 * work, and a Play Store release is distribution. One AGPL transitive dependency
 * in the shipped bundle is a legal problem that is cheap to prevent and expensive
 * to discover after launch.
 *
 * THE SCOPE IS WHAT SHIPS, AND IT IS SCOPED DELIBERATELY. `devDependencies` are
 * build tooling - not distributed, so a GPL test runner is not a problem. What is
 * scanned is the RUNTIME dependency closure of the mobile app and the packages it
 * imports. Getting that scope wrong in the permissive direction would make this
 * check decorative.
 *
 * AN UNKNOWN LICENCE IS A FAILURE, NOT A GAP. A package whose licence cannot be
 * read is a package nobody has cleared, and "we could not tell" is the answer that
 * ships a product with an AGPL library inside it.
 */
import { readFileSync, existsSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const read = (f) => readFileSync(f, 'utf8');
const json = (f) => JSON.parse(read(f));

/**
 * Copyleft licences that make distribution of a combined work conditional.
 *
 * LGPL is deliberately NOT here: it permits dynamic linking without relicensing
 * the combined work, which is the ordinary case for a JavaScript dependency. It
 * appears in the manifest so a human can see it, and it does not fail the gate.
 */
const BLOCKING = [/\bA?GPL-/i, /\bSSPL\b/i, /\bCC-BY-NC/i, /\bBUSL\b/i];
const isBlocking = (licence) => BLOCKING.some((re) => re.test(licence));

/** The workspaces whose RUNTIME dependencies are distributed inside the app. */
const SHIPPED_WORKSPACES = [
  'apps/mobile',
  'packages/formula-engine',
  'packages/values',
  'packages/fixtures',
];

/** Every workspace, so a `@swafto/*` dependency resolves to our source, not node_modules. */
const ALL_WORKSPACES = SHIPPED_WORKSPACES.concat(['packages/schema', 'apps/api']);

const licenceOf = (dir) => {
  const pkg = json(join(dir, 'package.json'));
  const raw =
    typeof pkg.license === 'string'
      ? pkg.license
      : typeof pkg.license === 'object' && pkg.license?.type
        ? String(pkg.license.type)
        : Array.isArray(pkg.licenses)
          ? pkg.licenses.map((l) => l.type ?? l).join(' OR ')
          : null;
  return { name: pkg.name ?? '(unnamed)', version: pkg.version ?? '?', licence: raw ?? 'UNKNOWN' };
};

const workspaceDirFor = (name) =>
  ALL_WORKSPACES.find((w) => {
    const f = join(w, 'package.json');
    return existsSync(f) && json(f).name === name;
  });

const seen = new Map();
const unresolved = [];

/**
 * Walk the runtime closure. A workspace package is ours and is followed into our
 * own source; anything else is resolved in node_modules and its runtime
 * dependencies are followed in turn.
 */
function walk(name, requiredBy) {
  if (seen.has(name)) return;

  const workspace = workspaceDirFor(name);
  const dir = workspace ?? join('node_modules', name);

  if (!existsSync(join(dir, 'package.json'))) {
    unresolved.push(name + ' (looked in ' + dir + ', required by ' + requiredBy + ')');
    return;
  }

  seen.set(name, { ...licenceOf(dir), own: Boolean(workspace), dir });

  const pkg = json(join(dir, 'package.json'));
  for (const dep of Object.keys(pkg.dependencies ?? {})) walk(dep, dir);
}

for (const ws of SHIPPED_WORKSPACES) {
  const file = join(ws, 'package.json');
  if (!existsSync(file)) continue;
  const pkg = json(file);
  seen.set(pkg.name, {
    name: pkg.name,
    version: pkg.version ?? '0.0.0',
    licence: 'OURS',
    own: true,
    dir: ws,
  });
  for (const dep of Object.keys(pkg.dependencies ?? {})) walk(dep, ws);
}


/**
 * AN UNDECLARED IMPORT IS A HOLE IN THIS VERY SCAN.
 *
 * This check found its own blind spot on its first run. `apps/mobile` imported
 * `react-native` through the UI seam and declared neither it nor `react` as a
 * dependency, so the runtime closure came back as FOUR packages, none of them
 * third-party, and the gate reported a clean result over almost nothing. Declaring
 * them took the closure to 275.
 *
 * So the scan now refuses to run over a tree that imports something it has not
 * declared. A licence gate that reads the manifest can only ever be as honest as
 * the manifest, and nothing else in this repository was checking that.
 *
 * `@swafto/ui` is exempt because it is not a package: it is the test seam, aliased
 * by vitest to the UI double and by the contact sheet to react-native-web. It
 * resolves to `apps/mobile/src/ui`, which is ours.
 */
const SEAM_ALIASES = new Set(['@swafto/ui']);

const bareSpecifiers = (source) => {
  const out = new Set();
  for (const m of source.matchAll(/(?:^|\n)\s*import[^'"]*['"]([^'"]+)['"]/g)) out.add(m[1]);
  for (const m of source.matchAll(/(?:^|\n)\s*export[^'"]*from\s*['"]([^'"]+)['"]/g)) out.add(m[1]);
  return [...out].filter((s) => !s.startsWith('.') && !s.startsWith('node:'));
};

/** The package a specifier belongs to: `react-native/Libraries/x` -> `react-native`. */
const packageOf = (specifier) => {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
};

const undeclared = [];
for (const ws of SHIPPED_WORKSPACES) {
  const manifest = join(ws, 'package.json');
  if (!existsSync(manifest)) continue;
  const declared = new Set(Object.keys(json(manifest).dependencies ?? {}));

  const walkDir = (d) => {
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return [];
    }
    return entries.flatMap((e) =>
      e.isDirectory() ? walkDir(join(d, e.name)) : [join(d, e.name)],
    );
  };

  const sources = walkDir(join(ws, 'src')).filter(
    (f) => /\.(ts|tsx)$/.test(f) && !/\.(spec|test)\./.test(f),
  );

  for (const file of sources) {
    for (const specifier of bareSpecifiers(read(file))) {
      const pkg = packageOf(specifier);
      if (SEAM_ALIASES.has(pkg) || declared.has(pkg)) continue;
      undeclared.push(file + ' imports ' + pkg + ', which ' + ws + ' does not declare');
    }
  }
}
const thirdParty = [...seen.values()]
  .filter((p) => !p.own)
  .sort((a, b) => a.name.localeCompare(b.name));

const blocking = thirdParty.filter((p) => isBlocking(p.licence));
const unknown = thirdParty.filter((p) => p.licence === 'UNKNOWN');

/* ---- L-19 · the fonts, which no package manifest mentions ---------------- */

/**
 * THE BIGGEST THIRD-PARTY ARTIFACT IN THE PRODUCT IS NOT AN NPM PACKAGE.
 *
 * Everything above walks `node_modules`. The font files are half a megabyte of
 * somebody else's work shipped inside the APK, and no manifest anywhere
 * mentions them - so this tool's scope, which felt complete, had the single
 * largest licensed artifact entirely outside it. That is an A12 finding about
 * the checker rather than about the code, and the earlier version said as much
 * in the manifest: *"cannot read a font file, so it does not claim to have
 * checked one."*
 *
 * It cannot read a font BINARY, which is true and still true. It can read the
 * licence beside it - A11's "open the payload" - and it can pin the binary by
 * hash so a swap is visible. That turns L-19 from "review the licensing" into
 * one hash comparison against the upstream release.
 */
const FONT_DIR = 'apps/mobile/assets/fonts';
const TOKENS_FILE = 'apps/mobile/src/theme/tokens.ts';

const fontAudit = (() => {
  const problems = [];
  const files = [];

  if (!existsSync(FONT_DIR)) {
    problems.push(FONT_DIR + ' does not exist, and the theme asks for fonts from it');
    return { files, problems };
  }

  const present = readdirSync(FONT_DIR).filter((f) => statSync(join(FONT_DIR, f)).isFile());
  const binaries = present.filter((f) => /\.(ttf|otf|woff2?)$/i.test(f));
  const licences = present.filter((f) => /licen|ofl|copying/i.test(f));

  /*
   * THE FAMILIES THE THEME ACTUALLY ASKS FOR, read from the token file rather
   * than from a list here. A font referenced and not shipped renders as the
   * system fallback, which on an Odia string is the tofu this build has a
   * whole other check about.
   */
  const asked = [...read(TOKENS_FILE).matchAll(/'(AnekOdia-[A-Za-z]+)'/g)].map((m) => m[1]);
  for (const family of new Set(asked)) {
    if (!binaries.some((f) => f.startsWith(family + '.'))) {
      problems.push('the theme asks for ' + family + ' and no such file ships');
    }
  }

  if (licences.length === 0) {
    problems.push('font binaries ship with no licence file beside them');
  }

  for (const name of licences) {
    const text = read(join(FONT_DIR, name));
    // A11: the label is not the payload. Open it and read what it says.
    if (!/SIL OPEN FONT LICENSE/i.test(text)) {
      problems.push(name + ' does not name the SIL Open Font Licence');
    }
    if (!/Version 1\.1/i.test(text)) {
      problems.push(name + ' does not state OFL version 1.1');
    }
    if (!/Copyright/i.test(text)) {
      problems.push(name + ' carries no copyright line');
    }
  }

  for (const name of [...binaries, ...licences].sort()) {
    const bytes = readFileSync(join(FONT_DIR, name));
    files.push({
      name,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      licence: /\.(ttf|otf|woff2?)$/i.test(name) ? 'OFL 1.1 (see the file below)' : 'the licence',
    });
  }

  return { files, problems };
})();

/* ---- the manifest (L-21) ------------------------------------------------ */
const lines = [
  '<!-- GENERATED by tools/check-licences.mjs. DO NOT EDIT BY HAND. -->',
  '',
  '# Licence manifest',
  '',
  'Every third-party package in the RUNTIME closure of the shipped app, read from',
  'the installed tree rather than from a list somebody maintains. Build tooling is',
  'absent because it is not distributed.',
  '',
  'Generated by `npm run check:licences`, which also fails the build on a copyleft',
  'licence that would condition a Play Store release (L-22).',
  '',
  '| package | version | licence |',
  '|---|---|---|',
];
for (const p of thirdParty) {
  lines.push('| `' + p.name + '` | ' + p.version + ' | ' + p.licence + ' |');
}
if (thirdParty.length === 0) {
  lines.push('| _none_ | - | the shipped closure has no third-party runtime dependency |');
}
lines.push('');
lines.push('## Bundled assets');
lines.push('');
lines.push(
  'The font files ship **inside the APK** and no package manifest mentions them, so',
);
lines.push(
  'the npm scan above cannot see the single largest third-party artifact in the',
);
lines.push('product. A12: that was this tool\'s scoping gap, closed at iteration 35.');
lines.push('');
lines.push('| File | Bytes | SHA-256 | Licence |');
lines.push('|---|---:|---|---|');
for (const f of fontAudit.files) {
  lines.push(
    '| `' + f.name + '` | ' + f.bytes + ' | `' + f.sha256.slice(0, 16) + '…` | ' + f.licence + ' |',
  );
}
lines.push('');
lines.push(
  '**What is verified here:** every family the theme asks for is present, a licence',
);
lines.push(
  'file accompanies it, that file names the SIL Open Font Licence 1.1 and carries a',
);
lines.push(
  'copyright line, and each binary is pinned by hash so a swapped file is visible in',
);
lines.push('a diff.');
lines.push('');
lines.push(
  '**What is NOT verified, and stays with L-19:** that these bytes are the upstream',
);
lines.push(
  'release they claim to be. Nothing here can know that. The human step is now one',
);
lines.push('comparison - this hash against the release - rather than a licence review.');
lines.push('');
lines.push(
  '**IBM Plex is not bundled.** AD-015/AD-016 ship Anek Odia alone, so the half of',
);
lines.push('L-19 that asks about IBM Plex has no subject.');
lines.push('');

writeFileSync('docs/handover/LICENCES.md', lines.join('\n'), 'utf8');

console.log('  shipped workspaces  : ' + SHIPPED_WORKSPACES.length);
console.log('  runtime packages    : ' + seen.size + ' (' + thirdParty.length + ' third-party)');
console.log('  undeclared imports  : ' + undeclared.length + ' (this must be zero)');
console.log('  copyleft blocking   : ' + blocking.length + ' (this must be zero)');
console.log('  unknown licence     : ' + unknown.length + ' (this must be zero)');
console.log(
  '  bundled font files  : ' +
    fontAudit.files.length +
    ' (' +
    fontAudit.problems.length +
    ' problems, this must be zero)',
);
console.log('  manifest            : docs/handover/LICENCES.md');

const failures = [];
for (const problem of fontAudit.problems) {
  failures.push(
    problem +
      '. Half a megabyte of third-party work ships inside the APK and no package ' +
      'manifest mentions it, so nothing else in this repository would notice.',
  );
}
for (const p of blocking) {
  failures.push(
    p.name +
      '@' +
      p.version +
      ' is ' +
      p.licence +
      ', which conditions distribution of the combined work. A Play Store release ' +
      'IS distribution (L-22).',
  );
}
for (const p of unknown) {
  failures.push(
    p.name +
      '@' +
      p.version +
      ' declares no licence this tool can read. An unknown licence is a package ' +
      'nobody has cleared, not a package that is fine.',
  );
}
for (const u of undeclared) {
  failures.push(
    u + '. An undeclared dependency is invisible to this scan, so its licence has ' +
      'never been read - which is how a clean result can cover almost nothing.',
  );
}
for (const u of unresolved) {
  failures.push('could not resolve ' + u + ' - an unscanned dependency is an uncleared one.');
}

if (failures.length) {
  console.error('\nLICENCE FAILURES (' + failures.length + '):');
  for (const f of failures) console.error('  x    ' + f);
  process.exit(1);
}

console.log('\nlicences: nothing in the shipped closure conditions a Play Store release');
