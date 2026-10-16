/**
 * PerfMonitor.ts
 * Monitor de rendimiento y telemetría de scrollytelling en tiempo real.
 * Permite auditar y verificar:
 * 1. droppedVideoFrames (API getVideoPlaybackQuality)
 * 2. Latencia de seek (tiempo entre scroll y fotograma pintado)
 * 3. FPS del motor
 * Se activa visualmente si la URL contiene `?debug=perf` y expone `window.__PERF_METRICS__`.
 */

export interface PerfMetrics {
  fps: number;
  seekLatencyMs: number;
  droppedFrames: number;
  totalFrames: number;
  activeVideoSrc: string;
}

declare global {
  interface Window {
    __PERF_METRICS__?: PerfMetrics;
  }
}

export class PerfMonitor {
  private static instance: PerfMonitor | null = null;
  private hudElement: HTMLElement | null = null;
  private isEnabled: boolean = false;
  private lastSeekStart: number = 0;
  private seekLatencyMs: number = 0;
  private activeVideo: HTMLVideoElement | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      this.isEnabled = urlParams.has('debug') && urlParams.get('debug') === 'perf';
      if (this.isEnabled) {
        this.createHUD();
      }
      this.startMetricsLoop();
    }
  }

  public static getInstance(): PerfMonitor {
    if (!PerfMonitor.instance) {
      PerfMonitor.instance = new PerfMonitor();
    }
    return PerfMonitor.instance;
  }

  public trackActiveVideo(video: HTMLVideoElement) {
    if (this.activeVideo === video) return;
    this.activeVideo = video;

    video.addEventListener('seeking', () => {
      this.lastSeekStart = performance.now();
    }, { passive: true });

    video.addEventListener('seeked', () => {
      if (this.lastSeekStart > 0) {
        this.seekLatencyMs = Math.round((performance.now() - this.lastSeekStart) * 10) / 10;
        this.lastSeekStart = 0;
      }
    }, { passive: true });
  }

  public recordSeekStart() {
    this.lastSeekStart = performance.now();
  }

  private createHUD() {
    this.hudElement = document.createElement('div');
    this.hudElement.id = 'perf-hud';
    this.hudElement.className =
      'fixed bottom-4 left-4 z-50 p-3 rounded-xl bg-black/85 border border-[#d4af37]/60 text-xs font-mono text-zinc-200 backdrop-blur-md shadow-2xl pointer-events-none select-none flex flex-col gap-1';
    document.body.appendChild(this.hudElement);
  }

  private startMetricsLoop() {
    let frameCount = 0;
    let lastTime = performance.now();
    let currentFps = 60;

    const loop = (now: number) => {
      frameCount++;
      const elapsed = now - lastTime;
      if (elapsed >= 500) {
        currentFps = Math.round((frameCount * 1000) / elapsed);
        frameCount = 0;
        lastTime = now;
      }

      let dropped = 0;
      let total = 0;
      if (this.activeVideo && 'getVideoPlaybackQuality' in this.activeVideo) {
        const q = (this.activeVideo as any).getVideoPlaybackQuality();
        if (q) {
          dropped = q.droppedVideoFrames || 0;
          total = q.totalVideoFrames || 0;
        }
      }

      const metrics: PerfMetrics = {
        fps: currentFps,
        seekLatencyMs: this.seekLatencyMs,
        droppedFrames: dropped,
        totalFrames: total,
        activeVideoSrc: this.activeVideo?.currentSrc || this.activeVideo?.src || '',
      };

      if (typeof window !== 'undefined') {
        window.__PERF_METRICS__ = metrics;
      }

      if (this.hudElement) {
        this.hudElement.innerHTML = `
          <div class="flex items-center gap-2 border-b border-zinc-700 pb-1 mb-1 font-semibold text-amber-300">
            <span class="w-2 h-2 rounded-full ${dropped === 0 ? 'bg-emerald-400' : 'bg-red-500'}"></span>
            Scrollytelling Perf HUD
          </div>
          <div class="flex justify-between gap-4"><span>FPS:</span><span class="${currentFps >= 55 ? 'text-emerald-400' : 'text-amber-400'}">${currentFps} fps</span></div>
          <div class="flex justify-between gap-4"><span>Seek Latency:</span><span class="${this.seekLatencyMs <= 16 ? 'text-emerald-400' : 'text-red-400'}">${this.seekLatencyMs} ms</span></div>
          <div class="flex justify-between gap-4"><span>Dropped Frames:</span><span class="${dropped === 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}">${dropped}</span></div>
          <div class="flex justify-between gap-4 text-[10px] text-zinc-400 truncate max-w-[200px]"><span>Source:</span><span class="truncate">${metrics.activeVideoSrc.split('/').pop()}</span></div>
        `;
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}
