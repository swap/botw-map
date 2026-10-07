import L from "leaflet";
import {
  ICON_URL,
  ICON_URL_DLC_SHRINE,
  SHOP_ICON_URL,
} from "../icons/categoryIcons";
import type { MapMarker, MarkerCategory } from "../types";

const cache = new Map<string, L.Icon>();

export type MarkerIconOptions = {
  selected?: boolean;
  completed?: boolean;
  zoom?: number;
  dlc?: boolean;
  shopIcon?: string | null;
};

function baseSizeForZoom(zoom: number, category: MarkerCategory): number {
  const travelGate =
    category === "tower" || category === "lab" || category === "shrine";

  if (travelGate) {
    if (zoom <= 2) return 26;
    if (zoom <= 3) return 28;
    if (zoom <= 4) return 32;
    if (zoom <= 5) return 36;
    return 40;
  }

  if (zoom <= 2) return 18;
  if (zoom <= 3) return 20;
  if (zoom <= 4) return 24;
  if (zoom <= 5) return 28;
  return 32;
}

function sizeForZoom(
  zoom: number,
  selected: boolean,
  category: MarkerCategory,
): number {
  const base = baseSizeForZoom(zoom, category);
  if (!selected) return base;
  
  return Math.round(base * 1.55);
}

function iconUrlFor(
  category: MarkerCategory,
  opts: { dlc?: boolean; shopIcon?: string | null },
): string {
  if (category === "shrine" && opts.dlc) return ICON_URL_DLC_SHRINE;
  if (category === "shop" && opts.shopIcon) {
    return SHOP_ICON_URL[opts.shopIcon] || ICON_URL.shop;
  }
  return ICON_URL[category] || ICON_URL.sideQuest;
}

export function markerIcon(
  category: MarkerCategory,
  opts: MarkerIconOptions | boolean = {},
): L.Icon {
  const options: MarkerIconOptions =
    typeof opts === "boolean" ? { selected: opts } : opts;
  const selected = !!options.selected;
  const completed = !!options.completed;
  const zoom = options.zoom ?? 3;
  const dlc = !!options.dlc;
  const shopIcon = options.shopIcon ?? null;
  const size = sizeForZoom(zoom, selected, category);
  const url = iconUrlFor(category, { dlc, shopIcon });
  const key = `real:${category}:${dlc ? 1 : 0}:${shopIcon || ""}:${selected ? 1 : 0}:${completed ? 1 : 0}:${size}`;
  const existing = cache.get(key);
  if (existing) return existing;

  const icon = L.icon({
    iconUrl: url,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    className: `botw-marker botw-marker--${category}${selected ? " is-selected" : ""}${completed ? " is-completed" : ""}`,
  });
  cache.set(key, icon);
  return icon;
}

export function markerIconFor(
  marker: MapMarker,
  opts: Omit<MarkerIconOptions, "dlc" | "shopIcon"> = {},
): L.Icon {
  return markerIcon(marker.category, {
    ...opts,
    dlc: !!marker.info.dlc,
    shopIcon: marker.info.icon ?? null,
  });
}
