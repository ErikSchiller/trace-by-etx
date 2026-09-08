// Image processing for trade screenshots.
// Downscales to a max width and re-encodes as JPEG to keep localStorage small,
// since screenshots are persisted inline as dataURLs in the trade store.

const MAX_WIDTH = 1920;
const JPEG_QUALITY = 0.85;
const HARD_LIMIT = 10 * 1024 * 1024; // reject source files above 10MB

/** Rough byte size of a dataURL string (base64 → ~3/4 of the char length). */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

/**
 * Read an image File, downscale to MAX_WIDTH, and return a compressed JPEG dataURL.
 * Rejects non-images and files above the hard limit.
 */
export function processImageForUpload(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo no es una imagen'));
      return;
    }
    if (file.size > HARD_LIMIT) {
      reject(new Error('Imagen demasiado grande (máx 10MB)'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height = Math.round((MAX_WIDTH / width) * height);
            width = MAX_WIDTH;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Error al procesar imagen')); return; }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
        } catch {
          reject(new Error('Error al procesar imagen'));
        }
      };
      img.onerror = () => reject(new Error('Error al procesar imagen'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Error al leer archivo'));
    reader.readAsDataURL(file);
  });
}
