import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";
import { fromLatLng } from "../map/crs";

interface Props {
  enabled: boolean;
  onAddPoint: (x: number, z: number) => void;
}


export function RouteBuildClick({ enabled, onAddPoint }: Props) {
  const map = useMap();
  const onAddRef = useRef(onAddPoint);
  onAddRef.current = onAddPoint;
  const dragged = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const onDragStart = () => {
      dragged.current = true;
    };
    const onClick = (e: LeafletMouseEvent) => {
      if (dragged.current) {
        dragged.current = false;
        return;
      }
      const { x, z } = fromLatLng(e.latlng);
      onAddRef.current(x, z);
    };

    map.on("dragstart", onDragStart);
    map.on("click", onClick);
    map.getContainer().classList.add("is-route-building");

    return () => {
      map.off("dragstart", onDragStart);
      map.off("click", onClick);
      map.getContainer().classList.remove("is-route-building");
    };
  }, [map, enabled]);

  return null;
}
