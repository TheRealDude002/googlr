# Googlr — reverse image search PWA

**search by image, find the world.** Googlr analyzes any image and pins the results to a skeuomorphic corkboard: a Best Guess label, exact + partial source URLs, web entities, visually similar images, and a safe-search badge. No accounts, no server-side storage, history lives in `localStorage` only.

> **Zero third-party search APIs.** Google Lens is scraped directly by a Cloudflare Browser Rendering Worker (headless Puppeteer). The only external service is ImgBB (free image hosting, no card) used to turn the uploaded base64 into a public URL that Lens can ingest. Everything runs on Cloudflare's free tier.

---

## Architecture

```
Googlr React App (CF Pages / next dev)
        ↓  POST { image: base64 }
proxy-worker (CF Worker)              ← uploads to ImgBB, then forwards the URL
        ↓  POST { imageUrl: string }
lens-worker (CF Worker)               ← headless browser scrapes Google Lens
        ↓
Google Lens (lens.google.com)         ← no API key, scraped directly
```

| Piece | File | Role |
|---|---|---|
| Next.js API route (default) | `src/app/api/search/route.ts` | Same pipeline as proxy-worker, used when running `npm run dev` / `next start` |
| Cloudflare proxy-worker | `worker/proxy-worker/` | Receives `{ image }`, uploads to ImgBB, calls lens-worker |
| Cloudflare lens-worker | `worker/lens-worker/` | Headless browser (Puppeteer via `BROWSER` binding) scrapes Google Lens |

The frontend calls `NEXT_PUBLIC_WORKER_URL` if set at build time, otherwise it POSTs to the same-origin `/api/search`. The ImgBB key and worker URLs are **never** in frontend code.

All backends speak the **same JSON contract**: `{ bestGuess, safeSearch, sources, partialMatches, similarImages, entities }`.

## Features

- 🖼 **Home** — drag-and-drop / tap-to-browse / clipboard-paste (Ctrl+V) dropzone, 📁 Upload + 📷 Camera (rear camera via `capture="environment"`), recent-searches grid (last 10, tap to reload cached results)
- 🔍 **Preview** — framed image preview, one-tap "Search This Image"
- 📌 **Loading** — pulsing cork pin: *"pinning results to board…"*
- 📋 **Results** — Best Guess banner + safe-search badge, corkboard with three pinned note cards (Found on the web / Identified as / visually similar strip), Share (Web Share API → clipboard fallback) + Search Again
- 📱 **PWA** — `manifest.json`, service worker caching the app shell (never `/api/*`), installable
- 🗜 **Client-side compression** — images are resized/re-encoded to JPEG ≤ 1MB via canvas before upload

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · **ImgBB** (free image hosting, no card — auto-deletes uploads after 5 min) · **Cloudflare Browser Rendering** (free tier — 1,000 requests/month, no card) · **@cloudflare/puppeteer** (headless Google Lens scraper)

Search pipeline: image (base64, ≤ 1 MB) → ImgBB upload → public URL → lens-worker scrapes `lens.google.com` → shaped JSON (`bestGuess`, `sources`, `partialMatches`, `similarImages`, `entities`, `safeSearch`).

Typography: Playfair Display (display) · Crimson Text (body) · Special Elite (UI chrome). The logo is an inline SVG — grey embossed Playfair letterforms, no image file.

## Local development

```bash
bun install
bun run dev        # http://localhost:3000
bun run lint
```

### Environment variables

Copy `.env.example` → `.env`:

```bash
IMGBB_API_KEY=your_imgbb_api_key_here   # server-side only — free at api.imgbb.com
LENS_WORKER_URL=http://localhost:8788   # lens-worker (mock mode locally, deployed in prod)
# NEXT_PUBLIC_WORKER_URL=https://googlr-proxy-worker.<your-subdomain>.workers.dev  # optional: bypass /api/search
```

**Demo mode:** if `IMGBB_API_KEY` or `LENS_WORKER_URL` is unset, `/api/search` returns clearly-flagged demo results (a "demo mode" note appears on the results screen) so the full UI flow is testable without any configuration.

### Running the workers locally (optional)

The Next.js route already performs the full pipeline (ImgBB → lens-worker) when the env vars above are set. If you want to run the exact production topology instead:

**Terminal 1 — lens-worker (mock mode, port 8788):**
```bash
cd worker/lens-worker
npm install
npx wrangler dev --port 8788
```
`USE_MOCK=true` is loaded from `.dev.vars` automatically. No `BROWSER` binding needed — returns realistic fake data instantly ("Golden Gate Bridge at Dusk").

**Terminal 2 — proxy-worker (port 8787):**
```bash
cd worker/proxy-worker
npx wrangler dev --port 8787
```
Reads `LENS_WORKER_URL=http://localhost:8788` from `.dev.vars`. Still uploads to ImgBB for real (requires `IMGBB_API_KEY` in `.dev.vars`).

**Terminal 3 — React app (port 3000):**
```bash
npm run dev
```
Set `NEXT_PUBLIC_WORKER_URL=http://localhost:8787` in `.env` to route through the proxy-worker instead of `/api/search`.

Full local flow: React app → `localhost:8787` (proxy) → ImgBB (real) → `localhost:8788` (lens, mock). Result: real image upload, fake Lens results, full UI testable end to end.

### Real Lens results locally (optional)

Run lens-worker with `--remote` so execution happens on Cloudflare's infrastructure where the `BROWSER` binding works:

```bash
cd worker/lens-worker
npx wrangler dev --remote --port 8788
```

Then set `USE_MOCK=false` in `worker/lens-worker/.dev.vars` and restart. Requires `wrangler login`. Consumes real browser rendering quota.

## Deployment (Cloudflare Pages + Workers)

Deploy in this order:

```bash
# 1. Deploy lens-worker
cd worker/lens-worker
npm install
npx wrangler deploy --env production

# 2. Note the deployed URL in terminal output, e.g.:
#    https://googlr-lens-worker.yourname.workers.dev

# 3. Update LENS_WORKER_URL in worker/proxy-worker/wrangler.toml with the real URL

# 4. Deploy proxy-worker
cd worker/proxy-worker
npx wrangler deploy --env production

# 5. Confirm IMGBB_API_KEY secret is set on proxy-worker
npx wrangler secret list

# 6. Remove secrets from retired third-party services, if they still exist
npx wrangler secret delete SCRAPINGDOG_API_KEY   # if present
```

Then:

1. **Push this repo to GitHub.**
2. **Connect the repo to Cloudflare Pages** — build command `npx @cloudflare/next-on-pages@1`, output directory `.vercel/output/static`.
3. **Set environment variables in Pages settings (before the first build)** — either `NEXT_PUBLIC_WORKER_URL` pointing at your deployed proxy-worker (recommended), or `IMGBB_API_KEY` + `LENS_WORKER_URL` so `/api/search` runs the pipeline on the Pages Functions runtime. `NEXT_PUBLIC_*` vars are inlined at build time, so set them before deploying.
4. **Push** — Cloudflare Pages auto-deploys. Add the app to your home screen to install the PWA.

Secrets are set per worker with `wrangler secret put` (never committed — the `.dev.vars` files are gitignored).

## Scraper maintenance

If sources or entities return empty on a real image, the CSS selectors in the `page.evaluate()` block in `worker/lens-worker/index.js` need updating. Google changes Lens's DOM periodically. Check the worker logs (Cloudflare dashboard → Workers & Pages → googlr-lens-worker → Logs), inspect what the page returned, and adjust the selectors to match what Google currently renders. This is normal scraper maintenance.

## Browser Rendering free tier budget

1,000 requests/month, 10 minutes of browser time per day, 3 concurrent browsers. Each search uses roughly 5–15 seconds of browser time. At 10 minutes/day that is approximately 40–120 real searches per day before the daily limit resets at 00:00 UTC. Local development with mock mode on burns zero quota. Monitor usage in Cloudflare dashboard → Workers & Pages → googlr-lens-worker → Metrics.

## Out of scope (by design)

No user accounts, no server-side image storage, no face identification, no bulk upload, no PDF/video, no AI-generated-image detection, no direct Google Images / TinEye buttons, no backend database, no third-party search API subscriptions.
