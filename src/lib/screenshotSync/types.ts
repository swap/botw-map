import type { MapMarker, MarkerCategory } from "../../types";

export type SyncCategory = Extract<MarkerCategory, "shrine" | "tower" | "lab">;


export type IconMode = "sheikah" | "completed";

export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface DetectedIcon {
  id: string;
  px: number;
  py: number;
  x: number;
  z: number;
  radius: number;
  pixelCount: number;
  score: number;
  kind: IconMode;
}

export interface SyncMatch {
  detection: DetectedIcon;
  marker: MapMarker;
  distance: number;
  alreadyCompleted: boolean;
}

export interface SyncPreview {
  detections: DetectedIcon[];
  matches: SyncMatch[];
  unmatched: DetectedIcon[];
  bounds: WorldBounds;
  imageWidth: number;
  imageHeight: number;
  previewDataUrl: string;
  iconMode: IconMode;
}

export interface SyncOptions {
  
  inset: number;
  
  maxMatchDistance: number;
  categories: SyncCategory[];
  
  region: string | null;
  worldBounds: WorldBounds | null;
  iconMode: IconMode;
}
