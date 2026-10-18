export type StoryAlignment = 'left' | 'right' | 'bottom';

export interface StorySection {
  id: string;
  actId: string;
  actTitle: string;
  actSubtitle: string;
  title: string;
  worldNumber: number;
  quote: string;
  clips: string[];
  clipMobile?: string;
  still?: string;
  stillMobile?: string;
  audioTrack?: string;
  audioTrackAlt?: string;
  accent: string;
  /**
   * Alineación visual del mundo en pantalla:
   * - 'left': Narrativa y título abajo a la izquierda (~30%). Botón "Siguiente Mundo" abajo a la derecha de la pantalla.
   * - 'right': Narrativa y título abajo a la derecha (~30%). Botón "Siguiente Mundo" abajo a la izquierda de la pantalla.
   * - 'bottom': Narrativa y título centrados abajo. Botón "Siguiente Mundo" dentro debajo del texto.
   * Nota: El indicador del Acto siempre se mantiene arriba a la izquierda sin importar esta opción.
   */
  alignment?: StoryAlignment;
  linger?: number;
  /**
   * Porcentaje de scroll asignado a este mundo en la pista total (0 a 100%).
   * Ejemplo: scroll: 30 representa el 30% del recorrido total de scrollytelling (pista fija de 900vh).
   * La suma sugerida entre todos los mundos es 100%.
   */
  scroll?: number;
}

export interface StoryAct {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  audioTrack?: string;
}

import { resolveMediaUrl, getCdnBaseUrl } from './cdn';

const cdnBase = getCdnBaseUrl();
console.log(
  `[Media] Resolviendo multimedia desde: ${cdnBase ? `CDN (${cdnBase})` : 'Local (/public)'}`
);

export const INTRO_MEDIA = {
  initialLoopDesktop: resolveMediaUrl('/desktop/initial_loop_video.mp4'),
  initialLoopMobile: resolveMediaUrl('/mobile/initial_loop_video.mp4'),
  introStartDesktop: resolveMediaUrl('/desktop/on_intro_start.mp4'),
  introStartMobile: resolveMediaUrl('/mobile/on_intro_start.mp4'),
};

export const STORY_ACTS: StoryAct[] = [
  {
    id: 'act-1',
    title: 'Acto I',
    subtitle: 'El Fuego y el Refugio del Presente',
    description: 'Este acto reune el aqui y el ahora: la intensidad de lo que son hoy, la pasion inquebrantable y el refugio que construyeron en su primer ano a pesar de las pruebas.',
    audioTrack: resolveMediaUrl('/audio/act_1.mp3')
  },
  {
    id: 'act-2',
    title: 'Acto II',
    subtitle: 'Las Almas que permanecen',
    description: 'Viajamos hacia atras en la memoria para honrar las sombras del pasado: el duelo de las ausencias, el recuerdo eterno de Luna y el abuelo San Miguel Arcangel.',
    audioTrack: resolveMediaUrl('/audio/act_2.mp3')
  },
  {
    id: 'act-3',
    title: 'Acto III',
    subtitle: 'El Principio del Mañana',
    description: 'El salto hacia el porvenir, los suenos por florecer y el destino compartido.',
    audioTrack: resolveMediaUrl('/audio/act_3.mp3')
  }
];

export const STORY_SECTIONS: StorySection[] = [
  {
    id: 'world-1',
    actId: 'act-1',
    actTitle: 'Acto I',
    actSubtitle: 'El Fuego y el Refugio del Presente',
    worldNumber: 1,
    title: 'El camino de las horas suspendidas',
    quote: 'Si uno mira con atención, los dias dificiles no son mas que un lienzo en blanco donde dos almas deciden volverse a elegir. Aunque el camino a veces este lleno de dificultades y silencios, el presente es ese lugar fragil y hermoso donde decidimos quedarnos, pintando de colores en un año de batallas libradas, sabiendo que el simple hecho de intentarlo ya es una victoria.',
    clips: [
      resolveMediaUrl('/desktop/world_1.mp4'),
    ],
    clipMobile: resolveMediaUrl('/mobile/world_1.mp4'),
    audioTrack: resolveMediaUrl('/audio/world_1.mp3'),
    accent: '#fff',
    alignment: 'left',
    linger: 0.45,
    scroll: 20
  },
  {
    id: 'world-2',
    actId: 'act-1',
    actTitle: 'Acto I',
    actSubtitle: 'El Fuego y el Refugio del Presente',
    worldNumber: 2,
    title: 'El Santuario del fuego eterno y el tiamat de la eterna primavera.',
    quote: 'Y cuando todo parecia desmoronarse en nuestros primeros pasos tambaleantes, el destino nos tendio una trampa de estrellas. En una terraza bajo el cielo estrellado de la ciudad de la eterna primera, la noche, las estrellas y la ciudad brillando a nuestros pies fueron testigos de ello, supe que tu piel y la mia hablaban el mismo idioma. Nuestra fortalezas: una pasion indomable, un amor infinito y unas inmensas ganas de conquistar el mundo justos nos vuelve invencibles.',
    clips: [
      resolveMediaUrl('/desktop/world_2.mp4'),
    ],
    clipMobile: resolveMediaUrl('/mobile/world_2.mp4'),
    audioTrack: resolveMediaUrl('/audio/world_2.mp3'),
    accent: '#fff',
    alignment: 'right',
    linger: 0.45,
    scroll: 20
  },
  {
    id: 'world-3',
    actId: 'act-2',
    actTitle: 'Acto II',
    actSubtitle: 'Las Almas que permanecen',
    worldNumber: 3,
    title: 'El Puente de los Cempasuchiles',
    quote: 'Las almas que amamos nunca se van; trascienden y cruzan un puente de luz entre dos mundos, lleno de petalos que guían devuelta a nuestros seres queridos. Aqui se hace sentir el latido en el viento de nuestra querida Luna, su presencia nunca se ha esfumado y su huella vive en cada estrella que hoy iluminan nuestra historia.',
    clips: [resolveMediaUrl('/desktop/world_3.mp4')],
    clipMobile: resolveMediaUrl('/mobile/world_3.mp4'),
    audioTrack: resolveMediaUrl('/audio/world_3.mp3'),
    accent: '#fff',
    alignment: 'left',
    linger: 0.45,
    scroll: 25
  },
  {
    id: 'world-4',
    actId: 'act-3',
    actTitle: 'Acto III',
    actSubtitle: 'El Principio del Mañana',
    worldNumber: 4,
    title: 'El horizonte de sueños',
    quote: 'Caminando en linea recta no puede uno llegar muy lejos... pero si miras hacia el horizonte, hacia los atardeceres dorados o los campos de cerezos notaras que el mundo espera por ser descubierto, que lo mejor de nuestra historia apenas comienza.',
    clips: [resolveMediaUrl('/desktop/world_4.mp4')],
    clipMobile: resolveMediaUrl('/mobile/world_4.mp4'),
    audioTrack: resolveMediaUrl('/audio/world_4.mp3'),
    accent: '#fff',
    alignment: 'left',
    linger: 0.45,
    scroll: 25
  },
  {
    id: 'world-5',
    actId: 'act-3',
    actTitle: 'Acto III',
    actSubtitle: 'El Principio del Mañana',
    worldNumber: 5,
    title: 'La ciudad de los ecos estelares',
    quote: 'Al final, las historias mas hermosas no son las que no tienen tormentas, sino aquellas donde dos caminantes descubren que su brujula son los ojos del otro. Este no es el final del camino, sino el portal hacia todos los universos que nos quedan por habitar juntos.',
    clips: [resolveMediaUrl('/desktop/world_5.mp4')],
    clipMobile: resolveMediaUrl('/mobile/world_5.mp4'),
    audioTrack: resolveMediaUrl('/audio/world_5.mp3'),
    accent: '#fff',
    alignment: 'left',
    linger: 0.45,
    scroll: 60 
  }
];
