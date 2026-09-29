import { useEffect, useRef, useState, useCallback } from 'react';
import { ASSETS, loadImage } from '../config/assets';
import { audioManager } from '../config/audio';
import portfolio from '../data/portfolio.json';
import {
  corruptionStore,
  useCorruptionState,
  SECTION_ORDER,
  revealSection,
} from '../config/corruption';
import {
  VIRUS_CONFIG,
  PHASE_COLORS,
  createBoss,
  phaseForHp,
  updateBossPosition,
  spawnMinions,
  updateMinion,
  drawBoss,
  drawMinion,
  type Boss,
  type Minion,
} from '../game/virus';

const GAME_STORAGE_KEY = 'space-portfolio-game-active';

function loadGameActive(): boolean {
  try {
    const saved = localStorage.getItem(GAME_STORAGE_KEY);
    if (saved !== null) return JSON.parse(saved);
  } catch {}
  return portfolio.settings.gameEnabled;
}

interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  bounces: number;
  type: 'basic' | 'bounce' | 'minigun';
}

interface Asteroid {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  hp: number;
  maxHp: number;
  color: string;
}

interface Explosion {
  id: number;
  x: number;
  y: number;
  particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[];
}

interface ShipDamage {
  id: number;
  x: number;
  y: number;
  particles: { x: number; y: number; vx: number; vy: number; life: number }[];
}

interface Powerup {
  id: number;
  x: number;
  y: number;
  type: 'shield' | 'life';
  rotation: number;
  pulse: number;
}

type Difficulty = 'relax' | 'normal' | 'hard' | 'extreme';
type WeaponType = 'basic' | 'bounce' | 'minigun';

interface DifficultyConfig {
  id: Difficulty;
  label: string;
  shortLabel: string;
  color: string;
  collision: boolean;
  safeZone: boolean;
  speedMult: number;
  maxLives: number;
  spawnRateBase: number;
  spawnRateMin: number;
}

const DIFFICULTIES: DifficultyConfig[] = [
  { id: 'relax',    label: 'RELAX',     shortLabel: 'RLX', color: '#10b981', collision: false, safeZone: false, speedMult: 1,   maxLives: 3, spawnRateBase: 180, spawnRateMin: 100 },
  { id: 'normal',   label: 'NORMAL',    shortLabel: 'NRM', color: '#06b6d4', collision: true,  safeZone: true,  speedMult: 1,   maxLives: 3, spawnRateBase: 180, spawnRateMin: 80  },
  { id: 'hard',     label: 'HARD',      shortLabel: 'HRD', color: '#f59e0b', collision: true,  safeZone: false, speedMult: 1.2, maxLives: 3, spawnRateBase: 150, spawnRateMin: 60  },
  { id: 'extreme',  label: 'EXTREME',   shortLabel: 'XTM', color: '#ef4444', collision: true,  safeZone: false, speedMult: 1.6, maxLives: 1, spawnRateBase: 120, spawnRateMin: 40  },
];

const WEAPONS: { id: WeaponType; label: string; shortLabel: string; icon: string; color: string }[] = [
  { id: 'basic',   label: 'BASICA',    shortLabel: 'BAS', icon: '•',  color: '#06b6d4' },
  { id: 'bounce',  label: 'REBOTE',    shortLabel: 'REB', icon: '◊',  color: '#10b981' },
  { id: 'minigun', label: 'MINIGUN',   shortLabel: 'MIN', icon: '⫸', color: '#f59e0b' },
];

const ASTEROID_COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#64748b'];
const INVINCIBILITY_FRAMES = 90;
const SHIP_RADIUS = 14;
const SHIP_SPEED = 4;
const MAX_BOUNCE = 3;
const POWERUP_INTERVAL_MIN = 500;
const POWERUP_INTERVAL_MAX = 2000;

/** Lluvia matrix: daño critico y derrota del medidor */
const DAMAGE_CRITICAL_PCT = 80;
const DAMAGE_LOSE_PCT = 100;
const MATRIX_CHARS = 'ｱｲｳｴｵｶｷｸｹｺﾊﾋﾌﾍﾎ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<>=*:.';

interface RainCol {
  rx: number;
  y: number;
  speed: number;
  chars: string[];
}

let nextId = 0;
const getId = () => ++nextId;

export default function AsteroidShooter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shipRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, angle: 0 });
  const projectilesRef = useRef<Projectile[]>([]);
  const asteroidsRef = useRef<Asteroid[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const damageRef = useRef<ShipDamage[]>([]);
  const powerupsRef = useRef<Powerup[]>([]);
  const keysRef = useRef(new Set<string>());
  const mouseRef = useRef({ x: 0, y: 0 });
  const useKeyboardRef = useRef(false);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const livesRef = useRef(3);
  const maxLivesRef = useRef(3);
  const invincibleRef = useRef(0);
  const shieldRef = useRef(0);
  const lastShotRef = useRef(0);
  const frameRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const gameOverRef = useRef(false);
  const difficultyRef = useRef<Difficulty>('normal');
  const weaponRef = useRef<WeaponType>('basic');
  const nextPowerupRef = useRef(POWERUP_INTERVAL_MIN);
  const audioInitRef = useRef(false);

  const imgCacheRef = useRef(new Map<string, HTMLImageElement>());

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [invincible, setInvincible] = useState(false);
  const [shield, setShield] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [weapon, setWeapon] = useState<WeaponType>('basic');
  const [mutedBg, setMutedBg] = useState(() => audioManager.isMuted('background'));
  const [mutedFx, setMutedFx] = useState(() => audioManager.isMuted('shoot'));
  const [gameActive, setGameActive] = useState(() => loadGameActive());
  const [settingsHover, setSettingsHover] = useState(false);
  const gameActiveRef = useRef(gameActive);

  // ─── Virus boss mode ───
  const bossRef = useRef<Boss | null>(null);
  const minionsRef = useRef<Minion[]>([]);
  const damageStepRef = useRef(0);
  const virusActiveRef = useRef(false);
  const virusLostRef = useRef(false);
  const bannerTimerRef = useRef<number | null>(null);
  const rainRef = useRef<Record<string, RainCol[]>>({});
  const [virusActive, setVirusActive] = useState(false);
  const [virusLost, setVirusLost] = useState(false);
  const [bossHp, setBossHp] = useState(0);
  const [virusPhase, setVirusPhase] = useState<1 | 2 | 3>(1);
  const [virusBanner, setVirusBanner] = useState<'intro' | 'victory' | null>(null);
  const corruption = useCorruptionState();
  const infectionPct = Math.round(
    (SECTION_ORDER.reduce((sum, id) => sum + corruption[id], 0) /
      (SECTION_ORDER.length * 3)) *
      100
  );
  const virusEnabled = portfolio.settings.virusEnabled !== false;

  const getDiffConfig = useCallback(() => {
    return DIFFICULTIES.find((d) => d.id === difficultyRef.current)!;
  }, []);

  const initAudio = useCallback(() => {
    if (!audioInitRef.current) {
      audioInitRef.current = true;
      audioManager.init();
    }
  }, []);

  const resetGame = useCallback(() => {
    const config = getDiffConfig();
    scoreRef.current = 0;
    comboRef.current = 0;
    livesRef.current = config.maxLives;
    maxLivesRef.current = config.maxLives;
    invincibleRef.current = 0;
    shieldRef.current = 0;
    gameOverRef.current = false;
    nextPowerupRef.current = POWERUP_INTERVAL_MIN + Math.random() * (POWERUP_INTERVAL_MAX - POWERUP_INTERVAL_MIN);
    asteroidsRef.current = [];
    projectilesRef.current = [];
    explosionsRef.current = [];
    damageRef.current = [];
    powerupsRef.current = [];
    spawnTimerRef.current = 0;
    // Virus: limpieza total al reiniciar (sin onda de reparacion)
    bossRef.current = null;
    minionsRef.current = [];
    damageStepRef.current = 0;
    virusActiveRef.current = false;
    virusLostRef.current = false;
    setVirusActive(false);
    setVirusLost(false);
    setBossHp(0);
    setVirusPhase(1);
    setVirusBanner(null);
    rainRef.current = {};
    if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
    corruptionStore.reset();
    setScore(0);
    setCombo(0);
    setLives(config.maxLives);
    setInvincible(false);
    setShield(false);
    setGameOver(false);
    audioManager.resumeBackground();
  }, [getDiffConfig]);

  const changeDifficulty = useCallback((newDiff: Difficulty) => {
    difficultyRef.current = newDiff;
    setDifficulty(newDiff);
    resetGame();
  }, [resetGame]);

  const cycleWeapon = useCallback(() => {
    const weapons: WeaponType[] = ['basic', 'bounce', 'minigun'];
    const idx = weapons.indexOf(weaponRef.current);
    const next = weapons[(idx + 1) % weapons.length];
    weaponRef.current = next;
    setWeapon(next);
  }, []);

  const loseLife = useCallback(() => {
    livesRef.current--;
    setLives(livesRef.current);

    if (livesRef.current <= 0) {
      gameOverRef.current = true;
      setGameOver(true);
      audioManager.play('gameOver');
      audioManager.pauseBackground();
      if (scoreRef.current > highScore) {
        setHighScore(scoreRef.current);
      }
      return;
    }

    invincibleRef.current = INVINCIBILITY_FRAMES;
    setInvincible(true);

    const ship = shipRef.current;
    const particles = [];
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      particles.push({
        x: ship.x, y: ship.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1,
      });
    }
    damageRef.current.push({ id: getId(), x: ship.x, y: ship.y, particles });
  }, [highScore]);

  const shoot = useCallback(() => {
    if (gameOverRef.current || !gameActiveRef.current) return;
    const now = Date.now();

    const currentWeapon = weaponRef.current;
    const cooldown = currentWeapon === 'minigun' ? 60 : 120;
    if (now - lastShotRef.current < cooldown) return;
    lastShotRef.current = now;

    initAudio();
    audioManager.play('shoot');

    const ship = shipRef.current;
    const angle = ship.angle;
    const speed = 12;

    if (currentWeapon === 'minigun') {
      // Fire 10 bullets in a spread
      for (let i = 0; i < 10; i++) {
        const spread = (i - 4.5) * 0.08;
        const a = angle + spread;
        projectilesRef.current.push({
          id: getId(),
          x: ship.x + Math.cos(a) * 18,
          y: ship.y + Math.sin(a) * 18,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: 0.6,
          bounces: 0,
          type: 'minigun',
        });
      }
    } else {
      projectilesRef.current.push({
        id: getId(),
        x: ship.x + Math.cos(angle) * 18,
        y: ship.y + Math.sin(angle) * 18,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        bounces: 0,
        type: currentWeapon,
      });
    }
  }, [initAudio]);

  const spawnAsteroid = useCallback((canvas: HTMLCanvasElement) => {
    const config = getDiffConfig();
    const edge = Math.floor(Math.random() * 4);
    let x: number, y: number, vx: number, vy: number;
    const speed = (0.4 + Math.random() * 0.8) * config.speedMult;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    switch (edge) {
      case 0: x = Math.random() * canvas.width; y = -30; vx = (Math.random() - 0.5) * speed; vy = speed; break;
      case 1: x = canvas.width + 30; y = Math.random() * canvas.height; vx = -speed; vy = (Math.random() - 0.5) * speed; break;
      case 2: x = Math.random() * canvas.width; y = canvas.height + 30; vx = (Math.random() - 0.5) * speed; vy = -speed; break;
      default: x = -30; y = Math.random() * canvas.height; vx = speed; vy = (Math.random() - 0.5) * speed; break;
    }

    const toCx = (cx - x) * 0.0003;
    const toCy = (cy - y) * 0.0003;
    vx += toCx;
    vy += toCy;

    const size = 15 + Math.random() * 25;
    asteroidsRef.current.push({
      id: getId(),
      x, y, vx, vy, size,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.04,
      hp: size > 28 ? 2 : 1,
      maxHp: size > 28 ? 2 : 1,
      color: ASTEROID_COLORS[Math.floor(Math.random() * ASTEROID_COLORS.length)],
    });
  }, [getDiffConfig]);

  const spawnPowerup = useCallback((canvas: HTMLCanvasElement) => {
    const config = getDiffConfig();
    // life powerup not available on extreme
    const type = (config.id === 'extreme' || Math.random() > 0.5) ? 'shield' : 'life';

    powerupsRef.current.push({
      id: getId(),
      x: 100 + Math.random() * (canvas.width - 200),
      y: 100 + Math.random() * (canvas.height - 200),
      type,
      rotation: 0,
      pulse: 0,
    });
  }, [getDiffConfig]);

  const toggleMuteBackground = useCallback(() => {
    const muted = audioManager.toggleMute('background');
    setMutedBg(muted);
  }, []);

  const toggleMuteFx = useCallback(() => {
    const muted = audioManager.toggleMute('shoot');
    audioManager.setMute('explosion', muted);
    audioManager.setMute('gameOver', muted);
    audioManager.setMute('virusSpawn', muted);
    audioManager.setMute('corrupt', muted);
    audioManager.setMute('repair', muted);
    audioManager.setMute('bossDeath', muted);
    setMutedFx(muted);
  }, []);

  const toggleGameActive = useCallback(() => {
    setGameActive((prev) => {
      const next = !prev;
      try { localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const showBanner = useCallback((kind: 'intro' | 'victory', ms: number) => {
    setVirusBanner(kind);
    if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = window.setTimeout(() => setVirusBanner(null), ms);
  }, []);

  /** Abortar/limpiar modo virus. repair=true → onda de reparacion escalonada */
  const deactivateVirus = useCallback((repair: boolean) => {
    virusActiveRef.current = false;
    virusLostRef.current = false;
    setVirusActive(false);
    setVirusLost(false);
    bossRef.current = null;
    minionsRef.current = [];
    damageStepRef.current = 0;
    rainRef.current = {};
    setBossHp(0);
    setVirusPhase(1);
    setVirusBanner(null);
    if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
    if (repair) corruptionStore.repairAll(true);
    else corruptionStore.reset();
  }, []);

  const activateVirus = useCallback(() => {
    // Si hay un game over pendiente, reiniciar antes de empezar la pelea
    if (gameOverRef.current) resetGame();
    if (!gameActiveRef.current) {
      gameActiveRef.current = true;
      setGameActive(true);
      try {
        localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(true));
      } catch {}
    }
    // Limpiar modo normal para empezar la pelea
    asteroidsRef.current = [];
    powerupsRef.current = [];
    corruptionStore.reset();
    damageStepRef.current = 0;
    minionsRef.current = [];
    rainRef.current = {};
    virusLostRef.current = false;
    setVirusLost(false);
    const w = canvasRef.current?.width || window.innerWidth;
    const h = canvasRef.current?.height || window.innerHeight;
    bossRef.current = createBoss(w, h);
    setBossHp(VIRUS_CONFIG.maxHp);
    setVirusPhase(1);
    virusActiveRef.current = true;
    setVirusActive(true);
    initAudio();
    audioManager.play('virusSpawn');
    revealSection('hero');
    showBanner('intro', 3200);
  }, [initAudio, showBanner, resetGame]);

  const toggleVirus = useCallback(() => {
    if (virusActiveRef.current) deactivateVirus(true);
    else activateVirus();
  }, [activateVirus, deactivateVirus]);

  useEffect(() => {
    virusActiveRef.current = virusActive;
  }, [virusActive]);

  useEffect(() => {
    gameActiveRef.current = gameActive;
    // Apagar el juego mientras el virus esta activo → abortar la pelea
    if (!gameActive && virusActiveRef.current) deactivateVirus(true);
  }, [gameActive, deactivateVirus]);

  // Derrota: el medidor de daño llego al 100% (pagina destruida)
  useEffect(() => {
    if (virusActive && !virusLost && infectionPct >= DAMAGE_LOSE_PCT) {
      virusLostRef.current = true;
      setVirusLost(true);
      minionsRef.current = [];
      audioManager.play('gameOver');
      audioManager.pauseBackground();
    }
  }, [virusActive, virusLost, infectionPct]);

  /** Pantalla de derrota: repara todo y reinicia la pelea del virus */
  const repairAndRetry = useCallback(() => {
    virusLostRef.current = false;
    setVirusLost(false);
    resetGame();
    activateVirus();
  }, [resetGame, activateVirus]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let animId: number;

    const shipImg = loadImage(ASSETS.ship, imgCacheRef.current);
    const asteroidImg = loadImage(ASSETS.asteroid, imgCacheRef.current);
    const projectileImg = loadImage(ASSETS.projectile, imgCacheRef.current);

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      if (!useKeyboardRef.current) {
        shipRef.current.targetX = e.clientX;
        shipRef.current.targetY = e.clientY;
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (isInputFocused()) return;
      initAudio();
      const target = e.target as HTMLElement;
      if (target.closest('a') || target.closest('button') || target.closest('input') || target.closest('textarea')) return;
      useKeyboardRef.current = false;
      shoot();
    };

    const isInputFocused = () => {
      const el = document.activeElement;
      return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return;
      initAudio();
      const key = e.key.toLowerCase();

      // Weapon switch: Q or E
      if (key === 'q' || key === 'e') {
        cycleWeapon();
        return;
      }

      // Shoot: Space
      if (key === ' ') {
        e.preventDefault();
        shoot();
        return;
      }

      // Movement keys
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault();
        keysRef.current.add(key);
        useKeyboardRef.current = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isInputFocused()) {
        keysRef.current.clear();
        useKeyboardRef.current = false;
        return;
      }
      keysRef.current.delete(e.key.toLowerCase());
      if (keysRef.current.size === 0) {
        useKeyboardRef.current = false;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    /**
     * Huecos void: trozos del contenido de secciones corruptas que "desaparecen"
     * (dibujados en el canvas por encima del DOM). Cambian cada ~20 frames y
     * respeta las zonas del HUD para no tapar la barra de vida ni el score.
     * scroll-aware: usa getBoundingClientRect cada frame.
     */
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const drawCorruptionVoids = () => {
      if (prefersReduced || gameOverRef.current || virusLostRef.current) return;
      const corrupt = corruptionStore.getState();
      const w = canvas.width;
      const h = canvas.height;
      const bucket = Math.floor(frameRef.current / 20);

      const idSeed: Record<string, number> = { hero: 11, about: 23, projects: 37, skills: 53, contact: 71 };
      const rand = (i: number, seed: number) => {
        const x = Math.sin((bucket * 97 + i * 31 + seed) * 12.9898) * 43758.5453;
        return x - Math.floor(x);
      };

      // Zonas que nunca se cubren (HUD virus centrado, HUD score derecha, panel settings izq.)
      const zones = [
        { x: w / 2 - 250, y: 0, w: 500, h: 195 },
        { x: w - 260, y: 0, w: 260, h: 370 },
        { x: 0, y: h / 2 - 170, w: 245, h: 340 },
      ];
      const hits = (x: number, y: number, cw: number, ch: number) =>
        zones.some((z) => x < z.x + z.w && x + cw > z.x && y < z.y + z.h && y + ch > z.y);

      for (const id of SECTION_ORDER) {
        const lvl = corrupt[id];
        if (lvl === 0) continue;
        const el = document.getElementById(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const top = Math.max(0, r.top);
        const bottom = Math.min(h, r.bottom);
        const left = Math.max(0, r.left);
        const right = Math.min(w, r.right);
        if (bottom - top < 60 || right - left < 60) continue;
        const seed = idSeed[id] || 7;

        // Huecos void (contenido borrado)
        const chunkCount = lvl === 1 ? 2 : lvl === 2 ? 5 : 9;
        for (let i = 0; i < chunkCount; i++) {
          const cw = (right - left) * (0.06 + rand(i, seed) * (0.09 + lvl * 0.05));
          const ch = (bottom - top) * (0.025 + rand(i + 50, seed) * (0.04 + lvl * 0.03));
          const cx = left + rand(i + 100, seed) * Math.max(1, right - left - cw);
          const cy = top + rand(i + 150, seed) * Math.max(1, bottom - top - ch);
          if (hits(cx, cy, cw, ch)) continue;

          ctx.save();
          ctx.fillStyle = '#0a0a1a';
          ctx.fillRect(cx, cy, cw, ch);
          ctx.strokeStyle = `rgba(34, 197, 94, ${0.25 + lvl * 0.15})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(cx, cy, cw, ch);
          // Pixeles de "pudricion" en los bordes
          const specks = 4 + lvl * 3;
          ctx.fillStyle = '#22c55e';
          for (let s = 0; s < specks; s++) {
            const sx = cx + rand(i * 13 + s + 200, seed) * cw;
            const sy = cy + (rand(i * 17 + s + 260, seed) < 0.5 ? 0 : ch - 2);
            ctx.globalAlpha = 0.5 + rand(i + s + 300, seed) * 0.5;
            ctx.fillRect(sx, sy, 2 + rand(s + 400, seed) * 3, 2);
          }
          ctx.restore();
        }

        // Bandas de ruido glitch (nivel 2+)
        if (lvl >= 2) {
          const bands = lvl === 2 ? 1 : 3;
          for (let b = 0; b < bands; b++) {
            if (lvl === 2 && rand(b + 500, seed) < 0.4) continue;
            const by = top + rand(b + 550, seed) * (bottom - top);
            const bh = 6 + rand(b + 600, seed) * 16;
            if (by < 200 && right > w / 2 - 250 && left < w / 2 + 250) continue;
            const cols = ['#22c55e', '#f0abfc', '#06b6d4', '#ef4444'];
            const segs = 6 + Math.floor(rand(b + 650, seed) * 10);
            const segW = (right - left) / segs;
            ctx.save();
            for (let sIdx = 0; sIdx < segs; sIdx++) {
              if (rand(b * 100 + sIdx + 700, seed) < 0.55) continue;
              ctx.globalAlpha = 0.15 + rand(b + sIdx + 750, seed) * 0.4;
              ctx.fillStyle = cols[(sIdx + b) % cols.length];
              ctx.fillRect(left + sIdx * segW + rand(sIdx + 800, seed) * 6, by, segW, bh);
            }
            ctx.restore();
          }
        }
      }
    };

    /**
     * Lluvia matrix: glifos verde neón cayendo sobre cada seccion corrupta
     * (coordenadas relativas a la seccion → scrollea con ella).
     * Mas rapida/intensa cuanto mas alto es el nivel y en estado critico.
     */
    const drawMatrixRain = () => {
      if (prefersReduced || gameOverRef.current || virusLostRef.current) return;
      const corrupt = corruptionStore.getState();
      const h = canvas.height;
      const total = SECTION_ORDER.reduce((s, id) => s + corrupt[id], 0);
      const crit = Math.round((total / (SECTION_ORDER.length * 3)) * 100) >= DAMAGE_CRITICAL_PCT;

      const randChar = () => MATRIX_CHARS[(Math.random() * MATRIX_CHARS.length) | 0];

      for (const id of SECTION_ORDER) {
        const lvl = corrupt[id];
        if (lvl === 0) {
          if (rainRef.current[id]) delete rainRef.current[id];
          continue;
        }

        let columns = rainRef.current[id];
        if (!columns) {
          columns = [];
          const COUNT = 16;
          for (let i = 0; i < COUNT; i++) {
            columns.push({
              rx: (i + 0.5 + (Math.random() - 0.5) * 0.7) / COUNT,
              y: Math.random(),
              speed: 0.0022 + Math.random() * 0.003,
              chars: Array.from({ length: 12 }, randChar),
            });
          }
          rainRef.current[id] = columns;
        }

        const el = document.getElementById(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const viewTop = Math.max(0, r.top);
        const viewBottom = Math.min(h, r.bottom);
        if (viewBottom - viewTop < 40 || r.width < 40) continue;

        const fs = 15;
        const lineH = fs + 4;
        const intensity = (0.4 + lvl * 0.2) * (crit ? 1.35 : 1);
        const speedMul = (1 + lvl * 0.3) * (crit ? 1.6 : 1);

        ctx.save();
        ctx.font = `700 ${fs}px 'Courier New', monospace`;
        ctx.textAlign = 'center';

        for (const col of columns) {
          col.y += col.speed * speedMul;
          if (col.y > 1.25) {
            col.y = -0.08 - Math.random() * 0.2;
            for (let c = 0; c < col.chars.length; c++) col.chars[c] = randChar();
          } else if (Math.random() < 0.15) {
            col.chars[(Math.random() * col.chars.length) | 0] = randChar();
          }

          const x = r.left + col.rx * r.width;
          const headY = r.top + col.y * r.height;

          for (let t = 0; t < col.chars.length; t++) {
            const py = headY - t * lineH;
            // Dentro de la seccion y del viewport
            if (py < Math.max(r.top, viewTop) - lineH || py > Math.min(r.bottom, viewBottom)) continue;
            if (py < r.top || py > r.bottom) continue;
            if (t === 0) {
              ctx.fillStyle = `rgba(234, 255, 234, ${Math.min(1, intensity)})`;
              ctx.shadowColor = '#4ade80';
              ctx.shadowBlur = 8;
            } else {
              const a = (1 - t / col.chars.length) * intensity;
              ctx.fillStyle = `rgba(74, 222, 128, ${a.toFixed(3)})`;
              ctx.shadowBlur = 0;
            }
            ctx.fillText(col.chars[t], x, py);
          }
        }
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    };

    /** Victoria: explosion grande, reparacion total escalonada y banner */
    const bossDefeated = (boss: Boss) => {
      const particles = [];
      const count = 34;
      for (let j = 0; j < count; j++) {
        const a = (Math.PI * 2 * j) / count + Math.random() * 0.6;
        const sp = 1.5 + Math.random() * 4;
        particles.push({
          x: boss.x,
          y: boss.y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 1,
          color: j % 3 === 0 ? '#f0abfc' : j % 3 === 1 ? '#22c55e' : '#f8fafc',
        });
      }
      explosionsRef.current.push({ id: getId(), x: boss.x, y: boss.y, particles });
      audioManager.play('bossDeath');
      scoreRef.current += 500;
      setScore(scoreRef.current);
      corruptionStore.repairAll(true);
      minionsRef.current = [];
      bossRef.current = null;
      damageStepRef.current = 0;
      setBossHp(0);
      virusActiveRef.current = false;
      setVirusActive(false);
      showBanner('victory', 4200);
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frameRef.current++;

      const config = getDiffConfig();
      const keys = keysRef.current;

      // Huecos void + lluvia matrix de las secciones corruptas (debajo de nave/boss)
      drawCorruptionVoids();
      drawMatrixRain();

      if (!gameOverRef.current && gameActiveRef.current) {
        spawnTimerRef.current++;

        if (!virusActiveRef.current) {
          // Spawn asteroids
          const spawnRate = Math.max(config.spawnRateMin, config.spawnRateBase - Math.floor(scoreRef.current / 50));
          if (spawnTimerRef.current >= spawnRate) {
            spawnAsteroid(canvas);
            spawnTimerRef.current = 0;
          }

          // Spawn powerups
          if (scoreRef.current >= nextPowerupRef.current) {
            spawnPowerup(canvas);
            nextPowerupRef.current = scoreRef.current + POWERUP_INTERVAL_MIN + Math.random() * (POWERUP_INTERVAL_MAX - POWERUP_INTERVAL_MIN);
          }
        }

        // Update invincibility
        if (invincibleRef.current > 0) {
          invincibleRef.current--;
          if (invincibleRef.current <= 0) {
            setInvincible(false);
          }
        }

        // Update shield
        if (shieldRef.current > 0) {
          shieldRef.current--;
          if (shieldRef.current <= 0) {
            setShield(false);
          }
        }
      }

      // Update ship movement
      const ship = shipRef.current;

      if (useKeyboardRef.current) {
        let dx = 0;
        let dy = 0;
        if (keys.has('w') || keys.has('arrowup')) dy -= 1;
        if (keys.has('s') || keys.has('arrowdown')) dy += 1;
        if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
        if (keys.has('d') || keys.has('arrowright')) dx += 1;

        if (dx !== 0 || dy !== 0) {
          const len = Math.sqrt(dx * dx + dy * dy);
          ship.targetX = ship.x + (dx / len) * SHIP_SPEED * 10;
          ship.targetY = ship.y + (dy / len) * SHIP_SPEED * 10;
        }
      }

      const lerp = 0.12;
      ship.x += (ship.targetX - ship.x) * lerp;
      ship.y += (ship.targetY - ship.y) * lerp;

      // Clamp to screen
      ship.x = Math.max(20, Math.min(canvas.width - 20, ship.x));
      ship.y = Math.max(20, Math.min(canvas.height - 20, ship.y));

      // Angle: keyboard uses last movement direction, mouse uses mouse position
      if (useKeyboardRef.current && (keys.size > 0)) {
        const kdx = ship.targetX - ship.x;
        const kdy = ship.targetY - ship.y;
        if (Math.abs(kdx) > 1 || Math.abs(kdy) > 1) {
          ship.angle = Math.atan2(kdy, kdx);
        }
      } else {
        ship.angle = Math.atan2(mouseRef.current.y - ship.y, mouseRef.current.x - ship.x);
      }

      const safeZone = {
        x: canvas.width - 220,
        y: 70,
        w: 220,
        h: 260,
      };

      // Draw ship
      if (ship.x > 0 && ship.y > 0) {
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.angle);

        if (invincibleRef.current > 0) {
          ctx.globalAlpha = 0.4 + Math.sin(frameRef.current * 0.5) * 0.4;
        }

        if (shipImg && shipImg.complete && shipImg.naturalWidth > 0) {
          const size = 40;
          ctx.drawImage(shipImg, -size / 2, -size / 2, size, size);
        } else {
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
          gradient.addColorStop(0, 'rgba(124, 58, 237, 0.15)');
          gradient.addColorStop(1, 'rgba(124, 58, 237, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, 30, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#a78bfa';
          ctx.strokeStyle = '#7c3aed';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(18, 0);
          ctx.lineTo(-10, -10);
          ctx.lineTo(-6, 0);
          ctx.lineTo(-10, 10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          const flicker = 4 + Math.sin(frameRef.current * 0.5) * 3;
          ctx.fillStyle = '#06b6d4';
          ctx.beginPath();
          ctx.moveTo(-6, -3);
          ctx.lineTo(-6 - flicker, 0);
          ctx.lineTo(-6, 3);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();

        // Draw shield
        if (shieldRef.current > 0) {
          ctx.save();
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.3 + Math.sin(frameRef.current * 0.1) * 0.2;
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(ship.x, ship.y, SHIP_RADIUS + 12, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Draw safe zone border
      if (config.safeZone && !gameOverRef.current && !virusActiveRef.current) {
        ctx.save();
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(safeZone.x, safeZone.y, safeZone.w, safeZone.h);
        ctx.setLineDash([]);
        ctx.restore();
      }

      // Update & draw projectiles
      if (gameActiveRef.current) {
      projectilesRef.current = projectilesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.012;

        if (p.life <= 0) return false;

        // Bounce off walls
        if (p.type === 'bounce' && p.bounces < MAX_BOUNCE) {
          if (p.x < 5 || p.x > canvas.width - 5) {
            p.vx *= -1;
            p.bounces++;
            p.x = Math.max(5, Math.min(canvas.width - 5, p.x));
          }
          if (p.y < 5 || p.y > canvas.height - 5) {
            p.vy *= -1;
            p.bounces++;
            p.y = Math.max(5, Math.min(canvas.height - 5, p.y));
          }
        } else {
          if (p.x < -20 || p.x > canvas.width + 20 || p.y < -20 || p.y > canvas.height + 20) return false;
        }

        ctx.save();
        ctx.globalAlpha = p.life;

        if (projectileImg && projectileImg.complete && projectileImg.naturalWidth > 0) {
          const size = 12;
          ctx.drawImage(projectileImg, p.x - size / 2, p.y - size / 2, size, size);
        } else {
          const color = p.type === 'bounce' ? '#10b981' : p.type === 'minigun' ? '#f59e0b' : '#06b6d4';
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.type === 'minigun' ? 1.5 : 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = p.life * 0.3;
          ctx.beginPath();
          ctx.arc(p.x - p.vx * 0.5, p.y - p.vy * 0.5, 1, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
        return true;
      });

      // Update & draw asteroids
      asteroidsRef.current = asteroidsRef.current.filter((a) => {
        a.x += a.vx;
        a.y += a.vy;
        a.rotation += a.rotationSpeed;

        if (a.x < -80 || a.x > canvas.width + 80 || a.y < -80 || a.y > canvas.height + 80) return false;

        // Safe zone
        if (config.safeZone && !gameOverRef.current) {
          if (
            a.x > safeZone.x && a.x < safeZone.x + safeZone.w &&
            a.y > safeZone.y && a.y < safeZone.y + safeZone.h
          ) {
            const pushX = a.x < safeZone.x + safeZone.w / 2 ? -3 : 3;
            const pushY = a.y < safeZone.y + safeZone.h / 2 ? -3 : 3;
            a.vx += pushX;
            a.vy += pushY;
          }
        }

        // Check collision with ship
        if (config.collision && invincibleRef.current <= 0 && !gameOverRef.current) {
          const dx = ship.x - a.x;
          const dy = ship.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < SHIP_RADIUS + a.size * 0.6) {
            if (shieldRef.current > 0) {
              // Shield absorbs hit
              shieldRef.current = 0;
              setShield(false);
              const pushAngle = Math.atan2(a.y - ship.y, a.x - ship.x);
              a.vx += Math.cos(pushAngle) * 5;
              a.vy += Math.sin(pushAngle) * 5;
            } else {
              loseLife();
              const pushAngle = Math.atan2(a.y - ship.y, a.x - ship.x);
              a.vx += Math.cos(pushAngle) * 3;
              a.vy += Math.sin(pushAngle) * 3;
            }
            return true;
          }
        }

        // Check collision with projectiles
        for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
          const p = projectilesRef.current[i];
          const dx = p.x - a.x;
          const dy = p.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < a.size + 5) {
            a.hp--;
            if (p.type !== 'bounce') {
              projectilesRef.current.splice(i, 1);
            }

            if (a.hp <= 0) {
              audioManager.play('explosion');

              const particles = [];
              const count = 8 + Math.floor(Math.random() * 6);
              for (let j = 0; j < count; j++) {
                const angle = (Math.PI * 2 * j) / count + Math.random() * 0.5;
                const speed = 1 + Math.random() * 3;
                particles.push({
                  x: a.x, y: a.y,
                  vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                  life: 1, color: a.color,
                });
              }
              explosionsRef.current.push({ id: getId(), x: a.x, y: a.y, particles });

              comboRef.current++;
              const points = 10 * comboRef.current;
              scoreRef.current += points;
              setScore(scoreRef.current);
              setCombo(comboRef.current);

              setTimeout(() => {
                comboRef.current = 0;
                setCombo(0);
              }, 2000);

              return false;
            }
            break;
          }
        }

        // Draw asteroid
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.rotation);

        if (asteroidImg && asteroidImg.complete && asteroidImg.naturalWidth > 0) {
          const drawSize = a.size * 2;
          ctx.drawImage(asteroidImg, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        } else {
          ctx.shadowColor = a.color;
          ctx.shadowBlur = a.hp > 1 ? 12 : 6;

          ctx.fillStyle = `${a.color}30`;
          ctx.strokeStyle = a.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          const sides = 7;
          for (let i = 0; i <= sides; i++) {
            const angle = (Math.PI * 2 * i) / sides;
            const r = a.size * (0.75 + Math.sin(i * 2.7) * 0.25);
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          if (a.hp > 1) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = a.color;
            ctx.font = "bold 10px 'Orbitron', monospace";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(a.hp), 0, 0);
          }
        }

        ctx.restore();
        return true;
      });

      // ─── VIRUS BOSS: update, infeccion, minions y combate ───
      if (virusActiveRef.current && bossRef.current) {
        const boss = bossRef.current;

        const newPhase = phaseForHp(boss.hp, boss.maxHp);
        if (newPhase !== boss.phase) {
          boss.phase = newPhase;
          setVirusPhase(newPhase);
        }

        // Movimiento scroll-aware: persigue el centro de su seccion objetivo
        updateBossPosition(boss, frameRef.current, canvas.width, canvas.height);

        if (!boss.entering && !gameOverRef.current && !virusLostRef.current) {
          const conf = VIRUS_CONFIG.phases[boss.phase];

          // Timer de ataque → infectar siguiente seccion (ciclica)
          boss.attackTimer--;
          if (boss.attackTimer <= 0) {
            const infected = corruptionStore.infectNext();
            if (infected) {
              boss.targetSection = infected;
              revealSection(infected);
              audioManager.play('corrupt');
            }
            boss.attackTimer = conf.attackInterval;
          }

          // Timer de invocacion → minions glitch
          boss.summonTimer--;
          if (boss.summonTimer <= 0) {
            const room = VIRUS_CONFIG.maxMinions - minionsRef.current.length;
            const count = Math.min(conf.minionCount, Math.max(0, room));
            if (count > 0) {
              minionsRef.current.push(...spawnMinions(boss, count));
            }
            boss.summonTimer = conf.summonInterval;
          }

          // Proyectiles vs boss
          for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
            const p = projectilesRef.current[i];
            const dx = p.x - boss.x;
            const dy = p.y - boss.y;
            if (Math.sqrt(dx * dx + dy * dy) < VIRUS_CONFIG.radius + 8) {
              projectilesRef.current.splice(i, 1);
              boss.hp = Math.max(0, boss.hp - 1);
              boss.hitFlash = 6;
              scoreRef.current += 5;
              setScore(scoreRef.current);
              setBossHp(boss.hp);

              // Reparacion hibrida: cada N golpes se empuja un nivel de infeccion
              damageStepRef.current++;
              if (damageStepRef.current >= VIRUS_CONFIG.damagePerStep) {
                damageStepRef.current = 0;
                if (corruptionStore.repairMost()) {
                  audioManager.play('repair');
                }
              }

              if (boss.hp <= 0) {
                bossDefeated(boss);
                break;
              }
            }
          }
        }

        // Minions: persiguen la nave, colisionan y mueren a disparos
        if (bossRef.current && !virusLostRef.current) {
          minionsRef.current = minionsRef.current.filter((m) => {
            updateMinion(m, ship.x, ship.y);

            const mdx = ship.x - m.x;
            const mdy = ship.y - m.y;
            const mdist = Math.sqrt(mdx * mdx + mdy * mdy);

            if (
              config.collision &&
              invincibleRef.current <= 0 &&
              !gameOverRef.current &&
              mdist < SHIP_RADIUS + VIRUS_CONFIG.minionRadius
            ) {
              if (shieldRef.current > 0) {
                shieldRef.current = 0;
                setShield(false);
              } else {
                loseLife();
              }
              const zap = [];
              const zcount = 8;
              for (let j = 0; j < zcount; j++) {
                const a = (Math.PI * 2 * j) / zcount;
                zap.push({
                  x: m.x,
                  y: m.y,
                  vx: Math.cos(a) * (1 + Math.random() * 2),
                  vy: Math.sin(a) * (1 + Math.random() * 2),
                  life: 1,
                  color: '#f0abfc',
                });
              }
              explosionsRef.current.push({ id: getId(), x: m.x, y: m.y, particles: zap });
              audioManager.play('explosion');
              return false;
            }

            for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
              const p = projectilesRef.current[i];
              const pdx = p.x - m.x;
              const pdy = p.y - m.y;
              if (Math.sqrt(pdx * pdx + pdy * pdy) < VIRUS_CONFIG.minionRadius + 6) {
                projectilesRef.current.splice(i, 1);
                m.hp--;
                if (m.hp <= 0) {
                  audioManager.play('explosion');
                  const parts = [];
                  const count = 6 + Math.floor(Math.random() * 4);
                  for (let j = 0; j < count; j++) {
                    const a = (Math.PI * 2 * j) / count + Math.random() * 0.5;
                    parts.push({
                      x: m.x,
                      y: m.y,
                      vx: Math.cos(a) * (1 + Math.random() * 2),
                      vy: Math.sin(a) * (1 + Math.random() * 2),
                      life: 1,
                      color: j % 2 ? '#f0abfc' : '#ef4444',
                    });
                  }
                  explosionsRef.current.push({ id: getId(), x: m.x, y: m.y, particles: parts });
                  comboRef.current++;
                  scoreRef.current += 10 * comboRef.current;
                  setScore(scoreRef.current);
                  setCombo(comboRef.current);
                  setTimeout(() => {
                    comboRef.current = 0;
                    setCombo(0);
                  }, 2000);
                  return false;
                }
                break;
              }
            }

            drawMinion(ctx, m, frameRef.current);
            return true;
          });
        }

        if (bossRef.current) {
          drawBoss(ctx, bossRef.current, frameRef.current, ship.x, ship.y);
        }
      }

      // Update & draw powerups
      powerupsRef.current = powerupsRef.current.filter((pu) => {
        pu.rotation += 0.02;
        pu.pulse += 0.05;

        // Check collection by ship
        const dx = ship.x - pu.x;
        const dy = ship.y - pu.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < SHIP_RADIUS + 20) {
          if (pu.type === 'shield') {
            shieldRef.current = 300; // ~5 seconds
            setShield(true);
          } else if (pu.type === 'life' && livesRef.current < maxLivesRef.current) {
            livesRef.current++;
            setLives(livesRef.current);
          }
          return false;
        }

        // Draw powerup
        const color = pu.type === 'shield' ? '#10b981' : '#ef4444';
        const pulseScale = 1 + Math.sin(pu.pulse) * 0.15;

        ctx.save();
        ctx.translate(pu.x, pu.y);
        ctx.scale(pulseScale, pulseScale);

        // Glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.fillStyle = `${color}20`;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        if (pu.type === 'shield') {
          // Shield icon: hexagon
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6 + pu.rotation;
            const px = Math.cos(angle) * 16;
            const py = Math.sin(angle) * 16;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = color;
          ctx.font = "bold 11px 'Orbitron', monospace";
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('S', 0, 0);
        } else {
          // Life icon: heart-ish shape
          ctx.beginPath();
          ctx.arc(-5, -3, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(5, -3, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-11, 0);
          ctx.quadraticCurveTo(0, 16, 11, 0);
          ctx.fill();
          ctx.stroke();
        }

        ctx.restore();
        return true;
      });

      // Update & draw explosions
      explosionsRef.current = explosionsRef.current.filter((exp) => {
        let alive = false;
        exp.particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.life -= 0.025;
          if (p.life > 0) alive = true;

          ctx.save();
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2 * p.life + 1, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
        return alive;
      });

      // Update & draw ship damage particles
      damageRef.current = damageRef.current.filter((d) => {
        let alive = false;
        d.particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.life -= 0.03;
          if (p.life > 0) alive = true;

          ctx.save();
          ctx.globalAlpha = p.life;
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2 * p.life + 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
        return alive;
      });
      } // end gameActive check

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [shoot, spawnAsteroid, spawnPowerup, loseLife, getDiffConfig, initAudio, cycleWeapon, showBanner]);

  const currentDiff = DIFFICULTIES.find((d) => d.id === difficulty)!;
  const currentWeapon = WEAPONS.find((w) => w.id === weapon)!;
  const damageCrit = virusActive && infectionPct >= DAMAGE_CRITICAL_PCT;

  return (
    <>
      {/* Spatial Settings Panel - left side, hover activated */}
      <div
        style={{ position: 'fixed', left: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 10001 }}
        onMouseEnter={() => setSettingsHover(true)}
        onMouseLeave={() => setSettingsHover(false)}
      >
        {/* Collapsed trigger - small floating orb */}
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '0 8px 8px 0',
          background: settingsHover ? 'rgba(21, 21, 48, 0.95)' : 'rgba(21, 21, 48, 0.7)',
          border: `1px solid ${settingsHover ? 'rgba(124, 58, 237, 0.5)' : 'rgba(30, 41, 59, 0.4)'}`,
          borderLeft: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          backdropFilter: 'blur(8px)',
          boxShadow: settingsHover ? '0 0 20px rgba(124, 58, 237, 0.2)' : 'none',
        }}>
          <div style={{
            width: '14px',
            height: '14px',
            border: `2px solid ${settingsHover ? '#a78bfa' : '#475569'}`,
            borderRadius: '50%',
            position: 'relative',
            transition: 'all 0.3s ease',
          }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: settingsHover ? '#a78bfa' : '#475569',
              transition: 'all 0.3s ease',
            }} />
            {/* Orbiting dot */}
            <div style={{
              position: 'absolute',
              top: '-3px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '3px',
              height: '3px',
              borderRadius: '50%',
              background: settingsHover ? '#22d3ee' : '#334155',
              transition: 'all 0.3s ease',
              animation: settingsHover ? 'orbit 2s linear infinite' : 'none',
            }} />
          </div>
        </div>

        {/* Expanded panel */}
        <div style={{
          position: 'absolute',
          left: '36px',
          top: '50%',
          transform: `translateY(-50%) translateX(${settingsHover ? '0' : '-10px'})`,
          opacity: settingsHover ? 1 : 0,
          pointerEvents: settingsHover ? 'auto' : 'none',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          width: '200px',
        }}>
          <div style={{
            background: 'rgba(15, 15, 42, 0.95)',
            border: '1px solid rgba(124, 58, 237, 0.3)',
            borderRadius: '0 12px 12px 0',
            padding: '1rem',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 0 30px rgba(10, 10, 26, 0.8)',
          }}>
            {/* Panel header */}
            <div style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '0.55rem',
              letterSpacing: '0.2em',
              color: '#a78bfa',
              textTransform: 'uppercase',
              marginBottom: '0.75rem',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid rgba(124, 58, 237, 0.2)',
            }}>
              Panel de Control
            </div>

            {/* Game toggle */}
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.5rem', letterSpacing: '0.12em', color: '#cbd5e1' }}>JUEGO</span>
                <button
                  onClick={toggleGameActive}
                  aria-label={gameActive ? 'Desactivar juego' : 'Activar juego'}
                  style={{
                    padding: '0.2rem 0.5rem',
                    background: gameActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                    border: `1px solid ${gameActive ? 'rgba(16, 185, 129, 0.5)' : 'rgba(100, 116, 139, 0.4)'}`,
                    borderRadius: '4px',
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: '0.5rem',
                    color: gameActive ? '#10b981' : '#94a3b8',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {gameActive ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Virus boss toggle */}
            {virusEnabled && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.5rem', letterSpacing: '0.12em', color: '#cbd5e1' }}>VIRUS</span>
                  <button
                    onClick={toggleVirus}
                    aria-label={virusActive ? 'Detener el virus' : 'Activar el boss virus'}
                    style={{
                      padding: '0.2rem 0.5rem',
                      background: virusActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                      border: `1px solid ${virusActive ? 'rgba(239, 68, 68, 0.5)' : 'rgba(100, 116, 139, 0.4)'}`,
                      borderRadius: '4px',
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: '0.5rem',
                      color: virusActive ? '#ef4444' : '#94a3b8',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {virusActive ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            )}

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(30, 41, 59, 0.5)', marginBottom: '0.75rem' }} />

            {/* Audio section */}
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.5rem', letterSpacing: '0.12em', color: '#cbd5e1' }}>MUSICA</span>
                <button
                  onClick={toggleMuteBackground}
                  aria-label={mutedBg ? 'Activar musica' : 'Desactivar musica'}
                  style={{
                    padding: '0.2rem 0.5rem',
                    background: mutedBg ? 'rgba(100, 116, 139, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    border: `1px solid ${mutedBg ? 'rgba(100, 116, 139, 0.4)' : 'rgba(16, 185, 129, 0.5)'}`,
                    borderRadius: '4px',
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: '0.5rem',
                    color: mutedBg ? '#94a3b8' : '#10b981',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {mutedBg ? 'OFF' : 'ON'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.5rem', letterSpacing: '0.12em', color: '#cbd5e1' }}>EFECTOS</span>
                <button
                  onClick={toggleMuteFx}
                  aria-label={mutedFx ? 'Activar efectos' : 'Desactivar efectos'}
                  style={{
                    padding: '0.2rem 0.5rem',
                    background: mutedFx ? 'rgba(100, 116, 139, 0.2)' : 'rgba(6, 182, 212, 0.2)',
                    border: `1px solid ${mutedFx ? 'rgba(100, 116, 139, 0.4)' : 'rgba(6, 182, 212, 0.5)'}`,
                    borderRadius: '4px',
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: '0.5rem',
                    color: mutedFx ? '#94a3b8' : '#06b6d4',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {mutedFx ? 'OFF' : 'ON'}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(30, 41, 59, 0.5)', margin: '0.75rem 0' }} />

            {/* Difficulty quick select */}
            <div style={{ marginBottom: '0.4rem' }}>
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.45rem', letterSpacing: '0.12em', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>DIFICULTAD</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => changeDifficulty(d.id)}
                    style={{
                      padding: '0.25rem 0.3rem',
                      background: difficulty === d.id ? `${d.color}20` : 'rgba(30, 41, 59, 0.3)',
                      border: `1px solid ${difficulty === d.id ? `${d.color}50` : 'rgba(30, 41, 59, 0.3)'}`,
                      borderRadius: '4px',
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: '0.45rem',
                      letterSpacing: '0.08em',
                      color: difficulty === d.id ? d.color : '#64748b',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {d.shortLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(30, 41, 59, 0.5)', margin: '0.6rem 0' }} />

            {/* Weapon quick select */}
            <div>
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.45rem', letterSpacing: '0.12em', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>ARMA</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {WEAPONS.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => { weaponRef.current = w.id; setWeapon(w.id); }}
                    style={{
                      flex: 1,
                      padding: '0.25rem 0.3rem',
                      background: weapon === w.id ? `${w.color}20` : 'rgba(30, 41, 59, 0.3)',
                      border: `1px solid ${weapon === w.id ? `${w.color}50` : 'rgba(30, 41, 59, 0.3)'}`,
                      borderRadius: '4px',
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: '0.45rem',
                      color: weapon === w.id ? w.color : '#64748b',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.2rem',
                    }}
                  >
                    <span style={{ fontSize: '0.6rem' }}>{w.icon}</span>
                    {w.shortLabel || w.label.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game canvas - always renders for cursor */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 10005,
        }}
      />

      {/* HUD (only when game active) */}
      {gameActive && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 10000,
            }}
          >
          <div
            style={{
              position: 'fixed',
              top: '5rem',
              right: '1.5rem',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '0.4rem',
            }}
          >
            {/* Active effects */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.3rem' }}>
              {shield && (
                <div
                  style={{
                    padding: '0.2rem 0.5rem',
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    borderRadius: '4px',
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: '0.45rem',
                    color: '#10b981',
                    letterSpacing: '0.1em',
                  }}
                >
                  ESCUDO
                </div>
              )}
            </div>

            {/* Lives */}
            <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.3rem' }}>
              {[...Array(currentDiff.maxLives)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '3px',
                    border: `1px solid ${i < lives ? '#ef4444' : '#334155'}`,
                    background: i < lives ? '#ef4444' : 'transparent',
                    boxShadow: i < lives ? '0 0 8px rgba(239, 68, 68, 0.5)' : 'none',
                    transition: 'all 0.3s ease',
                    opacity: invincible && i < lives ? (0.5 + Math.sin(frameRef.current * 0.3) * 0.5) : 1,
                  }}
                />
              ))}
            </div>

            {/* Score */}
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.6rem', letterSpacing: '0.15em', color: '#64748b' }}>SCORE</div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.6rem', fontWeight: 800, color: '#06b6d4', textShadow: '0 0 12px rgba(6, 182, 212, 0.5)', lineHeight: 1 }}>
              {String(score).padStart(5, '0')}
            </div>

            {combo > 1 && (
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', textShadow: '0 0 10px rgba(245, 158, 11, 0.5)', animation: 'comboPop 0.3s ease-out' }}>
                x{combo} COMBO
              </div>
            )}

            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.55rem', letterSpacing: '0.1em', color: '#475569', marginTop: '0.3rem' }}>
              HI: {String(highScore).padStart(5, '0')}
            </div>

            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.5rem', letterSpacing: '0.1em', color: currentDiff.color, marginTop: '0.2rem', opacity: 0.6 }}>
              {currentDiff.label}
            </div>

            {/* Controls hint */}
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.45rem', letterSpacing: '0.08em', color: '#334155', marginTop: '0.5rem', textAlign: 'right', lineHeight: 2 }}>
              WASD/FLECHAS = MOVER
              <br />
              ESPACIO = DISPARAR
              <br />
              Q/E = CAMBIAR ARMA
            </div>
          </div>

          {/* Virus HUD - barra de vida del boss + medidor de daño (scroll-aware) */}
          {virusActive && !virusLost && (
            <div style={{
              position: 'fixed',
              top: '1.2rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10000,
              pointerEvents: 'none',
              width: 'min(440px, 74vw)',
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '0.55rem',
                letterSpacing: '0.25em',
                color: PHASE_COLORS[virusPhase],
                marginBottom: '0.35rem',
                textShadow: `0 0 10px ${PHASE_COLORS[virusPhase]}66`,
              }}>
                VIRUS.EXE // FASE {virusPhase}
              </div>

              {/* Barra de vida del boss (segmentada) */}
              <div style={{
                position: 'relative',
                height: '14px',
                background: 'rgba(10, 10, 26, 0.85)',
                border: '1px solid rgba(30, 41, 59, 0.8)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: `${(bossHp / VIRUS_CONFIG.maxHp) * 100}%`,
                  background: `linear-gradient(90deg, #22c55e, ${PHASE_COLORS[virusPhase]})`,
                  transition: 'width 0.15s ease',
                  boxShadow: `0 0 12px ${PHASE_COLORS[virusPhase]}80`,
                }} />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'repeating-linear-gradient(90deg, transparent 0 21px, rgba(10, 10, 26, 0.9) 21px 23px)',
                }} />
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '0.3rem',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '0.45rem',
                color: '#64748b',
                letterSpacing: '0.12em',
              }}>
                <span>HP {bossHp}/{VIRUS_CONFIG.maxHp}</span>
                <span>GOLPES/REP: {damageStepRef.current}/{VIRUS_CONFIG.damagePerStep}</span>
              </div>

              {/* Medidor de DAÑO: critico al 80%, derrota al 100% */}
              <div style={{
                position: 'relative',
                marginTop: '0.35rem',
                height: '8px',
                background: 'rgba(10, 10, 26, 0.85)',
                border: `1px solid ${damageCrit ? 'rgba(239, 68, 68, 0.8)' : 'rgba(30, 41, 59, 0.6)'}`,
                borderRadius: '2px',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${infectionPct}%`,
                  background: damageCrit
                    ? 'linear-gradient(90deg, #ef4444, #ff1744)'
                    : 'linear-gradient(90deg, #f59e0b, #ef4444)',
                  transition: 'width 0.3s ease',
                  animation: damageCrit ? 'critBlink 0.7s steps(2) infinite' : 'none',
                }} />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'repeating-linear-gradient(90deg, transparent 0 9px, rgba(10, 10, 26, 0.5) 9px 10px)',
                  zIndex: 1,
                }} />
                {/* Marca de critico al 80% */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: `${DAMAGE_CRITICAL_PCT}%`,
                  width: '2px',
                  height: '100%',
                  background: 'rgba(255, 255, 255, 0.9)',
                  zIndex: 2,
                }} />
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '0.25rem',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: damageCrit ? '0.5rem' : '0.45rem',
                letterSpacing: '0.18em',
                color: damageCrit ? '#ef4444' : '#94a3b8',
                animation: damageCrit ? 'critLabel 0.7s steps(2) infinite' : 'none',
              }}>
                <span>{damageCrit ? '⚠ DAÑO CRITICO' : 'DAÑO'} {infectionPct}%</span>
                <span style={{ color: '#475569' }}>MAX 100%</span>
              </div>

              {/* Chips por seccion: nivel + click para hacer scroll hasta ella */}
              <div style={{
                display: 'flex',
                gap: '0.35rem',
                justifyContent: 'center',
                marginTop: '0.45rem',
                pointerEvents: 'auto',
                flexWrap: 'wrap',
              }}>
                {SECTION_ORDER.map((id) => {
                  const lvl = corruption[id];
                  const col = lvl >= 3 ? '#ef4444' : lvl === 2 ? '#f59e0b' : lvl === 1 ? '#facc15' : '#334155';
                  return (
                    <button
                      key={id}
                      onClick={() => revealSection(id)}
                      aria-label={`Ir a la seccion ${id} (infeccion nivel ${lvl})`}
                      title="Click para ir a la seccion"
                      style={{
                        background: lvl > 0 ? `${col}22` : 'rgba(30, 41, 59, 0.3)',
                        border: `1px solid ${lvl > 0 ? `${col}66` : 'rgba(30, 41, 59, 0.5)'}`,
                        borderRadius: '3px',
                        padding: '0.15rem 0.35rem',
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: '0.42rem',
                        letterSpacing: '0.1em',
                        color: col,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {id.slice(0, 3).toUpperCase()}{lvl > 0 ? ` ${lvl}` : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Virus banners: intro / victoria */}
          {virusBanner && (
            <div style={{
              position: 'fixed',
              top: '32%',
              left: 0,
              width: '100%',
              textAlign: 'center',
              zIndex: 10001,
              pointerEvents: 'none',
              animation: 'virusBannerPop 0.4s ease-out',
            }}>
              <div style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 'clamp(1.3rem, 5vw, 3rem)',
                fontWeight: 900,
                letterSpacing: '0.3em',
                color: virusBanner === 'intro' ? '#ef4444' : '#22c55e',
                animation: virusBanner === 'intro' ? 'virusGlitchText 0.6s steps(2) infinite' : 'none',
                textShadow: virusBanner === 'intro'
                  ? '0 0 25px rgba(239, 68, 68, 0.7), 3px 0 0 rgba(6, 182, 212, 0.7), -3px 0 0 rgba(240, 171, 222, 0.7)'
                  : '0 0 25px rgba(34, 197, 94, 0.7)',
              }}>
                {virusBanner === 'intro' ? 'VIRUS DETECTADO' : 'SISTEMA RESTAURADO'}
              </div>
              <div style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 'clamp(0.5rem, 1.5vw, 0.7rem)',
                letterSpacing: '0.2em',
                color: '#94a3b8',
                marginTop: '0.6rem',
              }}>
                {virusBanner === 'intro'
                  ? 'CONTENIDO INFECTADO - DESTRUYE EL NUCLEO'
                  : '+500 PTS - TODAS LAS SECCIONES REPARADAS'}
              </div>
            </div>
          )}

          {/* Derrota del virus: daño al 100% (pagina destruida) */}
          {virusLost && (
            <div style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10002,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(10, 10, 26, 0.94)',
              backdropFilter: 'blur(10px)',
              pointerEvents: 'auto',
              textAlign: 'center',
              padding: '2rem',
            }}>
              <div style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 'clamp(1.2rem, 4.5vw, 2.6rem)',
                fontWeight: 900,
                letterSpacing: '0.25em',
                color: '#ef4444',
                animation: 'virusGlitchText 0.5s steps(2) infinite',
                marginBottom: '0.6rem',
              }}>
                PAGINA DESTRUIDA
              </div>
              <div style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '0.6rem',
                letterSpacing: '0.18em',
                color: '#94a3b8',
                marginBottom: '0.4rem',
              }}>
                EL VIRUS CONSUMIO EL 100% DEL CONTENIDO
              </div>
              <div style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#ef4444',
                marginBottom: '0.3rem',
                animation: 'critLabel 0.7s steps(2) infinite',
              }}>
                DAÑO 100%
              </div>
              <div style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '0.7rem',
                color: '#94a3b8',
                letterSpacing: '0.15em',
                marginBottom: '1.6rem',
              }}>
                SCORE: {String(score).padStart(5, '0')} · BEST: {String(highScore).padStart(5, '0')}
              </div>
              <button
                onClick={repairAndRetry}
                style={{
                  padding: '0.85rem 2.5rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: '0.85rem',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 30px rgba(16, 185, 129, 0.7)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.4)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                REPARAR Y REINTENTAR
              </button>
              <div style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '0.5rem',
                color: '#475569',
                marginTop: '1.4rem',
                letterSpacing: '0.1em',
                maxWidth: '340px',
                lineHeight: 1.9,
              }}>
                DESTRUYE EL NUCLEO ANTES DE QUE LA BARRA DE DAÑO LLEGUE AL 100%
              </div>
            </div>
          )}

          {/* Game Over overlay */}
          {gameOver && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(10, 10, 26, 0.85)', backdropFilter: 'blur(8px)', pointerEvents: 'auto' }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.8rem', letterSpacing: '0.3em', color: '#ef4444', marginBottom: '0.5rem' }}>GAME OVER</div>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.6rem', color: currentDiff.color, letterSpacing: '0.15em', marginBottom: '0.5rem' }}>{currentDiff.label}</div>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '3rem', fontWeight: 900, color: '#e2e8f0', marginBottom: '0.5rem' }}>{String(score).padStart(5, '0')}</div>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.65rem', color: '#94a3b8', marginBottom: '2rem' }}>BEST: {String(highScore).padStart(5, '0')}</div>
              <button
                onClick={resetGame}
                style={{ padding: '0.85rem 2.5rem', background: `linear-gradient(135deg, ${currentDiff.color}, ${currentDiff.color}cc)`, border: 'none', borderRadius: '8px', color: 'white', fontFamily: "'Orbitron', sans-serif", fontSize: '0.85rem', letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: `0 0 20px ${currentDiff.color}40` }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 30px ${currentDiff.color}60`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 0 20px ${currentDiff.color}40`; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                REINTENTAR
              </button>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.5rem', color: '#475569', marginTop: '1rem', letterSpacing: '0.1em' }}>CAMBIA LA DIFICULTAD CON EL PANEL LATERAL</div>
            </div>
          )}

          {/* Invincibility indicator */}
          {invincible && !gameOver && (
            <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none', fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', letterSpacing: '0.2em', color: '#f59e0b', textShadow: '0 0 10px rgba(245, 158, 11, 0.5)', animation: 'comboPop 0.3s ease-out' }}>
              INVENCIBLE
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes comboPop {
          0% { transform: translateX(-50%) scale(1.5); opacity: 0.5; }
          100% { transform: translateX(-50%) scale(1); opacity: 1; }
        }
        @keyframes orbit {
          0% { transform: translateX(-50%) rotate(0deg) translateY(-10px); }
          100% { transform: translateX(-50%) rotate(360deg) translateY(-10px); }
        }
        @keyframes virusBannerPop {
          0% { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes virusGlitchText {
          0%, 100% { text-shadow: 0 0 25px rgba(239, 68, 68, 0.7), 3px 0 0 rgba(6, 182, 212, 0.7), -3px 0 0 rgba(240, 171, 222, 0.7); }
          50% { text-shadow: 0 0 25px rgba(239, 68, 68, 0.7), -4px 0 0 rgba(6, 182, 212, 0.7), 4px 0 0 rgba(240, 171, 222, 0.7); }
        }
        @keyframes critBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes critLabel {
          0%, 100% { opacity: 1; text-shadow: 0 0 10px rgba(239, 68, 68, 0.8); }
          50% { opacity: 0.5; text-shadow: none; }
        }
      `}</style>
    </>
  );
}
