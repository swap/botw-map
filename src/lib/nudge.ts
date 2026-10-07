import type { MapMarker, MarkerCategory } from "../types";

const SPREAD_CATEGORIES = new Set<MarkerCategory>([
  "mainQuest",
  "shrineQuest",
  "sideQuest",
  "objective",
  "memory",
]);

const MIN_SEPARATION = 55;

const ITERATIONS = 4;

export type DisplayPos = { x: number; z: number };

export function nudgePins(markers: MapMarker[]): Map<string, DisplayPos> {
  const positions = new Map<string, DisplayPos>();
  for (const m of markers) {
    positions.set(m.id, { x: m.x, z: m.z });
  }

  const movable = markers.filter((m) => SPREAD_CATEGORIES.has(m.category));
  if (movable.length < 2) return positions;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (let i = 0; i < movable.length; i++) {
      const a = positions.get(movable[i].id)!;
      for (let j = i + 1; j < movable.length; j++) {
        const b = positions.get(movable[j].id)!;
        let dx = b.x - a.x;
        let dz = b.z - a.z;
        let dist = Math.hypot(dx, dz);
        if (dist >= MIN_SEPARATION) continue;
        if (dist < 1e-3) {
          const angle =
            ((hashStr(movable[i].id) ^ hashStr(movable[j].id)) % 360) *
            (Math.PI / 180);
          dx = Math.cos(angle);
          dz = Math.sin(angle);
          dist = 1;
        }
        const push = (MIN_SEPARATION - dist) / 2;
        const ux = dx / dist;
        const uz = dz / dist;
        a.x -= ux * push;
        a.z -= uz * push;
        b.x += ux * push;
        b.z += uz * push;
      }
    }
  }

  return positions;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
