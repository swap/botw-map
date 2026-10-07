import type { MapMarker } from "../types";

export function imgFor(marker: MapMarker): string | null {
  return marker.image || null;
}
