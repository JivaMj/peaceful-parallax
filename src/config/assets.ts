/**
 * ====================================================
 *  CONFIGURACION DE ASSETS - PORTAFOLIO ESPACIAL
 * ====================================================
 *
 *  IMAGENES: Reemplaza las rutas con tus propias imagenes.
 *  Formatos soportados: PNG, JPG, SVG, WebP
 *
 *  AUDIO: Coloca tus archivos de audio en public/audio/
 *  Formatos soportados: MP3, WAV, OGG, WebM
 *  Si dejas null, no se reproducira ningun sonido.
 * ====================================================
 */

export const ASSETS = {
  // ─── IMAGENES ───────────────────────────────────────
  /** Imagen de la nave espacial (cursor). null = forma vectorial */
  ship: null as string | null,

  /** Imagen de los asteroides. null = poligonos dibujados */
  asteroid: null as string | null,

  /** Imagen del proyectil/disparo. null = circulo con brillo */
  projectile: null as string | null,

  /** Iconos de habilidades (se usan en la seccion Skills) */
  icons: {
    frontend: null as string | null,
    backend: null as string | null,
    devops: null as string | null,
    mobile: null as string | null,
  },

  /** Logo / favicon */
  logo: '/favicon.svg',

  // ─── AUDIO ──────────────────────────────────────────
  audio: {
    /** Musica de fondo - se reproduce en loop */
    background: '/audio/background.mp3',

    /** Sonido de disparo de la nave */
    shoot: '/audio/shoot.mp3',

    /** Sonido de destruccion de asteroide */
    explosion: '/audio/explosion.mp3',

    /** Sonido de game over */
    gameOver: '/audio/gameover.mp3',
  },
} as const;

/** Volumenes por defecto (0.0 a 1.0) */
export const DEFAULT_VOLUMES = {
  background: 0.3,
  shoot: 0.5,
  explosion: 0.6,
  gameOver: 0.7,
} as const;

/** Helper para cargar una imagen de forma segura */
export function loadImage(
  src: string | null,
  cache: Map<string, HTMLImageElement>
): HTMLImageElement | null {
  if (!src) return null;
  if (cache.has(src)) return cache.get(src)!;

  const img = new Image();
  img.src = src;
  cache.set(src, img);
  return img;
}
