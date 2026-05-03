/**
 * LIQAA uptime probe — checks 6 critical endpoints, writes JSON snapshot.
 * Designed to run on GitHub Actions (cron every 5 min).
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const TARGETS = [
  { name: 'home', url: 'https://liqaa.io/', method: 'HEAD', expectStatus: [200], critical: true },
  { name: 'sdk', url: 'https://liqaa.io/sdk.js', method: 'HEAD', expectStatus: [200], critical: true },
  { name: 'docs', url: 'https://liqaa.io/docs', method: 'HEAD', expectStatus: [200], critical: false },
  { name: 'console', url: 'https://liqaa.io/console', method: 'HEAD', expectStatus: [200, 302], critical: false },
  { name: 'reference', url: 'https://liqaa.io/reference', method: 'HEAD', expectStatus: [200], critical: false },
  { name: 'sitemap', url: 'https://liqaa.io/sitemap.xml', method: 'GET', expectStatus: [200], critical: false },
];

const PROBE_TIMEOUT_MS = 8000;

async function probe(target) {
  const t0 = performance.now();
  let status = 0;
  let ok = false;
  let error = null;
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), PROBE_TIMEOUT_MS);
    const r = await fetch(target.url, {
      method: target.method,
      signal: ac.signal,
      redirect: 'manual',
      headers: { 'User-Agent': 'liqaa-status-probe/1.0 (+https://github.com/hartemyaakoub/liqaa-status)' },
    });
    clearTimeout(t);
    status = r.status;
    ok = target.expectStatus.includes(status);
  } catch (e) {
    error = e.name === 'AbortError' ? 'timeout' : (e.message || 'unknown');
  }
  return {
    name: target.name,
    url: target.url,
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
