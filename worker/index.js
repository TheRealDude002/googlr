// ============================================================
// Googlr — Cloudflare Worker
// Card-free reverse image search pipeline:
//   1. ImgBB       — hosts the image (auto-deletes after 5 min)
//                    and returns a public URL
//   2. Scrapingdog — runs Google Lens reverse image search on it
//   3. This worker — shapes the Lens response into the same JSON
//      contract as the Next.js /api/search route.
//
// Receives { image: "<base64>", mimeType: "image/jpeg" }.
// Never writes to disk, never leaks the keys.
//
// Deploy:
//   wrangler secret put IMGBB_API_KEY
//   wrangler secret put SCRAPINGDOG_API_KEY
//   wrangler deploy
// ============================================================

const worker = {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { image } = await request.json();

      // Strip base64 prefix if present
      const base64 = image.includes(',') ? image.split(',')[1] : image;

      // Step 1: Upload to ImgBB
      const imgbbForm = new URLSearchParams();
      imgbbForm.append('image', base64);
      imgbbForm.append('expiration', '300');

      const imgbbRes = await fetch(
        `https://api.imgbb.com/1/upload?key=${env.IMGBB_API_KEY}`,
        { method: 'POST', body: imgbbForm }
      );

      if (!imgbbRes.ok) {
        throw new Error(`ImgBB upload failed: ${imgbbRes.status}`);
      }

      const imgbbData = await imgbbRes.json();
      const imageUrl = imgbbData?.data?.url;
      if (!imageUrl) {
        throw new Error('ImgBB upload failed: no URL in response');
      }

      // Step 2: Send to Scrapingdog Google Lens
      const params = new URLSearchParams({
        api_key: env.SCRAPINGDOG_API_KEY,
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

      const dogData = await dogRes.json();

      // Step 3: Shape response to match what the frontend expects
      // (kept in lockstep with src/app/api/search/route.ts)
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
      const sources = [];
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
      const similarImages = visual.slice(0, 10).map(v => ({
        url: v.thumbnail,
        sourceUrl: v.link,
        title: v.title,
      }));

      // Entities: deduplicated titles from organic + visual as tag cloud
      const seen = new Set();
      const entities = [];
      for (const r of [...organic, ...visual]) {
        if (!r.title || seen.has(r.title)) continue;
        seen.add(r.title);
        entities.push({ name: r.title, score: null });
        if (entities.length >= 8) break;
      }

      return new Response(JSON.stringify({
        bestGuess,
        safeSearch: 'safe',      // Scrapingdog doesn't flag; default safe
        sources,
        partialMatches: [],
        similarImages,
        entities,
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });

    } catch (err) {
      return new Response(JSON.stringify({
        error: err.message,
        bestGuess: 'Search failed',
        safeSearch: 'safe',
        sources: [],
        partialMatches: [],
        similarImages: [],
        entities: [],
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
  }
};

export default worker;
