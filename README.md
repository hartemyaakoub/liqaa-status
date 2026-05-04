<div align="center">

# LIQAA Status

**Public uptime monitoring for the LIQAA Cloud platform.**
Probed every 5 minutes by GitHub Actions. Results committed back to this repo as ground truth.

[![probe](https://github.com/hartemyaakoub/liqaa-status/actions/workflows/probe.yml/badge.svg)](https://github.com/hartemyaakoub/liqaa-status/actions/workflows/probe.yml)
[![docs](https://img.shields.io/badge/dashboard-liqaa.io%2Fstatus-1d4ed8?style=flat-square)](https://liqaa.io/status)

</div>

---

## How it works

```
GitHub Actions (cron */5 * * * *)


 probes/run.mjs HTTPS+HEAD liqaa.io endpoints


 results/YYYY-MM/HH-MM.json (commit)


 status.liqaa.io (read from main branch · CDN-cached)
```

Every 5 minutes a GitHub Actions workflow:

1. Pings 6 critical endpoints from a US-East runner (DigitalOcean for verification)
2. Records latency + status code per endpoint
3. Commits the JSON snapshot to `results/`
4. The frontend reads the latest 24 hours of results to render the dashboard

**Why this design?** The probe data is **public and append-only** — nobody (including us) can rewrite history. If we have an outage, the receipts are right here in `git log`.

## Probed endpoints

| Endpoint | Critical? | Probe method |
| ------------------------------------- | --------- | ------------------- |
| `https://liqaa.io/` | Yes | HEAD, expect 200 |
| `https://liqaa.io/sdk.js` | Yes | HEAD, expect 200 |
| `https://liqaa.io/api/public/v1/...` | Yes | health probe |
| `https://liqaa.io/console` | No | HEAD, expect 200/302 |
| `https://liqaa.io/docs` | No | HEAD, expect 200 |
| `wss://liqaa.io/rtc` | Yes | WebSocket handshake |

## Status definitions

- ** Operational** — All probes returned 2xx within p99 < 1s.
- ** Degraded** — One or more probes timed out or returned 5xx in the last 15 min.
- ** Outage** — Critical endpoint unreachable for 3+ consecutive probes (15 min).

## Subscribe

- **GitHub releases** — we tag every incident report. Watch this repo → Releases.
- **RSS** — `https://github.com/hartemyaakoub/liqaa-status/releases.atom`
- **Email** — coming soon (sendinblue + GitHub Pages).

## License

[CC0](./LICENSE) — public domain. The data, the code, all of it.
