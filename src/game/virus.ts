import { getSectionViewportCenter, type SectionId } from '../config/corruption';

let virusId = 0;
const getVirusId = () => ++virusId;

export interface Boss {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  phase: 1 | 2 | 3;
  angle: number;
  pulse: number;
  hitFlash: number;
  attackTimer: number;
  summonTimer: number;
  targetSection: SectionId;
  entering: boolean;
  orbAngle: number;
}

export interface Minion {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  rotation: number;
}

export const VIRUS_CONFIG = {
  maxHp: 150,
  radius: 44,
  /** golpes del jugador necesarios para empujar una reparacion */
  damagePerStep: 30,
  minionSpeed: 1.7,
  minionRadius: 11,
  minionHp: 1,
  entrySpeed: 5,
  maxMinions: 12,
  phases: {
    1: { attackInterval: 300, summonInterval: 420, minionCount: 2 },
    2: { attackInterval: 240, summonInterval: 330, minionCount: 3 },
    3: { attackInterval: 180, summonInterval: 250, minionCount: 4 },
  } as Record<1 | 2 | 3, { attackInterval: number; summonInterval: number; minionCount: number }>,
};

export const PHASE_COLORS: Record<1 | 2 | 3, string> = {
  1: '#22c55e',
  2: '#facc15',
  3: '#ef4444',
};

export function createBoss(w: number, h: number): Boss {
  return {
    x: w / 2,
    y: -80,
    hp: VIRUS_CONFIG.maxHp,
    maxHp: VIRUS_CONFIG.maxHp,
    phase: 1,
    angle: 0,
    pulse: 0,
    hitFlash: 0,
    attackTimer: VIRUS_CONFIG.phases[1].attackInterval,
    summonTimer: VIRUS_CONFIG.phases[1].summonInterval,
    targetSection: 'hero',
    entering: true,
    orbAngle: 0,
  };
}

export function phaseForHp(hp: number, maxHp: number): 1 | 2 | 3 {
  const p = hp / maxHp;
  return p > 0.66 ? 1 : p > 0.33 ? 2 : 3;
}

/**
 * Mueve el boss: entrada desde arriba, luego persigue el centro de su
 * seccion objetivo en coordenadas de viewport (scroll-aware) con vaiven orbital.
 */
export function updateBossPosition(boss: Boss, frame: number, w: number, h: number) {
  boss.angle += 0.012 + boss.phase * 0.006;
  boss.pulse += boss.phase === 3 ? 0.09 : 0.06;
  boss.orbAngle += 0.04;
  if (boss.hitFlash > 0) boss.hitFlash--;

  if (boss.entering) {
    boss.y += VIRUS_CONFIG.entrySpeed;
    if (boss.y >= 140) {
      boss.y = 140;
      boss.entering = false;
    }
    return;
  }

  const center = getSectionViewportCenter(boss.targetSection);
  const tx = center ? Math.max(80, Math.min(w - 80, center.x)) : w / 2;
  const ty = center ? Math.max(130, Math.min(h - 110, center.y)) : h / 2;
  const wobX = Math.sin(frame * 0.02) * 46;
  const wobY = Math.cos(frame * 0.016) * 28;
  boss.x += (tx + wobX - boss.x) * 0.045;
  boss.y += (ty + wobY - boss.y) * 0.045;
}

export function spawnMinions(boss: Boss, count: number): Minion[] {
  const out: Minion[] = [];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    out.push({
      id: getVirusId(),
      x: boss.x + Math.cos(a) * 50,
      y: boss.y + Math.sin(a) * 50,
      vx: Math.cos(a) * 1.5,
      vy: Math.sin(a) * 1.5,
      hp: VIRUS_CONFIG.minionHp,
      rotation: Math.random() * Math.PI * 2,
    });
  }
  return out;
}

/** Minion que persigue a la nave con aceleracion limitada */
export function updateMinion(m: Minion, shipX: number, shipY: number) {
  const dx = shipX - m.x;
  const dy = shipY - m.y;
  const dist = Math.hypot(dx, dy) || 1;
  m.vx += (dx / dist) * 0.05;
  m.vy += (dy / dist) * 0.05;
  const sp = Math.hypot(m.vx, m.vy);
  if (sp > VIRUS_CONFIG.minionSpeed) {
    m.vx = (m.vx / sp) * VIRUS_CONFIG.minionSpeed;
    m.vy = (m.vy / sp) * VIRUS_CONFIG.minionSpeed;
  }
  m.x += m.vx;
  m.y += m.vy;
  m.rotation += 0.06;
}

/** Boss: blob toxico con espinas, ojo que sigue a la nave, cortes glitch y orbs de fase.
 *  Si `img` esta cargada, se dibuja la imagen en vez del cuerpo vectorial
 *  (aura, glitch, orbs, flash y etiqueta se mantienen encima). */
export function drawBoss(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  frame: number,
  shipX: number,
  shipY: number,
  img?: HTMLImageElement | null
) {
  const color = PHASE_COLORS[boss.phase];
  const r = VIRUS_CONFIG.radius * (1 + Math.sin(boss.pulse) * 0.07);
  const jitter = frame % 23 < 2 ? (Math.random() - 0.5) * 8 : 0;

  ctx.save();
  ctx.translate(boss.x + jitter, boss.y);

  // Aura
  const glow = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 2.2);
  glow.addColorStop(0, `${color}55`);
  glow.addColorStop(1, `${color}00`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2);
  ctx.fill();

  const hasImg = !!(img && img.complete && img.naturalWidth > 0);

  if (hasImg) {
    // Cuerpo: imagen personalizada (siempre cuadrada, centrada)
    const size = r * 2.6;
    ctx.drawImage(img!, -size / 2, -size / 2, size, size);
  } else {
    // Espinas rotatorias
    const spikes = 10;
    ctx.fillStyle = `${color}cc`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < spikes; i++) {
      const a = boss.angle + (Math.PI * 2 * i) / spikes;
      const len = r * 0.45 + Math.sin(frame * 0.12 + i * 1.7) * 8 + boss.phase * 3;
      const half = 0.16;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - half) * r * 0.85, Math.sin(a - half) * r * 0.85);
      ctx.lineTo(Math.cos(a) * (r + len), Math.sin(a) * (r + len));
      ctx.lineTo(Math.cos(a + half) * r * 0.85, Math.sin(a + half) * r * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Nucleo
    const core = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    core.addColorStop(0, '#f8fafc');
    core.addColorStop(0.3, color);
    core.addColorStop(1, '#14532d');
    ctx.fillStyle = core;
    ctx.strokeStyle = '#0a0a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ojo que mira a la nave
    const eAngle = Math.atan2(shipY - boss.y, shipX - boss.x);
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(0, -2, r * 0.55, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0a1a';
    ctx.beginPath();
    ctx.arc(
      Math.cos(eAngle) * r * 0.28,
      -2 + Math.sin(eAngle) * r * 0.18,
      r * 0.17,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  // Cortes glitch
  if (frame % 19 < 3) {
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = '#f0abfc';
    ctx.fillRect(-r - 6, -10 + (frame % 5) * 4, (r + 6) * 2, 5);
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(-r - 2, 12 - (frame % 4) * 3, (r + 2) * 2, 4);
    ctx.globalAlpha = 1;
  }

  // Orbs orbitando (fase 2+)
  if (boss.phase >= 2) {
    for (let i = 0; i < boss.phase; i++) {
      const a = boss.orbAngle + (Math.PI * 2 * i) / boss.phase;
      const ox = Math.cos(a) * (r + 22);
      const oy = Math.sin(a) * (r + 22);
      const orbColor = i % 2 ? '#f0abfc' : '#f8fafc';
      ctx.fillStyle = orbColor;
      ctx.shadowColor = orbColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(ox, oy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // Flash de dao
  if (boss.hitFlash > 0) {
    ctx.globalAlpha = boss.hitFlash / 7;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Etiqueta
  ctx.font = "700 10px 'Orbitron', monospace";
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.fillText(`VIRUS.EXE // F${boss.phase}`, 0, -r - 26);

  ctx.restore();
}

/** Minion: diamante magenta con jitter glitch. Imagen opcional con fallback vectorial */
export function drawMinion(
  ctx: CanvasRenderingContext2D,
  m: Minion,
  frame: number,
  img?: HTMLImageElement | null
) {
  const jx = Math.sin(frame * 0.6 + m.id) * 2;
  ctx.save();
  ctx.translate(m.x + jx, m.y);
  ctx.rotate(m.rotation);
  ctx.shadowColor = '#f0abfc';
  ctx.shadowBlur = 10;

  const hasImg = !!(img && img.complete && img.naturalWidth > 0);
  if (hasImg) {
    const size = VIRUS_CONFIG.minionRadius * 2.6;
    ctx.drawImage(img!, -size / 2, -size / 2, size, size);
  } else {
    ctx.fillStyle = 'rgba(240, 171, 222, 0.25)';
    ctx.strokeStyle = '#f0abfc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(8, 0);
    ctx.lineTo(0, 10);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
