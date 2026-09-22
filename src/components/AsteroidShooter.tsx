import { useEffect, useRef, useState, useCallback } from 'react';
import { ASSETS, loadImage } from '../config/assets';
import { audioManager } from '../config/audio';
import portfolio from '../data/portfolio.json';

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

const WEAPONS: { id: WeaponType; label: string; icon: string; color: string }[] = [
  { id: 'basic',   label: 'BASICA',    icon: '•',  color: '#06b6d4' },
  { id: 'bounce',  label: 'REBOTE',    icon: '◊',  color: '#10b981' },
  { id: 'minigun', label: 'MINIGUN',   icon: '⫸', color: '#f59e0b' },
];

const ASTEROID_COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#64748b'];
const INVINCIBILITY_FRAMES = 90;
const SHIP_RADIUS = 14;
const SHIP_SPEED = 4;
const MAX_BOUNCE = 3;
const POWERUP_INTERVAL_MIN = 500;
const POWERUP_INTERVAL_MAX = 2000;

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
    setMutedFx(muted);
  }, []);

  const toggleGameActive = useCallback(() => {
    setGameActive((prev) => {
      const next = !prev;
      try { localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    gameActiveRef.current = gameActive;
  }, [gameActive]);

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

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frameRef.current++;

      const config = getDiffConfig();
      const keys = keysRef.current;

      if (!gameOverRef.current && gameActiveRef.current) {
        spawnTimerRef.current++;

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
      if (config.safeZone && !gameOverRef.current) {
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
  }, [shoot, spawnAsteroid, spawnPowerup, loseLife, getDiffConfig, initAudio, cycleWeapon]);

  const currentDiff = DIFFICULTIES.find((d) => d.id === difficulty)!;
  const currentWeapon = WEAPONS.find((w) => w.id === weapon)!;

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
      `}</style>
    </>
  );
}
