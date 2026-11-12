import { compressImage } from './compress';
import type { SearchResult } from './types';

export interface SearchOutcome {
  result: SearchResult;
  /** compressed JPEG data URL actually sent to the API */
  imageDataUrl: string;
}

/**
 * Reverse image search.
 * 1. Compress to <= 1MB JPEG in the browser (canvas).
 * 2. POST base64 to the search endpoint:
 *    - same-origin Next.js API route (/api/search) by default, or
 *    - a Cloudflare Worker when NEXT_PUBLIC_WORKER_URL is set at build time.
 * The ImgBB and Scrapingdog API keys live server-side only — the browser never sees them.
 */
export async function searchImage(file: File): Promise<SearchOutcome> {
  const imageDataUrl = await compressImage(file, 1024 * 1024);
  const base64 = imageDataUrl.split(',')[1];

  const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
  const endpoint = workerUrl || '/api/search';

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64, mimeType: 'image/jpeg' }),
  });

  if (!res.ok) {
    let message = `Search failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  const result: SearchResult = await res.json();
  return { result, imageDataUrl };
}
