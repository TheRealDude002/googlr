# Googlr — reverse image search PWA

**search by image, find the world.** Googlr analyzes any image and pins the results to a skeuomorphic corkboard: a Best Guess label, exact + partial source URLs, web entities with confidence scores, visually similar images, and a safe-search badge. No accounts, no server-side storage, history lives in `localStorage` only.

> This repo ships two interchangeable backends that speak the **same JSON contract**:
>
> | Backend | File | When to use |
> |---|---|---|
> | Next.js API route (default) | `src/app/api/search/route.ts` | Running the app as-is (`bun run dev` / Node host) |
> | Cloudflare Worker | `worker/index.js` | Static deployment on Cloudflare Pages |
>
> The frontend calls `NEXT_PUBLIC_WORKER_URL` if set at build time, otherwise it POSTs to the same-origin `/api/search`. The Vision API key is **never** in frontend code in either setup.

---

## Features

- 🖼 **Home** — drag-and-drop / tap-to-browse / clipboard-paste (Ctrl+V) dropzone, 📁 Upload + 📷 Camera (rear camera via `capture="environment"`), recent-searches grid (last 10, tap to reload cached results)
- 🔍 **Preview** — framed image preview, one-tap "Search This Image"
- 📌 **Loading** — pulsing cork pin: *"pinning results to board…"*
- 📋 **Results** — Best Guess banner + safe-search badge, corkboard with three pinned note cards (Found on the web / Identified as / visually similar strip), Share (Web Share API → clipboard fallback) + Search Again
- 📱 **PWA** — `manifest.json`, service worker caching the app shell (never `/api/*`), installable
- 🗜 **Client-side compression** — images are resized/re-encoded to JPEG ≤ 1MB via canvas before upload

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Google Cloud Vision API (**Web Detection**: `bestGuessLabels`, `fullMatchingImages`, `partialMatchingImages`, `visuallySimilarImages`, `webEntities`, `safeSearchAnnotation`)

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
GOOGLE_VISION_API_KEY=your_vision_api_key_here   # server-side only
# NEXT_PUBLIC_WORKER_URL=https://googlr-worker.<your-subdomain>.workers.dev  # optional: use Cloudflare Worker instead of /api/search
```

**Demo mode:** if `GOOGLE_VISION_API_KEY` is unset, `/api/search` returns clearly-flagged demo results (a "demo mode" note appears on the results screen) so the full UI flow is testable without a key.

## Deployment (Cloudflare Pages + Worker)

1. **Create the Vision key** — in the Google Cloud console, enable the **Cloud Vision API** and create an API key, restricted to the Vision API only.
2. **Deploy the Worker** — `wrangler secret put GOOGLE_VISION_API_KEY`, then `wrangler deploy` (config in `wrangler.toml`). This worker receives `{ image, mimeType }`, calls Vision, returns structured JSON, and never writes to disk.
3. **Push this repo to GitHub.**
4. **Connect the repo to Cloudflare Pages** — build command `npm run build`, output dir per Next.js (`dist` if using a static Vite variant, `.next` via `@cloudflare/next-on-pages` for this repo).
5. **Set environment variables in Pages settings** — either `GOOGLE_VISION_API_KEY` (route runs on the Pages Functions runtime) **or** `NEXT_PUBLIC_WORKER_URL` pointing at your deployed Worker from step 2.
6. **Push** — Cloudflare Pages auto-deploys. Add the app to your home screen to install the PWA.

## Out of scope (by design)

No user accounts, no server-side image storage, no face identification, no bulk upload, no PDF/video, no AI-generated-image detection, no direct Google Images / TinEye buttons, no backend database.
