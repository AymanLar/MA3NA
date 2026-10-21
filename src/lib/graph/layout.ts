import type { NodeType } from '@/types';
import type { Registry } from '@/lib/data/shapes';

/**
 * Deterministic layout for the economic graph.
 *
 * The layout is recomputed for whichever entities are currently visible, so
 * every scope frames itself to the viewport instead of inheriting the spacing
 * of the full network. Structure is radial rather than free-force, ordered
 * outwards by how "leaf-like" an entity is:
 *
 *     sectors → companies → indices + events
 *
 * A forced relaxation resolves springs against that skeleton, and an exact
 * axis-aligned separation pass guarantees no two node boxes ever touch. The
 * whole diagram is squashed vertically so it reads as a wide analytical plate
 * rather than a circle.
 */

const TAU = Math.PI * 2;

/** vertical squash — radial layouts are otherwise square, viewports are not */
const SQUASH = 0.52;

/** rendered node box half-extents, used for anisotropic separation */
const BOX: Record<NodeType, { w: number; h: number }> = {
  company: { w: 86, h: 30 },
  sector: { w: 88, h: 29 },
  index: { w: 74, h: 29 },
  event: { w: 84, h: 27 },
};

/** spring rest length for pairs that share a ring */
const SAME_RING: Record<string, number> = {
  'company|company': 188,
  'sector|sector': 186,
  'index|index': 158,
  'event|event': 176,
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) / 4294967296);
  };
}

interface P {
  x: number;
  y: number;
  /** angle in true (unsquashed) space */
  a: number;
}

export interface LayoutOptions {
  /** ids to include; omitted means the entire network */
  ids?: string[];
}

export function computeLayout(reg: Registry, opts: LayoutOptions = {}) {
  const want = opts.ids ? new Set(opts.ids) : null;
  const meta = reg.nodes.filter((r) => (want ? want.has(r.id) : true));
  const ids = meta.map((m) => m.id);
  const type = new Map(meta.map((m) => [m.id, m.type]));
  const idx = new Map(ids.map((id, i) => [id, i]));
  const n = ids.length;
  if (!n) return {} as Record<string, { x: number; y: number }>;

  /* adjacency from the verified/derived relation set */
  const rels = reg.relations.filter((r) => idx.has(r.from) && idx.has(r.to));
  const neighboursOf = (id: string) =>
    rels.filter((r) => r.from === id || r.to === id);
  const other = (r: (typeof rels)[number], id: string) => (r.from === id ? r.to : r.from);
  /** sector each company is classified into, by real relation */
  const sectorOf = new Map<string, string>();
  for (const r of rels) {
    if (r.kind === 'classified_in' && type.get(r.from) === 'company') sectorOf.set(r.from, r.to);
  }

  const rand = mulberry32(0x5eed ^ n);
  const pos = new Array<P>(n);
  const angleOf = new Map<number, number>();

  const counts: Record<string, number> = { company: 0, sector: 0, index: 0, event: 0 };
  meta.forEach((m) => (counts[m.type] += 1));

  /* ── ring radii, sized to what must sit on each ring ──────────────────── */

  const seat = (t: NodeType, count: number) =>
    count <= 0 ? 0 : Math.max(BOX[t].w * 2.0, (count * (BOX[t].w * 2 + 14)) / TAU);

  const maxCluster = new Map<string, number>();
  for (const m of meta) {
    if (m.type !== 'company') continue;
    const s = sectorOf.get(m.id) ?? 'unclassified';
    maxCluster.set(s, (maxCluster.get(s) ?? 0) + 1);
  }
  const clusterMax = Math.max(1, ...maxCluster.values());

  // A scope centred on one sector needs no ring: that sector is the centre and
  // its members orbit it. With two or more, the sectors form the outer ring.
  const rSector = counts.sector <= 1 ? 0 : Math.max(142, seat('sector', counts.sector));
  // Orbiting a single centre, every company is on the same ring, so size that
  // ring for the whole company count. With many sectors each cluster only
  // needs room for its largest sector.
  const rCompany =
    rSector +
    (counts.company
      ? Math.max(64, counts.sector <= 1 ? seat('company', counts.company) : seat('company', clusterMax) * 0.6)
      : 0);
  const rIndex = rCompany + (counts.index ? Math.max(108, seat('index', counts.index) * 0.92) : 0);
  const outerNeed =
    (counts.index * (BOX.index.w * 2 + 16) + counts.event * (BOX.event.w * 2 + 16)) / TAU;
  const rOuter = rIndex + Math.max(96, outerNeed);

  const RING: Record<NodeType, number> = {
    sector: rSector,
    company: rCompany,
    index: rIndex,
    event: rOuter,
  };

  const put = (i: number, angle: number, radius: number, jitter = 0) => {
    const r = Math.max(20, radius + jitter * (rand() - 0.5));
    pos[i] = { x: Math.cos(angle) * r, y: Math.sin(angle) * r * SQUASH, a: angle };
    angleOf.set(i, angle);
  };

  const byType = (t: NodeType) => meta.filter((m) => m.type === t);
  const ringOf = (i: number) => RING[type.get(ids[i])!];

  /* ── outer ring: events and indices, interleaved ──────────────────────── */

  const outer = [...byType('event'), ...byType('index')];
  outer.forEach((m, i, arr) => {
    const radius = m.type === 'index' ? rIndex : rOuter;
    put(idx.get(m.id)!, (i / Math.max(arr.length, 1)) * TAU - Math.PI / 2, radius, 22);
  });

  /* ── sectors, near the average angle of their member companies ─────────── */

  byType('sector').forEach((m, i, arr) => {
    const members = neighboursOf(m.id).map((r) => idx.get(other(r, m.id))).filter((x): x is number => x != null);
    let angle = (i / Math.max(arr.length, 1)) * TAU - Math.PI / 2;
    if (members.length) {
      let sx = 0;
      let sy = 0;
      members.forEach((c) => {
        sx += Math.cos(angleOf.get(c)!) || Math.cos(0);
        sy += Math.sin(angleOf.get(c)!) || Math.sin(0);
      });
      if (Math.hypot(sx, sy) > 0.08) angle = Math.atan2(sy, sx);
    }
    put(idx.get(m.id)!, angle, rSector, 20);
  });

  /* ── companies, orbiting their own sector ─────────────────────────────── */

  const perSector = new Map<string, number>();
  byType('company').forEach((m) => {
    const sid = sectorOf.get(m.id) ?? 'unclassified';
    const k = perSector.get(sid) ?? 0;
    perSector.set(sid, k + 1);
    const si = idx.get(sid);
    const base = si != null ? (angleOf.get(si) ?? 0) : 0;
    const spread = 0.2 + k * 0.26;
    const dir = k % 2 === 0 ? 1 : -1;
    put(idx.get(m.id)!, base + spread * dir * 0.55, rCompany + k * 16, 14);
  });

  /* ── relaxation ───────────────────────────────────────────────────────── */

  const edges = rels.map((r) => {
    const s = idx.get(r.from)!;
    const t = idx.get(r.to)!;
    const key = [type.get(r.from)!, type.get(r.to)!].sort().join('|');
    const rest = SAME_RING[key] ?? Math.abs(ringOf(s) - ringOf(t)) * 0.94 + 16;
    return { s, t, rest, w: r.value ?? 0.5 };
  });

  const ITER = n > 45 ? 320 : 280;
  const gapX = (i: number, j: number) =>
    BOX[type.get(ids[i])!].w + BOX[type.get(ids[j])!].w + 16;
  const gapY = (i: number, j: number) =>
    BOX[type.get(ids[i])!].h + BOX[type.get(ids[j])!].h + 12;

  const fx = new Float64Array(n);
  const fy = new Float64Array(n);

  for (let it = 0; it < ITER; it++) {
    const t = 1 - it / ITER;
    const step = (0.45 + 0.85 * t) * 1.05;
    fx.fill(0);
    fy.fill(0);

    for (const e of edges) {
      const a = pos[e.s];
      const b = pos[e.t];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.001;
      const f = (d - e.rest * (1 - e.w * 0.12)) * (0.016 + e.w * 0.011);
      const ux = dx / d;
      const uy = dy / d;
      fx[e.s] += ux * f;
      fy[e.s] += uy * f;
      fx[e.t] -= ux * f;
      fy[e.t] -= uy * f;
    }

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const ox = gapX(i, j) - Math.abs(pos[j].x - pos[i].x);
        if (ox <= 0) continue;
        const oy = gapY(i, j) - Math.abs(pos[j].y - pos[i].y);
        if (oy <= 0) continue;
        if (ox < oy) {
          fx[i] -= ox * 0.42;
          fx[j] += ox * 0.42;
        } else {
          fy[i] -= oy * 0.42;
          fy[j] += oy * 0.42;
        }
      }
    }

    for (let i = 0; i < n; i++) {
      const p = pos[i];
      const ty = type.get(ids[i])!;
      const band = RING[ty];
      const w = ty === 'event' ? 90 : ty === 'sector' ? 60 : 40;
      const r = Math.hypot(p.x, p.y / SQUASH) || 0.001;
      const off = r - band;
      if (Math.abs(off) > w) {
        const excess = off - Math.sign(off) * w;
        p.x -= (p.x / r) * excess * 0.22;
        p.y -= ((p.y / SQUASH) / r) * excess * 0.22 * SQUASH;
      }
      const a = Math.atan2(p.y / SQUASH, p.x);
      let da = a - p.a;
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      p.a += da * (ty === 'event' ? 0.014 : 0.04);
      p.x += fx[i] * step;
      p.y += fy[i] * step;
    }
  }

  /* ── exact box separation, ellipse kept intact ────────────────────────── */

  for (let pass = 0; pass < 300; pass++) {
    let worst = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const gx = gapX(i, j);
        const gy = gapY(i, j);
        const a = pos[i];
        const b = pos[j];
        const ox = gx - Math.abs(b.x - a.x);
        if (ox <= 0) continue;
        const oy = gy - Math.abs(b.y - a.y);
        if (oy <= 0) continue;
        worst = Math.max(worst, Math.min(ox, oy));
        // prefer the horizontal axis so the diagram stays wide and readable
        if (ox <= oy * 1.5) {
          const dir = b.x >= a.x ? 1 : -1;
          const push = ox * 0.5 + 0.02;
          a.x -= dir * push;
          b.x += dir * push;
        } else {
          const dir = b.y >= a.y ? 1 : -1;
          const push = oy * 0.5 + 0.02;
          a.y -= dir * push;
          b.y += dir * push;
        }
      }
    }
    // Pull stray nodes back toward their ring, but never cap outward growth:
    // an over-full ring must be able to breathe, otherwise boxes stay touching.
    for (let i = 0; i < n; i++) {
      const p = pos[i];
      const band = RING[type.get(ids[i])!];
      const w = type.get(ids[i]) === 'event' ? 100 : 52;
      const r = Math.hypot(p.x, p.y / SQUASH) || 0.001;
      const floor = band - w;
      if (r < floor && r > 0.001) {
        const k = floor / r;
        p.x *= k;
        p.y *= k;
      }
    }
    if (worst < 0.5) break;
  }

  /* ── recentre a single-sector scope on that sector ────────────────────── */

  let offsetX = 0;
  let offsetY = 0;
  const onlySector = meta.filter((m) => m.type === 'sector');
  if (onlySector.length === 1) {
    const p = pos[idx.get(onlySector[0].id)!];
    offsetX = p.x;
    offsetY = p.y;
  }

  const out: Record<string, { x: number; y: number }> = {};
  ids.forEach((id, i) => {
    out[id] = {
      x: Math.round(pos[i].x - offsetX),
      y: Math.round(pos[i].y - offsetY),
    };
  });
  return out;
}

export const LAYOUT_SQUASH = SQUASH;
export const NODE_BOX = BOX;