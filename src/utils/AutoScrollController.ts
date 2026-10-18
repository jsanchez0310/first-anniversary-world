/* ============================================================================
   AutoScrollController.ts
   Controlador cinemático de desplazamiento automático para Scrollytelling.
   - Singleton sincronizado entre componentes (NavigationIsland y páginas)
   - Auto-scroll suave a velocidad de lectura poética
   - Detección precisa de scroll manual del usuario (wheel, touch, scrollbar, teclas)
   - Distinción entre scroll programático y scroll manual
   - Pausa temporal reactiva con cuenta regresiva
   - Emisión de progreso para la barrita visual superior
   ============================================================================ */

export interface AutoScrollState {
  isEnabled: boolean;
  isPaused: boolean;
  isRunning: boolean;
}

export type StateListener = (state: AutoScrollState) => void;
export type CountdownListener = (progress: number, remainingMs: number) => void;

declare global {
  interface Window {
    __autoScrollControllerInstance?: AutoScrollController;
  }
}

export class AutoScrollController {
  private static instance: AutoScrollController | null = null;

  // Velocidad constante en píxeles por segundo (ritmo sereno y poético para lectura humana en 60Hz, 120Hz o 144Hz)
  private speedPxPerSecond: number = 42; 
  private pauseDuration: number = 3200; // Milisegundos de espera tras interacción manual antes de reanudar
  private isEnabled: boolean = false;
  private isJourneyActive: boolean = false;
  private isPausedByUser: boolean = false;
  private isWaitingForWorldCTA: boolean = false;
  private isOrientationLocked: boolean = false;
  private isLoopRunning: boolean = false;

  private rafId: number | null = null;
  private countdownRafId: number | null = null;
  private pauseStartTime: number = 0;
  private lastLoopTime: number = 0;
  private scrollSubpixelAccumulator: number = 0;

  private stateListeners: Set<StateListener> = new Set();
  private countdownListeners: Set<CountdownListener> = new Set();

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupUserInteractionListeners();
    }
  }

  public static getInstance(): AutoScrollController {
    if (typeof window !== 'undefined') {
      if (!window.__autoScrollControllerInstance) {
        window.__autoScrollControllerInstance = new AutoScrollController();
      }
      return window.__autoScrollControllerInstance;
    }
    if (!AutoScrollController.instance) {
      AutoScrollController.instance = new AutoScrollController();
    }
    return AutoScrollController.instance;
  }

  private setupUserInteractionListeners() {
    const handleUserInteraction = () => {
      if (!this.isJourneyActive || !this.isEnabled || this.isWaitingForWorldCTA) return;
      this.pauseAndStartCountdown();
    };

    // 1. Rueda del ratón / touchpad de dos dedos (entrada física real)
    window.addEventListener('wheel', handleUserInteraction, { passive: true });

    // 2. Desplazamiento táctil en dispositivos móviles
    window.addEventListener('touchmove', (e) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('button') || target?.closest('a')) return;
      handleUserInteraction();
    }, { passive: true });

    window.addEventListener('touchstart', (e) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('button') || target?.closest('a')) return;
      if (this.isJourneyActive && this.isEnabled && !this.isWaitingForWorldCTA) {
        this.pauseAndStartCountdown();
      }
    }, { passive: true });

    // 3. Teclas de navegación
    window.addEventListener('keydown', (e) => {
      const scrollKeys = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Space', 'Home', 'End'];
      if (scrollKeys.includes(e.code) || scrollKeys.includes(e.key)) {
        handleUserInteraction();
      }
    }, { passive: true });
  }

  // Pausa temporal por interacción del usuario o lectura con cuenta regresiva
  public pauseAndStartCountdown(durationMs?: number) {
    if (!this.isEnabled || !this.isJourneyActive || this.isWaitingForWorldCTA) return;

    const actualDuration = durationMs ?? this.pauseDuration;
    this.isPausedByUser = true;
    this.stopScrollLoop();
    this.stopCountdown();

    this.pauseStartTime = performance.now();
    this.notifyState();
    // Notificar inmediatamente para desplegar la barra de progreso al instante
    this.notifyCountdown(0.01, actualDuration);

    const tickCountdown = (now: number) => {
      if (!this.isEnabled || !this.isJourneyActive) {
        this.stopCountdown();
        this.isPausedByUser = false;
        this.notifyCountdown(0, 0);
        this.notifyState();
        return;
      }

      const elapsed = now - this.pauseStartTime;
      const progress = Math.min(1, elapsed / actualDuration);
      const remainingMs = Math.max(0, actualDuration - elapsed);

      this.notifyCountdown(progress, remainingMs);

      if (progress < 1) {
        this.countdownRafId = requestAnimationFrame(tickCountdown);
      } else {
        // Fin de la espera: reanudar auto-scroll suavemente si aún está habilitado
        this.stopCountdown();
        this.isPausedByUser = false;
        this.notifyCountdown(1, 0);
        this.notifyState();
        if (this.isEnabled && this.isJourneyActive && !this.isWaitingForWorldCTA) {
          this.startScrollLoop();
        }
      }
    };

    this.countdownRafId = requestAnimationFrame(tickCountdown);
  }

  private startScrollLoop() {
    this.stopScrollLoop();
    if (!this.isEnabled || !this.isJourneyActive || this.isPausedByUser || this.isWaitingForWorldCTA || this.isOrientationLocked) {
      return;
    }

    this.isLoopRunning = true;
    this.lastLoopTime = performance.now();
    this.scrollSubpixelAccumulator = 0;

    const loop = (now: number) => {
      if (!this.isLoopRunning || !this.isEnabled || !this.isJourneyActive || this.isPausedByUser || this.isWaitingForWorldCTA || this.isOrientationLocked) {
        this.isLoopRunning = false;
        this.lastLoopTime = 0;
        this.rafId = null;
        return;
      }

      if (this.lastLoopTime === 0) {
        this.lastLoopTime = now;
      }

      // Delta time en segundos acotado a un máximo de 60ms para evitar saltos si hay lag
      const deltaSec = Math.min(0.06, (now - this.lastLoopTime) / 1000);
      this.lastLoopTime = now;

      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      // Solo detener si la página tiene altura de scroll real (> 500px) y llegamos al final del epílogo
      if (maxScroll > 500 && window.scrollY >= maxScroll - 15) {
        this.stop();
        return;
      }

      // Acumular subpíxeles para una velocidad matemáticamente constante e independiente de los Hz del monitor
      const pixelsToMove = this.speedPxPerSecond * deltaSec;
      this.scrollSubpixelAccumulator += pixelsToMove;

      if (this.scrollSubpixelAccumulator >= 1) {
        const intPixels = Math.floor(this.scrollSubpixelAccumulator);
        this.scrollSubpixelAccumulator -= intPixels;
        window.scrollBy({ top: intPixels, behavior: 'instant' });
      }

      // Comprobar nuevamente tras scrollBy por si algún listener síncrono modificó el estado
      if (!this.isLoopRunning || !this.isEnabled || !this.isJourneyActive || this.isPausedByUser || this.isWaitingForWorldCTA || this.isOrientationLocked) {
        this.isLoopRunning = false;
        this.lastLoopTime = 0;
        this.rafId = null;
        return;
      }

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
    this.notifyState();
  }

  private stopScrollLoop() {
    this.isLoopRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lastLoopTime = 0;
    this.scrollSubpixelAccumulator = 0;
  }

  private stopCountdown() {
    if (this.countdownRafId !== null) {
      cancelAnimationFrame(this.countdownRafId);
      this.countdownRafId = null;
    }
  }

  // Pausar auto-scroll específicamente esperando el clic en "Siguiente Mundo"
  public pauseForWorldCTA() {
    this.isWaitingForWorldCTA = true;
    this.stopScrollLoop();
    this.stopCountdown();
    this.notifyCountdown(0, 0);
    this.notifyState();
  }

  // Liberar la espera del CTA si el usuario hace scroll hacia atrás dentro del mundo
  public clearWorldCTAPause() {
    if (this.isWaitingForWorldCTA) {
      this.isWaitingForWorldCTA = false;
      this.notifyState();
      if (this.isEnabled && this.isJourneyActive && !this.isPausedByUser) {
        this.startScrollLoop();
      }
    }
  }

  // Reanudar tras hacer clic en "Siguiente Mundo"
  public resumeAfterWorldCTA() {
    this.isWaitingForWorldCTA = false;
    this.isPausedByUser = false;
    this.stopCountdown();
    this.notifyCountdown(0, 0);
    if (this.isEnabled && this.isJourneyActive) {
      this.startScrollLoop();
    }
    this.notifyState();
  }

  // Pausar o reanudar según el bloqueo de orientación de pantalla
  public setOrientationLocked(locked: boolean) {
    this.isOrientationLocked = locked;
    if (locked) {
      this.stopScrollLoop();
      this.stopCountdown();
      this.notifyState();
    } else {
      this.notifyState();
      if (this.isEnabled && this.isJourneyActive && !this.isPausedByUser && !this.isWaitingForWorldCTA) {
        this.startScrollLoop();
      }
    }
  }

  // Establecer encendido/apagado manual explícito
  public setEnabled(enabled: boolean): boolean {
    this.isEnabled = enabled;
    if (!this.isEnabled) {
      this.stopScrollLoop();
      this.stopCountdown();
      this.isPausedByUser = false;
      this.notifyCountdown(0, 0);
    } else {
      this.isWaitingForWorldCTA = false;
      this.isPausedByUser = false;
      if (this.isJourneyActive) {
        this.startScrollLoop();
      }
    }
    this.notifyState();
    return this.isEnabled;
  }

  // Alternar encendido/apagado manual mediante el botón del HUD
  public toggle(): boolean {
    return this.setEnabled(!this.isEnabled);
  }

  // Iniciar el auto-scroll al finalizar la animación de video introductoria on_intro_start
  public startJourney() {
    this.isJourneyActive = true;
    this.isPausedByUser = false;
    this.isWaitingForWorldCTA = false;
    this.stopCountdown();
    this.notifyCountdown(0, 0);

    if (this.isEnabled) {
      this.startScrollLoop();
    } else {
      this.stopScrollLoop();
    }
    this.notifyState();
  }

  // Detener y resetear al volver al inicio
  public stop() {
    this.isJourneyActive = false;
    this.isPausedByUser = false;
    this.isWaitingForWorldCTA = false;
    this.stopScrollLoop();
    this.stopCountdown();
    this.notifyCountdown(0, 0);
    this.notifyState();
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public getIsPaused(): boolean {
    return this.isPausedByUser;
  }

  public getIsRunning(): boolean {
    return this.isJourneyActive && this.isEnabled && !this.isPausedByUser;
  }

  public subscribe(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener({
      isEnabled: this.isEnabled,
      isPaused: this.isPausedByUser,
      isRunning: this.getIsRunning(),
    });
    return () => this.stateListeners.delete(listener);
  }

  public subscribeCountdown(listener: CountdownListener): () => void {
    this.countdownListeners.add(listener);
    return () => this.countdownListeners.delete(listener);
  }

  private notifyState() {
    const state: AutoScrollState = {
      isEnabled: this.isEnabled,
      isPaused: this.isPausedByUser,
      isRunning: this.getIsRunning(),
    };
    this.stateListeners.forEach((fn) => fn(state));
  }

  private notifyCountdown(progress: number, remainingMs: number) {
    this.countdownListeners.forEach((fn) => fn(progress, remainingMs));
  }
}
