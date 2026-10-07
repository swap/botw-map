import type { MapMarker, MarkerCategory } from "../types";

export const HUNT_CATS: MarkerCategory[] = [
  "korok",
  "shrine",
  "memory",
  "chest",
  "talus",
  "hinox",
  "lynel",
  "molduga",
  "guardian",
  "greatFairy",
  "goddess",
  "tower",
];

export const START_PT = { x: -4500, z: 3500 };

export const END_PT = { x: -254, z: -611 };

type Pt = { x: number; z: number };

function dist2(a: Pt, b: Pt): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

function dist(a: Pt, b: Pt): number {
  return Math.sqrt(dist2(a, b));
}

function pathLength(points: Pt[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += dist(points[i - 1], points[i]);
  }
  return total;
}

function nearestIndex(points: Pt[], seed: Pt, used?: boolean[]): number {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < points.length; i++) {
    if (used?.[i]) continue;
    const d = dist2(points[i], seed);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function nearestNeighborOrder(
  points: Pt[],
  startIdx: number,
  goal: Pt | null,
  goalWeight: number,
): number[] {
  const n = points.length;
  const used = new Array<boolean>(n).fill(false);
  const order: number[] = [startIdx];
  used[startIdx] = true;

  while (order.length < n) {
    const cursor = points[order[order.length - 1]];
    let best = -1;
    let bestCost = Infinity;

    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      let cost = dist(cursor, points[i]);
      if (goal && goalWeight > 0) {
        cost += goalWeight * dist(points[i], goal);
      }
      if (cost < bestCost) {
        bestCost = cost;
        best = i;
      }
    }

    used[best] = true;
    order.push(best);
  }

  return order;
}

function twoOptOpen(order: number[], points: Pt[], maxPasses = 60): number[] {
  const n = order.length;
  if (n < 4) return order;

  const route = order.slice();
  let improved = true;
  let passes = 0;

  while (improved && passes < maxPasses) {
    improved = false;
    passes += 1;

    for (let i = 1; i < n - 2; i++) {
      for (let k = i + 1; k < n - 1; k++) {
        const a = points[route[i - 1]];
        const b = points[route[i]];
        const c = points[route[k]];
        const d = points[route[k + 1]];

        const before = dist(a, b) + dist(c, d);
        const after = dist(a, c) + dist(b, d);
        if (after + 1e-6 < before) {
          let lo = i;
          let hi = k;
          while (lo < hi) {
            const tmp = route[lo];
            route[lo] = route[hi];
            route[hi] = tmp;
            lo += 1;
            hi -= 1;
          }
          improved = true;
        }
      }
    }
  }

  return route;
}

export interface MakeRouteOptions {
  seed?: Pt;
  goal?: Pt | null;
  goalWeight?: number;
}

export function makeRoute(
  markers: MapMarker[],
  options: MakeRouteOptions = {},
): MapMarker[] {
  if (markers.length === 0) return [];
  if (markers.length === 1) return [...markers];

  const seed = options.seed ?? START_PT;
  const goal = options.goal ?? null;
  const points: Pt[] = markers.map((m) => ({ x: m.x, z: m.z }));
  const startIdx = nearestIndex(points, seed);

  const weights =
    goal != null ? [options.goalWeight ?? 0.35, 0.15, 0] : [0];

  let bestConstructed: number[] | null = null;
  let bestConstructedLen = Infinity;

  for (const w of weights) {
    const constructed = nearestNeighborOrder(points, startIdx, goal, w);
    const len = pathLength(constructed.map((i) => points[i]));
    if (len < bestConstructedLen) {
      bestConstructedLen = len;
      bestConstructed = constructed;
    }
  }

  const improved = twoOptOpen(bestConstructed ?? [startIdx], points);
  return improved.map((i) => markers[i]);
}

export function pruneCompletedRoute(
  route: MapMarker[],
  completedIds: Set<string>,
): MapMarker[] {
  return route.filter((m) => !completedIds.has(m.id));
}
