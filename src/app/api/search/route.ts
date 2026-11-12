import { NextResponse } from 'next/server';

/**
 * Googlr reverse image search endpoint.
 *
 * Accepts  POST { image: "<base64>", mimeType: "image/jpeg" }
 * Returns  { bestGuess, safeSearch, sources, partialMatches, similarImages, entities }
 *
 * Pipeline (mirrors worker/proxy-worker/index.js):
 *   1. ImgBB       — hosts the image (auto-deletes after 5 minutes) and
 *                    returns a public URL
 *   2. lens-worker — Cloudflare Browser Rendering Worker that scrapes
 *                    Google Lens headlessly (no third-party search API,
 *                    no Scrapingdog / SerpApi keys)
 *   3. This route  — passes the lens-worker JSON straight to the frontend
 *
 * Secrets live server-side only — the browser never sees them.
 * When IMGBB_API_KEY or LENS_WORKER_URL is missing the route returns
 * clearly-flagged demo data so the full UI flow stays usable (e.g. in
 * sandbox previews / before the environment is configured).
 */

interface DemoThumbSpec {
  hue: number;
  sunX: number;
}

function demoSimilarThumb({ hue, sunX }: DemoThumbSpec, index: number): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='180'>
  <defs>
    <linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='0' stop-color='hsl(${hue},42%,74%)'/>
      <stop offset='0.65' stop-color='hsl(${(hue + 28) % 360},48%,52%)'/>
      <stop offset='1' stop-color='hsl(${(hue + 40) % 360},45%,38%)'/>
    </linearGradient>
  </defs>
  <rect width='240' height='180' fill='url(#sky)'/>
  <circle cx='${sunX}' cy='56' r='27' fill='hsl(${(hue + 45) % 360},72%,82%)' opacity='0.9'/>
  <rect y='126' width='240' height='54' fill='hsl(${hue},40%,30%)' opacity='0.75'/>
  <path d='M0 126 L74 100 L152 126 L240 104 L240 180 L0 180 Z' fill='hsl(${hue},46%,22%)' opacity='0.85'/>
  <text x='120' y='170' font-family='monospace' font-size='11' fill='rgba(255,255,255,0.78)' text-anchor='middle'>similar ${index + 1}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function demoResult() {
  const specs: DemoThumbSpec[] = [
    { hue: 18, sunX: 60 },
    { hue: 32, sunX: 150 },
    { hue: 44, sunX: 110 },
    { hue: 205, sunX: 190 },
    { hue: 220, sunX: 80 },
    { hue: 238, sunX: 130 },
    { hue: 160, sunX: 100 },
    { hue: 175, sunX: 170 },
    { hue: 280, sunX: 65 },
    { hue: 300, sunX: 140 },
  ];
  return {
    demo: true,
    bestGuess: 'golden gate bridge at dusk',
    safeSearch: 'safe' as const,
    sources: [
      { url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge' },
      { url: 'https://www.britannica.com/topic/Golden-Gate-Bridge' },
      { url: 'https://www.history.com/topics/landmarks/golden-gate-bridge' },
      { url: 'https://sftravel.com/article/golden-gate-bridge-visitors-guide' },
      { url: 'https://www.goldengate.org/' },
    ],
    partialMatches: [
      { url: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/golden-gate-crop.jpg' },
      { url: 'https://images.example-cdn.net/photos/ggb-dusk-edited.jpg' },
      { url: 'https://static.example-media.org/bridge-filtered.png' },
    ],
    similarImages: specs.map((spec, i) => ({ url: demoSimilarThumb(spec, i) })),
    entities: [
      { name: 'Golden Gate Bridge', score: 0.98 },
      { name: 'Suspension bridge', score: 0.87 },
      { name: 'San Francisco', score: 0.81 },
      { name: 'Landmark', score: 0.76 },
      { name: 'Dusk', score: 0.64 },
      { name: 'Tourism', score: 0.58 },
      { name: 'Fog', score: 0.52 },
      { name: 'International Orange', score: 0.41 },
    ],
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const image: unknown = body?.image;

    if (typeof image !== 'string' || image.length === 0) {
      return NextResponse.json({ error: 'Missing image data' }, { status: 400 });
    }

    const imgbbKey = process.env.IMGBB_API_KEY;
    const lensWorkerUrl = process.env.LENS_WORKER_URL;
    if (!imgbbKey || !lensWorkerUrl) {
      // Environment not configured — serve clearly-flagged demo data.
      return NextResponse.json(demoResult());
    }

    // Strip base64 prefix if present
    const base64 = image.includes(',') ? image.split(',')[1] : image;

    // Step 1: Upload to ImgBB → get a public URL (auto-deletes after 5 minutes)
    const imgbbForm = new URLSearchParams();
    imgbbForm.append('image', base64);
    imgbbForm.append('expiration', '300');

    const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
      method: 'POST',
      body: imgbbForm,
    });

    if (!imgbbRes.ok) {
      throw new Error(`ImgBB upload failed: ${imgbbRes.status}`);
    }

    const imgbbData = await imgbbRes.json();
    const imageUrl: string | undefined = imgbbData?.data?.url;
    if (!imageUrl) {
      throw new Error('ImgBB upload failed: no URL in response');
    }

    // Step 2: Send public URL to the lens-worker (headless Google Lens scraper)
    const lensRes = await fetch(lensWorkerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl }),
    });

    if (!lensRes.ok) {
      throw new Error(`Lens worker failed: ${lensRes.status}`);
    }

    // Step 3: lens-worker already returns the frontend JSON contract — pass it through
    const result = await lensRes.json();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Search failed',
        bestGuess: 'Search failed',
        safeSearch: 'safe',
        sources: [],
        partialMatches: [],
        similarImages: [],
        entities: [],
      },
      { status: 500 }
    );
  }
}
