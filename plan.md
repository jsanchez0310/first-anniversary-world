Monta la experiencia completa de Scrollytelling para "Primer Aniversario: Un Universo a Dos Voces" usando el motor de
    la skill scroll-world y el sistema visual de landing-page-design en este proyecto Astro.
  
      IMPORTANTE: NO USES Higgsfield, ni Codex, ni ninguna API de generación de video/imagen por IA. No llames a ningún CLI
    de generación ni consumas créditos. TODOS los assets (videos, imágenes, audios) ya existen o se añadirán manualmente
    por nosotros dentro de la carpeta /public. Tu trabajo es puramente de desarrollo frontend: arquitectura del scrub
    engine, componentes Astro, diseño visual, revelado progresivo de texto y controlador de audio.
  
      ## 1. Assets en /public
  
      - Hero / Entrada:
        - public/initial_loop_video.mp4 (video de fondo de bienvenida).
        - public/on_intro_start.mp4.
      - Mundo 1:
        - Clips: public/world_1_1.mp4, public/world_1_2.mp4, public/world_1_3.mp4, public/world_1_4.mp4.
      - Mundos 2 al 5:
        - Deja la configuración lista y modular en src/config/story.ts para que cuando peguemos los archivos (ej.
    world_2_1.mp4, world_3_1.mp4, etc.) en public/, el engine los cargue automáticamente sin tocar lógica interna.
      - Audio (Música de fondo):
        - public/audio/ (act_1.mp3, act_2.mp3, world_1.mp3, etc.). El reproductor debe manejar de forma segura si el
    archivo aún no existe sin romper la web ni lanzar errores en consola.
  
      ## 2. Dirección de Arte & Sistema Visual (landing-page-design)
  
      - Paleta de color:
        - Modo oscuro estricto: Fondo `#000000`, superficies en `#131209` / `#181818`, bordes en `#272727`.
        - Texto: Principal crema/zinc `#f4f4f5`, secundario `#a1a1aa`.
        - Acentos cálidos/dorados: `#d4af37` (Mundo 1), `#e26d5c` (Mundo 2), `#f39c12` (Mundo 3), `#f8a5c2` (Mundo 4),
    `#70a1ff` (Mundo 5).
        - Regla: Sin degradados en fondos, solo planos limpios con backdrop-blur sobre el video.
      - Tipografía:
        - Geist para títulos y textos de narrativa, Geist Mono para números de actos y metadatos.
        - Sin fuentes cursivas, sin pesos ultra bold (máximo semibold/bold).
        - Titulares con text-wrap: balance, cuerpos con text-wrap: pretty.
      - Text Reveal Poético Progresivo (Regla B11 de landing-page-design):
        - La narrativa de "El Principito" NO debe mostrarse de golpe.
        - Cada palabra empieza atenuada (25% opacidad, sutil desenfoque) y, a medida que el usuario hace scroll dentro de
    la sección, se ilumina palabra por palabra hacia el 100% con un sutil resplandor cálido.
      - Curva de movimiento y física:
        - transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)].
  
      ## 3. Estructura Narrativa (de src/assets/book.md)
  
      1. Entrada (Hero):
         - Loop inicial con initial_loop_video.mp4.
         - Botón interactivo "Comenzar el Viaje" que activa el audio (desbloqueando el autoplay del navegador), el boton al darle clic a comenzar el viaje tiene que esperar el video initial loop termine la animacion y luego de eso comienza la transicion con el video @public/on_intro_start este video luego de terminar es que comenzara con con los mundos 
    hacia el Mundo 1.
      2. Acto I: «El Fuego y el Refugio del Presente»
         - Mundo 1: El Santuario de las Horas Suspendidas (Inspirado en Clair Obscur: Expedition 33 y Past Lives).
         - Mundo 2: El Atelier del Fuego Eterno y la Terraza de Medellín (Elden Ring, Orgullo y Prejuicio).
      3. Acto II: «Las Constelaciones del Dolor y las Raíces»
         - Mundo 3: El Puente de los Cempasúchiles y Cometas (Coco, Your Name, recuerdo de Luna y el abuelo San Miguel
    Arcángel).
      4. Acto III: «El Principio del Mañana»
         - Mundo 4: El Valle de los Cerezos y el Zorro de la Aurora (Japón, Robot Dreams, Dune, El Principito y Venus,
    partida a España).
         - Mundo 5: La Ciudad de los Ecos Estelares (El Cierre del Viaje: ciencia ficción, eternidad y portal compartido).
      5. Epílogo: Cierre poético con botón para volver al inicio.
  
      ## 4. Cableado Técnico del Engine (scroll-world)
  
      - Carga de clips mediante Blobs en memoria (URL.createObjectURL(blob)) para que video.currentTime responda
    instantáneamente al scroll sin atascos ni congelamientos.
      - Pacing por escena: aplica un dwell/linger de ~0.45 para que la cámara desacelere en el momento óptimo de cada mundo
    mientras el texto se revela.
      - AudioController singleton con crossfade suave (~1.8 s) entre pistas de audio al cruzar de mundo/acto.
      - Barra de navegación flotante (fluid island nav): centrada en la parte superior con desenfoque glass, links rápidos
    a cada mundo y botón HUD para alternar sonido (Muted / Sound On).
      - Prioridad móvil: en pantallas ≤860px o táctiles, servir el clip optimizado world_1_720.mp4, coalescer las búsquedas
    de tiempo para evitar freeze en deslizamientos rápidos y respetar safe-area-inset.
  
      ## 5. QA y Verificación
  
      - Servidor dev en background: `pnpm exec astro dev --background`.
      - Verifica que el scroll controla suavemente el video hacia adelante y hacia atrás.
      - Verifica que las palabras se iluminan de forma fluida con el avance del scroll.
      egúrate de que `pnpm run build` pase limpiamente al 100%.