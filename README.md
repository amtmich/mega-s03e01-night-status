# status for the night

Public night operations page and live `status.json`. Node 22 or newer; no dependencies.

## Run

```sh
node server.mjs
```

Open http://localhost:10000. The server uses Render's PORT when supplied.

## Deploy on Render

1. In Render, choose **New > Web Service** and connect this GitHub repository.
2. Select the `main` branch, Node runtime and **Free** plan.
3. Set build command: `node --check server.mjs && node --check worker.mjs`.
4. Set start command: `node server.mjs`.
5. Set health check path: `/healthz`.
6. Create the service. Open its public HTTPS URL and `/status.json`.

Alternatively, create a Render Blueprint using `render.yaml`. No environment variables, database, API keys or paid services are required. Render Free services sleep when idle, so the first request may take about a minute.

## Requirements and product decisions

- Product confirmed **keep the week**: R-L3R holds and R-L8Z goes. The incident window is anchored to the latest incident in the source data, which uses a fixed example night.
- Date format remains disputed: R-M6X requests month/day, R-K6L day/month. Both labelled formats are shown pending product's decision.
- R-X9Z requests an author on every incident, but source incident 3715 supplies `—`. The page and JSON preserve that value rather than inventing an author.
- Live upstream `updatedAt` is preserved. Every page/JSON request reads the feed; JSON allows CORS `*` and uses `Cache-Control: public, max-age=30`.
- The page uses the requested violet, exact heading, UTC footer, per-line summary and newest-first incident history.

Optional PRODUCT_POLICY JSON can select `dateFormat` (`day-first`, `month-first`, or `both`), `history` (`week` or `last-night`), and `missingAuthor`. Change those only after product resolves the relevant requirement. Defaults preserve the current decisions and unresolved information above.

## Check

```sh
node --test *.test.mjs
```

Tests cover the HTTP adapter, live freshness, CORS/cache headers, week retention, date ambiguity, missing authors, HTML escaping, and upstream failure handling. Browser QA has not been performed.

Only application source belongs in this repository. Course receipts, signed links and private logs are excluded.
