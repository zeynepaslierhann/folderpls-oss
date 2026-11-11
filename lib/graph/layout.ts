/**
 * Small, dependency-free force-directed layout.
 *
 * Deliberately NOT `react-force-graph-2d`/`force-graph`: the new graph view
 * only ever renders a focused neighborhood (1-2 hops, clustered above a
 * threshold — see `focus.ts`/`cluster.ts`), so node counts are small (tens,
 * capped at `hardNodeCap`). At that scale a synchronous relaxation pass is
 * plenty and avoids ~6MB of unpacked physics/canvas-engine JS entirely (see
 * `docs/graph-v2.md`). It runs once per focus change, not every animation
 * frame, so `prefers-reduced-motion` is satisfied for free — there's no
 * continuous physics to disable, only an optional CSS position transition on
 * the caller's side.
 */

export interface LayoutInputNode {
  readonly id: string;
}

export interface LayoutInputEdge {
  readonly source: string;
  readonly target: string;
}

export interface LayoutPoint {
  readonly x: number;
  readonly y: number;
}

export interface LayoutOptions {
  /** Node kept fixed at (0, 0) — typically the focused node. */
  readonly centerId?: string;
  readonly iterations?: number;
  readonly linkDistance?: number;
  readonly repulsion?: number;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/**
 * Deterministic (no `Math.random`) spring/repulsion relaxation. Same inputs
 * always produce the same layout, which keeps it trivially unit-testable and
 * gives a stable screenshot/visual diff.
 */
export function computeLayout(
  nodes: readonly LayoutInputNode[],
  edges: readonly LayoutInputEdge[],
  options: LayoutOptions = {}
): Map<string, LayoutPoint> {
  const positions = new Map<string, LayoutPoint>();
  if (nodes.length === 0) return positions;
  if (nodes.length === 1) {
    positions.set(nodes[0].id, { x: 0, y: 0 });
    return positions;
  }

  const linkDistance = options.linkDistance ?? 90;
  const repulsion = options.repulsion ?? 2400;
  // Fewer iterations for larger graphs keeps the (O(n²) per iteration) cost bounded.
  const iterations = options.iterations ?? (nodes.length > 150 ? 60 : 150);

  const particles = new Map<string, Particle>();
  nodes.forEach((node, i) => {
    if (node.id === options.centerId) {
      particles.set(node.id, { id: node.id, x: 0, y: 0, vx: 0, vy: 0 });
      return;
    }
    // Golden-angle spiral start: evenly spread, no randomness.
    const angle = i * GOLDEN_ANGLE;
    const radius = linkDistance * 0.6 * Math.sqrt(i + 1);
    particles.set(node.id, { id: node.id, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, vx: 0, vy: 0 });
  });

  const list = [...particles.values()];
  const damping = 0.82;

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsion — every pair pushes apart (Coulomb-like).
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let distSq = dx * dx + dy * dy;
        if (distSq < 0.01) {
          // Avoid singularities when two nodes start on top of each other.
          dx = 0.1;
          dy = 0.1;
          distSq = 0.02;
        }
        const force = repulsion / distSq;
        const dist = Math.sqrt(distSq);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }

    // Attraction — edges pull their endpoints toward `linkDistance` apart.
    for (const edge of edges) {
      const a = particles.get(edge.source);
      const b = particles.get(edge.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.01);
      const delta = dist - linkDistance;
      const fx = (dx / dist) * delta * 0.06;
      const fy = (dy / dist) * delta * 0.06;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    for (const p of list) {
      if (p.id === options.centerId) {
        p.x = 0;
        p.y = 0;
        p.vx = 0;
        p.vy = 0;
        continue;
      }
      p.vx *= damping;
      p.vy *= damping;
      p.x += p.vx;
      p.y += p.vy;
    }
  }

  for (const p of list) positions.set(p.id, { x: p.x, y: p.y });
  return positions;
}
