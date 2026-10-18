/**
 * AssetPreloadManager.ts
 * Administrador singleton de descargas y precargas progresivas de medios (video y audio).
 * - Descarga mediante fetch + Streams reportando progreso exacto en bytes (0-100%).
 * - Transforma los recursos en Blob URLs en memoria para scrubbing instantáneo sin latencia de red.
 * - Cachea recursos para evitar descargas repetidas.
 */

export interface PreloadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export type ProgressCallback = (progress: PreloadProgress) => void;

export class AssetPreloadManager {
  private static instance: AssetPreloadManager | null = null;
  private blobCache: Map<string, string> = new Map();
  private inFlightLoads: Map<string, Promise<string>> = new Map();
  private progressListeners: Map<string, Set<ProgressCallback>> = new Map();

  private constructor() {}

  public static getInstance(): AssetPreloadManager {
    if (!AssetPreloadManager.instance) {
      AssetPreloadManager.instance = new AssetPreloadManager();
    }
    return AssetPreloadManager.instance;
  }

  /**
   * Determina si el entorno actual es móvil o de pantalla táctil
   */
  public isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    const coarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    const smallMQ = window.matchMedia('(max-width: 860px)').matches;
    return coarse || smallMQ;
  }

  /**
   * Obtiene la URL de Blob en memoria si el recurso ya fue precargado
   */
  public getCachedBlobUrl(url: string): string | undefined {
    return this.blobCache.get(url);
  }

  /**
   * Precarga un recurso individual con seguimiento de progreso en bytes
   */
  public async preload(url: string, onProgress?: ProgressCallback): Promise<string> {
    if (!url) return '';

    // Si ya está en caché, notificar 100% de inmediato
    const cached = this.blobCache.get(url);
    if (cached) {
      onProgress?.({ loaded: 100, total: 100, percent: 100 });
      return cached;
    }

    // Si ya se está descargando, registrar el callback y reutilizar la promesa existente
    if (this.inFlightLoads.has(url)) {
      if (onProgress) {
        let listeners = this.progressListeners.get(url);
        if (!listeners) {
          listeners = new Set();
          this.progressListeners.set(url, listeners);
        }
        listeners.add(onProgress);
      }
      return this.inFlightLoads.get(url)!;
    }

    if (onProgress) {
      let listeners = this.progressListeners.get(url);
      if (!listeners) {
        listeners = new Set();
        this.progressListeners.set(url, listeners);
      }
      listeners.add(onProgress);
    }

    const notify = (loaded: number, total: number, percent: number) => {
      const listeners = this.progressListeners.get(url);
      if (listeners) {
        listeners.forEach((cb) => cb({ loaded, total, percent }));
      }
    };

    const downloadPromise = (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Error HTTP ${response.status} al cargar ${url}`);
        }

        const contentLengthHeader = response.headers.get('content-length');
        const total = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;

        if (!response.body || total === 0) {
          // Si no soporta streams o no hay content-length, descargar directamente
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          this.blobCache.set(url, blobUrl);
          notify(total || 100, total || 100, 100);
          return blobUrl;
        }

        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let loaded = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            loaded += value.length;
            const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 50;
            notify(loaded, total, percent);
          }
        }

        const contentType = response.headers.get('content-type') || 'video/mp4';
        const blob = new Blob(chunks as BlobPart[], { type: contentType });
        const blobUrl = URL.createObjectURL(blob);
        this.blobCache.set(url, blobUrl);
        notify(loaded, total, 100);
        return blobUrl;
      } catch (err) {
        console.warn(`[AssetPreloadManager] Fallo de precarga para ${url}, intentando fallback local:`, err);
        if (url.startsWith('http://') || url.startsWith('https://')) {
          try {
            const localPath = new URL(url).pathname;
            const fallbackBlob = await this.preload(localPath, (p) => {
              notify(p.loaded, p.total, p.percent);
            });
            this.blobCache.set(url, fallbackBlob);
            notify(100, 100, 100);
            return fallbackBlob;
          } catch (_fallbackErr) {
            notify(100, 100, 100);
            return url;
          }
        }
        notify(100, 100, 100);
        return url;
      } finally {
        this.inFlightLoads.delete(url);
        this.progressListeners.delete(url);
      }
    })();

    this.inFlightLoads.set(url, downloadPromise);
    return downloadPromise;
  }

  /**
   * Precarga un grupo de recursos y calcula el porcentaje total combinado (0 a 100%)
   */
  public async preloadGroup(urls: string[], onGroupProgress?: (overallPercent: number) => void): Promise<string[]> {
    const validUrls = urls.filter(Boolean);
    if (validUrls.length === 0) {
      onGroupProgress?.(100);
      return [];
    }

    const progressMap = new Map<string, number>();
    validUrls.forEach((u) => progressMap.set(u, this.blobCache.has(u) ? 100 : 0));

    const checkOverall = () => {
      let sum = 0;
      progressMap.forEach((val) => { sum += val; });
      const overall = Math.round(sum / validUrls.length);
      onGroupProgress?.(overall);
    };

    checkOverall();

    const promises = validUrls.map((url) => {
      return this.preload(url, (p) => {
        progressMap.set(url, p.percent);
        checkOverall();
      });
    });

    const results = await Promise.all(promises);
    onGroupProgress?.(100);
    return results;
  }
}
