import type { RouteStop } from "../lib/stops";
import type { MarkerCategory } from "../types";

const KEY = "botw-map:active-route";

export type RouteHunt = "custom" | MarkerCategory;

export type RoutePhase = "building" | "active";

export interface SavedRoute {
  hunt: RouteHunt;
  phase: RoutePhase;
  stops: RouteStop[];
  index: number;
  towardCastle: boolean;
}

export function loadSavedRoute(): SavedRoute | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedRoute & {
      active?: boolean;
      category?: MarkerCategory;
      markerIds?: string[];
    };
    if (!parsed) return null;

    if (parsed.hunt && parsed.phase && Array.isArray(parsed.stops)) {
      return parsed;
    }

    if (Array.isArray(parsed.markerIds)) {
      const stops: RouteStop[] = parsed.markerIds.map((id) => ({
        id,
        name: id,
        x: 0,
        z: 0,
        markerId: id,
      }));
      return {
        hunt: parsed.hunt ?? parsed.category ?? "custom",
        phase: parsed.phase ?? (parsed.active === false ? "building" : "active"),
        stops,
        index: parsed.index ?? 0,
        towardCastle: !!parsed.towardCastle,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function saveRoute(route: SavedRoute | null): void {
  try {
    if (!route || (route.phase !== "building" && route.phase !== "active")) {
      localStorage.removeItem(KEY);
      return;
    }
    localStorage.setItem(KEY, JSON.stringify(route));
  } catch {
    // ignore quota errors
  }
}
