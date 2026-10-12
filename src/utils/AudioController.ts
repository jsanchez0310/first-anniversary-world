/**
 * AudioController
 * Maneja la reproducción de música ambiental de fondo con transiciones (crossfade)
 * entre pistas por Acto o Mundo, y control de volumen / mute sincronizado.
 * Soporta registro de elementos de video para mutear/desmutear en conjunto.
 */
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

  private constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (this.currentAudio && !this.currentAudio.paused) {
            this.currentAudio.volume = 0;
          }
          this.registeredVideos.forEach(v => { v.muted = true; });
        } else {
          if (this.currentAudio && !this.currentAudio.paused && !this.isMuted) {
            this.currentAudio.volume = this.volume;
          }
          this.registeredVideos.forEach(v => { v.muted = this.isMuted; });
        }
      });
    }
  }

  public static getInstance(): AudioController {
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
    const isPlaying = !this.isMuted;
    for (const cb of this.listeners) {
      cb({ isMuted: this.isMuted, isPlaying, track: this.currentTrackUrl });
    }
  }

  public unlock() {
    this.isUnlocked = true;
    this.registeredVideos.forEach(v => {
      v.muted = this.isMuted;
    });
  }

  public async playTrack(trackUrl?: string, crossfadeDurationMs: number = 1800) {
    if (!trackUrl || trackUrl === this.currentTrackUrl) return;
    this.currentTrackUrl = trackUrl;

    if (!this.isUnlocked) return;

    try {
      const check = await fetch(trackUrl, { method: 'HEAD' }).catch(() => null);
      if (!check || !check.ok) {
        return;
      }

      const incoming = new Audio(trackUrl);
      incoming.loop = true;
      incoming.volume = 0;

      const playPromise = incoming.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.crossfade(incoming, crossfadeDurationMs);
          })
          .catch(() => {
            if (this.currentAudio) {
              this.fadeOutCurrent(1000);
            }
          });
      }
    } catch (_e) {}
  }

  private crossfade(incomingAudio: HTMLAudioElement, durationMs: number) {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    const steps = 30;
    const stepTime = durationMs / steps;
    const targetVolume = this.isMuted ? 0 : this.volume;
    let step = 0;

    const outgoing = this.currentAudio;
    this.currentAudio = incomingAudio;
    this.notify();

    this.fadeInterval = window.setInterval(() => {
      step++;
      const progress = step / steps;

      if (outgoing && !outgoing.paused) {
        outgoing.volume = Math.max(0, targetVolume * (1 - progress));
      }
      if (this.currentAudio) {
        this.currentAudio.volume = Math.min(targetVolume, targetVolume * progress);
      }

      if (step >= steps) {
        if (this.fadeInterval) clearInterval(this.fadeInterval);
        this.fadeInterval = null;
        if (outgoing) {
          outgoing.pause();
          outgoing.src = '';
        }
      }
    }, stepTime);
  }

  private fadeOutCurrent(durationMs: number) {
    if (!this.currentAudio) return;
    const outgoing = this.currentAudio;
    const steps = 20;
    const stepTime = durationMs / steps;
    let step = 0;

    const interval = window.setInterval(() => {
      step++;
      outgoing.volume = Math.max(0, outgoing.volume - outgoing.volume / steps);
      if (step >= steps) {
        clearInterval(interval);
        outgoing.pause();
      }
    }, stepTime);
    this.currentAudio = null;
    this.notify();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.currentAudio) {
      this.currentAudio.volume = this.isMuted ? 0 : this.volume;
    }
    this.registeredVideos.forEach(v => {
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

