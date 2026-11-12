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

    try {
      const { image } = await request.json();

      // Strip base64 data URI prefix if present
      const base64 = image.includes(",") ? image.split(",")[1] : image;

      // Step 1: Upload to ImgBB → get a public URL
      const imgbbForm = new URLSearchParams();
      imgbbForm.append("image", base64);
      imgbbForm.append("expiration", "300");

      const imgbbRes = await fetch(
        `https://api.imgbb.com/1/upload?key=${env.IMGBB_API_KEY}`,
        { method: "POST", body: imgbbForm }
      );

      if (!imgbbRes.ok) {
        throw new Error(`ImgBB upload failed: ${imgbbRes.status}`);
      }

      const imgbbData = await imgbbRes.json();
      const imageUrl = imgbbData.data.url;
      console.log("[proxy-worker] Image uploaded to ImgBB:", imageUrl);

      // Step 2: Send public URL to lens-worker
      const lensRes = await fetch(env.LENS_WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });

      if (!lensRes.ok) {
        throw new Error(`Lens worker failed: ${lensRes.status}`);
      }

      const result = await lensRes.json();
      console.log("[proxy-worker] Got result, mode:", lensRes.headers.get("X-Googlr-Mode"));

      return new Response(JSON.stringify(result), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (err) {
      console.error("[proxy-worker] Error:", err.message);
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
    }
  },
};
