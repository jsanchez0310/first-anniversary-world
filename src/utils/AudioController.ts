/**
 * AudioController
 * Maneja la reproducción de música ambiental de fondo con transiciones (crossfade)
 * limpias y exclusivas entre pistas por Acto o Mundo, garantizando que NUNCA
 * se superpongan múltiples pistas de audio.
 */
declare global {
  interface Window {
    __audioControllerInstance?: AudioController;
  }
}

export class AudioController {
  private static instance: AudioController | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private currentTrackUrl: string | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.75;
  private isUnlocked: boolean = false;
  private fadeInterval: number | null = null;
  private listeners: Set<(state: { isMuted: boolean; isPlaying: boolean; track: string | null }) => void> = new Set();
  private registeredVideos: Set<HTMLVideoElement> = new Set();
  private activeAudios: Set<HTMLAudioElement> = new Set();
  private pendingTrackUrl: string | null = null;

  private constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.activeAudios.forEach((a) => {
            if (!a.paused) a.volume = 0;
          });
          this.registeredVideos.forEach((v) => { v.muted = true; });
        } else {
          if (!this.isMuted) {
            if (this.currentAudio && !this.currentAudio.paused) {
              this.currentAudio.volume = this.volume;
            }
          }
          this.registeredVideos.forEach((v) => { v.muted = this.isMuted; });
        }
      });
    }
  }

  public static getInstance(): AudioController {
    if (typeof window !== 'undefined') {
      if (!window.__audioControllerInstance) {
        window.__audioControllerInstance = new AudioController();
      }
      return window.__audioControllerInstance;
    }
    if (!AudioController.instance) {
      AudioController.instance = new AudioController();
    }
    return AudioController.instance;
  }

  public registerVideo(video: HTMLVideoElement) {
    this.registeredVideos.add(video);
    video.muted = this.isMuted;
  }

  public unregisterVideo(video: HTMLVideoElement) {
    this.registeredVideos.delete(video);
  }

  public subscribe(cb: (state: { isMuted: boolean; isPlaying: boolean; track: string | null }) => void) {
    this.listeners.add(cb);
    this.notify();
    return () => this.listeners.delete(cb);
  }

  private notify() {
    const isPlaying = !this.isMuted && this.currentAudio !== null && !this.currentAudio.paused;
    for (const cb of this.listeners) {
      cb({ isMuted: this.isMuted, isPlaying, track: this.currentTrackUrl });
    }
  }

  public unlock() {
    this.isUnlocked = true;
    this.registeredVideos.forEach((v) => {
      v.muted = this.isMuted;
    });
    if (this.pendingTrackUrl && !this.currentAudio) {
      const pending = this.pendingTrackUrl;
      this.pendingTrackUrl = null;
      this.playTrack(pending);
    }
  }

  // Detener y limpiar por completo un elemento de audio
  private stopAndCleanAudio(audioEl: HTMLAudioElement | null) {
    if (!audioEl) return;
    try {
      audioEl.pause();
      audioEl.volume = 0;
      audioEl.removeAttribute('src');
      audioEl.load();
    } catch (_e) {}
    this.activeAudios.delete(audioEl);
  }

  // Detener todos los audios activos excepto uno opcional
  private stopAllActiveAudiosExcept(except?: HTMLAudioElement | null) {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    this.activeAudios.forEach((a) => {
      if (a !== except) {
        this.stopAndCleanAudio(a);
      }
    });
  }

  public async playTrack(trackUrl?: string, crossfadeDurationMs: number = 1800) {
    if (!trackUrl) return;

    // Si ya estamos reproduciendo exactamente esta pista, evitar duplicación
    if (trackUrl === this.currentTrackUrl && this.currentAudio && !this.currentAudio.paused) {
      return;
    }

    if (!this.isUnlocked) {
      this.pendingTrackUrl = trackUrl;
      return;
    }

    try {
      // Verificar si el archivo existe antes de alterar cualquier estado
      const check = await fetch(trackUrl, { method: 'HEAD' }).catch(() => null);
      if (!check || !check.ok) {
        // El archivo no existe: no interrumpir la música actual ni sobreescribir currentTrackUrl
        return;
      }

      // Verificación de carrera: ¿en lo que tardó el fetch ya se está reproduciendo?
      if (trackUrl === this.currentTrackUrl && this.currentAudio && !this.currentAudio.paused) {
        return;
      }

      const incoming = new Audio(trackUrl);
      incoming.loop = true;
      incoming.volume = 0;
      this.activeAudios.add(incoming);

      const playPromise = incoming.play();
      if (playPromise !== undefined) {
        await playPromise;
        this.currentTrackUrl = trackUrl;
        this.crossfade(incoming, crossfadeDurationMs);
      }
    } catch (_e) {
      // Si falla la reproducción de esta pista entrante, no romper la existente
    }
  }

  private crossfade(incomingAudio: HTMLAudioElement, durationMs: number) {
    // 1. Limpiar intervalo de fade anterior
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    // 2. Detener y silenciar de inmediato cualquier audio viejo que no sea el entrante ni el saliente
    const outgoing = this.currentAudio;
    this.activeAudios.forEach((a) => {
      if (a !== outgoing && a !== incomingAudio) {
        this.stopAndCleanAudio(a);
      }
    });

    this.currentAudio = incomingAudio;
    this.notify();

    if (!outgoing || outgoing === incomingAudio) {
      const targetVol = this.isMuted ? 0 : this.volume;
      incomingAudio.volume = targetVol;
      return;
    }

    // 3. Fade cruzado suave asegurando pausa total de outgoing al final
    const steps = 25;
    const stepTime = Math.max(20, Math.round(durationMs / steps));
    const targetVolume = this.isMuted ? 0 : this.volume;
    const startOutgoingVol = outgoing.volume;
    let step = 0;

    this.fadeInterval = window.setInterval(() => {
      step++;
      const progress = step / steps;

      if (!outgoing.paused) {
        outgoing.volume = Math.max(0, startOutgoingVol * (1 - progress));
      }
      if (incomingAudio && !incomingAudio.paused) {
        incomingAudio.volume = Math.min(targetVolume, targetVolume * progress);
      }

      if (step >= steps) {
        if (this.fadeInterval) {
          clearInterval(this.fadeInterval);
          this.fadeInterval = null;
        }
        this.stopAndCleanAudio(outgoing);
        if (incomingAudio && !incomingAudio.paused) {
          incomingAudio.volume = targetVolume;
        }
      }
    }, stepTime);
  }

  public stopAll() {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    this.stopAllActiveAudiosExcept(null);
    this.currentAudio = null;
    this.currentTrackUrl = null;
    this.notify();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    const targetVol = this.isMuted ? 0 : this.volume;
    this.activeAudios.forEach((a) => {
      a.volume = targetVol;
    });
    this.registeredVideos.forEach((v) => {
      v.muted = this.isMuted;
    });
    this.notify();
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getVolume(): number {
    return this.volume;
  }
}

