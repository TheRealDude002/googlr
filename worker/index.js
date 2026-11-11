export default {
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
      const imageUrl = imgbbData.data.url;

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
      const organic = dogData.organic_results || [];
      const visual = dogData.visual_matches || [];
      const kg = dogData.knowledge_graph || {};

      // Best guess: knowledge graph title → first organic title → first visual title → fallback
      const bestGuess =
        kg.title ||
        organic[0]?.title ||
        visual[0]?.title ||
        'No match found';

      // Sources: organic results (pages where image appears)
      const sources = organic.slice(0, 5).map(r => ({
        url: r.link,
        label: r.source || new URL(r.link).hostname,
      }));

      // Similar images: visual matches thumbnail strip
      const similarImages = visual.slice(0, 10).map(v => ({
        url: v.thumbnail,
        sourceUrl: v.link,
        title: v.title,
      }));

      // Entities: deduplicated titles from organic + visual as tag cloud
      const seen = new Set();
      const entities = [...organic, ...visual]
        .map(r => r.title)
        .filter(t => t && !seen.has(t) && seen.add(t))
        .slice(0, 8)
        .map(name => ({ name, score: null }));

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
