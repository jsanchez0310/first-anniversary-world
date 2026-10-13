/* ============================================================================
   ScrollWorldEngine.ts
   Motor cinemático de scroll-scrubbing para "Primer Aniversario".
   Basado en la arquitectura de la skill scroll-world:
   - Carga de clips como Blobs en memoria (URL.createObjectURL)
   - Pacing por escena: dwell/linger y remap suave de tiempo
   - Coalescing de búsquedas (seek coalescing) para móviles y deslizamientos rápidos
   - Transiciones de opacidad suaves entre clips
   - Manejo de resize ignorando colapsos de barra URL en móvil
   - Control de scroll container explícito (trackElement)
   ============================================================================ */

export interface ScrollWorldClipItem {
  id: string;
  url: string;
  urlMobile?: string;
  linger?: number;
  scrollWeight?: number;
  start?: number;
  end?: number;
}

export interface WorldSpan {
  worldIndex: number;
  start: number;
  end: number;
}

export interface ScrollWorldOptions {
  container: HTMLElement;
  trackElement?: HTMLElement;
  clips: ScrollWorldClipItem[];
  worldSpans?: WorldSpan[];
  onProgress?: (rawProgress: number, activeClipIndex: number, activeWorldIndex: number, worldProgress: number) => void;
  onWorldChange?: (worldIndex: number) => void;
  onSegmentChange?: (index: number) => void;
}

export class ScrollWorldEngine {
  private container: HTMLElement;
  private trackElement: HTMLElement;
  private clips: ScrollWorldClipItem[];
  private worldSpans: WorldSpan[];
  private videoElements: HTMLVideoElement[] = [];
  private blobUrls: string[] = [];
  private activeIndex: number = -1;
  private currentWorldIndex: number = -1;
  private isMobileView: boolean = false;
  private isSeekingMap: boolean[] = [];
  private rafId: number | null = null;
  private onProgress?: (rawProgress: number, activeClipIndex: number, activeWorldIndex: number, worldProgress: number) => void;
  private onWorldChange?: (worldIndex: number) => void;
  private onSegmentChange?: (index: number) => void;
  private isDestroyed: boolean = false;
  private lastViewportWidth: number = 0;

  constructor(options: ScrollWorldOptions) {
    this.container = options.container;
    this.trackElement = options.trackElement || options.container;
    this.clips = options.clips;
    this.worldSpans = options.worldSpans || [];
    this.onProgress = options.onProgress;
    this.onWorldChange = options.onWorldChange;
    this.onSegmentChange = options.onSegmentChange;

    const coarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    const smallMQ = window.matchMedia('(max-width: 860px)').matches;
    this.isMobileView = coarse || smallMQ;
    this.lastViewportWidth = window.innerWidth;

    this.init();
  }

  private async init() {
    this.setupDOM();
    this.setupListeners();
    this.update();
    // Precarga de Blobs en memoria en background para scrubbing ultra-fluido
    this.loadClipsAsBlobs().then(() => {
      if (!this.isDestroyed) {
        this.update();
      }
    });
  }

  private setupDOM() {
    this.container.innerHTML = '';

    const stage = document.createElement('div');
    stage.className = 'sw-stage absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0';
    stage.style.backgroundColor = 'transparent';

    this.clips.forEach((clipItem, idx) => {
      const video = document.createElement('video');
      video.className = `sw-video-segment absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ease-out ${
        idx === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0'
      }`;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('aria-hidden', 'true');

      // Asignar URL de destino inmediatamente para permitir streaming y metadatos sin demora
      const targetUrl = (this.isMobileView && clipItem.urlMobile) ? clipItem.urlMobile : clipItem.url;
      video.src = targetUrl;
      video.load();

      // Coalescing de búsqueda por video
      this.isSeekingMap[idx] = false;
      video.addEventListener('seeking', () => {
        this.isSeekingMap[idx] = true;
      });
      video.addEventListener('seeked', () => {
        this.isSeekingMap[idx] = false;
      });

      stage.appendChild(video);
      this.videoElements.push(video);
    });

    this.container.appendChild(stage);
  }

  private async loadClipsAsBlobs() {
    const loadPromises = this.clips.map(async (clipItem, idx) => {
      const targetUrl = (this.isMobileView && clipItem.urlMobile) ? clipItem.urlMobile : clipItem.url;
      const video = this.videoElements[idx];

      try {
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (this.isDestroyed) return;
        const blobUrl = URL.createObjectURL(blob);
        this.blobUrls.push(blobUrl);

        if (video) {
          const currentTime = video.currentTime;
          video.src = blobUrl;
          if (!Number.isNaN(currentTime) && currentTime > 0) {
            video.currentTime = currentTime;
          }
        }
      } catch (_e) {
        // En caso de fallo o conexión lenta, el video ya usa targetUrl asignado en setupDOM
      }
    });

    await Promise.allSettled(loadPromises);
  }

  private setupListeners() {
    const handleScroll = () => {
      if (this.rafId) return;
      this.rafId = requestAnimationFrame(() => {
        this.update();
        this.rafId = null;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    window.addEventListener('resize', () => {
      const currentWidth = window.innerWidth;
      if (currentWidth !== this.lastViewportWidth) {
        this.lastViewportWidth = currentWidth;
        const coarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
        const smallMQ = window.matchMedia('(max-width: 860px)').matches;
        this.isMobileView = coarse || smallMQ;
        this.update();
      }
    }, { passive: true });

    // Desbloqueo inicial Safari iOS
    const primeVideos = () => {
      this.videoElements.forEach(v => {
        try {
          const p = v.play();
          if (p !== undefined) {
            p.then(() => v.pause()).catch(() => {});
          }
        } catch (_err) {}
      });
      window.removeEventListener('touchstart', primeVideos);
      window.removeEventListener('click', primeVideos);
    };
    window.addEventListener('touchstart', primeVideos, { once: true, passive: true });
    window.addEventListener('click', primeVideos, { once: true, passive: true });
  }

  private lingerEase(x: number, L: number = 0.45): number {
    const clamped = Math.min(1, Math.max(0, x));
    const LClamped = Math.min(0.6, Math.max(0, L));
    const c = clamped - 0.5;
    return (1 - LClamped) * clamped + LClamped * (4 * c * c * c + 0.5);
  }

  public update() {
    if (this.isDestroyed || this.videoElements.length === 0) return;

    // Medición exacta respecto a trackElement
    const rect = this.trackElement.getBoundingClientRect();
    const containerTop = -rect.top;
    const maxScroll = rect.height - window.innerHeight;
    if (maxScroll <= 0) return;

    // Normalizado de 0 a 1 dentro de toda la pista de scrollytelling
    const rawProgress = Math.min(1, Math.max(0, containerTop / maxScroll));

    // 1. Determinar el mundo activo y el progreso dentro del mundo
    let activeWorldIndex = 0;
    let worldProgress = 0;
    if (this.worldSpans.length > 0) {
      for (let i = 0; i < this.worldSpans.length; i++) {
        const span = this.worldSpans[i];
        if (rawProgress >= span.start && (rawProgress < span.end || i === this.worldSpans.length - 1)) {
          activeWorldIndex = span.worldIndex;
          const spanRange = span.end - span.start;
          worldProgress = spanRange > 0 ? Math.min(1, Math.max(0, (rawProgress - span.start) / spanRange)) : 0;
          break;
        }
      }
    }

    if (activeWorldIndex !== this.currentWorldIndex) {
      this.currentWorldIndex = activeWorldIndex;
      this.onWorldChange?.(activeWorldIndex);
    }

    // 2. Determinar el clip activo y su progreso de scrubbing
    const totalClips = this.clips.length;
    let activeClipIndex = 0;
    let clipLocalProgress = 0;

    if (totalClips > 0) {
      const hasCustomRanges = this.clips.some((c) => c.start !== undefined && c.end !== undefined);

      if (hasCustomRanges) {
        let found = false;
        for (let i = 0; i < totalClips; i++) {
          const c = this.clips[i];
          const cStart = c.start ?? 0;
          const cEnd = c.end ?? 1;
          if (rawProgress >= cStart && rawProgress < cEnd) {
            activeClipIndex = i;
            clipLocalProgress = (cEnd > cStart) ? Math.min(1, Math.max(0, (rawProgress - cStart) / (cEnd - cStart))) : 0;
            found = true;
            break;
          }
        }
        if (!found) {
          if (rawProgress >= (this.clips[totalClips - 1].end ?? 1)) {
            activeClipIndex = totalClips - 1;
            clipLocalProgress = 1;
          } else {
            // Si cae en un tramo entre clips o previo a uno nuevo, seleccionar el clip anterior más cercano
            let prevIndex = 0;
            for (let i = totalClips - 1; i >= 0; i--) {
              if (rawProgress >= (this.clips[i].start ?? 0)) {
                prevIndex = i;
                break;
              }
            }
            activeClipIndex = prevIndex;
            clipLocalProgress = 1;
          }
        }
      } else {
        const progressPerClip = 1 / totalClips;
        activeClipIndex = Math.min(
          totalClips - 1,
          Math.floor(rawProgress / progressPerClip)
        );
        const clipStartProgress = activeClipIndex * progressPerClip;
        clipLocalProgress = Math.min(1, Math.max(0, (rawProgress - clipStartProgress) / progressPerClip));
      }

      if (activeClipIndex !== this.activeIndex) {
        this.activeIndex = activeClipIndex;
        this.onSegmentChange?.(activeClipIndex);

        this.videoElements.forEach((vid, idx) => {
          if (idx === activeClipIndex) {
            vid.style.opacity = '1';
            vid.style.zIndex = '10';
          } else {
            vid.style.opacity = '0';
            vid.style.zIndex = '0';
          }
        });
      }

      // Curva de desaceleración (dwell/linger)
      const clipConfig = this.clips[activeClipIndex];
      const easedProgress = this.lingerEase(clipLocalProgress, clipConfig?.linger ?? 0.45);

      const activeVideo = this.videoElements[activeClipIndex];
      if (activeVideo && activeVideo.duration && !Number.isNaN(activeVideo.duration)) {
        if (!this.isSeekingMap[activeClipIndex]) {
          const targetTime = easedProgress * activeVideo.duration;
          if (Math.abs(activeVideo.currentTime - targetTime) > 0.03) {
            activeVideo.currentTime = targetTime;
          }
        }
      }
    }

    this.onProgress?.(rawProgress, activeClipIndex, activeWorldIndex, worldProgress);
  }

  public reset() {
    this.activeIndex = -1;
    this.currentWorldIndex = -1;
    this.videoElements.forEach((vid, idx) => {
      vid.style.opacity = idx === 0 ? '1' : '0';
      vid.style.zIndex = idx === 0 ? '10' : '0';
      if (!Number.isNaN(vid.duration)) {
        vid.currentTime = 0;
      }
    });
    this.update();
  }

  public setTrackElement(el: HTMLElement) {
    this.trackElement = el;
    this.update();
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.blobUrls.forEach((url) => URL.revokeObjectURL(url));
  }
}
