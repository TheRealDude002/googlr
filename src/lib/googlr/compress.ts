/**
 * Client-side image preprocessing.
 * Everything is compressed in-browser via canvas — nothing is stored server-side.
 */

/** Compress an image File to a JPEG data URL under maxBytes (default 1MB). */
export function compressImage(file: File, maxBytes = 1024 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const { width, height } = img;

      // Start with a sane max dimension, then loop down on quality if needed.
      const MAX_DIM = 1600;
      const scale = Math.min(1, MAX_DIM / Math.max(width, height));
      canvas.width = Math.max(1, Math.floor(width * scale));
      canvas.height = Math.max(1, Math.floor(height * scale));

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Canvas is not supported in this browser'));
        return;
      }

      // Flatten transparency onto white so PNG -> JPEG doesn't turn black.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);

      let quality = 0.85;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);

      // Approximate binary size: base64 is ~4/3 of raw bytes.
      while (dataUrl.length * 0.75 > maxBytes && quality > 0.4) {
        quality -= 0.15;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }

      // Last resort: shrink dimensions.
      if (dataUrl.length * 0.75 > maxBytes) {
        const w = Math.floor(canvas.width * 0.7);
        const h = Math.floor(canvas.height * 0.7);
        const small = document.createElement('canvas');
        small.width = w;
        small.height = h;
        const sctx = small.getContext('2d');
        if (sctx) {
          sctx.fillStyle = '#ffffff';
          sctx.fillRect(0, 0, w, h);
          sctx.drawImage(canvas, 0, 0, w, h);
          dataUrl = small.toDataURL('image/jpeg', 0.7);
        }
      }

      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read that image file'));
    };

    img.src = objectUrl;
  });
}

/** Make a small square (cover-cropped) thumbnail data URL for history storage. */
export function makeThumb(source: string, size = 100): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas is not supported in this browser'));
        return;
      }
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => reject(new Error('Could not build thumbnail'));
    img.src = source;
  });
}
