import type { MapMarker } from "../types";

export interface RouteStop {
  id: string;
  name: string;
  x: number;
  z: number;
  region?: string | null;
  location?: string | null;
  markerId?: string;
  freeform?: boolean;
}

let waypointSeq = 0;

export function fromMarker(marker: MapMarker): RouteStop {
  return {
    id: marker.id,
    name: marker.name,
    x: marker.x,
    z: marker.z,
    region: marker.region,
    location: marker.location,
    markerId: marker.id,
    freeform: false,
  };
}

export function fromPoint(x: number, z: number, indexHint?: number): RouteStop {
  waypointSeq += 1;
  const n = indexHint ?? waypointSeq;
  return {
    id: `waypoint:${Date.now()}:${waypointSeq}`,
    name: `Pin ${n}`,
    x,
    z,
    freeform: true,
  };
}

export function nameStops(stops: RouteStop[]): RouteStop[] {
  let pin = 0;
  return stops.map((s) => {
    if (!s.freeform) return s;
    pin += 1;
    return { ...s, name: `Pin ${pin}` };
  });
}
