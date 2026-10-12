export type StoryAlignment = 'left' | 'right' | 'bottom';

export interface StorySection {
  id: string;
  actId: string;
  actTitle: string;
  actSubtitle: string;
  title: string;
  worldNumber: number;
  inspiration: string;
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
   * - 'left': Ocupa ~30% a la izquierda (por defecto) con narrativa y título abajo a la izquierda.
   * - 'right': Ocupa ~30% a la derecha con narrativa y título abajo a la derecha.
   * - 'bottom': Ocupa el ancho inferior centrado tradicional.
   * Nota: El indicador del Acto siempre se mantiene arriba a la izquierda sin importar esta opción.
   */
  alignment?: StoryAlignment;
  linger?: number;
  scroll?: number;
}

export interface StoryAct {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  audioTrack?: string;
}

export const STORY_ACTS: StoryAct[] = [
  {
    id: 'act-1',
    title: 'Acto I',
    subtitle: 'El Fuego y el Refugio del Presente',
    description: 'Este acto reune el aqui y el ahora: la intensidad de lo que son hoy, la pasion inquebrantable y el refugio que construyeron en su primer ano a pesar de las pruebas.',
    audioTrack: '/audio/act_1.mp3'
  },
  {
    id: 'act-2',
    title: 'Acto II',
    subtitle: 'Las Constelaciones del Dolor y las Raices',
    description: 'Viajamos hacia atras en la memoria para honrar las sombras del pasado: el duelo de las ausencias, el recuerdo eterno de Luna y el abuelo San Miguel Arcangel.',
    audioTrack: '/audio/act_2.mp3'
  },
  {
    id: 'act-3',
    title: 'Acto III',
    subtitle: 'El Principio del Manana',
    description: 'El salto hacia el porvenir, los suenos por florecer, la partida a Espana y el destino compartido.',
    audioTrack: '/audio/act_3.mp3'
  }
];

export const STORY_SECTIONS: StorySection[] = [
  {
    id: 'world-1',
    actId: 'act-1',
    actTitle: 'Acto I',
    actSubtitle: 'El Fuego y el Refugio del Presente',
    worldNumber: 1,
    title: 'Mundo 1: El Santuario de las Horas Suspendidas',
    inspiration: 'Clair Obscur: Expedition 33 y Past Lives',
    quote: 'Si uno mira con atencion, los dias dificiles no son mas que un lienzo en blanco donde dos almas deciden volverse a elegir. Aunque el camino a veces este lleno de escombros y silencios, el presente es ese lugar fragil y hermoso donde decidimos quedarnos, pintando de colores calidos un ano entero de batallas libradas codo a codo, sabiendo que el simple hecho de intentarlo ya es una victoria.',
    clips: [
      '/world_1_1.mp4',
      '/world_1_2.mp4',
      '/world_1_3.mp4',
      '/world_1_4.mp4'
    ],
    clipMobile: '/world_1_720.mp4',
    audioTrack: '/audio/world_1_angelica.mp3',
    accent: '#d4af37',
    alignment: 'left',
    linger: 0.45,
    scroll: 2.2
  },
  {
    id: 'world-2',
    actId: 'act-1',
    actTitle: 'Acto I',
    actSubtitle: 'El Fuego y el Refugio del Presente',
    worldNumber: 2,
    title: 'Mundo 2: El Atelier del Fuego Eterno y la Terraza de Medellin',
    inspiration: 'Elden Ring, Orgullo y Prejuicio y la noche bajo las estrellas',
    quote: 'Y cuando el mundo parecia desmoronarse en nuestros primeros pasos tambaleantes, el destino nos tendio una trampa de estrellas. En una terraza bajo el cielo de Medellin, sin mas testigos que la noche y la ciudad brillando a nuestros pies, supe que tu piel y la mia hablaban el mismo idioma milenario. Esta es nuestra fortaleza: un fuego indomable, una pasion feroz que desafia cualquier tormenta y nos vuelve invencibles.',
    clips: [
      // Modular: cuando existan world_2_1.mp4, etc. se anaden aqui
    ],
    audioTrack: '/audio/world_2.mp3',
    accent: '#e26d5c',
    alignment: 'left',
    linger: 0.45,
    scroll: 1.8
  },
  {
    id: 'world-3',
    actId: 'act-2',
    actTitle: 'Acto II',
    actSubtitle: 'Las Constelaciones del Dolor y las Raices',
    worldNumber: 3,
    title: 'Mundo 3: El Puente de los Cempasuchiles y Cometas',
    inspiration: 'Coco, Your Name y el duelo por Luna y el abuelo',
    quote: 'Lo esencial es invisible a los ojos. Las almas que amamos nunca se van; cruzan un puente de luz y petalos encendidos para convertirse en nuestra constelacion guia. Aqui habitan las lagrimas que sanaron la tierra: el eco eterno de tu abuelo, nuestro San Miguel Arcangel, y el latido en el viento de nuestra querida Luna, cuya huella vive en cada estrella que hoy ilumina nuestra historia.',
    clips: [],
    audioTrack: '/audio/world_3.mp3',
    accent: '#f39c12',
    alignment: 'left',
    linger: 0.45,
    scroll: 1.8
  },
  {
    id: 'world-4',
    actId: 'act-3',
    actTitle: 'Acto III',
    actSubtitle: 'El Principio del Manana',
    worldNumber: 4,
    title: 'Mundo 4: El Valle de los Cerezos y el Zorro de la Aurora',
    inspiration: 'Japon, Robot Dreams, Dune y El Principito con Venus',
    quote: 'Caminando en linea recta no puede uno llegar muy lejos... pero si miras hacia el horizonte, hacia los atardeceres dorados de un desierto lejano o los campos de cerezos que suenan con Japon, sabras que lo mejor de nuestra historia apenas comienza. Iremos a Espana tomados de la mano, con nuestra amada Venus guiando el camino, porque domesticar un corazon significa que seremos el refugio del otro por siempre y para siempre.',
    clips: [],
    audioTrack: '/audio/world_4.mp3',
    accent: '#f8a5c2',
    alignment: 'left',
    linger: 0.45,
    scroll: 1.8
  },
  {
    id: 'world-5',
    actId: 'act-3',
    actTitle: 'Acto III',
    actSubtitle: 'El Principio del Manana',
    worldNumber: 5,
    title: 'Mundo 5: La Ciudad de los Ecos Estelares',
    inspiration: 'Ciencia ficcion cosmica, union de dos mundos y eternidad',
    quote: 'Al final, las historias mas hermosas no son las que no tienen tormentas, sino aquellas donde dos caminantes descubren que su brujula son los ojos del otro. Este no es el final del camino, sino el portal hacia todos los universos que nos quedan por habitar juntos.',
    clips: [],
    audioTrack: '/audio/world_5.mp3',
    accent: '#70a1ff',
    alignment: 'left',
    linger: 0.45,
    scroll: 1.8
  }
];
