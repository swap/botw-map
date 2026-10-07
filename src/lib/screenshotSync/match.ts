import type { MapMarker } from "../../types";
import { detectMapIcons, paintPreview } from "./detect";
import type {
  DetectedIcon,
  IconMode,
  SyncCategory,
  SyncMatch,
  SyncOptions,
  SyncPreview,
  WorldBounds,
} from "./types";


export const DEFAULT_WORLD_BOUNDS: WorldBounds = {
  minX: -5000,
  maxX: 5000,
  minZ: -4000,
  maxZ: 4000,
};

export function boundsFromMarkers(markers: MapMarker[], pad = 200): WorldBounds {
  if (!markers.length) return { ...DEFAULT_WORLD_BOUNDS };
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const m of markers) {
    minX = Math.min(minX, m.x);
    maxX = Math.max(maxX, m.x);
    minZ = Math.min(minZ, m.z);
    maxZ = Math.max(maxZ, m.z);
  }
  return {
    minX: minX - pad,
    maxX: maxX + pad,
    minZ: minZ - pad,
    maxZ: maxZ + pad,
  };
}

export function uniqueRegions(markers: MapMarker[]): string[] {
  const set = new Set<string>();
  for (const m of markers) {
    if (m.region) set.add(m.region);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

function dist2(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

export function matchDetections(
  detections: DetectedIcon[],
  candidates: MapMarker[],
  completedIds: Set<string>,
  maxMatchDistance: number,
): { matches: SyncMatch[]; unmatched: DetectedIcon[] } {
  const maxD2 = maxMatchDistance * maxMatchDistance;
  const usedMarkers = new Set<string>();
  const matches: SyncMatch[] = [];
  const unmatched: DetectedIcon[] = [];

  const ranked = [...detections].sort((a, b) => b.score - a.score);

  for (const detection of ranked) {
    let best: MapMarker | null = null;
    let bestD2 = maxD2;

    for (const marker of candidates) {
      if (usedMarkers.has(marker.id)) continue;
      const d2 = dist2(detection.x, detection.z, marker.x, marker.z);
      if (d2 < bestD2) {
        bestD2 = d2;
        best = marker;
      }
    }

    if (!best) {
      unmatched.push(detection);
      continue;
    }

    usedMarkers.add(best.id);
    matches.push({
      detection,
      marker: best,
      distance: Math.sqrt(bestD2),
      alreadyCompleted: completedIds.has(best.id),
    });
  }

  matches.sort((a, b) => a.marker.name.localeCompare(b.marker.name));
  return { matches, unmatched };
}

async function loadImage(source: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(source);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not read that image"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function analyzeScreenshot(
  source: Blob,
  allMarkers: MapMarker[],
  completedIds: Set<string>,
  options: SyncOptions,
): Promise<SyncPreview> {
  const img = await loadImage(source);
  const maxEdge = 1600;
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);

  const allowed = new Set<SyncCategory>(options.categories);
  let candidates = allMarkers.filter((m) =>
    allowed.has(m.category as SyncCategory),
  );
  if (options.region) {
    candidates = candidates.filter((m) => m.region === options.region);
  }

  const bounds =
    options.worldBounds ??
    (options.region
      ? boundsFromMarkers(candidates)
      : boundsFromMarkers(
          allMarkers.filter((m) => allowed.has(m.category as SyncCategory)),
          220,
        ));

  const iconMode: IconMode = options.iconMode;
  const detections = detectMapIcons(
    imageData,
    options.inset,
    bounds,
    iconMode,
  );
  const { matches, unmatched } = matchDetections(
    detections,
    candidates,
    completedIds,
    options.maxMatchDistance,
  );

  const matchedIds = new Set(matches.map((m) => m.detection.id));
  const previewDataUrl = paintPreview(canvas, detections, matchedIds);

  return {
    detections,
    matches,
    unmatched,
    bounds,
    imageWidth: width,
    imageHeight: height,
    previewDataUrl,
    iconMode,
  };
}
