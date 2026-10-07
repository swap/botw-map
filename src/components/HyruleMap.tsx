import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, ImageOverlay, useMap } from "react-leaflet";
import L from "leaflet";
import {
  botwCrs,
  coverMinZoomForView,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  mapLatLngBounds,
  MAPTEX_LOCAL,
  MAX_NATIVE_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  toLatLng,
} from "../map/crs";
import { MarkerLayer } from "./MarkerLayer";
import { RouteBuildClick } from "./RouteBuildClick";
import { RoutePath } from "./RoutePath";
import type { RouteStop } from "../lib/stops";
import type { MapMarker } from "../types";

interface Props {
  markers: MapMarker[];
  selectedId: string | null;
  completedIds: Set<string>;
  onSelect: (marker: MapMarker | null) => void;
  focusId: string | null;
  
  routeStops?: RouteStop[];
  
  routeBuilding?: boolean;
  onAddRoutePoint?: (x: number, z: number) => void;
}

function FocusController({
  markers,
  routeStops,
  focusId,
}: {
  markers: MapMarker[];
  routeStops: RouteStop[];
  focusId: string | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!focusId) return;
    const m =
      markers.find((x) => x.id === focusId) ??
      routeStops.find((x) => x.id === focusId);
    if (!m) return;
    map.flyTo(toLatLng(m.x, m.z), Math.max(map.getZoom(), 6), {
      duration: 0.55,
    });
  }, [focusId, markers, routeStops, map]);
  return null;
}


function BaseMapUnderlay({
  url,
  bounds,
}: {
  url: string;
  bounds: L.LatLngBounds;
}) {
  return (
    <ImageOverlay
      url={url}
      bounds={bounds}
      opacity={1}
      pane="basemapPane"
    />
  );
}


function MapViewportLock({
  onBounds,
}: {
  onBounds: (bounds: L.LatLngBounds) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map.getPane("basemapPane")) {
      const pane = map.createPane("basemapPane");
      pane.style.zIndex = "150";
    }

    const bounds = mapLatLngBounds();
    onBounds(bounds);

    map.options.zoomSnap = 0.5;
    map.options.zoomDelta = 0.5;
    map.setMaxZoom(MAX_ZOOM);
    map.options.maxZoom = MAX_ZOOM;

    const viewSize = () => {
      map.invalidateSize({ pan: false });
      const s = map.getSize();
      if (s.x >= 2 && s.y >= 2) return s;
      const el = map.getContainer();
      return L.point(el.clientWidth || window.innerWidth, el.clientHeight || window.innerHeight);
    };

    const lock = () => {
      const size = viewSize();
      const minZoom = coverMinZoomForView(size.x, size.y, 0.5);

      map.options.minZoom = minZoom;
      map.setMinZoom(minZoom);

      const center = map.getCenter();
      const zoom = Math.max(minZoom, Math.min(MAX_ZOOM, map.getZoom() || minZoom));
      
      
      map.setView(center, zoom, { animate: false });

      map.setMaxBounds(bounds);
      map.options.maxBoundsViscosity = 1;
      map.panInsideBounds(bounds, { animate: false });
    };

    
    map.dragging.disable();
    lock();
    map.dragging.enable();

    const onGestureEnd = () => {
      const size = viewSize();
      const minZoom = coverMinZoomForView(size.x, size.y, 0.5);
      if (map.getZoom() < minZoom) {
        map.setView(map.getCenter(), minZoom, { animate: false });
      }
      map.panInsideBounds(bounds, { animate: false });
    };

    const ro = new ResizeObserver(() => {
      map.dragging.disable();
      lock();
      map.dragging.enable();
    });
    ro.observe(map.getContainer());

    map.on("dragend", onGestureEnd);
    map.on("zoomend", onGestureEnd);

    
    const raf = requestAnimationFrame(() => {
      lock();
      map.dragging.enable();
    });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      map.off("dragend", onGestureEnd);
      map.off("zoomend", onGestureEnd);
    };
  }, [map, onBounds]);

  return null;
}

export function HyruleMap({
  markers,
  selectedId,
  completedIds,
  onSelect,
  focusId,
  routeStops = [],
  routeBuilding = false,
  onAddRoutePoint,
}: Props) {
  const items = useMemo(() => markers, [markers]);
  const worldBounds = useMemo(() => mapLatLngBounds(), []);
  const [tileUrl, setTileUrl] = useState(`${MAPTEX_LOCAL}/{z}/{x}/{y}.png`);
  const [baseUrl, setBaseUrl] = useState(`${MAPTEX_LOCAL}/base.png`);
  const [imageBounds, setImageBounds] = useState<L.LatLngBounds | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const initialMinZoom = useMemo(
    () =>
      coverMinZoomForView(
        typeof window !== "undefined" ? window.innerWidth : 1280,
        typeof window !== "undefined" ? window.innerHeight : 800,
        0.5,
      ),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    setTileUrl(`${MAPTEX_LOCAL}/{z}/{x}/{y}.png`);
    setBaseUrl(`${MAPTEX_LOCAL}/base.png`);
    void (async () => {
      try {
        await fetch(`${MAPTEX_LOCAL}/3/2/2.png`, { method: "HEAD" });
        await fetch(`${MAPTEX_LOCAL}/base.png`, { method: "HEAD" });
      } catch {
        // offline: local paths only
      }
      if (!cancelled) setMapReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!mapReady) {
    return <div className="hyrule-map map-loading" />;
  }

  return (
    <MapContainer
      key={`hyrule-lock-${initialMinZoom}`}
      className="hyrule-map"
      crs={botwCrs}
      center={DEFAULT_CENTER}
      zoom={Math.max(DEFAULT_ZOOM, initialMinZoom)}
      minZoom={initialMinZoom}
      maxZoom={MAX_ZOOM}
      maxBounds={worldBounds}
      maxBoundsViscosity={1}
      zoomSnap={0.5}
      zoomDelta={0.5}
      scrollWheelZoom
      zoomControl={false}
      attributionControl={false}
      preferCanvas
    >
      <MapViewportLock onBounds={setImageBounds} />
      <FocusController
        markers={items}
        routeStops={routeStops}
        focusId={focusId}
      />

      {imageBounds && (
        <BaseMapUnderlay url={baseUrl} bounds={imageBounds} />
      )}

      <TileLayer
        key={tileUrl}
        url={tileUrl}
        maxNativeZoom={MAX_NATIVE_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        noWrap
        bounds={worldBounds}
        opacity={1}
        keepBuffer={12}
        updateWhenIdle
        updateWhenZooming={false}
        className="botw-tiles"
      />

      {routeStops.length > 0 && (
        <RoutePath stops={routeStops} showAll={routeBuilding} />
      )}

      <RouteBuildClick
        enabled={routeBuilding}
        onAddPoint={(x, z) => onAddRoutePoint?.(x, z)}
      />

      <MarkerLayer
        markers={items}
        selectedId={routeBuilding ? null : selectedId}
        completedIds={completedIds}
        onSelect={onSelect}
      />
    </MapContainer>
  );
}
