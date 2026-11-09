// ============================================================
// Googlr — Cloudflare Worker
// Server-side proxy for the Google Cloud Vision API.
// Receives { image: "<base64>", mimeType: "image/jpeg" },
// calls Vision WEB_DETECTION + SAFE_SEARCH_DETECTION,
// returns structured JSON. Never writes to disk, never leaks the key.
//
// Deploy:
//   wrangler secret put GOOGLE_VISION_API_KEY
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

    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const { image, mimeType } = await request.json();

    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${env.GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: image },
            features: [
              { type: 'WEB_DETECTION', maxResults: 20 },
              { type: 'SAFE_SEARCH_DETECTION' }
            ]
          }]
        })
      }
    );

    const data = await visionRes.json();
    const annotation = data.responses[0];
    const web = annotation.webDetection || {};
    const safe = annotation.safeSearchAnnotation || {};

    const isFlagged = ['LIKELY', 'VERY_LIKELY'].includes(safe.adult) ||
                      ['LIKELY', 'VERY_LIKELY'].includes(safe.violence);

    return new Response(JSON.stringify({
      bestGuess: web.bestGuessLabels?.[0]?.label || 'Unknown',
      safeSearch: isFlagged ? 'flagged' : 'safe',
      sources: (web.fullMatchingImages || []).slice(0, 5).map(i => ({ url: i.url })),
      partialMatches: (web.partialMatchingImages || []).slice(0, 3).map(i => ({ url: i.url })),
      similarImages: (web.visuallySimilarImages || []).slice(0, 10).map(i => ({ url: i.url })),
      entities: (web.webEntities || []).slice(0, 8).map(e => ({
        name: e.description,
        score: e.score
      }))
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

export default worker;
