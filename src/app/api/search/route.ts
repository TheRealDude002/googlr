import { NextResponse } from 'next/server';

/**
 * Googlr reverse image search endpoint.
 *
 * Accepts  POST { image: "<base64>", mimeType: "image/jpeg" }
 * Returns  { bestGuess, safeSearch, sources, partialMatches, similarImages, entities }
 *
 * Card-free pipeline (identical to the Cloudflare Worker in worker/index.js):
 *   1. ImgBB       — hosts the image (auto-deletes after 5 minutes) and
 *                    returns a public URL
 *   2. Scrapingdog — runs Google Lens reverse image search on that URL
 *   3. This route  — shapes the Lens response into the JSON contract the
 *                    frontend already expects
 *
 * Both API keys live server-side only — the browser never sees them.
 * When either key is missing the route returns clearly-flagged demo data so
 * the full UI flow stays usable (e.g. in sandbox previews / before keys are
 * configured).
 */

interface LensOrganicResult {
  title?: string;
  link?: string;
  source?: string;
  thumbnail?: string;
}

interface LensVisualMatch {
  title?: string;
  link?: string;
  thumbnail?: string;
}

interface LensKnowledgeGraph {
  title?: string;
  description?: string;
}

interface LensResponse {
  organic_results?: LensOrganicResult[];
  visual_matches?: LensVisualMatch[];
  knowledge_graph?: LensKnowledgeGraph;
}

interface SourceDto {
  url: string;
  label?: string;
}

interface SimilarImageDto {
  url: string;
  sourceUrl?: string;
  title?: string;
}

interface ShapedResult {
  bestGuess: string;
  safeSearch: 'safe' | 'flagged';
  sources: SourceDto[];
  partialMatches: SourceDto[];
  similarImages: SimilarImageDto[];
  entities: { name: string; score: number | null }[];
}

/**
 * Shapes a Scrapingdog Google Lens payload into the frontend contract.
 * Kept in lockstep with worker/index.js — the two backends must stay
 * byte-compatible in what they return.
 */
function shapeLensResponse(dogData: LensResponse): ShapedResult {
  const organic = dogData.organic_results || [];
  const visual = dogData.visual_matches || [];
  const kg = dogData.knowledge_graph || {};

  // Best guess: knowledge graph title → first organic title → first visual title → fallback
  const bestGuess =
    kg.title ||
    organic[0]?.title ||
    visual[0]?.title ||
    'No match found';

  // Sources: organic results (pages where the image appears).
  // Rows without a link are skipped rather than failing the whole search;
  // collection continues until 5 valid rows are found.
  const sources: SourceDto[] = [];
  for (const r of organic) {
    if (sources.length >= 5) break;
    if (!r.link) continue;
    let label = r.source;
    if (!label) {
      try {
        label = new URL(r.link).hostname;
      } catch {
        label = r.link;
      }
    }
    sources.push({ url: r.link, label });
  }

  // Similar images: visual matches thumbnail strip
  const similarImages: SimilarImageDto[] = visual.slice(0, 10).map((v) => ({
    url: v.thumbnail,
    sourceUrl: v.link,
    title: v.title,
  }));

  // Entities: deduplicated titles from organic + visual as tag cloud
  const seen = new Set<string>();
  const entities: ShapedResult['entities'] = [];
  for (const r of [...organic, ...visual]) {
    if (!r.title || seen.has(r.title)) continue;
    seen.add(r.title);
    entities.push({ name: r.title, score: null });
    if (entities.length >= 8) break;
  }

  return {
    bestGuess,
    safeSearch: 'safe', // Scrapingdog doesn't flag; default safe
    sources,
    partialMatches: [],
    similarImages,
    entities,
  };
}

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
    const mimeType: string = typeof body?.mimeType === 'string' ? body.mimeType : 'image/jpeg';

    if (typeof image !== 'string' || image.length === 0) {
      return NextResponse.json({ error: 'Missing image data' }, { status: 400 });
    }

    const imgbbKey = process.env.IMGBB_API_KEY;
    const dogKey = process.env.SCRAPINGDOG_API_KEY;
    if (!imgbbKey || !dogKey) {
      // Keys not configured — serve clearly-flagged demo data.
      return NextResponse.json(demoResult());
    }

    // Strip base64 prefix if present
    const base64 = image.includes(',') ? image.split(',')[1] : image;

    // Step 1: Upload to ImgBB
    const imgbbForm = new URLSearchParams();
    imgbbForm.append('image', base64);
    imgbbForm.append('expiration', '300');

    const imgbbRes = await fetch(
      `https://api.imgbb.com/1/upload?key=${imgbbKey}`,
      { method: 'POST', body: imgbbForm }
    );

    if (!imgbbRes.ok) {
      throw new Error(`ImgBB upload failed: ${imgbbRes.status}`);
    }

    const imgbbData = await imgbbRes.json();
    const imageUrl: string | undefined = imgbbData?.data?.url;
    if (!imageUrl) {
      throw new Error('ImgBB upload failed: no URL in response');
    }

    // Step 2: Send to Scrapingdog Google Lens
    const params = new URLSearchParams({
      api_key: dogKey,
      url: imageUrl,
      visual_matches: 'true',
      country: 'us',
    });

    const dogRes = await fetch(
      `https://api.scrapingdog.com/google_lens?${params.toString()}`
    );

    if (!dogRes.ok) {
      throw new Error(`Scrapingdog failed: ${dogRes.status}`);
    }

    const dogData: LensResponse = await dogRes.json();

    // Step 3: Shape response to match what the frontend expects
    return NextResponse.json(shapeLensResponse(dogData));
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
