import { ASSETS, DEFAULT_VOLUMES } from './assets';

type AudioChannel =
  | 'background'
  | 'shoot'
  | 'explosion'
  | 'gameOver'
  | 'virusSpawn'
  | 'corrupt'
  | 'repair'
  | 'bossDeath';

interface AudioState {
  /** Si el canal esta mutado */
  muted: Record<AudioChannel, boolean>;
  /** Volumen de cada canal (0-1) */
  volumes: Record<AudioChannel, number>;
}

const STORAGE_KEY = 'space-portfolio-audio';

function defaultMuted(): Record<AudioChannel, boolean> {
  return {
    background: false,
    shoot: false,
    explosion: false,
    gameOver: false,
    virusSpawn: false,
    corrupt: false,
    repair: false,
    bossDeath: false,
  };
}

function defaultVolumes(): Record<AudioChannel, number> {
  return { ...DEFAULT_VOLUMES };
}

/** Carga estado guardado del audio */
function loadState(): AudioState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge con defaults por si el guardado es de una version anterior
      return {
        muted: { ...defaultMuted(), ...(parsed.muted || {}) },
        volumes: { ...defaultVolumes(), ...(parsed.volumes || {}) },
      };
    }
  } catch {}
  return {
    muted: defaultMuted(),
    volumes: defaultVolumes(),
  };
}

/** Guarda estado del audio */
function saveState(state: AudioState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

class AudioManager {
  private elements: Partial<Record<AudioChannel, HTMLAudioElement>> = {};
  private state: AudioState = loadState();
  private initialized = false;

  /** Inicializa los elementos de audio (llamar en click del usuario) */
  init() {
    if (this.initialized) return;
    this.initialized = true;

    const channels: AudioChannel[] = [
      'background',
      'shoot',
      'explosion',
      'gameOver',
      'virusSpawn',
      'corrupt',
      'repair',
      'bossDeath',
    ];

    for (const channel of channels) {
      const src = ASSETS.audio[channel];
      if (!src) continue;

      const audio = new Audio();
      audio.src = src;
      audio.preload = channel === 'background' ? 'auto' : 'auto';
      audio.volume = this.state.volumes[channel] * (this.state.muted[channel] ? 0 : 1);

      if (channel === 'background') {
        audio.loop = true;
      }

      this.elements[channel] = audio;
    }
  }

  /** Reproduce un sonido */
  play(channel: AudioChannel) {
    const audio = this.elements[channel];
    if (!audio) return;

    // Si esta mutado, no reproducir
    if (this.state.muted[channel]) return;

    // Para efectos, reiniciar desde el inicio
    if (channel !== 'background') {
      audio.currentTime = 0;
    }

    audio.play().catch(() => {
      // Ignorar errores de reproduccion (autoplay policy)
    });
  }

  /** Pausa la musica de fondo */
  pauseBackground() {
    this.elements.background?.pause();
  }

  /** Reanuda la musica de fondo */
  resumeBackground() {
    const bg = this.elements.background;
    if (bg && this.state.muted.background === false) {
      bg.play().catch(() => {});
    }
  }

  /** Alterna mute de un canal */
  toggleMute(channel: AudioChannel): boolean {
    this.state.muted[channel] = !this.state.muted[channel];
    this.applyVolume(channel);
    saveState(this.state);
    return this.state.muted[channel];
  }

  /** Setea el mute de un canal */
  setMute(channel: AudioChannel, muted: boolean) {
    this.state.muted[channel] = muted;
    this.applyVolume(channel);
    saveState(this.state);
  }

  /** Setea el volumen de un canal */
  setVolume(channel: AudioChannel, volume: number) {
    this.state.volumes[channel] = Math.max(0, Math.min(1, volume));
    this.applyVolume(channel);
    saveState(this.state);
  }

  /** Aplica el volumen actual a un canal */
  private applyVolume(channel: AudioChannel) {
    const audio = this.elements[channel];
    if (!audio) return;

    const vol = this.state.volumes[channel];
    const muted = this.state.muted[channel];
    audio.volume = muted ? 0 : vol;

    // Pausar/reanudar background segun mute
    if (channel === 'background') {
      if (muted) {
        audio.pause();
      } else {
        audio.play().catch(() => {});
      }
    }
  }

  /** Obtiene si un canal esta mutado */
  isMuted(channel: AudioChannel): boolean {
    return this.state.muted[channel];
  }

  /** Obtiene el volumen de un canal */
  getVolume(channel: AudioChannel): number {
    return this.state.volumes[channel];
  }

  /** Obtiene el estado completo */
  getState(): Readonly<AudioState> {
    return this.state;
  }
}

/** Instancia singleton */
export const audioManager = new AudioManager();
