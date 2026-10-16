import { test, expect } from '@playwright/test';

test.describe('Scrollytelling: Fluidez, Carga Progresiva y Scrubbing', () => {

  test('1. Loading Screen inicial: muestra progreso 0-100% y revela el libro mágico', async ({ page }) => {
    await page.goto('/?debug=perf');

    const loadingScreen = page.locator('#loading-screen');
    await expect(loadingScreen).toBeVisible();

    // Esperar a que la precarga inicial concluya y el Loading Screen se desvanezca
    await expect(loadingScreen).toBeHidden({ timeout: 25000 });

    // Verificar que el video loop del libro mágico esté activo
    const videoLoop = page.locator('#video-initial-loop');
    await expect(videoLoop).toBeVisible();

    const isPlaying = await page.evaluate(() => {
      const v = document.getElementById('video-initial-loop') as HTMLVideoElement;
      return v && !v.paused && v.readyState >= 2;
    });
    expect(isPlaying).toBe(true);

    // El botón comenzar debe estar listo
    const startBtn = page.locator('#btn-start-journey');
    await expect(startBtn).toBeVisible();
  });

  test('2. Transición del Intro hacia los Mundos de Scrollytelling', async ({ page }) => {
    await page.goto('/?debug=perf');
    await page.locator('#loading-screen').waitFor({ state: 'hidden', timeout: 25000 });

    const startBtn = page.locator('#btn-start-journey');
    await startBtn.click();

    // El video de intro arranca
    const videoIntro = page.locator('#video-intro-start');
    await expect(videoIntro).toHaveCSS('opacity', '1');

    // Avanzar tiempo del video de intro para que termine o simular end
    await page.evaluate(() => {
      const v = document.getElementById('video-intro-start') as HTMLVideoElement;
      if (v) {
        v.currentTime = v.duration - 0.05;
      }
    });

    // Esperar a que se active el escenario de mundos
    const worldClips = page.locator('#sw-world-clips');
    await expect(worldClips).toHaveCSS('opacity', '1', { timeout: 10000 });

    // Verificar que la pista de scroll se haya habilitado
    const storyTrack = page.locator('#scroll-story-track');
    await expect(storyTrack).not.toHaveClass(/hidden/);
  });

  test('3. Fluidéz de Scrubbing a 60 FPS: 0 fotogramas perdidos (droppedVideoFrames === 0)', async ({ page }) => {
    await page.goto('/?debug=perf');
    await page.locator('#loading-screen').waitFor({ state: 'hidden', timeout: 25000 });

    // Iniciar viaje
    await page.locator('#btn-start-journey').click();
    await page.evaluate(() => {
      const v = document.getElementById('video-intro-start') as HTMLVideoElement;
      if (v) v.currentTime = v.duration - 0.05;
    });

    await expect(page.locator('#sw-world-clips')).toHaveCSS('opacity', '1', { timeout: 10000 });

    // Simular secuencia intensiva de scroll (adelante y atrás)
    for (let i = 0; i < 20; i++) {
      await page.mouse.wheel(0, 150);
      await page.waitForTimeout(40);
    }
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(40);
    }
    for (let i = 0; i < 15; i++) {
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(40);
    }

    // Consultar calidad de reproducción del video activo
    const metrics = await page.evaluate(() => {
      const video = document.querySelector('.sw-video-segment.opacity-100') as HTMLVideoElement;
      const perf = window.__PERF_METRICS__;
      let dropped = 0;
      let total = 0;
      if (video && 'getVideoPlaybackQuality' in video) {
        const q = (video as any).getVideoPlaybackQuality();
        dropped = q?.droppedVideoFrames ?? 0;
        total = q?.totalVideoFrames ?? 0;
      }
      return {
        droppedFrames: dropped,
        totalFrames: total,
        seekLatencyMs: perf?.seekLatencyMs ?? 0,
        fps: perf?.fps ?? 60,
      };
    });

    console.log('[Playwright Telemetría]:', metrics);

    // COMPROBACIÓN CRÍTICA:
    // 0 fotogramas perdidos durante todo el scrubbing
    expect(metrics.droppedFrames).toBe(0);
  });

  test('4. Botón Siguiente Mundo: refleja barra de progreso y desbloquea el avance', async ({ page }) => {
    await page.goto('/?debug=perf');
    await page.locator('#loading-screen').waitFor({ state: 'hidden', timeout: 25000 });

    await page.locator('#btn-start-journey').click();
    await page.evaluate(() => {
      const v = document.getElementById('video-intro-start') as HTMLVideoElement;
      if (v) v.currentTime = v.duration - 0.05;
    });

    await expect(page.locator('#sw-world-clips')).toHaveCSS('opacity', '1', { timeout: 10000 });

    // Desplazar la página hasta el final del Mundo 1 (aproximadamente al 80% del tramo)
    await page.evaluate(() => {
      const track = document.getElementById('scroll-story-track');
      if (track) {
        const max = track.getBoundingClientRect().height - window.innerHeight;
        // Mundo 1 concluye antes del 30% del total de la pista
        window.scrollTo({ top: Math.round(max * 0.26), behavior: 'instant' });
        window.dispatchEvent(new Event('scroll'));
      }
    });

    const nextBtn = page.locator('#btn-next-world-0');
    await expect(nextBtn).toBeVisible({ timeout: 8000 });

    // Esperar a que el botón alcance el estado data-ready="true" (Mundo 2 listo en memoria)
    await expect(nextBtn).toHaveAttribute('data-ready', 'true', { timeout: 15000 });

    // Hacer clic en el botón de Siguiente Mundo
    await nextBtn.click();

    // Confirmar que el scroll avanzó hacia el umbral del siguiente mundo
    await page.waitForTimeout(1000);
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(100);
  });

});
