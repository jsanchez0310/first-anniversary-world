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

export class AutoScrollController {
  private static instance: AutoScrollController | null = null;

  private speed: number = 1.65; // Pixeles por fotograma (~90-100 px/s, ritmo fluido y natural)
  private pauseDuration: number = 3200; // Milisegundos de espera tras interacción manual
  private isEnabled: boolean = true;
  private isJourneyActive: boolean = false;
  private isPausedByUser: boolean = false;
  private isProgrammaticScroll: boolean = false;

  private rafId: number | null = null;
  private countdownRafId: number | null = null;
  private pauseStartTime: number = 0;

  private stateListeners: Set<StateListener> = new Set();
  private countdownListeners: Set<CountdownListener> = new Set();

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupUserInteractionListeners();
    }
  }

  public static getInstance(): AutoScrollController {
    if (!AutoScrollController.instance) {
      AutoScrollController.instance = new AutoScrollController();
    }
    return AutoScrollController.instance;
  }

  private setupUserInteractionListeners() {
    const handleUserInteraction = () => {
      if (!this.isJourneyActive || !this.isEnabled) return;
      this.pauseAndStartCountdown();
    };

    // 1. Rueda del ratón / touchpad
    window.addEventListener('wheel', handleUserInteraction, { passive: true });

    // 2. Desplazamiento táctil en dispositivos móviles
    window.addEventListener('touchmove', handleUserInteraction, { passive: true });
    window.addEventListener('touchstart', (e) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('button') || target?.closest('a')) return;
      if (this.isJourneyActive && this.isEnabled) {
        this.pauseAndStartCountdown();
      }
    }, { passive: true });

    // 3. Evento nativo de scroll (cubre arrastre de barra de scroll, inercia, etc.)
    window.addEventListener('scroll', () => {
      // Ignorar si el desplazamiento fue generado por nuestro propio motor de auto-scroll
      if (this.isProgrammaticScroll) return;
      if (this.isJourneyActive && this.isEnabled) {
        handleUserInteraction();
      }
    }, { passive: true });

    // 4. Teclas de navegación
    window.addEventListener('keydown', (e) => {
      const scrollKeys = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Space', 'Home', 'End'];
      if (scrollKeys.includes(e.code) || scrollKeys.includes(e.key)) {
        handleUserInteraction();
      }
    }, { passive: true });
  }

  // Pausa temporal por interacción del usuario con cuenta regresiva
  public pauseAndStartCountdown() {
    this.isPausedByUser = true;
    this.stopScrollLoop();
    this.stopCountdown();

    this.pauseStartTime = performance.now();
    this.notifyState();
    // Notificar inmediatamente para desplegar la barra de progreso al instante
    this.notifyCountdown(0.01, this.pauseDuration);

    const tickCountdown = (now: number) => {
      const elapsed = now - this.pauseStartTime;
      const progress = Math.min(1, elapsed / this.pauseDuration);
      const remainingMs = Math.max(0, this.pauseDuration - elapsed);

      this.notifyCountdown(progress, remainingMs);

      if (progress < 1) {
        this.countdownRafId = requestAnimationFrame(tickCountdown);
      } else {
        // Fin de la espera: reanudar auto-scroll
        this.stopCountdown();
        this.isPausedByUser = false;
        this.notifyCountdown(1, 0);
        this.notifyState();
        if (this.isEnabled && this.isJourneyActive) {
          this.startScrollLoop();
        }
      }
    };

    this.countdownRafId = requestAnimationFrame(tickCountdown);
  }

  private startScrollLoop() {
    this.stopScrollLoop();

    const loop = () => {
      if (!this.isEnabled || !this.isJourneyActive || this.isPausedByUser) {
        return;
      }

      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      // Solo detener si la página tiene altura de scroll real (> 500px) y llegamos al final del epílogo
      if (maxScroll > 500 && window.scrollY >= maxScroll - 15) {
        this.stop();
        return;
      }

      // Marcar como scroll programático para que el listener de scroll no pause el proceso
      this.isProgrammaticScroll = true;
      window.scrollBy({ top: this.speed, behavior: 'instant' });

      // Liberar la bandera en el próximo ciclo
      requestAnimationFrame(() => {
        this.isProgrammaticScroll = false;
      });

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
    this.notifyState();
  }

  private stopScrollLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private stopCountdown() {
    if (this.countdownRafId) {
      cancelAnimationFrame(this.countdownRafId);
      this.countdownRafId = null;
    }
  }

  // Alternar encendido/apagado manual mediante el botón del HUD
  public toggle(): boolean {
    this.isEnabled = !this.isEnabled;
    if (!this.isEnabled) {
      this.stopScrollLoop();
      this.stopCountdown();
      this.isPausedByUser = false;
      this.notifyCountdown(0, 0);
    } else {
      if (this.isJourneyActive) {
        this.isPausedByUser = false;
        this.startScrollLoop();
      }
    }
    this.notifyState();
    return this.isEnabled;
  }

  // Iniciar el auto-scroll al finalizar la animación de video introductoria on_intro_start
  public startJourney() {
    this.isJourneyActive = true;
    this.isPausedByUser = false;
    this.stopCountdown();
    this.notifyCountdown(0, 0);

    if (this.isEnabled) {
      this.startScrollLoop();
    }
    this.notifyState();
  }

  // Detener y resetear al volver al inicio
  public stop() {
    this.isJourneyActive = false;
    this.isPausedByUser = false;
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
