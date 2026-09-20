/**
 * L-11 / T6.4 - A TRIPWIRE, NOT A MEASUREMENT, AND IT SAYS SO.
 *
 * The rule: a push notification must carry a TRIGGER ONLY. No amount, no
 * customer name, no phone number, no shop name. The text is resolved on the
 * device from data the device already has. Two reasons, and the second is the
 * one people forget:
 *
 *   1. An FCM payload passes through Google's infrastructure, outside India.
 *      LEGAL-AUDIT §2 and the residency question. "Rahul owes you INR 4,200"
 *      in a push payload is a cross-border disclosure of a customer's personal
 *      data that nobody consented to.
 *   2. A notification is rendered on a LOCKED SCREEN. Whatever is in it is
 *      readable by whoever picks the phone up, which on a shop counter is
 *      anybody.
 *
 * WHAT THIS CHECK ACTUALLY KNOWS TODAY: there is no push code in this
 * repository at all. No FCM, no Firebase dependency, no notification builder.
 * V1 does not request the Android 13+ notification permission - DEFERRED.md
 * records the inbox and its primer as cut - so the rule has no subject, and a
 * check with no subject measures nothing.
 *
 * SO IT IS A TRIPWIRE. It fails the day push arrives without the rule arriving
 * with it. That is worth having precisely because of how this feature gets
 * added: somebody wires FCM in an afternoon to send "your day is not closed
 * yet", it works, and the second payload - the useful one, with the figure in
 * it - is added a week later by somebody who never read this file.
 *
 * It must never be described as proving L-11. It proves that L-11 has not
 * silently become applicable.
 */
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/** Anything that could put a notification on a screen. */
const PUSH_SIGNS = [
  ['@react-native-firebase/messaging', 'the Firebase messaging SDK'],
  ['firebase-admin', 'the Firebase admin SDK, which is how a server sends one'],
  ['expo-notifications', 'a notification SDK'],
  ['@notifee/react-native', 'a notification SDK'],
  ['messaging()', 'a Firebase messaging call'],
  ['FirebaseMessaging', 'the Android messaging class'],
  ['sendMulticast', 'an FCM multicast send'],
  ['registerDeviceForRemoteMessages', 'FCM device registration'],
];

const SOURCE_ROOTS = ['apps', 'packages'];
const isSource = (f) => /\.(ts|tsx|js|mjs|json)$/.test(f) && !/[\\/]node_modules[\\/]/.test(f);

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e === 'node_modules' || e === '.git') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (isSource(p)) out.push(p);
  }
  return out;
}

const files = [...SOURCE_ROOTS.flatMap((r) => walk(r)), 'package.json'].filter((f) => existsSync(f));

const found = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const [sign, what] of PUSH_SIGNS) {
    if (text.includes(sign)) found.push({ file, sign, what });
  }

  /*
   * AND A SWEEP OF THE DEPENDENCY NAMES, because the list above is scoped by
   * KNOWN PACKAGE and the adversary pass asks whether a plant moves along the
   * axis a guard is written in. It does not: the SDK somebody reaches for next
   * year is not on that list, and on that axis the check was blind. A name
   * sweep is coarse and will one day fire on something harmless - which is the
   * right failure, because it is loud and takes a minute to dismiss, while the
   * other one is silent and takes a breach to discover.
   */
  if (/(^|[\\/])package\.json$/.test(file)) {
    const manifest = JSON.parse(text);
    for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
      for (const name of Object.keys(manifest[field] ?? {})) {
        if (/firebase|messag|notif|onesignal|push|apns|fcm|pusher|airship/i.test(name)) {
          found.push({
            file,
            sign: name,
            what: 'a dependency whose NAME suggests notifications, caught by the name sweep rather than the known-SDK list',
          });
        }
      }
    }
  }
}

console.log('  files scanned      : ' + files.length);
console.log('  push integrations  : ' + found.length + ' (V1 ships none)');
console.log('  what this proves   : that L-11 has NOT silently become applicable');
console.log('  what it does NOT   : that a real payload is trigger-only - no payload exists');

if (found.length) {
  console.error('\nPUSH HAS ARRIVED (' + found.length + '):');
  for (const f of found) console.error('  x    ' + f.file + '  ' + f.sign + ' - ' + f.what);
  console.error(
    '\nL-11 and SECURITY-AUDIT T6.4 now APPLY, and this tripwire cannot judge a\n' +
      'payload it was never built to read. Before this check is changed:\n' +
      '\n' +
      '  1. The payload must carry a TRIGGER ONLY - an event kind and nothing else.\n' +
      '     No amount, no customer or supplier name, no phone number, no shop name.\n' +
      '     The text is resolved on the device, from data the device already has.\n' +
      '  2. Replace this file with one that reads the real payload builder and\n' +
      '     fails on any field not in an allow-list. An allow-list, not a deny-list:\n' +
      '     the field somebody adds next month is the one that leaks.\n' +
      '  3. Update LEGAL-AUDIT L-11 and SECURITY-AUDIT T6.4 from ACTION-REQUIRED,\n' +
      '     and answer the residency question in section 2 - an FCM payload leaves\n' +
      '     India.\n' +
      '\n' +
      'A notification is also rendered on a LOCKED screen, on a phone that sits on a\n' +
      'shop counter all day.',
  );
  process.exit(1);
}

console.log(
  '\npush payload: no push integration exists, so nothing can put a name or a figure in one',
);
