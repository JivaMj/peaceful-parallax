import { useSyncExternalStore } from 'react';

export type SectionId = 'hero' | 'about' | 'projects' | 'skills' | 'contact';

export const SECTION_ORDER: SectionId[] = ['hero', 'about', 'projects', 'skills', 'contact'];
export const MAX_LEVEL = 3;

export type CorruptionState = Record<SectionId, number>;

const INITIAL_STATE: CorruptionState = { hero: 0, about: 0, projects: 0, skills: 0, contact: 0 };

const GLITCH_CHARS =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&$@!?/\\|<>=+~*ｱｲｳｴｵｶｷｸｹｺﾊﾋﾌﾍﾎ';
const RARE_BLOCKS = '▓▒░█';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Reemplaza caracteres por glifos glitch manteniendo la longitud (evita reflow) */
function scrambleText(original: string, density: number): string {
  let out = '';
  for (const ch of original) {
    if (/\s/.test(ch)) {
      out += ch;
      continue;
    }
    if (Math.random() < density) {
      out += Math.random() < 0.12
        ? RARE_BLOCKS[(Math.random() * RARE_BLOCKS.length) | 0]
        : GLITCH_CHARS[(Math.random() * GLITCH_CHARS.length) | 0];
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Store singleton con el nivel de corrupcion (0-3) de cada seccion.
 *
 * - Aplica las clases .virus-lN al DOM de la seccion (los <section> usan style,
 *   no className, asi que React nunca pisa estas clases).
 * - Scramblea el texto visible de la seccion corrupta (se restaura al llegar a 0).
 * - Toggle de la clase del body para la viñeta de infeccion.
 * - No persiste: recargar la pagina deja el sitio limpio.
 */
class CorruptionStore {
  private state: CorruptionState = { ...INITIAL_STATE };
  private cursor = 0;
  private listeners = new Set<() => void>();
  private timers: number[] = [];
  private scrambleTimer: number | null = null;
  /** Textos originales por seccion para poder restaurarlos */
  private originals = new Map<SectionId, { node: Text; text: string }[]>();

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getState = (): CorruptionState => this.state;

  getInfectionPct = (): number => {
    let total = 0;
    for (const id of SECTION_ORDER) total += this.state[id];
    return Math.round((total / (SECTION_ORDER.length * MAX_LEVEL)) * 100);
  };

  private emit() {
    this.listeners.forEach((l) => l());
  }

  private applyClass(id: SectionId) {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('virus-l1', 'virus-l2', 'virus-l3');
    const level = this.state[id];
    if (level > 0) el.classList.add(`virus-l${level}`);
  }

  private syncBodyClass() {
    if (typeof document === 'undefined') return;
    const total = SECTION_ORDER.reduce((sum, id) => sum + this.state[id], 0);
    const pct = Math.round((total / (SECTION_ORDER.length * MAX_LEVEL)) * 100);
    document.body.classList.toggle('virus-infecting', total > 0);
    document.body.classList.toggle('virus-critical', pct >= 80);
  }

  // ─── Text scramble ────────────────────────────────

  /** Guarda los nodos de texto originales de una seccion (una sola vez por infeccion) */
  private collectOriginals(id: SectionId) {
    if (this.originals.has(id)) return;
    const el = document.getElementById(id);
    if (!el) return;
    const entries: { node: Text; text: string }[] = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n: Node | null = null;
    while ((n = walker.nextNode())) {
      const t = n as Text;
      if (!t.data.trim()) continue;
      const parent = t.parentElement;
      if (!parent) continue;
      const tag = parent.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA') continue;
      entries.push({ node: t, text: t.data });
    }
    this.originals.set(id, entries);
  }

  private scrambleSection(id: SectionId, level: number) {
    this.collectOriginals(id);
    const entries = this.originals.get(id);
    if (!entries) return;
    const density = level === 1 ? 0.14 : level === 2 ? 0.42 : 0.7;
    for (const e of entries) {
      if (!e.node.isConnected) continue;
      e.node.data = scrambleText(e.text, density);
    }
  }

  private restoreSection(id: SectionId) {
    const entries = this.originals.get(id);
    if (!entries) return;
    for (const e of entries) {
      if (e.node.isConnected && e.node.data !== e.text) e.node.data = e.text;
    }
    this.originals.delete(id);
  }

  private restoreAllTexts() {
    for (const id of SECTION_ORDER) this.restoreSection(id);
  }

  /** Re-scramble periodico de las secciones en nivel 2+ (L1 se scramblea una vez) */
  private ensureScrambleLoop() {
    if (this.scrambleTimer !== null) return;
    if (prefersReducedMotion()) return;
    this.scrambleTimer = window.setInterval(() => {
      let any = false;
      for (const id of SECTION_ORDER) {
        const lvl = this.state[id];
        if (lvl <= 0) continue;
        any = true;
        if (lvl >= 2) this.scrambleSection(id, lvl);
      }
      if (!any) this.stopScrambleLoop();
    }, 280);
  }

  private stopScrambleLoop() {
    if (this.scrambleTimer !== null) {
      window.clearInterval(this.scrambleTimer);
      this.scrambleTimer = null;
    }
  }

  // ─── Niveles ──────────────────────────────────────

  setLevel(id: SectionId, level: number) {
    const next = Math.max(0, Math.min(MAX_LEVEL, level));
    if (this.state[id] === next) return;
    this.state = { ...this.state, [id]: next };
    this.applyClass(id);
    if (next > 0 && !prefersReducedMotion()) {
      this.scrambleSection(id, next);
      this.ensureScrambleLoop();
    } else if (next === 0) {
      this.restoreSection(id);
    }
    this.syncBodyClass();
    this.emit();
  }

  /** Infecta la seccion en el cursor (ciclico) y lo avanza. Devuelve la seccion infectada. */
  infectNext(): SectionId | null {
    for (let i = 0; i < SECTION_ORDER.length; i++) {
      const idx = (this.cursor + i) % SECTION_ORDER.length;
      const id = SECTION_ORDER[idx];
      if (this.state[id] < MAX_LEVEL) {
        this.setLevel(id, this.state[id] + 1);
        this.cursor = (idx + 1) % SECTION_ORDER.length;
        return id;
      }
    }
    return null;
  }

  /** Repara un nivel en la seccion mas corrupta. Devuelve la seccion reparada. */
  repairMost(): SectionId | null {
    let target: SectionId | null = null;
    let best = 0;
    for (const id of SECTION_ORDER) {
      if (this.state[id] > best) {
        best = this.state[id];
        target = id;
      }
    }
    if (!target) return null;
    this.setLevel(target, best - 1);
    return target;
  }

  /** Onda de reparacion total con barrido escalonado (victoria) */
  repairAll(stagger = true) {
    this.clearTimers();
    const order = [...SECTION_ORDER].reverse();
    order.forEach((id, i) => {
      if (this.state[id] === 0) return;
      if (stagger) {
        const t = window.setTimeout(() => this.setLevel(id, 0), i * 160);
        this.timers.push(t);
      } else {
        this.setLevel(id, 0);
      }
    });
  }

  /** Limpieza instantanea (reset del juego / abortar) */
  reset() {
    this.clearTimers();
    this.stopScrambleLoop();
    this.cursor = 0;
    let changed = false;
    for (const id of SECTION_ORDER) {
      if (this.state[id] !== 0) {
        this.state = { ...this.state, [id]: 0 };
        this.applyClass(id);
        changed = true;
      }
    }
    this.restoreAllTexts();
    this.syncBodyClass();
    if (changed) this.emit();
  }

  private clearTimers() {
    this.timers.forEach((t) => window.clearTimeout(t));
    this.timers = [];
  }
}

export const corruptionStore = new CorruptionStore();

/** Hook reactivo con el estado completo de corrupcion (SSR-safe) */
export function useCorruptionState(): CorruptionState {
  return useSyncExternalStore(
    corruptionStore.subscribe,
    corruptionStore.getState,
    corruptionStore.getState
  );
}

/**
 * Centro de una seccion en coordenadas del viewport (fixed/absolute del canvas).
 * Tiene en cuenta el scroll actual: sirve para posicionar el boss sobre
 * la seccion real este donde este en la pagina.
 */
export function getSectionViewportCenter(id: SectionId): { x: number; y: number } | null {
  if (typeof document === 'undefined') return null;
  const el = document.getElementById(id);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/**
 * Si la seccion esta totalmente fuera del viewport, hace scroll suave hasta ella
 * (para que el evento de infeccion siempre sea visible). Respeta prefers-reduced-motion.
 */
export function revealSection(id: SectionId) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(id);
  if (!el) return;
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const offscreen = r.bottom < 0 || r.top > vh;
  if (!offscreen) return;
  const reduce = prefersReducedMotion();
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
}
