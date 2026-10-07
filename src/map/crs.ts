import L from "leaflet";

import "leaflet-rastercoords";


export const TILE_SIZE = 256;
export const MAP_SIZE: [number, number] = [24000, 20000];

export const DEFAULT_CENTER: L.LatLngExpression = [0, 0];

export const DEFAULT_ZOOM = 4;

export const MIN_ZOOM = 2;

export const MAX_NATIVE_ZOOM = 7;
export const MAX_ZOOM = MAX_NATIVE_ZOOM;


export function mapLatLngBounds(): L.LatLngBounds {
  const halfX = MAP_SIZE[0] / 4; 
  const halfZ = MAP_SIZE[1] / 4; 
  return L.latLngBounds([-halfZ, -halfX], [halfZ, halfX]);
}


const MAP_PX_W0 = MAP_SIZE[0] / 128;
const MAP_PX_H0 = MAP_SIZE[1] / 128;


export function coverMinZoomForView(
  viewW: number,
  viewH: number,
  snap = 0.5,
): number {
  if (viewW < 2 || viewH < 2) return MIN_ZOOM;
  const need = Math.max(viewW / MAP_PX_W0, viewH / MAP_PX_H0);
  const raw = Math.log2(need);
  if (!Number.isFinite(raw)) return MIN_ZOOM;
  const snapped = Math.ceil(raw / snap - 1e-9) * snap;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, snapped));
}


export const MAPTEX_LOCAL = "/data/maptex";

export const botwCrs = L.Util.extend({}, L.CRS.Simple, {
  transformation: new L.Transformation(
    4 / TILE_SIZE,
    MAP_SIZE[0] / TILE_SIZE,
    4 / TILE_SIZE,
    MAP_SIZE[1] / TILE_SIZE,
  ),
}) as typeof L.CRS.Simple;


export function toLatLng(x: number, z: number): L.LatLngExpression {
  return [z, x];
}

export function fromLatLng(latlng: L.LatLng): { x: number; z: number } {
  return { x: latlng.lng, z: latlng.lat };
}

declare module "leaflet" {
  class RasterCoords {
    constructor(
      map: Map,
      imgsize: [number, number],
      tilesize?: number,
      setmaxbounds?: boolean,
    );
    width: number;
    height: number;
    zoom: number;
    unproject(coord: [number, number]): LatLng;
    project(coord: LatLngExpression): Point;
    setMaxBounds(): void;
    zoomLevel(): number;
  }
}
