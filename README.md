<div align="center">

# LIQAA Status

**Public uptime probing for [liqaa.io](https://liqaa.io/).**
Every reading is committed to this repository, append-only. Nothing is summarised
into a number that cannot be checked against `git log`.

[![probe](https://github.com/hartemyaakoub/liqaa-status/actions/workflows/probe.yml/badge.svg)](https://github.com/hartemyaakoub/liqaa-status/actions/workflows/probe.yml)

</div>

---

## How it works

A GitHub Actions workflow requests six endpoints, records the status code and
latency of each, and commits the snapshot to `results/YYYY-MM/`. The data is
public and append-only: an outage cannot be edited out afterwards, including by
us.

## Probed endpoints

| Endpoint | Critical? | Expected |
|---|---|---|
| `https://liqaa.io/` | yes | 200 after redirects (currently → `/ar`) |
| `https://liqaa.io/sdk.js` | yes | 200 |
| `https://liqaa.io/docs` | no | 200 after redirects |
| `https://liqaa.io/console` | no | 200 after redirects |
| `https://liqaa.io/status` | no | 200 |
| `https://liqaa.io/sitemap.xml` | no | 200 |

That is the whole list. An earlier version of this README also advertised a
`/api/public/v1/…` health probe and a `wss://liqaa.io/rtc` WebSocket handshake.
Neither was ever probed. A status page that lists checks it does not run is
exactly the failure it exists to prevent, so the table now matches
[`probes/run.mjs`](probes/run.mjs) line for line.

Redirects are followed and the final status is what counts. `liqaa.io/` answers
`/` with a 307 to the locale path, which a visitor never experiences as downtime;
the landing URL is recorded in `final_url` so a locale hop stays distinguishable
from a hijack. A redirect loop still fails, which is the case worth catching.

`/reference` was dropped. It returned 404 in 31 of the 137 snapshots in this
repository — not a degraded endpoint, a URL that does not exist.

## Status definitions

- **Operational** — every critical endpoint answered as expected.
- **Degraded** — a non-critical endpoint failed.
- **Outage** — a critical endpoint failed. The workflow exits non-zero, so the
  badge above turns red on its own.

## What this data cannot tell you

- **One vantage point.** The probe runs on a GitHub-hosted runner outside
  Algeria. A failure means liqaa.io was unreachable *from there*. That is not
  always the same as being down.
- **The cadence is requested, not guaranteed.** The workflow asks for every 30
  minutes. Across the snapshots already committed here, under a `*/5` request,
  the median gap was **90 minutes** — GitHub drops scheduled runs under load and
  never makes them up. Read the timestamps, not the cron line.
- **Resolution is one probe.** With a few hundred samples, availability cannot be
  reported to more decimal places than one missed probe is worth.
- **There is a three-month hole.** No snapshot was written between 13 May and 12
  August 2026. The workflow was not disabled and never stopped running: it ran
  1,302 times and failed every one. The probe exits non-zero on an outage to turn
  the badge red, and that exit code also skipped the commit step — so the outage
  it had just detected was never recorded. The commit step now runs on
  `always()`. The gap is visible in `results/` and is left there rather than
  backfilled.

Fleet-wide availability across all TKAWEN platforms — including liqaa.io — is
measured continuously and published at
**[hartemyaakoub.github.io/mystoq-status](https://hartemyaakoub.github.io/mystoq-status/)**.

## Subscribe

- **RSS** — `https://github.com/hartemyaakoub/liqaa-status/commits/main.atom`
  gives every probe result as it lands.

## License

[CC0](./LICENSE) — public domain. The data, the code, all of it.
