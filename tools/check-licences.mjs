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
  // `import` must be the keyword: a line that STARTS with the JSX prop
  // `importantForAccessibility="no"` is not an import of a package called "no".
  for (const m of source.matchAll(/(?:^|\n)\s*import(?=[\s{*'"])[^'"]*['"]([^'"]+)['"]/g)) out.add(m[1]);
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

/* ---- L-09 · a processor is not the same question as a licence ----------- */

/**
 * WHO ELSE WOULD SEE THE DATA.
 *
 * L-09 asks whether any processor moves personal data out of India. Today the
 * answer is that there is no processor at all: no crash reporter, no
 * analytics, no error tracker, no CDN in the shipped closure. SMS goes to an
 * Indian operator under the DLT framework and the database is in ap-south-1.
 *
 * That answer is only worth having if something notices when it stops being
 * true - and the natural place is here, because this tool already walks every
 * package that ships. A licence scan asks "may we distribute this"; this asks
 * a different question of the same list: "would this send a shopkeeper's data
 * to somebody".
 *
 * IT IS A TRIPWIRE AND NOT A PROOF, like `check:push`. A processor added under
 * a name nobody recognised would pass, which is why the pattern is broad and
 * the failure is loud rather than clever.
 */
const PROCESSOR_SIGNS =
  /sentry|bugsnag|datadog|new-?relic|amplitude|mixpanel|segment|posthog|analytics|crashlytics|appcenter|instabug|smartlook|fullstory|logrocket|rollbar|raygun/i;

const processors = thirdParty.filter((p) => PROCESSOR_SIGNS.test(p.name));

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

  /*
   * ONE LICENCE PER FILE, NOT ONE FOR THE DIRECTORY. Every font used to be
   * assumed OFL and every licence text was demanded to say so, which would reject
   * the ISC text beside the icon font and label that font OFL in the manifest -
   * a false statement in a legal document. Each group names the binaries it
   * covers, the licence file beside them, and what that text must say. A binary
   * that no group covers, or a licence file that no group names, is a failure:
   * an unmapped licence is one nobody has cleared. The OFL rules are exactly the
   * three they always were.
   */
  const GROUPS = [
    {
      label: 'OFL 1.1 (see the file below)',
      covers: /^AnekOdia-[A-Za-z]+\.ttf$/,
      licenceFile: 'OFL-AnekOdia.txt',
      rules: [
        [/SIL OPEN FONT LICENSE/i, 'does not name the SIL Open Font Licence'],
        [/Version 1\.1/i, 'does not state OFL version 1.1'],
        [/Copyright/i, 'carries no copyright line'],
      ],
    },
    {
      // Lucide's LICENSE is ISC, plus the MIT text for the glyphs derived from Feather.
      // The icon subset contains Feather-derived glyphs (check, clock, lock, info, ...),
      // so BOTH notices must travel with it.
      label: 'ISC; MIT for Feather-derived glyphs (see the file below)',
      covers: /^SwaftoIcons\.ttf$/,
      licenceFile: 'ISC-Lucide.txt',
      rules: [
        [/^\s*ISC License/m, 'does not carry the title "ISC License"'],
        [
          /Permission to use, copy, modify, and\/or distribute this software for any\s+purpose with or without fee is hereby granted/i,
          'lacks the ISC permission notice',
        ],
        [/Copyright \(c\) \d{4} Lucide Icons and Contributors/i, 'carries no Lucide copyright line'],
        [/The MIT License \(MIT\)/i, 'lacks the MIT licence for the Feather-derived glyphs'],
        [/Copyright \(c\) 2013-present Cole Bemis/i, 'carries no Feather (Cole Bemis) copyright line'],
        [/copies or substantial portions of the Software/i, 'lacks the MIT permission notice'],
      ],
    },
  ];
  const groupOf = (binary) => GROUPS.find((g) => g.covers.test(binary));
  const mapped = new Set(GROUPS.map((g) => g.licenceFile));

  /*
   * THE FAMILIES THE THEME ACTUALLY ASKS FOR, read from the token file rather
   * than from a list here. A font referenced and not shipped renders as the
   * system fallback, which on an Odia string is the tofu this build has a
   * whole other check about.
   */
  const asked = [...read(TOKENS_FILE).matchAll(/'(AnekOdia-[A-Za-z]+|SwaftoIcons)'/g)].map((m) => m[1]);
  for (const family of new Set(asked)) {
    if (!binaries.some((f) => f.startsWith(family + '.'))) {
      problems.push('the theme asks for ' + family + ' and no such file ships');
    }
  }

  for (const binary of binaries) {
    const group = groupOf(binary);
    if (!group) {
      problems.push(binary + ' ships with no licence mapping in this tool, so nobody has cleared it');
      continue;
    }
    if (!present.includes(group.licenceFile)) {
      problems.push(binary + ' ships with no licence file beside it (expected ' + group.licenceFile + ')');
      continue;
    }
    const text = read(join(FONT_DIR, group.licenceFile));
    // A11: the label is not the payload. Open it and read what it says.
    for (const [re, message] of group.rules) {
      if (!re.test(text)) problems.push(group.licenceFile + ' ' + message);
    }
  }
  for (const name of present) {
    if (!binaries.includes(name) && !mapped.has(name)) {
      problems.push(name + ' sits among the fonts and no licence mapping names it');
    }
  }
  if (binaries.length === 0) problems.push('no font binary found to audit');

  for (const name of [...binaries, ...present.filter((f) => mapped.has(f))].sort()) {
    const bytes = readFileSync(join(FONT_DIR, name));
    files.push({
      name,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      licence: binaries.includes(name) ? (groupOf(name)?.label ?? 'UNMAPPED') : 'the licence',
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
lines.push('## Data processors (L-09)');
lines.push('');
lines.push(
  '**' +
    processors.length +
    '** package in the shipped closure looks like a crash reporter, an analytics',
);
lines.push(
  'SDK or an error tracker. That is the L-09 question - whether a processor moves',
);
lines.push(
  'personal data out of India - and today it has no subject: the database is in',
);
lines.push(
  'ap-south-1, SMS goes to an Indian operator under DLT, and nothing else receives',
);
lines.push('anything. The scan above is what notices if that changes.');
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
  '**What is verified here:** every family the theme asks for is present, each binary',
);
lines.push(
  'is covered by a licence mapping in this tool, the licence file beside it carries',
);
lines.push(
  'the required text of each licence (OFL 1.1 for Anek Odia; ISC plus the MIT notice for',
);
lines.push(
  'the Feather-derived glyphs for the Lucide icon subset), and each binary is hashed',
);
lines.push('so a swapped file is visible in a diff.');
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

/*
 * HT-15: THE SAME LIST, AS THE PAGE ABOUT -> "Open-source licences" OPENS. The
 * button did nothing. Written from the rows above so the page and the manifest
 * cannot disagree, with the font licence text in full because OFL 1.1 requires
 * it to travel with the fonts. Served from the API origin like the policy.
 */
const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fontLicences = fontAudit.files.filter((f) => f.licence === 'the licence').map((f) => f.name);
const html = [
  '<!doctype html>',
  '<!-- GENERATED by tools/check-licences.mjs. DO NOT EDIT BY HAND. -->',
  '<html lang="en">',
  '  <head>',
  '    <meta charset="utf-8" />',
  '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
  '    <title>SWAFTO open-source licences</title>',
  '    <style>',
  '      body { font: 16px/1.5 system-ui, sans-serif; color: #1a1a1a; background: #fff; margin: 0 auto; max-width: 720px; padding: 16px; }',
  '      table { border-collapse: collapse; width: 100%; font-size: 14px; }',
  '      th, td { text-align: left; padding: 4px 8px; border-bottom: 1px solid #d6d6d0; overflow-wrap: anywhere; }',
  '      pre { white-space: pre-wrap; font-size: 13px; background: #f4f4f2; padding: 12px; }',
  '    </style>',
  '  </head>',
  '  <body>',
  '    <h1>Open-source licences</h1>',
  '    <p>SWAFTO is built with these open-source packages. Each is used under the licence shown.</p>',
  '    <table>',
  '      <tr><th>Package</th><th>Version</th><th>Licence</th></tr>',
  ...thirdParty.map(
    (p) => '      <tr><td>' + esc(p.name) + '</td><td>' + esc(p.version) + '</td><td>' + esc(p.licence) + '</td></tr>',
  ),
  '    </table>',
  '    <h2>Fonts</h2>',
  ...fontLicences.flatMap((f) => ['    <h3>' + esc(f) + '</h3>', '    <pre>' + esc(read(join(FONT_DIR, f))) + '</pre>']),
  '  </body>',
  '</html>',
  '',
].join('\n');
writeFileSync('apps/web/legal/licences.html', html, 'utf8');

console.log('  shipped workspaces  : ' + SHIPPED_WORKSPACES.length);
console.log('  runtime packages    : ' + seen.size + ' (' + thirdParty.length + ' third-party)');
console.log('  undeclared imports  : ' + undeclared.length + ' (this must be zero)');
console.log('  copyleft blocking   : ' + blocking.length + ' (this must be zero)');
console.log('  unknown licence     : ' + unknown.length + ' (this must be zero)');
console.log(
  '  data processors     : ' + processors.length + ' in the shipped closure (this must be zero)',
);
console.log(
  '  bundled font files  : ' +
    fontAudit.files.length +
    ' (' +
    fontAudit.problems.length +
    ' problems, this must be zero)',
);
console.log('  manifest            : docs/handover/LICENCES.md');

const failures = [];
for (const p of processors) {
  failures.push(
    p.name +
      '@' +
      p.version +
      ' looks like a data processor, and L-09 asks whether any processor moves ' +
      'personal data out of India. Answer it before shipping this: where does it ' +
      'send what, is that India, and does the privacy policy and the Data Safety ' +
      'form say so? Today both declare that nothing is shared with anybody.',
  );
}
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
