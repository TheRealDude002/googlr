import puppeteer from "@cloudflare/puppeteer";

const MOCK_RESULT = {
  bestGuess: "Golden Gate Bridge at Dusk",
  safeSearch: "safe",
  sources: [
    { url: "https://en.wikipedia.org/wiki/Golden_Gate_Bridge", label: "wikipedia.org" },
    { url: "https://www.sfgate.com/golden-gate", label: "sfgate.com" },
    { url: "https://www.flickr.com/photos/goldengate", label: "flickr.com" },
  ],
  partialMatches: [],
  similarImages: [
    { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/GoldenGateBridge-001.jpg/320px-GoldenGateBridge-001.jpg" },
    { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/New_york_times_square-terabass.jpg/320px-New_york_times_square-terabass.jpg" },
    { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Empire_State_Building_%28aerial_view%29.jpg/320px-Empire_State_Building_%28aerial_view%29.jpg" },
  ],
  entities: [
    { name: "Golden Gate Bridge", score: null },
    { name: "San Francisco", score: null },
    { name: "Suspension Bridge", score: null },
    { name: "California", score: null },
    { name: "Landmark", score: null },
    { name: "Sunset", score: null },
  ],
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // MOCK MODE — return fake data immediately, no browser needed
    if (env.USE_MOCK === "true") {
      console.log("[lens-worker] Running in MOCK mode");
      return new Response(JSON.stringify(MOCK_RESULT), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "X-Googlr-Mode": "mock",
        },
      });
    }

    // LIVE MODE — real Puppeteer + Browser Rendering
    let browser;
    try {
      const { imageUrl } = await request.json();
      if (!imageUrl) {
        return new Response(JSON.stringify({ error: "imageUrl required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`;
      console.log("[lens-worker] Scraping:", lensUrl);

      browser = await puppeteer.launch(env.BROWSER);
      const page = await browser.newPage();

      // Spoof a mobile browser to avoid bot detection and get a cleaner DOM
      await page.setUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      );

      await page.goto(lensUrl, {
        waitUntil: "networkidle2",
        timeout: 25000,
      });

      // Wait for result elements — non-fatal if they don't appear
      await page.waitForSelector(
        'div[data-action-url], h3, [data-thumbnail-url]',
        { timeout: 10000 }
      ).catch(() => null);

      const results = await page.evaluate(() => {
        const data = {
          bestGuess: null,
          sources: [],
          similarImages: [],
          entities: [],
        };

        // Best guess — top heading Google Lens renders above results
        const heading = document.querySelector('h3, [role="heading"]');
        if (heading) data.bestGuess = heading.innerText.trim();

        // Fallback: strip " - Google Lens" from page title
        if (!data.bestGuess) {
          const title = document.title.replace(" - Google Lens", "").trim();
          if (title && title !== "Google Lens") data.bestGuess = title;
        }

        // Source links
        const cards = document.querySelectorAll(
          'a[href*="http"][data-action-url], a[jsname][href*="http"]'
        );
        cards.forEach((card) => {
          const href = card.href;
          const label = card.querySelector("div, span")?.innerText?.trim();
          if (
            href &&
            !href.includes("lens.google.com") &&
            !href.includes("google.com/search")
          ) {
            data.sources.push({ url: href, label: label || new URL(href).hostname });
          }
        });
        const seenSources = new Set();
        data.sources = data.sources
          .filter((s) => {
            if (seenSources.has(s.url)) return false;
            seenSources.add(s.url);
            return true;
          })
          .slice(0, 5);

        // Similar image thumbnails
        const thumbs = document.querySelectorAll(
          'img[data-thumbnail-url], img[src*="encrypted-tbn"]'
        );
        thumbs.forEach((img) => {
          const src = img.dataset?.thumbnailUrl || img.src;
          if (src && src.startsWith("http") && !src.includes("google.com/images/branding")) {
            data.similarImages.push({ url: src });
          }
        });
        data.similarImages = data.similarImages.slice(0, 10);

        // Entity chips
        const chips = document.querySelectorAll(
          '[role="listitem"] span, .HDvAN span, [data-query] span'
        );
        chips.forEach((chip) => {
          const text = chip.innerText?.trim();
          if (text && text.length > 2 && text.length < 60) {
            data.entities.push({ name: text, score: null });
          }
        });
        data.entities = data.entities.slice(0, 8);

        return data;
      });

      return new Response(
        JSON.stringify({
          bestGuess: results.bestGuess || "No match found",
          safeSearch: "safe",
          sources: results.sources,
          partialMatches: [],
          similarImages: results.similarImages,
          entities: results.entities,
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "X-Googlr-Mode": "live",
          },
        }
      );
    } catch (err) {
      console.error("[lens-worker] Error:", err.message);
      return new Response(
        JSON.stringify({
          error: err.message,
          bestGuess: "Search failed",
          safeSearch: "safe",
          sources: [],
          partialMatches: [],
          similarImages: [],
          entities: [],
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    } finally {
      if (browser) await browser.close();
    }
  },
};
