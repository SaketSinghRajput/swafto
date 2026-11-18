/**
 * WHERE THE API IS. One line to change per environment, in one file.
 *
 * This points at a LAPTOP ON THE LOCAL NETWORK, not at production, because
 * production does not exist yet: no server is deployed in ap-south-1 and
 * nothing resolves api.swafto.com. A handset on the same Wi-Fi can reach this
 * machine directly, which is the shortest path to the app being usable at all.
 *
 * THREE THINGS THAT WILL BITE WHOEVER CHANGES THIS.
 *
 * 1. The address is this machine's Wi-Fi address, handed out by DHCP. It
 *    changes when the router feels like it. If the app stops reaching the API,
 *    check the machine's address before debugging anything else - the usual
 *    cause is that the laptop moved to a different number. A static lease on
 *    the router removes the problem permanently.
 *
 * 2. `localhost` WORKS ONLY OVER USB, AND THAT IS NOW THE SETUP. On a phone
 *    localhost is the phone - unless `adb reverse tcp:8787 tcp:8787` is in
 *    force, which maps the phone's port to this machine's over the cable
 *    (docs/handover/LOCAL-API.md). That beats the Wi-Fi address it replaced
 *    (192.168.1.35), which DHCP could move at any time. Over Wi-Fi only, put
 *    the laptop's 192.168.x.x back - never the 172.x WSL adapter.
 *
 * 3. http, NOT https, AND THAT IS WHY THIS IS A DEBUG BUILD. Android blocks
 *    cleartext traffic in release builds: the manifest's `usesCleartextTraffic`
 *    placeholder is set false for release by the React Native Gradle plugin,
 *    which is correct and is decision S-06 being enforced for us. A release
 *    APK pointed at this URL would fail every request with a
 *    cleartext-not-permitted error. So the local-network build is the DEBUG
 *    variant, deliberately, and the two cannot be mistaken for each other.
 *
 * PORT 8787 RATHER THAN 8080 because another container on this machine
 * already holds 127.0.0.1:8080. Two servers answering the same port, one on
 * loopback and one on the LAN, is a confusion nobody needs at 11pm.
 *
 * FOR PRODUCTION (C-16) the URL is BUILD CONFIG, not source. Gradle bakes it
 * into `BuildConfig.API_BASE_URL`; `SwaftoDeviceModule` hands it to JS as a
 * constant; `resolveApiBaseUrl` below picks it. The debug build keeps the dev
 * URL. A RELEASE BUILD FAILS (`generateReleaseBuildConfig`, app/build.gradle)
 * unless `SWAFTO_API_BASE_URL` is an https URL, and this function throws at
 * start-up for a release binary that somehow carries anything else.
 *
 * WHERE THE PRODUCTION ORIGIN IS SET - a HUMAN decision (H5), not made here:
 * `SWAFTO_API_BASE_URL` in ~/.gradle/gradle.properties (next to the upload
 * key) or `-PSWAFTO_API_BASE_URL=https://...` on the command line. The
 * checked-in value in android/gradle.properties is an empty placeholder, so
 * the release build cannot pass until somebody chooses.
 */

/** What the debug build talks to. Reached over `adb reverse`, see above. */
export const DEV_API_BASE_URL = 'http://localhost:8787';

/**
 * The URL a build may use. Pure, so a test can prove the release rule without
 * a handset: `isDebugBuild` is the NATIVE `BuildConfig.DEBUG`, never `__DEV__`
 * (build.gradle sets `debuggableVariants = []`, so even the debug APK runs a
 * production JS bundle with `__DEV__` false). Anything but `true` - missing,
 * unknown, an old binary - fails SAFE as a release and needs https.
 * `fromBuildConfig` is what the native module reported, or undefined.
 */
export function resolveApiBaseUrl(fromBuildConfig: string | undefined | null, isDebugBuild: boolean | undefined | null): string {
  const url = (fromBuildConfig ?? '').trim().replace(/\/+$/, '');
  if (isDebugBuild === true) return url !== '' ? url : DEV_API_BASE_URL;
  if (!/^https:\/\/[^/\s]+/.test(url)) {
    throw new Error(
      'This release build has no https API URL (BuildConfig.API_BASE_URL = "' + url + '"). ' +
        'Set SWAFTO_API_BASE_URL at build time.',
    );
  }
  return url;
}

/**
 * KEPT FOR `apps/api/test/web-pages.spec.ts`, which compares page URLs with it
 * under the default. It is the DEV default, NOT the URL a release build uses -
 * production code reads `apiBaseUrl()`. (Request to the API owner: import
 * `DEV_API_BASE_URL` there and this alias can go.)
 */
export const API_BASE_URL = DEV_API_BASE_URL;

let baseUrl: string = DEV_API_BASE_URL;

/** Called once by Root, before anything reads `API_BASE_URL`. */
export function setApiBaseUrl(url: string): void {
  baseUrl = url;
}

/** Live binding: always the value `setApiBaseUrl` last set. */
export function apiBaseUrl(): string {
  return baseUrl;
}

/**
 * F-23: the public pages, served from this same origin (`apps/api/src/web.ts`).
 * `web-links.spec.ts` asks the real API for each path, so a renamed route
 * fails a test instead of a link on About. Getters, so they follow the base
 * URL Root resolved rather than the dev default.
 */
export const WEB_PAGE_URLS = {
  get privacy() {
    return baseUrl + '/privacy';
  },
  get terms() {
    return baseUrl + '/terms';
  },
  get licences() {
    return baseUrl + '/licences';
  },
  get deleteAccount() {
    return baseUrl + '/delete-account';
  },
};

