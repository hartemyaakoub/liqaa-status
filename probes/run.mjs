/**
 * LIQAA uptime probe — requests each endpoint, writes a JSON snapshot.
 *
 * Two corrections from the first version, both found by replaying it against
 * the live site after the probe had been dead for three months:
 *
 *   redirect: 'manual' + expect 200 — liqaa.io now answers / with a 307 to the
 *   locale path (/ar). Under the old rule that is a failed critical probe, so
 *   the probe would have opened a permanent outage against a site that loads
 *   perfectly. Redirects are followed now and the final status is what counts,
 *   because a visitor does not experience a 307 as downtime. A redirect loop
 *   still fails, which is the case worth catching.
 *
 *   /reference — returns 404, and did in 31 of the 137 snapshots already
 *   committed here. It is not a degraded endpoint, it is a URL that does not
 *   exist. Probing it produced a permanent yellow that meant nothing; it is
 *   removed rather than excused.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const TARGETS = [
  { name: 'home', url: 'https://liqaa.io/', method: 'GET', expectStatus: [200], critical: true },
  { name: 'sdk', url: 'https://liqaa.io/sdk.js', method: 'GET', expectStatus: [200], critical: true },
  { name: 'docs', url: 'https://liqaa.io/docs', method: 'GET', expectStatus: [200], critical: false },
  { name: 'console', url: 'https://liqaa.io/console', method: 'GET', expectStatus: [200], critical: false },
  { name: 'status', url: 'https://liqaa.io/status', method: 'GET', expectStatus: [200], critical: false },
  { name: 'sitemap', url: 'https://liqaa.io/sitemap.xml', method: 'GET', expectStatus: [200], critical: false },
];

const PROBE_TIMEOUT_MS = 8000;

async function probe(target) {
  const t0 = performance.now();
  let status = 0;
  let ok = false;
  let error = null;
  let finalUrl = null;
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), PROBE_TIMEOUT_MS);
    const r = await fetch(target.url, {
      method: target.method,
      signal: ac.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'liqaa-status-probe/1.1 (+https://github.com/hartemyaakoub/liqaa-status)' },
    });
    clearTimeout(t);
    status = r.status;
    ok = target.expectStatus.includes(status);
    // Record where a redirect actually landed, so a locale hop and a hijack are
    // distinguishable in the log rather than both reading as a bare 200.
    if (r.redirected && r.url !== target.url) finalUrl = r.url;
  } catch (e) {
    error = e.name === 'AbortError' ? 'timeout' : (e.message || 'unknown');
  }
  return {
    name: target.name,
    url: target.url,
    final_url: finalUrl,
    status,
    ok,
    error,
    critical: target.critical,
    latency_ms: Math.round(performance.now() - t0),
  };
}

const ts = new Date().toISOString();
const results = await Promise.all(TARGETS.map(probe));
const overall = (() => {
  const criticals = results.filter((r) => r.critical);
  if (criticals.every((r) => r.ok)) return 'operational';
  if (criticals.some((r) => !r.ok)) return 'outage';
  return 'degraded';
})();

const snapshot = {
  timestamp: ts,
  region: process.env.PROBE_REGION || 'github-ubuntu-east',
  overall,
  results,
};

const [date, time] = ts.split('T');
const [yyyy, mm] = date.split('-');
const dir = join('results', `${yyyy}-${mm}`);
await mkdir(dir, { recursive: true });
const file = join(dir, `${date}_${time.slice(0, 5).replace(':', '-')}.json`);
await writeFile(file, JSON.stringify(snapshot, null, 2));

console.log(`Wrote ${file} — ${overall}`);
console.log(JSON.stringify(snapshot, null, 2));

// Update latest.json for quick frontend access
await writeFile('results/latest.json', JSON.stringify(snapshot, null, 2));

// Exit non-zero on outage so the GitHub Actions check fails (visible in repo header)
if (overall === 'outage') process.exit(1);
