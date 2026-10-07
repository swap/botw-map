import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { toLatLng } from "../map/crs";
import type { RouteStop } from "../lib/stops";

interface Props {
  
  stops: RouteStop[];
  
  lookAhead?: number;
  
  showAll?: boolean;
}


export function RoutePath({ stops, lookAhead = 32, showAll = false }: Props) {
  const map = useMap();

  useEffect(() => {
    if (stops.length === 0) return;

    const slice = showAll ? stops : stops.slice(0, lookAhead + 1);
    const layers: L.Layer[] = [];

    if (slice.length >= 2) {
      const latlngs = slice.map((m) => toLatLng(m.x, m.z) as L.LatLngExpression);

      const glow = L.polyline(latlngs, {
        color: "#1a3d28",
        weight: 8,
        opacity: 0.45,
        lineCap: "round",
        lineJoin: "round",
        interactive: false,
      });
      const line = L.polyline(latlngs, {
        color: "#5dbf7a",
        weight: 3.5,
        opacity: 0.92,
        lineCap: "round",
        lineJoin: "round",
        interactive: false,
        className: "route-polyline",
      });
      glow.addTo(map);
      line.addTo(map);
      layers.push(glow, line);
    }

    const dotCount = showAll ? slice.length : Math.min(slice.length, 10);
    for (let i = 0; i < dotCount; i++) {
      const m = slice[i];
      const isCurrent = i === 0;
      const isFree = !!m.freeform;
      const dot = L.circleMarker(toLatLng(m.x, m.z) as L.LatLngExpression, {
        radius: isCurrent ? 8 : isFree ? 5 : 4,
        color: isCurrent ? "#d4b85a" : "#5dbf7a",
        weight: 2,
        fillColor: isFree ? "#5dbf7a" : isCurrent ? "#d4b85a" : "#0f1612",
        fillOpacity: isFree ? 0.85 : 0.95,
        interactive: false,
      });
      dot.addTo(map);
      layers.push(dot);
    }

    return () => {
      for (const layer of layers) map.removeLayer(layer);
    };
  }, [map, stops, lookAhead, showAll]);

  return null;
}
