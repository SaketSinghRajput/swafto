/**
 * THE PUBLIC PAGES, SERVED FROM THE API ORIGIN (F-23, GP-2, GP-4).
 *
 * Google Play wants a reachable privacy-policy URL and a web account-deletion
 * page. Both were written (`apps/web/`) and nothing served them, so the in-app
 * link had nowhere to go. CLAUDE.md puts them on the API origin because the API
 * sets no `Access-Control-Allow-Origin`: the deletion page's `fetch` only works
 * same-origin.
 *
 * THE CSP STAYS `default-src 'none'`. Each page's one inline `<style>` and
 * `<script>` is allowed by its SHA-256, computed here from the file actually
 * served - never `'unsafe-inline'`, so an injected script still runs nowhere.
 * Read once at start-up: a page is a release artefact, not a per-request read.
 */
import type { FastifyInstance } from 'fastify';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

/** Path -> file under `apps/web/`. The app's About screen links these paths. */
export const WEB_PAGES = {
  '/privacy': 'legal/privacy.html',
  '/terms': 'legal/terms.html',
  '/licences': 'legal/licences.html', // HT-15, written by tools/check-licences.mjs
  '/delete-account': 'delete-account/index.html',
} as const;

const hashes = (html: string, tag: 'style' | 'script'): string =>
  [...html.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))]
    .map((m) => `'sha256-${createHash('sha256').update(m[1]!).digest('base64')}'`)
    .join(' ');

export function registerWebPages(app: FastifyInstance): void {
  for (const [path, file] of Object.entries(WEB_PAGES)) {
    const html = readFileSync(new URL('../../web/' + file, import.meta.url), 'utf8');
    const style = hashes(html, 'style');
    const script = hashes(html, 'script');
    const csp = [
      "default-src 'none'",
      ...(style ? ['style-src ' + style] : []),
      ...(script ? ['script-src ' + script, "connect-src 'self'"] : []),
      "frame-ancestors 'none'",
      "base-uri 'none'",
      "form-action 'none'",
    ].join('; ');
    app.get(path, async (_req, reply) =>
      reply
        .code(200)
        .header('Content-Type', 'text/html; charset=utf-8')
        .header('Content-Security-Policy', csp)
        .send(html),
    );
  }
}
