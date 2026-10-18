/**
 * cdn.ts
 * Utilidad para resolver URLs de recursos multimedia (videos y audios).
 * - Si se define `PUBLIC_CDN_URL` (por ejemplo Vercel Blob o CDN externa),
 *   antepone esa URL base.
 * - Si no está definida, sirve directamente desde la carpeta local `/public`.
 */

export function getCdnBaseUrl(): string {
  const envUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_CDN_URL) ||
    (typeof process !== 'undefined' && process.env?.PUBLIC_CDN_URL) ||
    '';
  return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
}

/**
 * Resuelve la URL absoluta o relativa de un archivo estático.
 * Ejemplo: resolveMediaUrl('/desktop/world_1.mp4') ->
 *   - Local: '/desktop/world_1.mp4'
 *   - Vercel Blob: 'https://xxx.public.blob.vercel-storage.com/desktop/world_1.mp4'
 */
export function resolveMediaUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
    console.info(`Media URL resolved from ${path}`, path);
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const base = getCdnBaseUrl();

  const url = base ? `${base}${cleanPath}` : cleanPath;

  console.info(`Media URL resolved from ${path}`, url);
  return url
}
