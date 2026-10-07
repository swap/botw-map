import { useEffect, useMemo, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { toLatLng } from "../map/crs";
import { nudgePins } from "../lib/nudge";
import { markerIconFor } from "./MarkerIcon";
import type { MapMarker } from "../types";

interface Props {
  markers: MapMarker[];
  selectedId: string | null;
  completedIds: Set<string>;
  onSelect: (marker: MapMarker | null) => void;
}

type TaggedMarker = L.Marker & { __botwId?: string };


export function MarkerLayer({
  markers,
  selectedId,
  completedIds,
  onSelect,
}: Props) {
  const map = useMap();
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const completedRef = useRef(completedIds);
  completedRef.current = completedIds;

  const positions = useMemo(() => nudgePins(markers), [markers]);

  const layersByIdRef = useRef<Map<string, TaggedMarker>>(new Map());

  
  useEffect(() => {
    const byId = new Map(markers.map((m) => [m.id, m]));

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: (z: number) => {
        if (z <= 2) return 140;
        if (z <= 3) return 110;
        if (z <= 4) return 70;
        if (z <= 5) return 40;
        return 28;
      },
      spiderfyOnMaxZoom: true,
      spiderfyDistanceMultiplier: 1.6,
      disableClusteringAtZoom: 7,
      zoomToBoundsOnClick: true,
      animate: false,
      chunkedLoading: true,
      chunkInterval: 50,
      chunkDelay: 25,
      removeOutsideVisibleBounds: true,
      iconCreateFunction: (clust) => {
        const count = clust.getChildCount();
        const size = count > 50 ? 40 : count > 15 ? 34 : 28;
        return L.divIcon({
          className: "botw-cluster",
          html: `<span class="botw-cluster-badge" style="width:${size}px;height:${size}px">${count}</span>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    });

    const layersById = new Map<string, TaggedMarker>();

    const applyIcon = (layer: TaggedMarker, zoom: number) => {
      const m = layer.__botwId ? byId.get(layer.__botwId) : undefined;
      if (!m) return;
      layer.setIcon(
        markerIconFor(m, {
          selected: m.id === selectedRef.current,
          completed: completedRef.current.has(m.id),
          zoom,
        }),
      );
    };

    for (const m of markers) {
      const pos = positions.get(m.id) ?? { x: m.x, z: m.z };
      const layer = L.marker(toLatLng(pos.x, pos.z) as L.LatLngExpression, {
        title: m.name,
      }) as TaggedMarker;
      layer.__botwId = m.id;
      applyIcon(layer, map.getZoom());
      layer.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectRef.current(m);
      });
      layersById.set(m.id, layer);
      cluster.addLayer(layer);
    }

    map.addLayer(cluster);
    layersByIdRef.current = layersById;

    const onZoomEnd = () => {
      const z = map.getZoom();
      for (const layer of layersById.values()) applyIcon(layer, z);
    };
    map.on("zoomend", onZoomEnd);

    return () => {
      map.off("zoomend", onZoomEnd);
      map.removeLayer(cluster);
      layersByIdRef.current = new Map();
    };
  }, [map, markers, positions]);

  
  useEffect(() => {
    const z = map.getZoom();
    const byId = new Map(markers.map((m) => [m.id, m]));
    for (const [id, layer] of layersByIdRef.current) {
      const m = byId.get(id);
      if (!m) continue;
      layer.setIcon(
        markerIconFor(m, {
          selected: m.id === selectedId,
          completed: completedIds.has(m.id),
          zoom: z,
        }),
      );
    }
  }, [map, markers, selectedId, completedIds]);

  return null;
}
